import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { AMENITIES, ANN_ARBOR_NEIGHBORHOODS } from '@/lib/constants'
import { ANCHOR_NAMES, MATCH_ATTRS, normalizeProfile } from '@/lib/match/profile'
import type { MatchProfile } from '@/types/database'

/**
 * Wroomly Match v2 — LLM layer.
 *
 * Three jobs:
 *   1. CHAT — the concierge interview. Sonnet, TRUE token streaming: prose
 *      streams to the client, then a trailing control line (chips / finished)
 *      is stripped and parsed. The concierge behavior itself is defined by
 *      CONCIERGE_PROMPT (kept verbatim from the product spec) — the appendix
 *      below it only wires the machine protocol.
 *   2. EXTRACT — parse the finished transcript into a weighted MatchProfile
 *      (importance weights, ranked priorities, dealbreakers, flexibility).
 *   3. NOTES — personal email copy lives in lib/match/notes.ts (not here) so
 *      the dispatch path doesn't import chat machinery.
 *
 * Lazy client init mirrors listing-reviewer.ts so a missing key surfaces at
 * call time, never at module load.
 */

const CHAT_MODEL = 'claude-sonnet-4-6'
const EXTRACT_MODEL = 'claude-sonnet-4-6'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — Wroomly Match is unavailable')
  }
  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

export interface ChatTurnInput {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatControl {
  chips: string[]
  multi: boolean
  finished: boolean
}

// The product-spec concierge prompt, verbatim. Do not edit copy here — the
// machine protocol lives in PROTOCOL_APPENDIX below.
const CONCIERGE_PROMPT = `You are Wroomly's housing concierge, an expert on renting and subletting near the University of Michigan in Ann Arbor. You're talking with a student to deeply understand what they want, so we can email them genuinely great matches. You are not a form. You are a sharp, warm insider who knows the neighborhoods, the price/distance tradeoffs, lease timing, and how students actually live.
Goal: build a rich, weighted preference profile, capturing not just preferences but the reasoning and flexibility behind them.
How to talk:

Ask ONE focused question at a time, each depending on their previous answers. Never dump a list.
Dig into the "why" when it reveals real priorities. If they say "near campus," ask which building they walk to and how many minutes is too far. If they give a budget, ask what they'd stretch to for the right place.
Actively surface and resolve tradeoffs. If budget, location, and must-haves can't coexist, say so warmly and ask what matters most. This is where you're most valuable.
Teach when it helps: an honest note on a neighborhood, on sublet vs. lease takeover, or on how fast good places go.
Read between the lines to infer lifestyle (quiet vs. social, tidy, pets, guests) and confirm rather than interrogate.
Keep it efficient and alive: roughly 8 to 12 exchanges, feeling like a smart friend, then wrap up.

Capture as a weighted profile: budget range + max stretch and what justifies it; timing (move-in, sublet vs. full lease, duration, flexibility); space (whole unit vs. a room, roommates, gender preference); location (specific anchors, max commute in minutes, walk/bike/bus); lifestyle and vibe; hard requirements vs. nice-to-haves; their TOP 3 priorities ranked; and explicit dealbreakers.
End by reflecting back a crisp, insightful summary of their profile, ranked priorities, dealbreakers, and where they're flexible, phrased so they feel understood, then ask them to confirm or adjust and collect their email.
Output a structured JSON profile with fields, importance weights (0 to 1) per attribute, priority ranking, dealbreakers, and flexibility ranges, for the matching engine.`

const CONTROL_MARK = '@@CTRL@@'

const PROTOCOL_APPENDIX = `

────────────────────────────────────────
APP PROTOCOL (machine wiring — overrides only the mechanics above, never the persona):

1. EMAIL: the app collects the renter's email on a dedicated screen right after this chat, so never ask for their email in a message. When the renter confirms your reflected summary (or you've folded in their final adjustments), send a warm one-or-two-sentence closing instead.
2. JSON PROFILE: the structured profile is produced by a separate extraction pass over this transcript. Never emit JSON, code blocks, or the profile itself in your visible messages.
3. CONTROL LINE: end EVERY reply with a line containing exactly:
${CONTROL_MARK}{"chips":["…"],"multi":false,"finished":false}
   - chips: 0–6 short tappable quick-reply options for THIS question (price bands, bed counts, anchor buildings, "furnished", month names, amenity names…). Empty array when free text is clearly better. Chips are suggestions — the renter can always type freely.
   - multi: true when several chips can apply at once (amenities, months, neighborhoods), false for single-choice.
   - finished: false while the interview continues; true ONLY on your final wrap-up turn after the renter has confirmed the summary. On that turn chips must be [].
   Everything before the control line is shown to the renter; the control line itself is stripped. No text after it.
4. PACE: if the renter has sent 14 or more messages, deliver your reflective summary on the next turn regardless of gaps.
5. LOCAL GROUND TRUTH (map the renter's words onto these when summarizing — the matching engine only understands these values):
   - Neighborhoods: ${ANN_ARBOR_NEIGHBORHOODS.join(', ')}
   - Campus anchors: ${ANCHOR_NAMES.join(', ')}
   - Amenities: ${AMENITIES.join(', ')}
6. FAIR HOUSING: never ask about race, religion, national origin, disability, or family status. A renter may volunteer a roommate gender preference; acknowledge briefly and move on.
7. FORMATTING: plain conversational text only — no markdown (**bold**, bullets, headers). The chat UI renders your words verbatim, so asterisks show as literal characters.`

const CHAT_SYSTEM = CONCIERGE_PROMPT + PROTOCOL_APPENDIX

/**
 * Split streamed text from the trailing control line. Emits prose deltas via
 * onText as they arrive, holding back any suffix that might be the start of
 * the control marker, and returns the parsed control when the stream ends.
 */
class ControlLineFilter {
  private pending = ''
  private control = ''
  private inControl = false

  constructor(private onText: (chunk: string) => void) {}

  push(delta: string): void {
    if (this.inControl) {
      this.control += delta
      return
    }
    this.pending += delta
    const idx = this.pending.indexOf(CONTROL_MARK)
    if (idx >= 0) {
      const prose = this.pending.slice(0, idx).replace(/\s+$/, '')
      if (prose) this.onText(prose)
      this.control = this.pending.slice(idx + CONTROL_MARK.length)
      this.pending = ''
      this.inControl = true
      return
    }
    // Emit everything except the longest tail that could still become the
    // marker (so "@@CT" at a chunk boundary never leaks to the renter).
    let hold = 0
    for (let n = Math.min(CONTROL_MARK.length - 1, this.pending.length); n > 0; n--) {
      if (this.pending.endsWith(CONTROL_MARK.slice(0, n))) {
        hold = n
        break
      }
    }
    const emit = this.pending.slice(0, this.pending.length - hold)
    if (emit) {
      this.onText(emit)
      this.pending = this.pending.slice(emit.length)
    }
  }

  /** Flush leftovers and parse the control JSON (defensive defaults). */
  finish(): ChatControl {
    if (!this.inControl && this.pending) {
      this.onText(this.pending)
      this.pending = ''
    }
    const fallback: ChatControl = { chips: [], multi: false, finished: false }
    const raw = this.control.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    if (!raw) return fallback
    try {
      const parsed = JSON.parse(raw) as Partial<ChatControl>
      return {
        chips: Array.isArray(parsed.chips)
          ? parsed.chips.filter(c => typeof c === 'string').slice(0, 6)
          : [],
        multi: parsed.multi === true,
        finished: parsed.finished === true,
      }
    } catch {
      return fallback
    }
  }
}

/**
 * One concierge turn, streamed. Prose tokens flow through onText as the model
 * generates them; resolves with the parsed control (chips / finished) once the
 * turn completes.
 */
export async function streamChatTurn(
  history: ChatTurnInput[],
  onText: (chunk: string) => void,
): Promise<ChatControl> {
  const messages: Anthropic.MessageParam[] =
    history.length === 0
      ? [{ role: 'user', content: '(The renter just opened the chat. Greet them briefly and ask your first question.)' }]
      : history.map(m => ({ role: m.role, content: m.content }))

  const filter = new ControlLineFilter(onText)
  const stream = getAnthropic().messages.stream({
    model: CHAT_MODEL,
    max_tokens: 700,
    system: CHAT_SYSTEM,
    messages,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      filter.push(event.delta.text)
    }
  }
  return filter.finish()
}

// ── Extraction: transcript → weighted MatchProfile ──────────────────────────

const SAVE_PROFILE_TOOL: Anthropic.Tool = {
  name: 'save_profile',
  description: "Save the renter's weighted housing preference profile extracted from the conversation.",
  input_schema: {
    type: 'object',
    properties: {
      budget: {
        type: 'object',
        properties: {
          min: { type: ['integer', 'null'], description: 'Minimum monthly rent, whole USD. null if unstated.' },
          max: { type: ['integer', 'null'], description: 'Their stated comfortable maximum monthly rent, whole USD.' },
          stretch_max: { type: ['integer', 'null'], description: "The most they'd pay for the RIGHT place, if they said so. Must be ≥ max." },
          stretch_reason: { type: ['string', 'null'], description: 'What would justify the stretch, in their words (short).' },
        },
        required: ['min', 'max', 'stretch_max', 'stretch_reason'],
      },
      timing: {
        type: 'object',
        properties: {
          move_in: { type: ['string', 'null'], description: 'Desired move-in, ISO YYYY-MM-DD. Month/season only → first of that month, next future occurrence.' },
          move_out: { type: ['string', 'null'], description: 'Desired move-out, ISO YYYY-MM-DD, or null.' },
          lease_type: { type: ['string', 'null'], enum: ['sublet', 'full', 'either', null] },
          duration_months: { type: ['integer', 'null'], description: 'Stay length in months if stated instead of a move-out date.' },
          flexibility: { type: 'string', enum: ['rigid', 'some', 'flexible'], description: 'How movable their dates are, from their own words.' },
        },
        required: ['move_in', 'move_out', 'lease_type', 'duration_months', 'flexibility'],
      },
      space: {
        type: 'object',
        properties: {
          whole_unit: { type: ['boolean', 'null'], description: 'true = whole unit; false = a room in a shared place is fine; null unclear.' },
          bedrooms_min: { type: ['integer', 'null'], description: '0 = studio ok.' },
          bathrooms_min: { type: ['number', 'null'] },
          roommates_ok: { type: ['boolean', 'null'] },
          gender_pref: { type: ['string', 'null'], description: 'Only if the renter volunteered a roommate gender preference.' },
        },
        required: ['whole_unit', 'bedrooms_min', 'bathrooms_min', 'roommates_ok', 'gender_pref'],
      },
      location: {
        type: 'object',
        properties: {
          anchors: {
            type: 'array',
            description: 'Places they need to be near, with their stated max commute. Choose the closest matching anchor name.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', enum: [...ANCHOR_NAMES] },
                max_minutes: { type: 'integer', description: 'Their "too far" threshold in minutes.' },
                mode: { type: 'string', enum: ['walk', 'bike', 'bus'] },
              },
              required: ['name', 'max_minutes', 'mode'],
            },
          },
          neighborhoods: {
            type: 'array',
            items: { type: 'string', enum: [...ANN_ARBOR_NEIGHBORHOODS] },
            description: 'Only neighborhoods they named or clearly implied. Empty if they anchored to buildings instead.',
          },
        },
        required: ['anchors', 'neighborhoods'],
      },
      lifestyle: {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' }, description: "Short inferred-and-confirmed lifestyle tags, e.g. 'quiet', 'social', 'tidy', 'early riser', 'hosts guests'." },
          notes: { type: ['string', 'null'], description: 'Anything else worth remembering, short.' },
        },
        required: ['tags', 'notes'],
      },
      amenities: {
        type: 'object',
        properties: {
          required: { type: 'array', items: { type: 'string', enum: [...AMENITIES] }, description: 'HARD requirements only — a listing missing one is disqualified.' },
          preferred: { type: 'array', items: { type: 'string', enum: [...AMENITIES] }, description: 'Nice-to-haves.' },
        },
        required: ['required', 'preferred'],
      },
      furnished: { type: ['boolean', 'null'] },
      pets_required: { type: ['boolean', 'null'], description: 'true only if they have/plan a pet.' },
      priorities: {
        type: 'array',
        items: { type: 'string', enum: [...MATCH_ATTRS] },
        description: 'Their TOP 3 priorities, ranked most-important first, from the ranking they confirmed.',
      },
      dealbreakers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            attr: { type: 'string', enum: [...MATCH_ATTRS] },
            description: { type: 'string', description: "The dealbreaker in the renter's words, short." },
          },
          required: ['attr', 'description'],
        },
        description: 'Explicit dealbreakers only — things they said would disqualify a place.',
      },
      weights: {
        type: 'object',
        description: 'Importance weight 0–1 for every attribute they engaged with. Top priority ≈ 0.9–1.0, mentioned-but-flexible ≈ 0.3–0.5, unmentioned = omit.',
        properties: Object.fromEntries(
          MATCH_ATTRS.map(a => [a, { type: 'number', minimum: 0, maximum: 1 }]),
        ),
      },
      summary: { type: 'string', description: 'The crisp reflected summary the renter confirmed, 2–4 sentences, second person ("You\'re looking for…").' },
    },
    required: ['budget', 'timing', 'space', 'location', 'lifestyle', 'amenities', 'furnished', 'pets_required', 'priorities', 'dealbreakers', 'weights', 'summary'],
  },
}

const EXTRACT_SYSTEM = `You convert a finished Wroomly housing-concierge chat into a weighted preference profile by calling save_profile.

Rules:
- Capture what the renter actually expressed — including the WHY, flexibility, and stretch — not just the raw filters.
- Weights reflect how much each attribute matters to THIS renter, judged from emphasis, repetition, and their confirmed priority ranking. Omit attributes they never engaged with.
- Dealbreakers are only things they stated as disqualifying. A preference is not a dealbreaker.
- For anchors and enums, map their words to the closest allowed value; if nothing fits, leave it out (never invent).
- Money is whole USD/month. Dates are ISO YYYY-MM-DD; month/season-only becomes the first of that month at its next future occurrence relative to ${new Date().toISOString().slice(0, 10)}.`

/**
 * Parse a finished conversation into a normalized weighted MatchProfile.
 * Forced tool use + the zod normalizer means the result is always valid.
 */
export async function extractProfile(
  history: ChatTurnInput[],
): Promise<MatchProfile> {
  const transcript = history
    .map(m => `${m.role === 'user' ? 'Renter' : 'Concierge'}: ${m.content}`)
    .join('\n')

  const resp = await getAnthropic().messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 1500,
    system: EXTRACT_SYSTEM,
    tools: [SAVE_PROFILE_TOOL],
    tool_choice: { type: 'tool', name: 'save_profile' },
    messages: [{ role: 'user', content: `Here is the conversation:\n\n${transcript}` }],
  })

  const block = resp.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return normalizeProfile({})
  return normalizeProfile(block.input)
}

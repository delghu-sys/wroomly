import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { AMENITIES, ANN_ARBOR_NEIGHBORHOODS } from '@/lib/constants'
import { normalizeCriteria } from '@/lib/match/criteria'
import type { MatchCriteria } from '@/types/database'

/**
 * Wroomly Match — LLM layer.
 *
 * Two jobs:
 *   1. CHAT — drive a short, adaptive interview that fills a housing-preference
 *      profile. Fast model (Haiku), one structured `respond` tool call per turn.
 *   2. EXTRACT — at the end, parse the whole transcript into a strict
 *      MatchCriteria object. Accuracy model (Sonnet), one `save_criteria` call.
 *
 * Lazy client init mirrors listing-reviewer.ts so a missing key surfaces at call
 * time, never at module load.
 */

const CHAT_MODEL = 'claude-haiku-4-5'
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

export interface AssistantTurn {
  message: string
  chips: string[]
  multi: boolean
  finished: boolean
}

const CHAT_SYSTEM = `You are Wroomly Match — a warm, efficient housing assistant for Wroomly, a student-housing marketplace in Ann Arbor (University of Michigan area).

GOAL: through a short, friendly chat (aim for 5–8 questions, about 60 seconds total), learn exactly what kind of place the renter wants, so we can email them when a matching listing is posted.

You are filling this preference profile:
- budget (monthly rent range, USD)
- bedrooms (and whether they want a whole unit or just a room in a shared unit)
- bathrooms (only if it comes up naturally — usually skip)
- move-in / dates, and whether it's a summer/short sublet or a full-year lease
- preferred neighborhoods or proximity to campus
- furnished or not
- must-have amenities (parking, in-unit laundry, A/C, pet-friendly, dishwasher, gym, etc.)
- roommate / living-situation preferences ONLY if the renter raises them

RULES:
- Ask ONE question at a time. Keep each message to 1–2 short sentences, casual and human.
- Be ADAPTIVE. Use earlier answers to decide what to ask next and what to skip. Examples: if they say "summer sublet," ask the exact months; if they already said "I'll have roommates," don't ask roommate count again; if budget is clearly stated, don't re-ask.
- Offer 3–6 short, tappable "chips" for quick answers whenever the question has common options (price bands, bed counts, "near central campus / downtown / med campus", "furnished", "summer sublet / full year", amenity lists). Use multi=true for questions where several answers apply (e.g. amenities), false otherwise. Leave chips empty when free text is clearly better.
- Never ask for personal contact info, name, or email — that's collected later on a separate screen.
- Do not ask about race, religion, national origin, disability, family status, or any protected class. A renter may volunteer a roommate gender preference; if so, just acknowledge it briefly and move on.
- When you have enough to build a useful profile (don't be greedy — 5–8 questions is plenty), set finished=true and make your message a short, friendly wrap-up like "Perfect — I've got what I need!". Do not ask another question in the same turn you finish.

Always reply by calling the "respond" tool. Never write outside the tool.`

const RESPOND_TOOL: Anthropic.Tool = {
  name: 'respond',
  description: 'Send the next chat message to the renter (a question, or a closing wrap-up).',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Your short, friendly message to show the renter.',
      },
      chips: {
        type: 'array',
        items: { type: 'string' },
        description: '0–6 short tappable quick-reply suggestions for THIS question. Empty when free text is better.',
      },
      multi: {
        type: 'boolean',
        description: 'true if several chips can be selected at once (e.g. amenities); false for a single choice.',
      },
      finished: {
        type: 'boolean',
        description: 'true once you have enough to build the profile and are sending a closing wrap-up instead of another question.',
      },
    },
    required: ['message', 'chips', 'multi', 'finished'],
  },
}

/**
 * One adaptive chat turn. Given the running transcript, returns the assistant's
 * next message + suggested chips + whether the interview is complete. Uses
 * forced tool use so the output is always structured and reliable.
 */
export async function nextChatTurn(
  history: ChatTurnInput[],
): Promise<AssistantTurn> {
  // First turn (empty history): seed with a user "start" so the model opens.
  const messages: Anthropic.MessageParam[] =
    history.length === 0
      ? [{ role: 'user', content: '(The renter just opened the chat. Greet them and ask your first question.)' }]
      : history.map(m => ({ role: m.role, content: m.content }))

  const resp = await getAnthropic().messages.create({
    model: CHAT_MODEL,
    max_tokens: 400,
    system: CHAT_SYSTEM,
    tools: [RESPOND_TOOL],
    tool_choice: { type: 'tool', name: 'respond' },
    messages,
  })

  const block = resp.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    // Defensive fallback — shouldn't happen with forced tool use.
    return {
      message: "Sorry, I lost my train of thought — could you say that again?",
      chips: [],
      multi: false,
      finished: false,
    }
  }

  const input = block.input as Partial<AssistantTurn>
  return {
    message: typeof input.message === 'string' && input.message.trim()
      ? input.message.trim()
      : 'Got it!',
    chips: Array.isArray(input.chips) ? input.chips.filter(c => typeof c === 'string').slice(0, 6) : [],
    multi: input.multi === true,
    finished: input.finished === true,
  }
}

const SAVE_CRITERIA_TOOL: Anthropic.Tool = {
  name: 'save_criteria',
  description: 'Save the renter\'s structured housing preferences extracted from the conversation.',
  input_schema: {
    type: 'object',
    properties: {
      budget_min: { type: ['integer', 'null'], description: 'Minimum monthly rent in whole USD dollars, or null.' },
      budget_max: { type: ['integer', 'null'], description: 'Maximum monthly rent in whole USD dollars, or null.' },
      bedrooms_min: { type: ['integer', 'null'], description: 'Minimum bedrooms. 0 = studio. null if unspecified.' },
      whole_unit: { type: ['boolean', 'null'], description: 'true = wants the whole unit; false = ok with a room in a shared unit; null if unclear.' },
      bathrooms_min: { type: ['number', 'null'], description: 'Minimum bathrooms, or null.' },
      lease_type: { type: ['string', 'null'], enum: ['sublet', 'full', 'either', null], description: 'sublet = short/summer; full = full-year lease; either; or null.' },
      date_start: { type: ['string', 'null'], description: 'Desired move-in date, ISO YYYY-MM-DD. Infer the year (assume the next occurrence). null if unknown.' },
      date_end: { type: ['string', 'null'], description: 'Desired move-out date for sublets, ISO YYYY-MM-DD, or null.' },
      neighborhoods: { type: 'array', items: { type: 'string', enum: [...ANN_ARBOR_NEIGHBORHOODS] }, description: 'Preferred neighborhoods, only from the allowed list. Empty if no preference.' },
      furnished: { type: ['boolean', 'null'], description: 'true if furnished is required, false if explicitly not needed, null if unspecified.' },
      amenities: { type: 'array', items: { type: 'string', enum: [...AMENITIES] }, description: 'Required amenities, only from the allowed list. Empty if none.' },
      pets_required: { type: ['boolean', 'null'], description: 'true if they need pet-friendly, else null.' },
      roommate_pref: { type: ['string', 'null'], description: 'Short free-text note if they mentioned roommate/living preferences, else null.' },
      notes: { type: ['string', 'null'], description: 'Any other short preference worth remembering, else null.' },
    },
    required: ['budget_min', 'budget_max', 'bedrooms_min', 'whole_unit', 'bathrooms_min', 'lease_type', 'date_start', 'date_end', 'neighborhoods', 'furnished', 'amenities', 'pets_required', 'roommate_pref', 'notes'],
  },
}

const EXTRACT_SYSTEM = `You convert a Wroomly Match housing chat into a strict structured profile by calling save_criteria.

Rules:
- Only use values supported by the schema. For neighborhoods and amenities, map the renter's words to the closest allowed enum value; if there's no good match, omit it (don't invent).
- Money is whole USD dollars per month.
- Dates: output ISO YYYY-MM-DD. If only a month/season was given, pick a sensible first-of-month date and assume the next future occurrence relative to ${new Date().toISOString().slice(0, 10)}.
- Leave a field null / empty when the renter didn't express a preference. Do not guess preferences they never stated.`

/**
 * Parse a finished conversation into a normalized MatchCriteria. Forced tool use
 * + our zod normalizer means the result is always a valid criteria object.
 */
export async function extractCriteria(
  history: ChatTurnInput[],
): Promise<MatchCriteria> {
  const transcript = history
    .map(m => `${m.role === 'user' ? 'Renter' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const resp = await getAnthropic().messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 700,
    system: EXTRACT_SYSTEM,
    tools: [SAVE_CRITERIA_TOOL],
    tool_choice: { type: 'tool', name: 'save_criteria' },
    messages: [{ role: 'user', content: `Here is the conversation:\n\n${transcript}` }],
  })

  const block = resp.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return normalizeCriteria({})
  return normalizeCriteria(block.input)
}

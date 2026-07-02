import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { MatchProfile, MatchReason } from '@/types/database'

/**
 * Wroomly Match v2 — personal email copy.
 *
 * One LLM call per email (single match or ranked digest) writes the subject
 * line and a short personal note per listing: why THIS place fits the renter's
 * stated priorities, one honest caveat, and a timing nudge. Grounded strictly
 * in the engine's machine-readable fit/miss reasons — the model phrases, it
 * does not invent.
 *
 * Never blocks a send: any failure falls back to deterministic copy built from
 * the same reasons.
 */

const NOTES_MODEL = 'claude-sonnet-4-6'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

export interface NoteListingInput {
  id: string
  title: string
  price_per_month: number | null // cents
  neighborhood: string | null
  bedrooms: number | null
  available_from: string
  available_to: string
  score: number
  fits: MatchReason[]
  misses: MatchReason[]
}

export interface MatchNotes {
  subject: string
  notes: Map<string, string> // listing id → note
}

const NOTES_TOOL: Anthropic.Tool = {
  name: 'write_notes',
  description: 'Write the match email subject and one personal note per listing.',
  input_schema: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description:
          'Email subject naming the lead match concretely (e.g. "A furnished 2-bed 8 min from the Diag — 87% match"). Never generic, never "a new listing matched". Under 80 chars, no emoji.',
      },
      notes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            listing_id: { type: 'string' },
            note: {
              type: 'string',
              description:
                "60–110 words, warm and direct, second person. Structure: why this place fits THEIR stated priorities (use the fit reasons); how it stacks against their ideal; exactly ONE honest caveat drawn from the miss reasons (or a real limitation like few photos — if there are no misses, note what to verify in person); end with a short timing nudge. No greetings, no sign-offs, no bullet lists, no emoji.",
            },
          },
          required: ['listing_id', 'note'],
        },
      },
    },
    required: ['subject', 'notes'],
  },
}

const NOTES_SYSTEM = `You write the match notes for Wroomly Match, a housing-alert service for University of Michigan students in Ann Arbor. A renter told our concierge what they want; our engine scored new listings against their weighted profile. You turn that scoring into short, personal, honest notes.

Rules:
- Ground every claim in the provided fit/miss reasons and listing facts. Never invent amenities, distances, or qualities.
- Speak to their stated priorities by name ("you said walkability mattered most").
- Exactly one honest caveat per note — renters trust us because we tell them what's off, not just what's on.
- Good Ann Arbor places move in days, sometimes hours; the timing nudge should be real, not breathless.
- Plain warm prose. No hype words ("stunning", "dream"), no emoji, no exclamation marks.`

function fmtListing(l: NoteListingInput): string {
  const price = l.price_per_month != null ? `$${Math.round(l.price_per_month / 100)}/mo` : 'no price'
  return [
    `listing_id: ${l.id}`,
    `title: ${l.title}`,
    `facts: ${price}, ${l.bedrooms === 0 ? 'studio' : `${l.bedrooms ?? '?'} bed`}, ${l.neighborhood ?? 'neighborhood n/a'}, available ${l.available_from} to ${l.available_to}`,
    `match score: ${l.score}/100`,
    `fits: ${l.fits.map(f => f.detail).join('; ') || '(none)'}`,
    `misses: ${l.misses.map(m => m.detail).join('; ') || '(none)'}`,
  ].join('\n')
}

/** Deterministic fallback copy when the LLM is unavailable. */
export function fallbackNotes(
  listings: NoteListingInput[],
): MatchNotes {
  const lead = listings[0]
  const subject =
    listings.length === 1
      ? `${lead.title} — ${lead.score}% match on Wroomly`
      : `Your top ${listings.length} matches this week on Wroomly`
  const notes = new Map<string, string>()
  for (const l of listings) {
    const why = l.fits.slice(0, 3).map(f => f.detail).join(' · ')
    const caveat = l.misses[0]?.detail
    notes.set(
      l.id,
      `This one scores ${l.score}/100 against your profile${why ? ` — ${why}` : ''}.` +
        (caveat ? ` One caveat: ${caveat}.` : '') +
        ' Places like this tend to go quickly, so it is worth a look soon.',
    )
  }
  return { subject, notes }
}

/**
 * Write the subject + per-listing personal notes for one email (1–3 listings,
 * ranked best-first). Falls back to deterministic copy on any failure.
 */
export async function writeMatchNotes(
  profile: MatchProfile,
  listings: NoteListingInput[],
): Promise<MatchNotes> {
  if (listings.length === 0) return { subject: '', notes: new Map() }
  try {
    const profileBrief = [
      profile.summary ? `Their confirmed profile: ${profile.summary}` : null,
      profile.priorities.length > 0
        ? `Their ranked priorities: ${profile.priorities.join(' > ')}`
        : null,
      profile.budget.stretch_reason
        ? `They'd stretch their budget for: ${profile.budget.stretch_reason}`
        : null,
      profile.lifestyle.tags.length > 0
        ? `Lifestyle: ${profile.lifestyle.tags.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    const resp = await getAnthropic().messages.create({
      model: NOTES_MODEL,
      max_tokens: 1200,
      system: NOTES_SYSTEM,
      tools: [NOTES_TOOL],
      tool_choice: { type: 'tool', name: 'write_notes' },
      messages: [
        {
          role: 'user',
          content: `${profileBrief}\n\nListings (ranked best-first — the first is the lead for the subject):\n\n${listings.map(fmtListing).join('\n\n')}`,
        },
      ],
    })

    const block = resp.content.find(b => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') return fallbackNotes(listings)
    const input = block.input as {
      subject?: string
      notes?: { listing_id?: string; note?: string }[]
    }

    const notes = new Map<string, string>()
    for (const n of input.notes ?? []) {
      if (typeof n.listing_id === 'string' && typeof n.note === 'string' && n.note.trim()) {
        notes.set(n.listing_id, n.note.trim())
      }
    }
    // Every listing must have a note; patch gaps from the fallback.
    const fb = fallbackNotes(listings)
    for (const l of listings) {
      if (!notes.has(l.id)) notes.set(l.id, fb.notes.get(l.id)!)
    }
    const subject =
      typeof input.subject === 'string' && input.subject.trim()
        ? input.subject.trim().slice(0, 120)
        : fb.subject

    return { subject, notes }
  } catch (err) {
    console.error('[match/notes] LLM notes failed, using fallback', err)
    return fallbackNotes(listings)
  }
}

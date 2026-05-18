import Anthropic from '@anthropic-ai/sdk'
import type { Listing, ListingAmenity, SwapPreference } from '@/types/database'

// Lazy-init: the SDK constructor throws "Neither apiKey nor authenticator
// provided" when ANTHROPIC_API_KEY is missing. Instantiating at module
// scope means *any* code path that transitively loads this file (including
// client bundles via tree-shaking misses) would crash at module evaluation
// when the env var is absent. Construct on first use, scoped to the
// `reviewListing` server function below.
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — listing auto-review unavailable')
  }
  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

export type ReviewDecision = 'approve' | 'reject' | 'manual'

export interface ReviewResult {
  decision: ReviewDecision
  reason: string
  flags: string[]
}

export interface ListingForReview
  extends Pick<
    Listing,
    | 'title'
    | 'description'
    | 'neighborhood'
    | 'address'
    | 'city'
    | 'state'
    | 'type'
    | 'price_per_month'
    | 'deposit_amount'
    | 'available_from'
    | 'available_to'
    | 'bedrooms'
    | 'bathrooms'
    | 'sq_ft'
    | 'furnished'
    | 'pets_allowed'
    | 'utilities_included'
  > {
  amenities: Pick<ListingAmenity, 'amenity'>[]
  swap_preferences: SwapPreference | null
  image_urls: string[]
}

const SYSTEM_PROMPT = `You are the listing moderator for Wroomly, a student housing marketplace serving University of Michigan students in Ann Arbor.

Your job: decide whether a newly submitted listing should be APPROVED, REJECTED, or held for MANUAL human review.

APPROVE when:
- Title and description are coherent, on-topic (housing in/near Ann Arbor), and free of spam, profanity, or scams
- Photos (if provided) look like a real apartment/house — bedrooms, kitchens, living areas, exterior shots, floor plans
- No obvious red flags: no contact info pushing users off-platform, no discriminatory language, no impossibly low prices, no requests for upfront wire transfers

REJECT when:
- Description is gibberish, spam, or empty/placeholder
- Photos are clearly unrelated (memes, screenshots of other listings, NSFW, watermarks from other sites)
- Discriminatory language (e.g. excluding people based on race, religion, national origin, sex, family status, disability)
- Scammy patterns: "wire money to hold", asks for SSN/bank info up front, contact info that pushes off the platform (random WhatsApp/Telegram pushed in description), suspiciously low prices for the area (< $300/mo in Ann Arbor)
- Clearly not a real Ann Arbor housing offer

MANUAL when:
- Borderline cases: confusing but not clearly bad, very short description, photos are sparse but acceptable, unusual pricing that could be legit, anything you're not confident about

Be reasonable. Most legitimate student listings should pass quickly. Only reject when you're confident the listing is bad-faith or unsafe. When unsure, choose MANUAL.

Output ONLY a JSON object with this exact shape:
{
  "decision": "approve" | "reject" | "manual",
  "reason": "one or two short sentences explaining the decision, written to the supplier",
  "flags": ["short_tag", ...]  // empty array if none. Use snake_case tags like "missing_description", "blurry_photos", "off_platform_contact", "discriminatory_language", "unrealistic_price", "spam".
}

Do not include any text outside the JSON.`

function buildUserMessage(l: ListingForReview): string {
  const lines: string[] = []
  lines.push(`Type: ${l.type}`)
  lines.push(`Title: ${l.title}`)
  lines.push(`Description: ${l.description ?? '(none)'}`)
  lines.push(`Neighborhood: ${l.neighborhood ?? '(unspecified)'}, ${l.city}, ${l.state}`)
  lines.push(`Address: ${l.address ?? '(hidden)'}`)
  lines.push(
    `Bedrooms: ${l.bedrooms ?? '?'}, Bathrooms: ${l.bathrooms ?? '?'}, sq ft: ${l.sq_ft ?? '?'}`
  )
  if (l.type === 'sublet') {
    const price = l.price_per_month ? `$${(l.price_per_month / 100).toFixed(0)}/mo` : '(no price)'
    const deposit = l.deposit_amount ? `$${(l.deposit_amount / 100).toFixed(0)}` : '(none)'
    lines.push(`Price: ${price}, Deposit: ${deposit}`)
  } else if (l.swap_preferences) {
    lines.push(
      `Swap with cities: ${l.swap_preferences.preferred_cities?.join(', ') ?? '(any)'}`
    )
    if (l.swap_preferences.notes) lines.push(`Swap notes: ${l.swap_preferences.notes}`)
  }
  lines.push(`Available: ${l.available_from} to ${l.available_to}`)
  lines.push(
    `Furnished: ${l.furnished}, Pets: ${l.pets_allowed}, Utilities included: ${l.utilities_included}`
  )
  if (l.amenities.length > 0) {
    lines.push(`Amenities: ${l.amenities.map(a => a.amenity).join(', ')}`)
  }
  lines.push(`Number of photos: ${l.image_urls.length}`)
  return lines.join('\n')
}

export async function reviewListing(listing: ListingForReview): Promise<ReviewResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      decision: 'manual',
      reason: 'Auto-reviewer not configured (missing ANTHROPIC_API_KEY).',
      flags: ['auto_review_unconfigured'],
    }
  }

  const textBlock = { type: 'text' as const, text: buildUserMessage(listing) }

  // Include up to 4 images so the model can verify they look like real housing
  const imageBlocks = listing.image_urls.slice(0, 4).map(url => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }))

  const response = await getAnthropic().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [...imageBlocks, textBlock],
      },
    ],
  })

  const textOut = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  // Strip code fences if the model wrapped output despite instructions
  const jsonStr = textOut
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return {
      decision: 'manual',
      reason: 'Auto-reviewer returned unparseable output; held for human review.',
      flags: ['parse_error'],
    }
  }

  const p = parsed as Partial<ReviewResult>
  const decision: ReviewDecision =
    p.decision === 'approve' || p.decision === 'reject' || p.decision === 'manual'
      ? p.decision
      : 'manual'

  return {
    decision,
    reason: typeof p.reason === 'string' ? p.reason.slice(0, 1000) : '',
    flags: Array.isArray(p.flags) ? p.flags.filter(f => typeof f === 'string').slice(0, 10) : [],
  }
}

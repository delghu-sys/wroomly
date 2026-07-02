/**
 * The concierge's opening turn is deterministic — the same greeting and the same
 * first question every time — so there's no reason to pay a model round-trip for
 * it. The chat renders this instantly on open (no /api/match/chat call for turn
 * zero), which is what a renter sees the moment they hit "Start chatting".
 *
 * It's sent back as the first assistant message in the transcript on the next
 * turn, so the model has its own greeting as context (see streamChatTurn, which
 * prepends a synthetic user opener to keep the API's user-first rule satisfied).
 *
 * Keep this in the concierge's voice and consistent with CONCIERGE_PROMPT in
 * lib/match/llm.ts — it stands in for the model's first turn.
 */
export const GREETING_TEXT =
  "Hey, welcome to Wroomly! I'm here to help you find a place near U of M that actually fits your life — not just a random listing.\n\nLet's start simple: what's bringing you to Ann Arbor, and when are you hoping to move in?"

export const GREETING_CHIPS = [
  'Fall semester',
  'Winter term',
  'Spring/summer sublet',
  'Just exploring',
]

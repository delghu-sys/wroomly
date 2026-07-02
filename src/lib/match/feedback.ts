import type {
  MatchFeedback,
  MatchProfile,
  MatchReason,
} from '@/types/database'

/**
 * Wroomly Match v2 — feedback learning.
 *
 * Pure and dependency-free (type imports only) so it runs under `node --test`.
 *
 * Each emailed listing carries 👍/👎 buttons. A reaction nudges the profile's
 * attribute weights multiplicatively, grounded in that listing's recorded
 * fit/miss reasons:
 *
 *   👎 on a listing that scored well on some attribute → that attribute is a
 *      weaker predictor of what they want than we thought (decay it), while
 *      the attributes it MISSED on are plausibly why they rejected it
 *      (reinforce them).
 *   👍 is the mirror image: reinforce what it delivered, soften what it
 *      lacked (they liked it anyway).
 *
 * Nudges are small (±5–7%) and clamped, so profiles sharpen over a handful of
 * reactions without whiplash. Repeated 👎 on stretch-priced listings also
 * walks stretch_max back toward the stated max — "I keep saying no to
 * over-budget places" is a budget signal, not an attribute signal.
 */

const DOWN_FIT_DECAY = 0.93
const DOWN_MISS_BOOST = 1.07
const UP_FIT_BOOST = 1.05
const UP_MISS_DECAY = 0.95

const WEIGHT_MIN = 0.05
const WEIGHT_MAX = 1

function clamp(w: number): number {
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, w))
}

/** Detail marker the engine puts on stretch-band budget fits. */
function isStretchBudgetReason(r: MatchReason): boolean {
  return r.attr === 'budget' && /stretch/i.test(r.detail)
}

/**
 * Apply one thumbs reaction to a profile. Returns a NEW profile — the caller
 * persists it. `reasons` are the fit/miss reasons recorded on the send row.
 */
export function applyFeedbackNudge(
  profile: MatchProfile,
  reasons: MatchReason[],
  feedback: MatchFeedback,
): MatchProfile {
  const next: MatchProfile = structuredClone(profile)

  for (const r of reasons) {
    const current = next.weights[r.attr]
    if (current == null) continue // never resurrect an attribute they don't use
    const factor =
      feedback === 'down'
        ? r.kind === 'fit'
          ? DOWN_FIT_DECAY
          : DOWN_MISS_BOOST
        : r.kind === 'fit'
          ? UP_FIT_BOOST
          : UP_MISS_DECAY
    next.weights[r.attr] = clamp(current * factor)
  }

  // 👎 on a stretch-priced listing: halve the stretch band toward max, and
  // drop it entirely once it's within $25 — they've told us the budget is
  // realer than the chat suggested.
  if (
    feedback === 'down' &&
    reasons.some(isStretchBudgetReason) &&
    next.budget.max != null &&
    next.budget.stretch_max != null
  ) {
    const tightened = Math.round(
      next.budget.max + (next.budget.stretch_max - next.budget.max) / 2,
    )
    next.budget.stretch_max =
      tightened - next.budget.max <= 25 ? null : tightened
  }

  return next
}

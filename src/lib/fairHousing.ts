/**
 * Fair-housing guardrail for listing copy.
 *
 * Matches phrases that commonly signal a preference based on a protected
 * characteristic (federal Fair Housing Act; Michigan's Elliott-Larsen act and
 * Ann Arbor's ordinance add more classes, including source of income).
 *
 * This WARNS, it does not block: several words here are legitimate in a
 * property description ("accessible unit", "near the Catholic church") and a
 * hard block just gets worked around. Every match is logged to
 * fair_housing_flags so this list can be tuned from real data — that is the
 * whole reason it lives in its own file.
 *
 * NEVER turn this list into structured form fields, dropdowns, or filters.
 * Free-text-only is what preserves Section 230 immunity (Fair Housing Council
 * v. Roommates.com, 9th Cir. 2008): the site lost immunity for its dropdowns
 * and kept it for its free-text box.
 */

export interface FairHousingMatch {
  phrase: string
}

// Case-insensitive, matched on word boundaries.
const FLAG_PHRASES: string[] = [
  // Familial status / age
  'no kids', 'no children', 'no families', 'not suitable for children',
  'adults only', 'young professional', 'students only', 'no students',
  'perfect for singles', 'empty nesters',
  // Sex / gender / orientation
  'female only', 'females only', 'male only', 'males only', 'girls only',
  'guys only', 'no men', 'no women', 'straight only', 'must be female',
  'must be male', 'prefer a girl', 'prefer a guy',
  // Religion (preference contexts)
  'christian only', 'christians only', 'muslim only', 'jewish only',
  'catholic only', 'god-fearing', 'no religion',
  // Race / national origin / language
  'english speakers', 'english only', 'american only', 'no international',
  'must speak english', 'caucasian', 'whites only', 'no immigrants',
  // Disability
  'must be able-bodied', 'able-bodied', 'no disabilities', 'no wheelchairs',
  // Source of income (Michigan / Ann Arbor protected class)
  'no section 8', 'no vouchers', 'no housing assistance', 'employed only',
  'must have a job', 'no unemployed',
  // Marital status
  'married couples only', 'no couples', 'singles only', 'no single mothers',
  // Coded language
  'clean-cut', 'traditional family', 'our kind of people', 'no drama',
]

const PATTERNS = FLAG_PHRASES.map(p => ({
  phrase: p,
  // \b on both ends; the phrase itself is escaped and its spaces made flexible.
  rx: new RegExp(
    `\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}\\b`,
    'i',
  ),
}))

/** First matching phrase in the text, or null. */
export function checkFairHousing(text: string): FairHousingMatch | null {
  if (!text) return null
  for (const { phrase, rx } of PATTERNS) {
    if (rx.test(text)) return { phrase }
  }
  return null
}

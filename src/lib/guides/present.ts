/**
 * Presentation rules for the guides: pure, so they are unit-tested rather than
 * eyeballed across twenty-eight articles.
 */

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'with', 'vs', 'if', 'you', 'your', 'is', 'it', 'by', 'from', 'as', 'that', 'this'])

/**
 * Split a headline so its last word or two can be set in the brand's italic
 * gold, as on the home and About pages. Two words when the second-to-last is a
 * real word ("getting burned"), one when it is a connector ("of Michigan" →
 * "Michigan"). A one or two word title is accented whole-last-word only.
 */
export function splitAccent(title: string): { lead: string; accent: string } {
  const words = title.trim().split(/\s+/)
  if (words.length < 3) return { lead: '', accent: title.trim() }
  let take = 1
  const prev = words[words.length - 2].toLowerCase().replace(/[^a-z']/g, '')
  if (words.length >= 5 && prev && !STOP.has(prev)) take = 2
  return { lead: words.slice(0, words.length - take).join(' '), accent: words.slice(words.length - take).join(' ') }
}

export type GuideTopic = 'Safety and money' | 'Roommates and leases' | 'Timing' | 'Where to live' | 'Subletting'

export const TOPICS: GuideTopic[] = ['Subletting', 'Safety and money', 'Roommates and leases', 'Timing', 'Where to live']

const RULES: [RegExp, GuideTopic][] = [
  [/scam|safe|pay|deposit|fraud|wire|refund|rent-prices|cost|price/, 'Safety and money'],
  [/roommate|lease|split|agreement|joint|individual/, 'Roommates and leases'],
  [/summer|winter|fall|spring|timeline|abroad|semester|when|january|calendar|move/, 'Timing'],
  [/neighborhood|where|near|campus|car|building|area|north|central|kerrytown|south/, 'Where to live'],
]

/** One topic per guide, from its slug. First match wins; the default is the
 *  core subject of the whole site. */
export function topicOf(slug: string): GuideTopic {
  for (const [rx, topic] of RULES) if (rx.test(slug)) return topic
  return 'Subletting'
}

/** URL-safe, unique anchor ids for a list of headings, in order. */
export function sectionIds(headings: string[]): string[] {
  const seen = new Map<string, number>()
  return headings.map((h, i) => {
    const base = h.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || `section-${i + 1}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  })
}

export function formatUpdated(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

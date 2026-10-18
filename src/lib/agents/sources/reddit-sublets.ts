import type { FetchContext, RawLead, SourceAdapter } from '../source-adapter.ts'
import { htmlToText } from '../prefill.ts'

/**
 * Source: sublet OFFERS posted on r/uofm and r/AnnArbor.
 *
 * WHAT THIS YIELDS, AND WHAT IT DOES NOT. A Reddit post never carries an
 * email address (people write "DM me"), so these leads have NO contact email:
 * the draft and outreach agents skip them automatically, and nobody is ever
 * emailed from this source. What the lead does carry is the poster's Reddit
 * handle and the post link, so a human can send one Reddit message by hand.
 * The point is the listing itself — knowing it exists, when, for how much.
 *
 * WHY IT IS IN SCOPE. A public "[Sublease] 1B/1B at Beekman, DM me" post is
 * an invitation to be contacted about that sublet, which is the only kind of
 * source this pipeline reads. The subreddit is mostly people LOOKING for a
 * place; those are not leads, and `classifyPost` keeps them out — but they
 * are still recorded as skipped, so the feed is not re-read for them.
 *
 * HOW IT IS POLITE. Reddit publishes Atom feeds for any search, and asks for
 * a descriptive User-Agent and few requests: this adapter makes at most one
 * request per subreddit per run, paused between them. Reddit rate-limits
 * anonymous feeds hard (HTTP 429 after a couple of quick requests), so a run
 * that hits the limit says so instead of silently finding nothing.
 */

export const SUBREDDITS = ['uofm', 'AnnArbor'] as const
const UA = 'wroomly-discovery/1.0 (+https://wroomly.app)'
const PAUSE_MS = 4000

export function feedUrl(subreddit: string): string {
  const q = encodeURIComponent('sublet OR sublease OR "lease takeover"')
  return `https://www.reddit.com/r/${subreddit}/search.rss?q=${q}&restrict_sr=1&sort=new&limit=100`
}

export interface RedditPost {
  /** Reddit's own id, e.g. "t3_1x1qt70" — stable, so discovery is idempotent. */
  id: string
  title: string
  url: string
  /** Handle without the "u/" prefix. */
  author: string
  postedAt: string
  /** The self-text as plain text (null for a link/photo-only post). */
  body: string | null
  subreddit: string
}

const xmlUnescape = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]

/** Pure: Atom feed → posts. Exported so it is testable against a fixture. */
export function parseRedditFeed(xml: string, subreddit: string): RedditPost[] {
  const posts: RedditPost[] = []
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = tag(entry, 'id')?.trim()
    const title = tag(entry, 'title')
    const url = entry.match(/<link[^>]*href="([^"]+)"/)?.[1]
    const author = tag(entry, 'name')?.trim().replace(/^\/?u\//, '')
    const postedAt = tag(entry, 'published') ?? tag(entry, 'updated')
    if (!id || !title || !url || !author || !postedAt) continue

    // The content is HTML, XML-escaped once. The self-text sits between the
    // SC_OFF/SC_ON markers; outside them is Reddit's "submitted by … [link]
    // [comments]" boilerplate, which is not the poster's words.
    const html = xmlUnescape(tag(entry, 'content') ?? '')
    const self = html.match(/<!-- SC_OFF -->([\s\S]*?)<!-- SC_ON -->/)?.[1] ?? null
    posts.push({
      id,
      title: xmlUnescape(title).trim(),
      url: xmlUnescape(url),
      author,
      postedAt: postedAt.trim(),
      body: self ? htmlToText(self) : null,
      subreddit,
    })
  }
  return posts
}

// ── is this an offer? ───────────────────────────────────────────────────────
//
// Precision over recall, on purpose. A real offer on r/uofm is rare (about one
// a month); a "looking for a sublet" post is the norm. Every lead this lets
// through is one a person will act on by hand, so a missed offer costs less
// than a dozen false ones.

const ABOUT_SUBLET = /\b(sub-?let|sub-?leas|lease\s*take-?over|take-?over|re-?let)/i

/** A title that is not about housing at all ("towing on mary st") can still
 *  mention a sublease in passing. It is not a listing. */
const TITLE_HOUSING = /\b(sub-?let|sub-?leas|lease|take-?over|room|bed|apartment|apt|studio|house|housing|rent|place|unit)/i

// Someone LOOKING for a place, judged on the title. "Looking for someone to
// take over my lease" is an offer, hence the exception after "looking for".
const REQUEST_TITLE =
  /\b(looking for (?!(?:a |an |some )?(?:someone|somebody|people|sub-?leasers?|sub-?letters?|sub-?tenants?|tenants?|roommates?|a roommate)\b)|lf|iso|in search of|seeking|wanted|need(?:ed|ing)?|anyone (?:have|know|selling|renting|subletting|got)|where (?:to|can|do|should)|how (?:to|do|does|should|can)|advice|recommend|question|tips|help|megathread)\b|\?\s*$/i

// First-person signs of a place being OFFERED. Each one is something a person
// with a sublet to hand off writes, and a person searching for one does not.
const OFFER_SIGNALS = [
  /\bsub-?(?:let|leas)(?:ting|ing|e)?\s+(?:my|our)\b/i,
  /\bsub-?(?:let|leas)(?:ting|ing)\s+(?:a|an|one|two|the|private)\s+(?:private\s+|furnished\s+)?(?:room|bed(?:room)?|apartment|apt|unit|studio|place|house)\b(?!\s+from\b)/i,
  /\b(?:take|taking)\s+over\s+(?:my|our)\b/i,
  // "someone to take over MY lease" — without the my/our, "hard to find
  // someone to sublease to" is a complaint, not an offer.
  /\b(?:someone|somebody|anyone|people|sub-?leasers?|sub-?letters?|sub-?tenants?|tenants?|roommates?|a (?:male|female|person|student|grad|girl|guy))\s+to\s+(?:take\s+over|sub-?let|sub-?lease|lease\s+take-?over|rent|move into?)(?:\/[a-z -]+?)?\s+(?:my|our)\b/i,
  /\b(?:room|bed(?:room)?|apartment|apt|unit|studio|place|house|sub-?lease|sub-?let)\s+(?:is\s+|would be\s+|will be\s+)?available\b/i,
  /\bavailable\s+(?:for\s+)?(?:sub-?let|sub-?lease|rent|take-?over)\b/i,
  /\boffering\s+(?:a\s+|my\s+)?(?:sub-?let|sub-?lease|room)/i,
  /\bfor\s+sub-?(?:let|lease)\b/i,
  // "Rent: $2,200" states a price; "my budget for rent is $1000" states a
  // wish. A bare "$1000 a month" is deliberately NOT a signal — it is just
  // as often someone's maximum.
  /(?<!budget\s)(?<!budget\sfor\s)\b(?:monthly\s+)?rent\s*(?::|is|of|=|-)\s*\$?\s?\d/i,
]

// Signs of someone SEARCHING, checked only when no offer sign was found.
const REQUEST_BODY =
  /\b(looking for (?:a|an|some|somewhere|housing|a place|places|apartments|rooms|sub-?lets?|sub-?leases?)\b|(?:find|finding|searching for|need|needing) (?:a|an|some|somewhere|housing)\b|in need of|any(?:one|body) (?:who|have|has|know|renting|subletting|happen)|does any(?:one|body)|ask(?:ing)? for (?:advice|insight|help|suggestions)|any (?:advice|suggestions|recommendations)|my budget)\b/i

const PARKING_ONLY = /\bparking\b/i
const HOUSING_WORD = /\b(bed|bd|br|room|apartment|apt|studio|house|unit)\b/i
const ELSEWHERE = /\b(manhattan|new york|nyc|brooklyn|chicago|detroit|boston|san francisco|seattle|los angeles|washington,? d\.?c\.?|dc area)\b/i
const HERE = /\b(ann arbor|umich|u-m|u of m|campus|ypsi|ypsilanti)\b/i

export type PostKind = 'offer' | 'request' | 'other'

/** Pure: the judgement that keeps "looking for a sublet" posts out of the queue. */
export function classifyPost(title: string, body: string | null): PostKind {
  const text = `${title}\n${body ?? ''}`
  if (!ABOUT_SUBLET.test(text) || !TITLE_HOUSING.test(title)) return 'other'
  if (REQUEST_TITLE.test(title)) return 'request'
  if (OFFER_SIGNALS.some(re => re.test(text))) return 'offer'
  if (REQUEST_BODY.test(body ?? '')) return 'request'
  return 'other'
}

// ── reading the post ────────────────────────────────────────────────────────

// Full names or the usual abbreviations only — a looser `dec[a-z]*` reads
// "declawing" as December.
const MONTH =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?(?![a-z])'
const MONTH_SIDE = `${MONTH}(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,?\\s*20\\d{2})?`
const RANGE_SEP = '\\s*(?:-|–|—|to|through|thru|until|till)\\s*'
const MONTH_RANGE = new RegExp(`\\b${MONTH_SIDE}${RANGE_SEP}${MONTH_SIDE}\\b`, 'i')
const NUMERIC_RANGE = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*(?:-|–|—|to|through|until)\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/
const SINGLE_MONTH = new RegExp(`\\b(?:from|starting|start|available|through|until|till|lease (?:ends|through|until)|move-?in)\\s+(?:in\\s+|on\\s+)?(${MONTH_SIDE})\\b`, 'i')
// U-M's terms, as students write them. Winter runs January–April.
const SEMESTER = /\b(winter|fall|summer|spring\/summer|spring)\s+(?:semester\s+|term\s+)?(20\d{2})\b/i
const SEMESTER_MONTHS: Record<string, string> = {
  winter: 'January to April',
  spring: 'May to June',
  'spring/summer': 'May to August',
  summer: 'May to August',
  fall: 'September to December',
}

/**
 * Pull the term out of free text, as the poster wrote it, in a form
 * `parseAvailability` reads. "Jan–May 2027" and "Winter 2027" both count;
 * the latter becomes "January to April 2027". Null when nothing dated.
 */
export function findTermText(text: string): string | null {
  const t = text.replace(/[–—]/g, '-')
  const numeric = t.match(NUMERIC_RANGE)
  if (numeric) return numeric[0]
  const range = t.match(MONTH_RANGE)
  if (range) return range[0].replace(/\s+/g, ' ')
  const sem = t.match(SEMESTER)
  if (sem) return `${SEMESTER_MONTHS[sem[1].toLowerCase()]} ${sem[2]}`
  const single = t.match(SINGLE_MONTH)
  if (single) return single[1]
  return null
}

export function findPrice(text: string): string | null {
  // "$2,200", "$917/month" and the student-typed "700$".
  const m = text.match(/\$\s?(\d{1,2},\d{3}|\d{3,4})(?:\.\d{2})?\b/) ?? text.match(/\b(\d{3,4})\s?\$/)
  return m ? `$${m[1]}` : null
}

export function findEmail(text: string | null): string | undefined {
  const m = (text ?? '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  if (!m) return undefined
  const email = m[0].toLowerCase()
  return email.endsWith('reddit.com') ? undefined : email
}

/** An undated offer this old is a sublet long since filled. A dated one is
 *  judged on its dates instead (termHasEnded, in sanitizeLeads). */
const UNDATED_MAX_AGE_DAYS = 180

export function toLead(post: RedditPost, now = new Date()): RawLead {
  const text = `${post.title}\n${post.body ?? ''}`
  const kind = classifyPost(post.title, post.body)
  const dates = findTermText(text) ?? undefined
  const ageDays = (now.getTime() - new Date(post.postedAt).getTime()) / 86_400_000

  let skip: string | undefined
  if (kind === 'request') skip = 'looking-for post, not an offer'
  else if (kind === 'other') skip = 'not a sublet offer'
  else if (PARKING_ONLY.test(post.title) && !HOUSING_WORD.test(post.title)) skip = 'parking space, not housing'
  else if (ELSEWHERE.test(text) && !HERE.test(text)) skip = 'not in Ann Arbor'
  else if (!dates && ageDays > UNDATED_MAX_AGE_DAYS)
    skip = `posted ${post.postedAt.slice(0, 10)} with no dates — older than ${UNDATED_MAX_AGE_DAYS} days`

  const handle = `u/${post.author}`
  return {
    sourceExternalId: post.id,
    sourceUrl: post.url,
    title: post.title,
    // Only if the poster wrote an address into their own post. Almost nobody
    // does — "DM me" is the norm — which is why these leads mostly carry a
    // handle instead.
    contactEmail: skip ? undefined : findEmail(post.body),
    extracted: {
      posterName: handle,
      contactHandle: handle,
      contactChannel: 'reddit',
      contactUrl: `https://www.reddit.com/user/${post.author}`,
      subreddit: `r/${post.subreddit}`,
      posterType: 'Reddit user',
      leaseType: 'Sub Lease',
      dates,
      price: findPrice(text) ?? undefined,
      postedAt: post.postedAt,
      description: post.body ?? undefined,
    },
    skip,
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const redditSublets: SourceAdapter = {
  key: 'reddit-sublets',
  label: 'Reddit (r/uofm + r/AnnArbor)',
  contactBasis:
    'People post their own sublet offer publicly and ask to be messaged about it. No email is published, so these leads carry a Reddit handle for a manual message — the outreach agent never emails anyone from here.',

  async fetchLeads({ knownIds, maxFetches }: FetchContext = {}) {
    const leads: RawLead[] = []
    const errors: string[] = []
    let fetched = 0
    for (const sub of SUBREDDITS) {
      if (fetched >= (maxFetches ?? SUBREDDITS.length)) break
      if (fetched > 0) await sleep(PAUSE_MS)
      fetched++
      try {
        const res = await fetch(feedUrl(sub), {
          headers: { 'User-Agent': UA, Accept: 'application/atom+xml, application/xml' },
        })
        if (res.status === 429) throw new Error(`r/${sub}: Reddit rate limit (HTTP 429) — try again in a few minutes`)
        if (!res.ok) throw new Error(`r/${sub}: HTTP ${res.status}`)
        for (const post of parseRedditFeed(await res.text(), sub)) {
          if (knownIds?.has(post.id)) continue
          leads.push(toLead(post))
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }
    // One feed failing should not throw away the other's posts; nothing
    // working at all is an error the console should show.
    if (errors.length === fetched) throw new Error(errors.join('; '))
    return leads
  },
}

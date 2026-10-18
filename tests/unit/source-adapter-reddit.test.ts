import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseRedditFeed,
  classifyPost,
  findTermText,
  findPrice,
  toLead,
  feedUrl,
} from '../../src/lib/agents/sources/reddit-sublets.ts'
import { sanitizeLeads } from '../../src/lib/agents/source-adapter.ts'

// Fixture mirrors Reddit's Atom search feed (checked 2026-10-18) with
// INVENTED posts and authors, so the suite never handles a real person's post.

const esc = (html: string) => html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function entry({ id, title, author, published, body, path }: { id: string; title: string; author: string; published: string; body?: string; path: string }) {
  const content = body
    ? `<!-- SC_OFF --><div class="md">${body}</div><!-- SC_ON --> &#32; submitted by &#32; <a href="https://www.reddit.com/user/${author}"> /u/${author} </a> <span><a href="https://www.reddit.com${path}">[comments]</a></span>`
    : `submitted by <a href="https://www.reddit.com/user/${author}"> /u/${author} </a>`
  return `<entry><author><name>/u/${author}</name><uri>https://www.reddit.com/user/${author}</uri></author><category term="uofm" label="r/uofm"/><content type="html">${esc(content)}</content><id>${id}</id><link href="https://www.reddit.com${path}" /><updated>${published}</updated><published>${published}</published><title>${esc(title)}</title></entry>`
}

const NOW = new Date('2026-10-18T12:00:00Z')

const feed = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">
${entry({ id: 't3_offer1', title: '[Sublease] 1B/1B at Example Tower | Jan–May 2027', author: 'ada_l', published: '2026-10-09T17:03:04+00:00', path: '/r/uofm/comments/offer1/sublease_1b1b/', body: '<p>Hi! I’m looking for someone to take over my 1 bed / 1 bath for the Winter 2027 semester.</p><ul><li>Rent: $2,200/month</li><li>Lease through May 2027</li></ul><p>DM me if interested!</p>' })}
${entry({ id: 't3_req1', title: 'Looking for sublease near central campus', author: 'grace_h', published: '2026-10-01T10:00:00+00:00', path: '/r/uofm/comments/req1/looking/', body: '<p>Need a place from January. Budget $1200 a month. DM me if you have one.</p>' })}
${entry({ id: 't3_rant1', title: 'Housing in Ann Arbor sucks', author: 'alan_t', published: '2026-09-28T10:00:00+00:00', path: '/r/uofm/comments/rant1/housing/', body: '<p>They only do 12 month leases so you have to find somebody to sublease to like???</p>' })}
${entry({ id: 't3_park1', title: 'Summer Parking Sublease!', author: 'kat_j', published: '2026-09-20T10:00:00+00:00', path: '/r/uofm/comments/park1/parking/', body: '<p>Offering a sublease for parking over the summer. $100 per month. DM for details!</p>' })}
${entry({ id: 't3_nyc1', title: 'Summer Sublet of Sunny Room in Manhattan', author: 'lin_b', published: '2026-09-15T10:00:00+00:00', path: '/r/uofm/comments/nyc1/manhattan/', body: '<p>I’m subletting my room in the East Village in NYC this summer, $1,800.</p>' })}
${entry({ id: 't3_old1', title: 'Subleasing my apartment downtown', author: 'old_timer', published: '2025-11-01T10:00:00+00:00', path: '/r/uofm/comments/old1/old/', body: '<p>Subletting my apartment, message me for details.</p>' })}
${entry({ id: 't3_email1', title: 'Sublease Available: Studio at Example Place', author: 'mail_me', published: '2026-10-12T10:00:00+00:00', path: '/r/uofm/comments/email1/studio/', body: '<p>Room available for rent, Jan 5 to April 30, 2027. Rent is 950$. Email me at poster@example.com</p>' })}
${entry({ id: 't3_nobody', title: 'Sublease Available: 1-Bedroom at Example Lofts', author: 'terse', published: '2026-10-11T10:00:00+00:00', path: '/r/uofm/comments/nobody/lofts/' })}
</feed>`

test('parses every entry: id, title, author, date, link and the self-text as plain text', () => {
  const posts = parseRedditFeed(feed, 'uofm')
  assert.equal(posts.length, 8)
  const p = posts[0]
  assert.equal(p.id, 't3_offer1')
  assert.equal(p.title, '[Sublease] 1B/1B at Example Tower | Jan–May 2027')
  assert.equal(p.author, 'ada_l', 'the "/u/" prefix is dropped')
  assert.equal(p.url, 'https://www.reddit.com/r/uofm/comments/offer1/sublease_1b1b/')
  assert.equal(p.postedAt, '2026-10-09T17:03:04+00:00')
  assert.match(p.body ?? '', /Rent: \$2,200\/month/)
  assert.doesNotMatch(p.body ?? '', /submitted by/, 'Reddit boilerplate is not the poster’s words')
  assert.equal(posts[7].body, null, 'a photo-only post has no self-text')
})

test('offers are told apart from "looking for" posts and rants', () => {
  assert.equal(classifyPost('[Sublease] 1B/1B at Example Tower', 'looking for someone to take over my lease. Rent: $2,200/month'), 'offer')
  assert.equal(classifyPost('Looking for sublease near campus', 'need a place from January, budget $1200 a month'), 'request')
  assert.equal(classifyPost('Looking for subleasers for the summer', 'subletting my room May–Aug'), 'offer', '"looking for subleasers" is someone with a place')
  assert.equal(classifyPost('Housing in Ann Arbor sucks', 'you have to find somebody to sublease to like???'), 'other')
  assert.equal(classifyPost('towing on mary st', 'last summer I parked here while staying at my sublease'), 'other', 'a sublease mentioned in passing is not a listing')
  assert.equal(classifyPost('Winter subleasing', 'Is anyone subleasing their apartment? I’m looking for housing, max $1000 a month'), 'request', 'a budget is not a price')
  assert.equal(classifyPost('Parking Sublease', 'I am subleasing an apartment from the Verve. Does anybody have a parking spot?'), 'request')
  assert.equal(classifyPost('Sublease Available: 1-Bedroom at Example Lofts', null), 'offer', 'a title alone can say it')
})

test('reads the term and the price the way students write them', () => {
  assert.equal(findTermText('[Sublease] 1B/1B | Jan–May 2027 | Official'), 'Jan-May 2027')
  assert.equal(findTermText('available for the Winter 2027 semester'), 'January to April 2027')
  assert.equal(findTermText('from 5/1 to 8/20/26, flexible'), '5/1 to 8/20/26')
  assert.equal(findTermText('Lease through May 2027'), 'May 2027')
  assert.equal(findTermText('cat declawing is not allowed'), null, 'a looser month regex read "declawing" as December')
  assert.equal(findPrice('Rent: $2,200/month'), '$2,200')
  assert.equal(findPrice('Rent is 950$ + utilities'), '$950')
  assert.equal(findPrice('no numbers here'), null)
})

test('an offer becomes a lead with a handle, never an invented email', () => {
  const lead = toLead(parseRedditFeed(feed, 'uofm')[0], NOW)
  assert.equal(lead.skip, undefined)
  assert.equal(lead.sourceExternalId, 't3_offer1', 'Reddit’s id is the dedupe key')
  assert.equal(lead.contactEmail, undefined, 'nobody published an address')
  assert.equal(lead.extracted?.contactHandle, 'u/ada_l')
  assert.equal(lead.extracted?.contactChannel, 'reddit')
  assert.equal(lead.extracted?.contactUrl, 'https://www.reddit.com/user/ada_l')
  assert.equal(lead.extracted?.dates, 'Jan-May 2027')
  assert.equal(lead.extracted?.price, '$2,200')
  assert.equal(lead.extracted?.postedAt, '2026-10-09T17:03:04+00:00')
  assert.match(String(lead.extracted?.description), /take over my 1 bed/)
})

test('an email the poster wrote into their own post IS taken — they published it', () => {
  const lead = toLead(parseRedditFeed(feed, 'uofm')[6], NOW)
  assert.equal(lead.contactEmail, 'poster@example.com')
  assert.equal(lead.extracted?.dates, 'Jan 5 to April 30, 2027')
  assert.equal(lead.extracted?.price, '$950')
})

test('everything else is recorded as skipped, with the reason, so it is not re-read', () => {
  const byId = Object.fromEntries(parseRedditFeed(feed, 'uofm').map(p => [p.id, toLead(p, NOW)]))
  assert.equal(byId.t3_req1.skip, 'looking-for post, not an offer')
  assert.equal(byId.t3_req1.contactEmail, undefined, 'no contact is kept for someone we will not write to')
  assert.equal(byId.t3_rant1.skip, 'not a sublet offer')
  assert.equal(byId.t3_park1.skip, 'parking space, not housing')
  assert.equal(byId.t3_nyc1.skip, 'not in Ann Arbor')
  assert.match(byId.t3_old1.skip ?? '', /posted 2025-11-01 with no dates — older than 180 days/)
  assert.equal(byId.t3_nobody.skip, undefined, 'a fresh, dated-by-nothing offer is still a lead')
})

test('through the sanitizer: offers survive, the rest are rejected with their reason', () => {
  const { ok, rejected } = sanitizeLeads(parseRedditFeed(feed, 'uofm').map(p => toLead(p, NOW)), { now: NOW })
  assert.deepEqual(ok.map(l => l.sourceExternalId).sort(), ['t3_email1', 't3_nobody', 't3_offer1'])
  assert.equal(rejected.length, 5)
})

test('the feed asks Reddit for new sublet posts in one subreddit, nothing else', () => {
  const url = new URL(feedUrl('uofm'))
  assert.equal(url.pathname, '/r/uofm/search.rss')
  assert.equal(url.searchParams.get('restrict_sr'), '1')
  assert.equal(url.searchParams.get('sort'), 'new')
  assert.match(url.searchParams.get('q') ?? '', /sublet OR sublease/)
})

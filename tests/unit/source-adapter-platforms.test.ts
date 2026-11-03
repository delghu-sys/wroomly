import { test } from 'node:test'
import assert from 'node:assert/strict'
import { longDate, termText, priceText, inAnnArborArea, jsonLdBlocks } from '../../src/lib/agents/sources/platform-shared.ts'
import { parseIndex as rrIndex, toLead as rrLead } from '../../src/lib/agents/sources/rotatingroom.ts'
import { parseIndex as ohIndex, toLead as ohLead } from '../../src/lib/agents/sources/ohana.ts'
import { parsePage, toLead as slLead, type SubleapsRecord } from '../../src/lib/agents/sources/subleaps.ts'
import { sanitizeLeads } from '../../src/lib/agents/source-adapter.ts'
import { parseAvailability } from '../../src/lib/agents/prefill.ts'

// Fixtures mirror the shape of each site's public pages (checked 2026-11-03)
// with INVENTED listings, so the suite never handles a real person's post.

const NOW = new Date('2026-11-03T12:00:00Z')
const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`

test('dates become the long form the term parser reads, and an undated listing stays undated', () => {
  assert.equal(longDate('2026-12-18'), 'December 18, 2026')
  assert.equal(longDate('2027-01-05T00:00:00+00:00'), 'January 5, 2027')
  assert.equal(longDate('soon'), null)
  assert.equal(termText('2026-12-18', '2027-07-30'), 'December 18, 2026 to July 30, 2027')
  assert.equal(termText('2026-12-18', null), 'from December 18, 2026')
  assert.equal(termText(null, '2027-07-30'), null, 'an end with no start is not a term')
  assert.deepEqual(parseAvailability('December 18, 2026 to July 30, 2027', NOW, null)?.to, '2027-07-30')
  assert.equal(priceText(1200), '$1,200')
  assert.equal(priceText(0), null)
  assert.equal(priceText('abc'), null)
})

test('Ann Arbor area: coordinates win; otherwise only a local town name counts', () => {
  assert.equal(inAnnArborArea('Macomb', 42.636, -82.928), false, 'coordinates outside the area')
  assert.equal(inAnnArborArea('Somewhere', 42.28, -83.74), true, 'coordinates inside, whatever the label')
  assert.equal(inAnnArborArea('Ann Arbor'), true)
  assert.equal(inAnnArborArea('Ypsilanti'), true)
  assert.equal(inAnnArborArea('Detroit'), false)
  assert.equal(inAnnArborArea(undefined), false, 'unknown is not assumed local')
})

test('JSON-LD: parses every block, flattens @graph, ignores a broken one', () => {
  const html = `${ld({ '@graph': [{ '@type': 'A' }, { '@type': 'B' }] })}<script type="application/ld+json">{nope</script>${ld({ '@type': 'C' })}`
  assert.deepEqual(jsonLdBlocks(html).map(b => b['@type']), ['A', 'B', 'C'])
})

// ── RotatingRoom ────────────────────────────────────────────────────────────

const rrIndexHtml = ld({
  '@type': 'ItemList',
  numberOfItems: 89,
  itemListElement: [
    { '@type': 'ListItem', position: 1, url: 'https://rotatingroom.com/need-a-room/1001' },
    { '@type': 'ListItem', position: 2, url: 'https://rotatingroom.com/need-a-room/1002' },
    { '@type': 'ListItem', position: 3, url: 'https://rotatingroom.com/need-a-room/1001' },
    { '@type': 'ListItem', position: 4, url: 'https://rotatingroom.com/about' },
  ],
})
const rrPage = (over: Record<string, unknown> = {}, offers: Record<string, unknown> = {}) =>
  ld({
    '@type': 'Accommodation',
    name: 'Sunny room near the Diag',
    description: 'Furnished room.   Close to campus.',
    numberOfBedrooms: 3,
    numberOfBathroomsTotal: 2,
    address: { '@type': 'PostalAddress', addressLocality: 'Ann Arbor', addressRegion: 'MI' },
    geo: { '@type': 'GeoCoordinates', latitude: 42.279, longitude: -83.739 },
    offers: { '@type': 'Offer', price: 1150, availability: 'https://schema.org/InStock', availabilityStarts: '2027-01-05', availabilityEnds: '2027-04-30', ...offers },
    ...over,
  })

test('RotatingRoom index: listing ids and the total the site reports; duplicates and other links dropped', () => {
  const { items, total } = rrIndex(rrIndexHtml)
  assert.deepEqual(items.map(i => i.id), ['1001', '1002'])
  assert.equal(total, 89)
})

test('RotatingRoom listing: facts and a link, never a contact address', () => {
  const lead = rrLead(rrPage(), '1001', 'https://rotatingroom.com/need-a-room/1001')!
  assert.equal(lead.skip, undefined)
  assert.equal(lead.contactEmail, undefined)
  assert.equal(lead.title, 'Sunny room near the Diag')
  assert.equal(lead.extracted?.price, '$1,150')
  assert.equal(lead.extracted?.dates, 'January 5, 2027 to April 30, 2027')
  assert.equal(lead.extracted?.contactChannel, 'rotatingroom')
  assert.equal(lead.extracted?.contactHandle, 'Message on RotatingRoom')
  assert.equal(lead.extracted?.contactUrl, 'https://rotatingroom.com/need-a-room/1001')
  assert.equal(lead.extracted?.description, 'Furnished room. Close to campus.', 'whitespace collapsed')
  assert.equal(lead.extracted?.beds, 3)
})

test('RotatingRoom: a listing in another town is recorded as skipped, not imported', () => {
  const far = rrLead(
    rrPage({ address: { addressLocality: 'Macomb', addressRegion: 'MI' }, geo: { latitude: 42.636, longitude: -82.928 } }),
    '1002', 'https://rotatingroom.com/need-a-room/1002')!
  assert.match(far.skip ?? '', /not in the Ann Arbor area \(Macomb, MI\)/)
  assert.match(far.title ?? '', /Macomb/, 'the title says where it really is')
})

test('RotatingRoom: an unavailable listing is skipped; a page with no listing data stays retryable', () => {
  const gone = rrLead(rrPage({}, { availability: 'https://schema.org/OutOfStock' }), '1', 'https://rotatingroom.com/need-a-room/1')!
  assert.equal(gone.skip, 'listing marked unavailable')
  assert.equal(rrLead('<html>maintenance</html>', '1', 'u'), null, 'null = not remembered, tried again next run')
})

test('through the sanitizer: an ended window is rejected, a future one kept', () => {
  const ended = rrLead(rrPage({}, { availabilityStarts: '2026-09-09', availabilityEnds: '2026-09-27' }), '1', 'u1')!
  const future = rrLead(rrPage(), '2', 'u2')!
  const { ok, rejected } = sanitizeLeads([ended, future], { now: NOW })
  assert.deepEqual(ok.map(l => l.sourceExternalId), ['2'])
  assert.match(rejected[0].reason, /term already ended/)
})

// ── Ohana ───────────────────────────────────────────────────────────────────

test('Ohana index: ids come from the listing slug, whether the url is on the entry or its item', () => {
  const html = ld({
    '@type': 'ItemList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, url: 'https://liveohana.ai/listing/home-in-ann-arbor-475-3-bedrooms' },
      { '@type': 'ListItem', position: 2, item: { '@type': 'Offer', url: 'https://liveohana.ai/listing/room-near-campus-abc123' } },
      { '@type': 'ListItem', position: 3, url: 'https://liveohana.ai/listing/home-in-ann-arbor-475-3-bedrooms' },
    ],
  })
  assert.deepEqual(ohIndex(html).map(i => i.id), ['home-in-ann-arbor-475-3-bedrooms', 'room-near-campus-abc123'])
})

const ohPage = (locality = 'Ann Arbor') =>
  ld({
    '@type': 'Offer',
    price: 1605,
    availabilityStarts: '2026-12-20',
    availabilityEnds: '2027-05-01',
    itemOffered: {
      '@type': 'Room',
      name: 'Private room in a 3 bedroom home',
      description: 'Quiet street.',
      numberOfBedrooms: 3,
      numberOfBathroomsTotal: 1,
      address: { '@type': 'PostalAddress', addressLocality: locality, addressRegion: 'MI' },
    },
  })

test('Ohana listing: price, window, town; no contact; a link for a manual message', () => {
  const lead = ohLead(ohPage(), 'room-near-campus-abc123', 'https://liveohana.ai/listing/room-near-campus-abc123')!
  assert.equal(lead.skip, undefined)
  assert.equal(lead.contactEmail, undefined)
  assert.equal(lead.extracted?.price, '$1,605')
  assert.equal(lead.extracted?.dates, 'December 20, 2026 to May 1, 2027')
  assert.equal(lead.extracted?.contactChannel, 'ohana')
  assert.equal(ohLead(ohPage('Detroit'), 'x', 'u')!.skip?.startsWith('not in the Ann Arbor area'), true)
  assert.equal(ohLead('<html></html>', 'x', 'u'), null)
})

// ── SubLeaps ────────────────────────────────────────────────────────────────

/** A page whose payload is split across two chunks mid-record, as Next does. */
function subleapsHtml(records: Record<string, unknown>[]): string {
  const flight = `0:["$","div",null,{"children":[${records.map(r => JSON.stringify(r)).join(',')}]}]\n`
  const cut = flight.indexOf('"price_per_month"') + 4
  const chunks = [flight.slice(0, cut), flight.slice(cut)]
  return `<html>${chunks.map(c => `<script>self.__next_f.push([1,${JSON.stringify(c)}])</script>`).join('')}</html>`
}
const rec = (over: Partial<SubleapsRecord> & Record<string, unknown> = {}) => ({
  id: '4a2c6848-0000-4000-8000-000000000001',
  host_id: '11111111-2222-3333-4444-555555555555',
  title: ' Bedroom in a 4 bed near campus ',
  description: 'Hi! Rent is {firm}, "quoted" as $1,200. Text me at 734-555-0100 or me@example.com',
  price_per_month: 1200,
  status: 'ACTIVE',
  start_date: '2026-12-18',
  end_date: '2027-07-30',
  created_at: '2026-10-30T22:48:31.990276+00:00',
  beds: 4,
  baths: 2,
  address_city: 'Ann Arbor',
  address_state: 'MI',
  images: [],
  ...over,
})

test('SubLeaps page: records read out of the payload, even split across chunks and with braces and quotes in text', () => {
  const [a, b] = parsePage(subleapsHtml([rec(), rec({ id: '4a2c6848-0000-4000-8000-000000000002', title: 'Studio' })]))
  assert.equal(a.id, '4a2c6848-0000-4000-8000-000000000001')
  assert.equal(a.title, 'Bedroom in a 4 bed near campus', 'trimmed')
  assert.match(a.description ?? '', /\{firm\}, "quoted"/)
  assert.equal(b.title, 'Studio')
  assert.equal(parsePage('<html>no payload</html>').length, 0)
})

test('SubLeaps lead: posted date, dates, price; the host id is never kept and no email is taken from the text', () => {
  const lead = slLead(parsePage(subleapsHtml([rec()]))[0])
  assert.equal(lead.skip, undefined)
  assert.equal(lead.sourceUrl, 'https://subleaps.com/listings/4a2c6848-0000-4000-8000-000000000001')
  assert.equal(lead.extracted?.postedAt, '2026-10-30T22:48:31.990276+00:00')
  assert.equal(lead.extracted?.dates, 'December 18, 2026 to July 30, 2027')
  assert.equal(lead.extracted?.price, '$1,200')
  assert.equal(lead.contactEmail, undefined, 'an email in the description is not a published invitation to be emailed')
  assert.doesNotMatch(JSON.stringify(lead), /11111111-2222|host_id/)
})

test('SubLeaps: inactive and out-of-area listings are recorded as skipped', () => {
  assert.equal(slLead(parsePage(subleapsHtml([rec({ status: 'FILLED' })]))[0]).skip, 'listing is filled')
  assert.match(slLead(parsePage(subleapsHtml([rec({ address_city: 'Chicago', address_state: 'IL' })]))[0]).skip ?? '', /not in the Ann Arbor area \(Chicago, IL\)/)
})

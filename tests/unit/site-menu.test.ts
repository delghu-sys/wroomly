import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { buildMenuSections, type MenuInput } from '../../src/lib/nav/site-menu.ts'

const base: MenuInput = {
  role: null,
  hideRenterNav: false,
  paymentsEnabled: false,
  unreadCount: 0,
  neighborhoods: [{ slug: 'central-campus', name: 'Central Campus' }, { slug: 'kerrytown', name: 'Kerrytown' }],
}
const hrefs = (i: Partial<MenuInput> = {}) => buildMenuSections({ ...base, ...i }).flatMap(s => s.links.map(l => l.href))
const section = (title: string, i: Partial<MenuInput> = {}) => buildMenuSections({ ...base, ...i }).find(s => s.title === title)

test('a signed-out visitor sees the public pages and a way to sign in, never account pages', () => {
  const h = hrefs()
  for (const p of ['/listings', '/match', '/buildings', '/guides', '/guides/ann-arbor-rent-prices', '/about', '/safety', '/exchange', '/list-place', '/import-listing', '/sign-in', '/sign-up']) {
    assert.ok(h.includes(p), `${p} missing`)
  }
  for (const p of ['/dashboard', '/messages', '/admin', '/my-listings', '/listings/new']) assert.ok(!h.includes(p), `${p} should not show`)
  assert.equal(section('Account')!.links.length, 2)
})

test('neighborhoods come from what the caller passes, in order', () => {
  const find = section('Find a place')!.links
  assert.deepEqual(find.filter(l => l.href.startsWith('/ann-arbor/')).map(l => l.label), ['Central Campus', 'Kerrytown'])
})

test('each role sees its own account pages', () => {
  const consumer = hrefs({ role: 'consumer' })
  assert.ok(consumer.includes('/saved-searches') && consumer.includes('/applications'))
  assert.ok(!consumer.includes('/my-listings') && !consumer.includes('/admin') && !consumer.includes('/listings/new'))

  const supplier = hrefs({ role: 'supplier' })
  assert.ok(supplier.includes('/my-listings') && supplier.includes('/inquiries') && supplier.includes('/listings/new'))
  assert.ok(!supplier.includes('/admin') && !supplier.includes('/saved-searches'))

  const admin = hrefs({ role: 'admin' })
  assert.ok(admin.includes('/admin') && admin.includes('/my-listings') && admin.includes('/listings/new'))
  for (const h of [consumer, supplier, admin]) assert.ok(h.includes('/dashboard') && h.includes('/messages') && h.includes('/profile') && !h.includes('/sign-in'))
})

test('payouts only when payments are on; unread messages show as a badge', () => {
  assert.ok(!hrefs({ role: 'supplier' }).includes('/payouts'))
  assert.ok(hrefs({ role: 'supplier', paymentsEnabled: true }).includes('/payouts'))
  const msgs = (n: number) => section('Your account', { role: 'consumer', unreadCount: n })!.links.find(l => l.href === '/messages')!
  assert.equal(msgs(3).badge, 3)
  assert.equal(msgs(0).badge, undefined)
})

test('supply-only mode hides the renter product links but keeps the public content', () => {
  const h = hrefs({ hideRenterNav: true })
  assert.ok(!h.includes('/listings') && !h.includes('/match'))
  for (const p of ['/guides', '/buildings', '/safety', '/exchange', '/list-place']) assert.ok(h.includes(p), `${p} should stay`)
})

test('every internal link points at a real page in the app', () => {
  // Walk src/app for page.tsx files and turn them into route patterns.
  const routes: RegExp[] = []
  const walk = (dir: string, parts: string[]) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        const seg = /^\(.*\)$/.test(name) ? null : name.startsWith('[') ? '[^/]+' : name
        walk(full, seg === null ? parts : [...parts, seg])
      } else if (name === 'page.tsx') {
        routes.push(new RegExp(`^/${parts.join('/')}$`))
      }
    }
  }
  walk(join(process.cwd(), 'src/app'), [])
  const all = [{ role: null }, { role: 'consumer' }, { role: 'supplier' }, { role: 'admin', paymentsEnabled: true }] as Partial<MenuInput>[]
  const internal = [...new Set(all.flatMap(i => hrefs(i)))].filter(h => h.startsWith('/'))
  for (const h of internal) assert.ok(routes.some(r => r.test(h)), `${h} has no page`)
})

test('the pricing guide the menu links to exists', async () => {
  const { GUIDES } = await import('../../src/lib/seo/guides.ts')
  assert.ok(GUIDES.some(g => g.slug === 'how-to-price-your-sublet'))
})

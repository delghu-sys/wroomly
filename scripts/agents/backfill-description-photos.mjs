/**
 * Give drafts made before 2026-10-01 their poster's description and photos.
 *
 *   node --env-file=.env.local scripts/agents/backfill-description-photos.mjs            (dry run)
 *   node --env-file=.env.local scripts/agents/backfill-description-photos.mjs --write
 *
 * Drafts used to carry neither: the description was never read and photos
 * were deliberately not copied. Both changed (see source-photos.ts for the
 * photo decision). This re-reads each post, stores the description and photo
 * URLs on the lead, copies the photos into the draft's PRIVATE storage, and
 * re-derives the draft so the claim page shows them.
 *
 * Touches only drafts nobody has claimed or published — once someone holds a
 * draft, its content may be theirs. Idempotent: a draft that already has
 * photos keeps them rather than gaining a second copy.
 */
import { createClient } from '@supabase/supabase-js'
import { extractContact } from '../../src/lib/agents/sources/offcampus-universe.ts'
import { leadToExtractedDraft } from '../../src/lib/agents/to-draft.ts'
import { copySourcePhotos } from '../../src/lib/agents/source-photos.ts'
import { SOURCES } from '../../src/lib/agents/runner.ts'

const write = process.argv.includes('--write')
const UA = 'WroomlyBot/1.0 (+https://wroomly.app)'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: leads, error } = await db
  .from('sourced_leads')
  .select('id, title, source, source_url, contact_email, extracted, import_request_id')
  .eq('source', 'offcampus-universe-umich')
  .eq('status', 'drafted')
  .is('outreach_sent_at', null)
if (error) throw new Error(error.message)

let done = 0, skipped = 0, photos = 0
for (const lead of leads ?? []) {
  const label = (lead.title ?? '(untitled)').slice(0, 34).padEnd(36)
  const { data: req } = await db
    .from('listing_import_requests')
    .select('id, claimed_by_user_id, listing_id, personal_image_paths')
    .eq('id', lead.import_request_id)
    .maybeSingle()
  if (!req || req.claimed_by_user_id || req.listing_id) {
    console.log(`${label} SKIP  claimed, published, or missing — may hold the owner's edits`)
    skipped++
    continue
  }

  const html = await fetch(lead.source_url, { headers: { 'User-Agent': UA } }).then(r => r.text())
  const c = extractContact(html)
  const extracted = {
    ...(lead.extracted ?? {}),
    ...(c.description ? { description: c.description } : {}),
    ...(c.imageUrls?.length ? { imageUrls: c.imageUrls } : {}),
  }
  const draft = leadToExtractedDraft({
    title: lead.title,
    sourceLabel: SOURCES.find(s => s.key === lead.source)?.label ?? lead.source,
    contactEmail: lead.contact_email,
    extracted,
  })
  const havePhotos = (req.personal_image_paths?.length ?? 0) > 0

  if (!write) {
    console.log(`${label} would add  description ${draft.description?.length ?? 0} chars · ${havePhotos ? 'photos already present' : `${c.imageUrls?.length ?? 0} photos`}`)
    done++
    await new Promise(r => setTimeout(r, 400))
    continue
  }

  let paths = req.personal_image_paths ?? []
  if (!havePhotos && c.imageUrls?.length) {
    const copied = await copySourcePhotos(db, req.id, c.imageUrls)
    paths = copied.paths
    photos += copied.paths.length
  }

  // Guarded write: a claim landing mid-run turns this into a no-op.
  const { data: rows, error: upErr } = await db
    .from('listing_import_requests')
    .update({ extracted_data: draft, personal_image_paths: paths })
    .eq('id', req.id)
    .is('claimed_by_user_id', null)
    .is('listing_id', null)
    .select('id')
  if (upErr || !rows?.length) {
    console.log(`${label} SKIP  ${upErr?.message ?? 'claimed while running'}`)
    skipped++
    continue
  }
  await db.from('sourced_leads').update({ extracted }).eq('id', lead.id)
  console.log(`${label} done   description ${draft.description?.length ?? 0} chars · ${paths.length} photos`)
  done++
  await new Promise(r => setTimeout(r, 400))
}

console.log(`\n${done} ${write ? 'updated' : 'would update'} · ${skipped} skipped${write ? ` · ${photos} photos copied privately` : ''}`)
if (!write) console.log('Dry run — nothing written. Re-run with --write.')

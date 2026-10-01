import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  copySourcePhotos,
  wixImageUrl,
  IMPORTS_BUCKET,
  MAX_SOURCE_PHOTOS,
  MAX_SOURCE_PHOTO_BYTES,
} from '../../src/lib/agents/source-photos.ts'

/**
 * Photos copied from a post go to the PRIVATE imports bucket and nowhere
 * else. These tests pin that, plus the guards that keep a bad image from
 * becoming a stored file.
 */

test('wix refs map to the CDN, and nothing else is guessed at', () => {
  assert.equal(
    wixImageUrl('wix:image://v1/d79c35_962f~mv2.webp/IMG_0817.webp#originWidth=1080'),
    'https://static.wixstatic.com/media/d79c35_962f~mv2.webp',
  )
  assert.equal(wixImageUrl('https://evil.example/x.jpg'), null)
  assert.equal(wixImageUrl('wix:image://v1/no-extension/x'), null)
  assert.equal(wixImageUrl('wix:image://v1/abc~mv2.svg/x.svg'), null, 'not a photo type')
})

function storageDb(uploads: { bucket: string; path: string; type: string }[], fail = false) {
  return {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _b: Uint8Array, o: { contentType: string }) => {
          if (fail) return { error: { message: 'nope' } }
          uploads.push({ bucket, path, type: o.contentType })
          return { error: null }
        },
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const imageRes = (type: string, bytes = 10) =>
  new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': type } })

test('photos go ONLY to the private imports bucket, under the draft', async () => {
  const uploads: { bucket: string; path: string; type: string }[] = []
  const r = await copySourcePhotos(storageDb(uploads), 'req-1', ['https://a/1.jpg', 'https://a/2.webp'], {
    fetchImpl: (async (u: string) => imageRes(String(u).endsWith('webp') ? 'image/webp' : 'image/jpeg')) as typeof fetch,
  })
  assert.equal(r.paths.length, 2)
  assert.ok(uploads.every(u => u.bucket === IMPORTS_BUCKET), 'never the public bucket')
  assert.equal(IMPORTS_BUCKET, 'listing-imports')
  for (const p of r.paths) assert.match(p, /^imports\/req-1\/personal\//)
})

test('the type is taken from what the server sent, not the URL', async () => {
  const uploads: { bucket: string; path: string; type: string }[] = []
  const r = await copySourcePhotos(storageDb(uploads), 'req-1', ['https://a/looks-like.jpg'], {
    fetchImpl: (async () => imageRes('text/html')) as unknown as typeof fetch,
  })
  assert.equal(r.paths.length, 0)
  assert.equal(r.skipped, 1, 'an HTML error page named .jpg is not a photo')
})

test('an image over the size limit is skipped, not stored', async () => {
  const r = await copySourcePhotos(storageDb([]), 'req-1', ['https://a/huge.jpg'], {
    fetchImpl: (async () => imageRes('image/jpeg', MAX_SOURCE_PHOTO_BYTES + 1)) as unknown as typeof fetch,
  })
  assert.deepEqual(r, { paths: [], skipped: 1 })
})

test('a failure costs a photo, never the draft — it does not throw', async () => {
  const r = await copySourcePhotos(storageDb([], true), 'req-1', ['https://a/1.jpg'], {
    fetchImpl: (async () => imageRes('image/jpeg')) as unknown as typeof fetch,
  })
  assert.deepEqual(r, { paths: [], skipped: 1 })

  const r2 = await copySourcePhotos(storageDb([]), 'req-1', ['https://a/1.jpg'], {
    fetchImpl: (async () => { throw new Error('network down') }) as unknown as typeof fetch,
  })
  assert.deepEqual(r2, { paths: [], skipped: 1 })
})

test('capped, and duplicates are fetched once', async () => {
  let fetched = 0
  const urls = Array.from({ length: 20 }, (_, i) => `https://a/${i % 12}.jpg`)
  const r = await copySourcePhotos(storageDb([]), 'req-1', urls, {
    fetchImpl: (async () => { fetched++; return imageRes('image/jpeg') }) as unknown as typeof fetch,
  })
  assert.equal(r.paths.length, MAX_SOURCE_PHOTOS)
  assert.equal(fetched, MAX_SOURCE_PHOTOS, 'no wasted downloads past the cap')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import imageLoader from '../../src/lib/image-loader.ts'

const BASE = 'https://sgoeucbxxjqjsopoxeiw.supabase.co'
const photo = `${BASE}/storage/v1/object/public/listing-images/u1/l1/0.jpg`

test('a public storage photo is requested resized through the render endpoint', () => {
  const out = new URL(imageLoader({ src: photo, width: 640, quality: 75 }))
  assert.equal(out.pathname, '/storage/v1/render/image/public/listing-images/u1/l1/0.jpg')
  assert.equal(out.searchParams.get('width'), '640')
  assert.equal(out.searchParams.get('quality'), '75')
})

test('it scales proportionally — the default mode crops to the original height', () => {
  const out = new URL(imageLoader({ src: photo, width: 640 }))
  assert.equal(out.searchParams.get('resize'), 'contain')
  assert.equal(out.searchParams.get('quality'), '75', 'quality defaults when next/image omits it')
})

test('widths beyond Supabase’s 2500px limit are clamped, not rejected', () => {
  const out = new URL(imageLoader({ src: photo, width: 3840 }))
  assert.equal(out.searchParams.get('width'), '2500')
})

test('everything that is not a public storage object passes through untouched', () => {
  for (const src of [
    '/logo.png',
    `${BASE}/storage/v1/object/sign/listing-imports/a.jpg?token=abc`,
    'blob:https://wroomly.app/1234',
    'http://sgoeucbxxjqjsopoxeiw.supabase.co/storage/v1/object/public/x.jpg',
  ]) {
    assert.equal(imageLoader({ src, width: 640 }), src)
  }
})

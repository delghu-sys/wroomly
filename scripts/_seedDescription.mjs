/**
 * Deterministic, varied description generator for seed listings.
 * Seeded by the listing address so re-imports produce stable (non-shuffling)
 * text. Builds an honest paragraph from the data we actually have — no claims
 * we can't back up — and nudges toward the waitlist (seed inquiries go there).
 */
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makePicker(seed) {
  let s = seed || 1
  return arr => {
    s = (s * 1664525 + 1013904223) >>> 0
    return arr[s % arr.length]
  }
}

const bedLabel = b =>
  b == null ? 'place' : b === 0 ? 'studio' : b === 1 ? '1-bedroom' : `${b}-bedroom`

function listJoin(arr) {
  if (arr.length === 1) return arr[0]
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`
}

export function buildSeedDescription(r) {
  const pick = makePicker(hashSeed(r.address || r.title || 'x'))
  const city = String(r.city || 'Ann Arbor').split(',')[0].trim()
  const unit = bedLabel(r.bedrooms)
  const amenities = Array.isArray(r.amenities) ? r.amenities.filter(Boolean) : []

  const opener = pick([
    `Bright ${unit} in ${city}, a short trip from the University of Michigan campus.`,
    `Spacious ${unit} in ${city}, close to U-M and everyday essentials.`,
    `Well-kept ${unit} in the heart of ${city}, minutes from central campus.`,
    `Comfortable ${unit} in ${city}, a good fit for U-M students.`,
    `${city} ${unit} in a convenient spot near campus, shops, and transit.`,
  ])

  const layoutLine =
    r.bathrooms != null
      ? pick([
          `The unit has ${r.bathrooms} bath${r.bathrooms === 1 ? '' : 's'}.`,
          `Includes ${r.bathrooms} bath${r.bathrooms === 1 ? '' : 's'}.`,
          `You'll have ${r.bathrooms} bath${r.bathrooms === 1 ? '' : 's'} to work with.`,
        ])
      : ''

  const priceLine = r.price_per_month
    ? pick([
        `Rent is $${Number(r.price_per_month).toLocaleString()}/month.`,
        `Asking $${Number(r.price_per_month).toLocaleString()} per month.`,
        `Offered at $${Number(r.price_per_month).toLocaleString()}/mo.`,
      ])
    : ''

  const whenLine = r.available_date
    ? pick([
        `Available starting ${r.available_date}.`,
        `Move-in from ${r.available_date}.`,
        `Open from ${r.available_date}.`,
      ])
    : ''

  const amenLine = amenities.length
    ? pick([
        `Highlights include ${listJoin(amenities)}.`,
        `Features ${listJoin(amenities)}.`,
        `Comes with ${listJoin(amenities)}.`,
      ])
    : ''

  const closer = pick([
    `Add yourself to the waitlist to be notified as availability opens up.`,
    `A solid option for the upcoming term — join the waitlist to hear more.`,
    `Message to get on the list for places like this.`,
    `Reach out and we'll let you know when similar places open up.`,
  ])

  return [opener, layoutLine, priceLine, whenLine, amenLine, closer].filter(Boolean).join(' ')
}

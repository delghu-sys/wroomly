# Social/Shareable Features — Audit & Plan (branch: feature/social-share)

2026-07-04. Rollback guarantee: main untouched at `f9eab39`; everything here
lives on this branch; the one new migration (033) is a file only — nothing
touches the prod DB until you approve the merge.

## Step 0 — What already exists (audit)

| Capability | Status | Detail |
|---|---|---|
| Per-listing rich link previews (OG + Twitter) | ✅ EXISTS — reuse | `listings/[id]/page.tsx` generateMetadata + **dynamic 1200×630 OG image route** (`listings/[id]/opengraph-image.tsx`, ImageResponse: cover photo, price, neighborhood, brand). GroupMe/iMessage/IG-DM previews already work |
| Story-format (1080×1920) share image | ❌ missing | No vertical variant |
| Share UI (Web Share / copy / WhatsApp) | ❌ missing | Zero `navigator.share` usage anywhere |
| Share analytics | ❌ missing | `lib/track` + `/api/events` exist (reuse); no share events in allowlist |
| Browse modes | ⚠️ partial | `view=grid|map` param plumbing + `ListingsViewToggle`; no feed mode |
| Listing media | ⚠️ images only | `listing_images` table + public `listing-images` bucket (ownership-checked INSERT via 016); **no video anywhere** (no column, no UI) |
| Card/detail components to reuse | ✅ | `BrandListingCard`, `CardGallery`, `BrandedGallery`, `FavoriteButton`, `formatDateRange`, `InquiryModal` |
| Save counts | ⚠️ data exists | `favorites(user_id, listing_id, created_at)` — aggregatable server-side; never displayed |
| View counts | ❌ missing | No view tracking; `analytics_events` (031) is the natural sink |
| "New" badge / "Just listed" strip | ❌ missing | `created_at` available; no UI |

## Plan — build only the gaps

### 1. Share (main feature)
- **`/listings/[id]/story-image`** route handler: 1080×1920 ImageResponse
  reusing the OG route's data fetch + palette; adds dates, logo, wroomly.app.
- **`ShareListing`** client component on the listing detail page:
  - Mobile: **Web Share API with the story image as a file** (`navigator.share({ files })`)
    — the honest path to IG stories (Instagram has no web story-intent; the
    share sheet → Instagram → story works with a shared image).
  - Always: Copy link · WhatsApp (`wa.me`) · Messages (`sms:`) · native share.
  - Falls back to link-only share when `canShare({files})` is false; degrades
    to copy-link on desktop.
- Track `share_opened` / `share_completed {method}` via existing `track()`
  (allowlist extended).

### 2. Feed browse mode + video
- **`view=feed`** third mode on /listings (same filters/query, newest-first):
  `ListingsFeed` client component — vertical scroll-snap, one listing per
  viewport, big media, overlay: price/beds/dates/neighborhood, actions:
  favorite (reuse), share, "View details", New badge. IntersectionObserver
  drives video play/pause + lazy media. Desktop: centered column.
- **Video walkthrough (optional, one per listing)**: migration **033** adds
  `listings.video_path` (file only — paste at merge). Upload in the listing
  wizard's photos step + owner edit (mp4/webm/mov, ≤60s advisory, ≤50MB,
  direct to the existing `listing-images` bucket under the owner's folder —
  the 016 ownership policy already covers it). Feed + gallery: muted
  `autoPlay playsInline loop` when visible. Everything degrades to photos.

### 3. Honest activity cues
- **Views**: new `listing_viewed {listingId}` event fired from the detail
  page (client ping, existing track()); count = real event count. No
  migration needed (031 table).
- **Saves**: server-side aggregate of `favorites` per listing.
- Display on detail page + feed overlay **only when ≥3** (never fabricated,
  never sad-zero). Exact copy: "12 students viewed · 4 saved".
- **New badge**: `created_at ≤ 72h` chip on cards + feed.
- **Just listed strip**: horizontal scroll of the 6 newest actives atop the
  grid view (hidden when fewer than 3 recent).

### Tests
- e2e: story-image route returns image/png with substantial bytes for a real
  active listing + 404-safe for bogus id; feed mode renders + snaps + toggle;
  events route accepts `listing_viewed`; counts hidden below threshold.
- unit: badge/threshold helpers.

### Explicitly NOT rebuilding
Messaging, favorites mechanics, profiles, Match, reviews, SEO metadata, the
OG 1200×630 image, analytics plumbing — all reused as-is.

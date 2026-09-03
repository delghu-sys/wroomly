'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * In-card image carousel: a horizontal scroll-snap strip so users can swipe /
 * scroll through every photo without opening the listing.
 *
 * Crucially, this gallery is NOT wrapped in the card's <Link> (see
 * BrandListingCard). A swipe on a photo therefore has no anchor to trigger —
 * it literally cannot navigate, which is what kept happening on touch when the
 * strip lived inside the link. Opening the listing is handled here instead:
 * a genuine TAP (the strip didn't scroll) pushes to `href`; a swipe scrolls and
 * navigates nothing. The browser already suppresses the click after a scroll,
 * and the scrollLeft guard is a second belt.
 */
export function CardGallery({
  images,
  alt,
  href,
  priority = false,
}: {
  images: string[]
  alt: string
  /** Listing URL — a tap on the photo opens it. */
  href: string
  priority?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  // scrollLeft when a press begins; if it moved by click time, it was a swipe.
  const pressScrollLeft = useRef(0)

  function markPressStart() {
    pressScrollLeft.current = ref.current?.scrollLeft ?? 0
  }

  function onClick() {
    const el = ref.current
    // A swipe moved the strip → don't open. A still tap → open the listing.
    if (el && Math.abs(el.scrollLeft - pressScrollLeft.current) > 6) return
    router.push(href)
  }

  function onScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== idx) setIdx(i)
  }

  function go(e: React.MouseEvent, dir: -1 | 1) {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    const next = Math.max(0, Math.min(images.length - 1, idx + dir))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setIdx(next)
  }

  const multi = images.length > 1

  return (
    <div className="relative w-full h-full">
      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDownCapture={markPressStart}
        onTouchStartCapture={markPressStart}
        onClick={onClick}
        // Horizontally scrollable region: keyboard-focusable + named so it
        // isn't a pointer-only control (WCAG 2.1.1). Arrow keys scroll it.
        tabIndex={multi ? 0 : undefined}
        role={multi ? 'group' : undefined}
        aria-label={multi ? `${alt}, ${images.length} photos, use arrow keys` : undefined}
        // No scroll-smooth class: that smooths USER swipes too and makes them
        // feel sticky on touch. The arrow buttons still animate via their
        // scrollTo({behavior:'smooth'}) call. overscroll-x-contain stops a
        // swipe past the last photo from chaining into the browser back-swipe.
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory overscroll-x-contain cursor-pointer [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-maize-bright/60"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative shrink-0 w-full h-full snap-center">
            <Image
              src={src}
              alt={i === 0 ? alt : ''}
              fill
              quality={75}
              priority={priority && i === 0}
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading={i === 0 ? undefined : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Bottom legibility scrim (doesn't block swipe/clicks) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in oklab, var(--navy-deep) 10%, transparent) 0%, transparent 30%, transparent 55%, color-mix(in oklab, var(--navy-deep) 28%, transparent) 100%)',
        }}
        aria-hidden
      />

      {multi && (
        <>
          {idx > 0 && (
            <button
              type="button"
              onClick={e => go(e, -1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-md text-ink opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition hover:bg-surface"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              type="button"
              onClick={e => go(e, 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-md text-ink opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition hover:bg-surface"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === idx ? 'w-4 bg-surface' : 'w-1.5 bg-white/55'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

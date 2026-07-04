'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * In-card image carousel: a horizontal scroll-snap strip so users can swipe /
 * scroll through every photo of a listing without opening it. Lives inside the
 * card's <Link>, so the arrow buttons stop propagation + prevent default to
 * avoid navigating; swiping the strip never fires a click, and tapping a photo
 * still opens the listing.
 */
export function CardGallery({ images, alt }: { images: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

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
        // When there's more than one photo the strip is a horizontally
        // scrollable region — make it keyboard-focusable and named so it isn't
        // a pointer-only control (WCAG 2.1.1 / scrollable-region-focusable).
        // Arrow keys scroll a focused overflow container natively.
        tabIndex={multi ? 0 : undefined}
        role={multi ? 'group' : undefined}
        aria-label={multi ? `${alt} — ${images.length} photos, use arrow keys` : undefined}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[oklch(0.84_0.17_85/0.60)]"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative shrink-0 w-full h-full snap-center">
            <Image
              src={src}
              alt={i === 0 ? alt : ''}
              fill
              // q75 is visually indistinguishable at card sizes and cuts
              // bytes ~35% vs q90 — phones decode + scroll these in bulk.
              quality={75}
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading={i === 0 ? undefined : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Bottom legibility scrim (doesn't block swipe/clicks) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, oklch(0.22 0.075 256 / 0.10) 0%, transparent 30%, transparent 55%, oklch(0.22 0.075 256 / 0.28) 100%)',
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-md text-ink opacity-0 group-hover:opacity-100 focus:opacity-100 transition hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              type="button"
              onClick={e => go(e, 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-md text-ink opacity-0 group-hover:opacity-100 focus:opacity-100 transition hover:bg-white"
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
                  i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/55'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import type { ListingImage } from '@/types/database'
import { getListingImageUrl } from '@/lib/utils/listing'
import { ChevronLeft, ChevronRight, BedDouble, X } from 'lucide-react'

interface BrandedGalleryProps {
  images: ListingImage[]
  title: string
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export function BrandedGallery({ images, title }: BrandedGalleryProps) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const prev = useCallback(() => {
    setDirection(-1)
    setCurrent(c => (c - 1 + images.length) % images.length)
  }, [images.length])
  const next = useCallback(() => {
    setDirection(1)
    setCurrent(c => (c + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, prev, next])

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-3xl flex items-center justify-center bg-[oklch(0.95_0.01_85)]">
        <BedDouble className="w-16 h-16 text-ink-muted/40" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main image with crossfade */}
        <div
          className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-[oklch(0.10_0.02_260)] cursor-zoom-in shadow-[0_18px_50px_oklch(0_0_0/0.10)]"
          onClick={() => setLightboxOpen(true)}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 60 : -60, scale: 1.02 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction > 0 ? -60 : 60, scale: 1.02 }}
              transition={{ ...spring, stiffness: 80 }}
              className="absolute inset-0"
            >
              <Image
                src={getListingImageUrl(images[current].storage_path)}
                alt={`${title} — photo ${current + 1}`}
                fill
                quality={92}
                className="object-cover"
                priority={current === 0}
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </motion.div>
          </AnimatePresence>

          {/* Bottom scrim for legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, transparent 50%, oklch(0.10 0.02 260 / 0.45) 100%)',
            }}
            aria-hidden
          />

          {images.length > 1 && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation()
                  prev()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur hover:bg-white text-ink flex items-center justify-center shadow-[0_4px_12px_oklch(0_0_0/0.20)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.92] hover:scale-105"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  next()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur hover:bg-white text-ink flex items-center justify-center shadow-[0_4px_12px_oklch(0_0_0/0.20)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.92] hover:scale-105"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Animated counter */}
              <div className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.10] backdrop-blur-md border border-white/[0.15]">
                <motion.span
                  key={current}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={spring}
                  className="font-display text-sm text-white tabular-nums"
                >
                  {String(current + 1).padStart(2, '0')}
                </motion.span>
                <span className="text-white/40 text-sm">/</span>
                <span className="text-white/60 text-sm tabular-nums">
                  {String(images.length).padStart(2, '0')}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip with active indicator */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => {
                  setDirection(i > current ? 1 : -1)
                  setCurrent(i)
                }}
                className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96]"
                aria-label={`Photo ${i + 1}`}
                aria-current={i === current}
              >
                <Image
                  src={getListingImageUrl(img.storage_path)}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                {/* Inactive overlay */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    i === current ? 'opacity-0' : 'opacity-50 bg-white'
                  }`}
                  aria-hidden
                />
                {/* Active ring */}
                {i === current && (
                  <motion.span
                    layoutId="gallery-active-thumb"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl ring-2 ring-[oklch(0.84_0.17_85)]"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-[oklch(0.10_0.02_260/0.97)] flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur flex items-center justify-center transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tabular-nums">
            {String(current + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation()
                  prev()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur flex items-center justify-center transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  next()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur flex items-center justify-center transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-5xl max-h-[85vh] mx-4 aspect-auto"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={getListingImageUrl(images[current].storage_path)}
              alt={`${title} — photo ${current + 1}`}
              width={1920}
              height={1080}
              quality={95}
              className="object-contain w-full h-full max-h-[85vh] rounded-2xl"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </>
  )
}

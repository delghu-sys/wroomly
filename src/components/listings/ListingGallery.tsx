'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { ListingImage } from '@/types/database'
import { getListingImageUrl } from '@/lib/utils/listing'
import { ChevronLeft, ChevronRight, BedDouble, X } from 'lucide-react'

interface ListingGalleryProps {
  images: ListingImage[]
  title: string
}

export function ListingGallery({ images, title }: ListingGalleryProps) {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const prev = useCallback(() => setCurrent(c => (c - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setCurrent(c => (c + 1) % images.length), [images.length])

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
      <div className="aspect-[16/9] bg-gray-100 rounded-2xl flex items-center justify-center">
        <BedDouble className="w-16 h-16 text-gray-300" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {/* Main image */}
        <div
          className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={getListingImageUrl(images[current].storage_path)}
            alt={`${title} — photo ${current + 1}`}
            fill
            quality={90}
            className="object-cover"
            priority={current === 0}
            sizes="(max-width: 1024px) 100vw, 66vw"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                {current + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 ring-2 transition-all ${
                  i === current ? 'ring-blue-600' : 'ring-transparent hover:ring-gray-300'
                }`}
              >
                <Image
                  src={getListingImageUrl(img.storage_path)}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {current + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
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
              className="object-contain w-full h-full max-h-[85vh] rounded-lg"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </>
  )
}

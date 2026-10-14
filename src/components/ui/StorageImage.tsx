'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

/**
 * next/image for photos stored in Supabase. The global loader
 * (src/lib/image-loader.ts) requests a resized copy; if that request fails —
 * e.g. the transformation quota is exhausted — this retries the ORIGINAL
 * file, so a resize problem costs speed, never a broken photo.
 */
export default function StorageImage({ alt, onError, unoptimized, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false)
  return (
    <Image
      {...props}
      alt={alt}
      unoptimized={unoptimized || failed}
      onError={e => {
        setFailed(true)
        onError?.(e)
      }}
    />
  )
}

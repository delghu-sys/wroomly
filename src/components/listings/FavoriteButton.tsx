'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  listingId: string
  userId: string | null
  isFavorited: boolean
}

export function FavoriteButton({ listingId, userId, isFavorited }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(isFavorited)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      toast.error('Sign in to save listings')
      return
    }

    const supabase = createClient()
    const prev = favorited
    setFavorited(!prev)

    if (prev) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId)
      if (error) {
        setFavorited(prev)
        toast.error('Could not remove from saved')
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, listing_id: listingId })
      if (error) {
        setFavorited(prev)
        toast.error('Could not save listing')
      } else {
        toast.success('Saved to favorites')
      }
    }

    startTransition(() => router.refresh())
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface/90 backdrop-blur border border-line flex items-center justify-center hover:scale-110 transition-transform"
      aria-label={favorited ? 'Remove from saved' : 'Save listing'}
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          favorited ? 'fill-red-500 stroke-red-500' : 'stroke-ink-muted'
        }`}
      />
    </button>
  )
}

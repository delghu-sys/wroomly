'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface FavoriteButtonProps {
  listingId: string
  userId: string | null
  isFavorited: boolean
}

export function FavoriteButton({ listingId, userId, isFavorited }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(isFavorited)
  const [isPending, startTransition] = useTransition()
  const [showAuth, setShowAuth] = useState(false)
  const router = useRouter()

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      setShowAuth(true)
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
        // Offer a jump to the saved list right at save time — closes the loop
        // so people learn where their favorites live without hunting for it.
        toast.success('Saved to favorites', {
          action: { label: 'View saved', onClick: () => router.push('/favorites') },
        })
      }
    }

    startTransition(() => router.refresh())
  }

  return (
    <>
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

      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-maize/30 flex items-center justify-center mb-2">
              <Heart className="w-5 h-5 text-navy" />
            </div>
            <DialogTitle className="text-center font-display text-xl">Save this listing</DialogTitle>
            <DialogDescription className="text-center">
              Sign in to save listings and come back to them later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Link href={`/sign-in?next=/listings`} onClick={() => setShowAuth(false)}>
              <Button className="w-full rounded-full bg-navy text-white hover:bg-navy/90 h-11">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up" onClick={() => setShowAuth(false)}>
              <Button variant="outline" className="w-full rounded-full h-11">
                Create account
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

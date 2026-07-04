'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Share2, Link2, MessageCircle, MessageSquare, ImageDown, Loader2 } from 'lucide-react'
import { track } from '@/lib/track'

interface ShareListingProps {
  listingId: string
  title: string
  priceLabel?: string | null
}

/**
 * Share sheet for a listing (docs/social-share-audit.md item 1).
 *
 * "Share story image" fetches the 1080×1920 card from ./story-image and
 * pushes it through the Web Share API as a FILE — the honest route to an
 * Instagram story (IG has no web intent for stories; the OS share sheet →
 * Instagram → Story works with a shared image). Link options cover the
 * places UMich students actually paste things: iMessage, WhatsApp, GroupMe
 * (via copy). Desktop degrades to copy-link. All methods tracked.
 */
export function ShareListing({ listingId, title, priceLabel }: ShareListingProps) {
  const [busy, setBusy] = useState(false)

  const url = `https://wroomly.app/listings/${listingId}`
  const text = `${title}${priceLabel ? ` — ${priceLabel}` : ''} · verified UMich sublet`

  // File-share support (mobile share sheets); probed lazily with a dummy file.
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    !!navigator.canShare &&
    navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })
  const canShareLink = typeof navigator !== 'undefined' && !!navigator.share

  async function shareStory() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/listings/${listingId}/story-image`)
      if (!res.ok) throw new Error('image failed')
      const blob = await res.blob()
      const file = new File([blob], 'wroomly-listing.png', { type: 'image/png' })
      await navigator.share({ files: [file], title, text: `${text} ${url}` })
      track('share_completed', { method: 'story_image', listingId })
    } catch (err) {
      // AbortError = user closed the sheet; not a failure worth surfacing.
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Could not share the image — link copied instead.')
        await copyLink(false)
      }
    } finally {
      setBusy(false)
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title, text, url })
      track('share_completed', { method: 'native_link', listingId })
    } catch {
      /* user dismissed */
    }
  }

  async function copyLink(announce = true) {
    try {
      await navigator.clipboard.writeText(url)
      if (announce) toast.success('Link copied — paste it anywhere.')
      track('share_completed', { method: 'copy_link', listingId })
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  function shareWhatsApp() {
    track('share_completed', { method: 'whatsapp', listingId })
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank')
  }

  function shareMessages() {
    track('share_completed', { method: 'sms', listingId })
    window.location.href = `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`
  }

  return (
    <DropdownMenu onOpenChange={open => open && track('share_opened', { listingId })}>
      <DropdownMenuTrigger
        aria-label="Share this listing"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-line bg-white text-[13px] font-medium text-ink hover:border-[oklch(0.84_0.17_85/0.5)] transition active:scale-[0.98]"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        Share
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {canShareFiles && (
          <DropdownMenuItem onClick={shareStory} disabled={busy}>
            <ImageDown className="w-4 h-4 mr-2" />
            Share story image
          </DropdownMenuItem>
        )}
        {canShareLink && (
          <DropdownMenuItem onClick={shareLink}>
            <Share2 className="w-4 h-4 mr-2" />
            Share link…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => copyLink()}>
          <Link2 className="w-4 h-4 mr-2" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareMessages}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareWhatsApp}>
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

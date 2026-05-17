'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BedDouble, BadgeCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusDot } from './StatusDot'

interface ThreadHeaderProps {
  otherName: string | null
  otherAvatarUrl: string | null
  otherInitials: string
  listingId: string | null
  listingTitle: string | null
  listingNeighborhood: string | null
  listingThumbnail: string | null
  /** When true → show active green dot ("Active now"). */
  active?: boolean
  /** Override label for the status line (e.g. "Last seen 3h ago"). */
  statusLabel?: string
}

export function ThreadHeader({
  otherName,
  otherAvatarUrl,
  otherInitials,
  listingId,
  listingTitle,
  listingNeighborhood,
  listingThumbnail,
  active = true,
  statusLabel,
}: ThreadHeaderProps) {
  return (
    <header
      className="
        shrink-0 px-4 sm:px-5 py-3.5
        bg-white/85 backdrop-blur-xl border-b border-line
      "
      style={{ boxShadow: 'inset 0 -1px 0 oklch(0 0 0 / 0.04)' }}
    >
      <div className="flex items-center gap-3">
        {/* Back arrow — mobile only */}
        <Link
          href="/messages"
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-ink-muted/10 transition-colors active:scale-95 shrink-0"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
        </Link>

        {/* Counterparty avatar */}
        <Avatar className="h-10 w-10 ring-1 ring-line shrink-0">
          <AvatarImage src={otherAvatarUrl ?? undefined} />
          <AvatarFallback
            className="text-xs font-semibold"
            style={{
              background: 'oklch(0.10 0.02 260)',
              color: 'oklch(0.84 0.17 85)',
            }}
          >
            {otherInitials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-[15px] tracking-tight text-ink truncate">
              {otherName ?? 'Unknown'}
            </p>
            <BadgeCheck
              className="w-4 h-4 shrink-0 fill-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)]"
              strokeWidth={2.25}
              aria-label="Verified"
            />
          </div>
          <StatusDot
            active={active}
            label={statusLabel ?? (active ? 'Active now' : 'Recently active')}
          />
        </div>

        {/* Listing thumbnail link — right side */}
        {listingId && (
          <Link
            href={`/listings/${listingId}`}
            className="hidden sm:flex items-center gap-3 max-w-[280px] pl-3 ml-1 border-l border-line group"
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[oklch(0.95_0.01_85)] ring-1 ring-line">
              {listingThumbnail ? (
                <Image
                  src={listingThumbnail}
                  alt={listingTitle ?? ''}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  sizes="44px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BedDouble className="w-4 h-4 text-ink-muted/40" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-[13px] tracking-tight text-ink truncate group-hover:text-[oklch(0.45_0.13_85)] transition-colors">
                {listingTitle}
              </p>
              {listingNeighborhood && (
                <p className="text-[11px] text-ink-muted truncate">
                  {listingNeighborhood}
                </p>
              )}
            </div>
          </Link>
        )}
      </div>
    </header>
  )
}

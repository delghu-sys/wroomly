'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ShieldCheck, Star, ArrowRight } from 'lucide-react'
import { SocialPill } from '@/components/users/SocialPill'

interface SupplierCardProps {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
    university: string | null
    created_at: string
    bio: string | null
    instagram_handle?: string | null
  }
  ratingAvg: number | null
  reviewCount: number
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export function SupplierCard({ user, ratingAvg, reviewCount }: SupplierCardProps) {
  const initials = user.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px 0px' }}
      transition={spring}
      whileHover={{ y: -2 }}
      className="
        group relative rounded-3xl overflow-hidden
        border border-line bg-white/70 backdrop-blur-xl p-6
        transition-shadow duration-500
        hover:shadow-[0_18px_50px_oklch(0_0_0/0.08)]
      "
    >
      {/* Glass refraction highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.7)' }}
        aria-hidden
      />

      {/* Whole-card link layered behind the action chips so the
          Instagram pill can capture its own clicks. */}
      <Link
        href={`/users/${user.id}`}
        aria-label={`Open ${user.full_name ?? 'profile'}`}
        className="absolute inset-0 z-0 rounded-3xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.30)]"
      />

      <div className="relative z-10 pointer-events-none flex items-start gap-4">
        {/* Avatar with animated verified badge */}
        <div className="relative">
          <Avatar className="h-14 w-14 ring-1 ring-line">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[oklch(0.22_0.075_256)] text-[oklch(0.84_0.17_85)] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[oklch(0.84_0.17_85)] flex items-center justify-center ring-2 ring-white">
            <ShieldCheck
              className="w-3.5 h-3.5 text-[oklch(0.22_0.075_256)]"
              strokeWidth={2.25}
            />
            <span className="absolute inset-0 rounded-full bg-[oklch(0.84_0.17_85)] animate-ping opacity-30" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg tracking-tight text-ink truncate">
              {user.full_name}
            </p>
            <ArrowRight className="w-4 h-4 text-ink-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[oklch(0.45_0.13_85)] shrink-0" />
          </div>

          <div className="flex items-center gap-3 text-sm mt-1.5">
            <span className="inline-flex items-center gap-1 text-[oklch(0.45_0.13_85)] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              U of M verified
            </span>
            {ratingAvg !== null && (
              <span className="inline-flex items-center gap-1 text-ink">
                <Star className="w-3.5 h-3.5 fill-[oklch(0.84_0.17_85)] stroke-[oklch(0.84_0.17_85)]" />
                <span className="font-medium tabular-nums">
                  {ratingAvg.toFixed(1)}
                </span>
                <span className="text-ink-muted">({reviewCount})</span>
              </span>
            )}
          </div>

          {user.bio && (
            <p className="text-sm text-ink-soft mt-3 line-clamp-2 leading-relaxed">
              {user.bio}
            </p>
          )}

          {/* "View full profile" + Instagram chip row — interactive,
              opt back in to pointer events so the SocialPill is clickable. */}
          <div className="mt-4 flex flex-wrap items-center gap-3 pointer-events-auto">
            <Link
              href={`/users/${user.id}`}
              className="
                inline-flex items-center gap-1 text-[12.5px] font-medium
                text-[oklch(0.45_0.13_85)]
                underline-offset-4 hover:underline transition-colors
                focus:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.84_0.17_85/0.25)]
                rounded-full px-1
                relative z-10
              "
            >
              View full profile
              <span aria-hidden>→</span>
            </Link>
            {user.instagram_handle && (
              <SocialPill
                network="instagram"
                handle={user.instagram_handle}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

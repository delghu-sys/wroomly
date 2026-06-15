'use client'

import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, CalendarBlank, Crown } from '@phosphor-icons/react/dist/ssr'
import { format, parseISO } from 'date-fns'
import { VerifiedSeal } from './VerifiedSeal'
import { StarRating } from './StarRating'

interface ProfileHeroProps {
  fullName: string | null
  avatarUrl: string | null
  initials: string
  university: string | null
  createdAt: string
  isVerified: boolean
  isAdmin: boolean
  userType: 'supplier' | 'consumer' | 'admin'
  ratingAvg: number | null
  ratingCount: number
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

export function ProfileHero({
  fullName,
  avatarUrl,
  initials,
  university,
  createdAt,
  isVerified,
  isAdmin,
  userType,
  ratingAvg,
  ratingCount,
}: ProfileHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="
        relative overflow-hidden rounded-3xl
        border border-line bg-white/70 backdrop-blur-xl
        p-6 sm:p-8
        shadow-[0_2px_12px_oklch(0_0_0/0.04)]
      "
      style={{
        boxShadow:
          'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 2px 12px oklch(0 0 0 / 0.04)',
      }}
    >
      {/* Soft maize mesh blob behind avatar */}
      <div
        className="pointer-events-none absolute -top-20 -left-10 w-72 h-72 rounded-full blur-3xl opacity-25"
        style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
        aria-hidden
      />

      <div className="relative">
        {/* Avatar — 96px brand accent */}
        <motion.div
          initial={{ scale: 0.7, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="relative inline-flex"
        >
          <Avatar
            className="ring-2 ring-white shadow-[0_8px_28px_oklch(0.84_0.17_85/0.30)]"
            style={{ width: 80, height: 80 }}
          >
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback
              className="font-display tracking-tight"
              style={{
                background: 'oklch(0.84 0.17 85)',
                color: 'oklch(0.22 0.075 256)',
                fontSize: 30,
                lineHeight: 1,
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {isVerified && (
            <span className="absolute -bottom-1 -right-1">
              <span className="inline-flex items-center justify-center rounded-full bg-white p-0.5 ring-2 ring-white shadow-[0_4px_14px_oklch(0.84_0.17_85/0.30)]">
                <VerifiedSeal size={26} />
              </span>
            </span>
          )}
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.18 }}
          className="font-display text-[clamp(1.75rem,3vw,2.5rem)] tracking-tight text-ink mt-5 leading-[1.05]"
        >
          {fullName ?? 'Anonymous'}
        </motion.h1>

        {/* Badges row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.24 }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          {isVerified && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
              style={{
                background: 'oklch(0.84 0.17 85 / 0.15)',
                color: 'oklch(0.32 0.10 85)',
              }}
            >
              U of M verified
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-white border border-line text-ink-soft capitalize"
          >
            {userType}
          </span>
          {isAdmin && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[oklch(0.22_0.075_256)] text-white"
            >
              <Crown size={11} weight="fill" />
              Admin
            </span>
          )}
        </motion.div>

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="mt-4 space-y-1.5 text-[13px] text-ink-muted"
        >
          {university && (
            <p className="inline-flex items-center gap-1.5">
              <MapPin size={14} weight="duotone" />
              {university}
            </p>
          )}
          <p className="inline-flex items-center gap-1.5">
            <CalendarBlank size={14} weight="duotone" />
            On Wroomly since {format(parseISO(createdAt), 'MMM yyyy')}
          </p>
        </motion.div>

        {/* Rating */}
        {ratingAvg !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.36 }}
            className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
          >
            <StarRating
              value={ratingAvg}
              size={14}
              showValue
              count={ratingCount}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

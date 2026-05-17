'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Review, User } from '@/types/database'
import { StarRating } from './StarRating'

type ReviewWithReviewer = Review & {
  reviewer: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

interface ReviewListProps {
  reviews: ReviewWithReviewer[]
}

const list = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const card = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ReviewList({ reviews }: ReviewListProps) {
  return (
    <motion.ul
      variants={list}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-80px 0px' }}
      className="space-y-4"
    >
      {reviews.map(r => (
        <motion.li
          key={r.id}
          variants={card}
          className="
            relative rounded-3xl overflow-hidden
            border border-line bg-white/85 backdrop-blur-xl
            shadow-[0_2px_12px_oklch(0_0_0/0.04)]
          "
          style={{
            boxShadow:
              'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 2px 12px oklch(0 0 0 / 0.04)',
          }}
        >
          <div className="p-5 sm:p-6 flex gap-4">
            <Link href={`/users/${r.reviewer.id}`} className="shrink-0">
              <Avatar className="h-10 w-10 ring-1 ring-line">
                <AvatarImage src={r.reviewer?.avatar_url ?? undefined} />
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{
                    background: 'oklch(0.10 0.02 260)',
                    color: 'oklch(0.84 0.17 85)',
                  }}
                >
                  {initials(r.reviewer.full_name)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/users/${r.reviewer.id}`}
                  className="font-medium text-ink hover:text-[oklch(0.45_0.13_85)] transition-colors"
                >
                  {r.reviewer?.full_name ?? 'Anonymous'}
                </Link>
                <span className="text-[11px] text-ink-muted tabular-nums">
                  ·{' '}
                  {formatDistanceToNowStrict(parseISO(r.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="mt-1">
                <StarRating value={r.rating} size={14} />
              </div>
              {r.comment && (
                <p className="text-[14.5px] text-ink-soft mt-3 leading-relaxed whitespace-pre-line italic font-light">
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  )
}

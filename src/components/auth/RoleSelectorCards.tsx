'use client'

import { motion, AnimatePresence } from 'motion/react'
import {
  House,
  MagnifyingGlass,
  Check,
  ShieldCheck,
  EnvelopeOpen,
} from '@phosphor-icons/react/dist/ssr'

export type Role = 'supplier' | 'consumer'

interface RoleSelectorCardsProps {
  selected: Role | null
  onSelect: (role: Role) => void
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }
const popSpring = { type: 'spring' as const, stiffness: 240, damping: 16 }

interface RoleDef {
  value: Role
  icon: typeof House
  title: string
  body: string
  badge: string
  badgeIcon: typeof ShieldCheck
}

const ROLES: RoleDef[] = [
  {
    value: 'supplier',
    icon: House,
    title: 'I have a place',
    body: 'Subletting your apartment or room near U of M.',
    badge: 'Any email accepted',
    badgeIcon: ShieldCheck,
  },
  {
    value: 'consumer',
    icon: MagnifyingGlass,
    title: 'I need a place',
    body: 'Student from another university looking for housing near U of M.',
    badge: 'Any email accepted',
    badgeIcon: EnvelopeOpen,
  },
]

export function RoleSelectorCards({ selected, onSelect }: RoleSelectorCardsProps) {
  // Once any role is selected, unselected cards become slightly muted
  const hasSelection = selected !== null

  return (
    <div className="space-y-4">
      {ROLES.map((role, i) => {
        const active = selected === role.value
        const muted = hasSelection && !active
        const Icon = role.icon
        const BadgeIcon = role.badgeIcon

        return (
          <motion.button
            key={role.value}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: muted ? 0.55 : 1,
              y: 0,
              scale: active ? 1 : muted ? 0.985 : 1,
            }}
            transition={{ ...spring, delay: 0.2 + i * 0.08 }}
            whileHover={{ y: -2, scale: active ? 1.01 : 1.005 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSelect(role.value)}
            aria-pressed={active}
            className={`
              relative group w-full p-6 sm:p-7 rounded-3xl text-left overflow-hidden
              transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
              focus:outline-none focus-visible:ring-4 focus-visible:ring-maize-bright/25
              ${
                active
                  ? 'bg-surface border-[2px] border-gold-deep shadow-glow-maize'
                  : 'bg-white/70 backdrop-blur border-[2px] border-line hover:border-maize-bright/40 hover:shadow-2'
              }
            `}
            style={
              active
                ? {
                    background:
                      'linear-gradient(180deg, color-mix(in oklab, var(--maize-bright) 10%, transparent) 0%, oklch(1 0 0) 60%)',
                  }
                : undefined
            }
          >
            {/* Selected checkmark badge — top-right, spring pop-in */}
            <AnimatePresence>
              {active && (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={popSpring}
                  className="absolute top-4 right-4 inline-flex w-7 h-7 rounded-full items-center justify-center shadow-glow-maize"
                  style={{
                    background: 'var(--maize-bright)',
                    color: 'var(--navy-deep)',
                  }}
                  aria-hidden
                >
                  <Check size={14} weight="bold" />
                </motion.span>
              )}
            </AnimatePresence>

            <div className="relative flex items-start gap-4">
              <motion.div
                animate={{
                  scale: active ? 1.05 : 1,
                  rotate: active ? -4 : 0,
                }}
                transition={spring}
                className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
                  transition-colors duration-500
                  ${
                    active
                      ? 'bg-navy-deep text-maize-bright shadow-glow-navy'
                      : 'bg-[oklch(0.97_0.008_75)] text-ink-soft group-hover:bg-navy-deep group-hover:text-maize-bright'
                  }
                `}
              >
                <Icon size={24} weight={active ? 'fill' : 'duotone'} />
              </motion.div>

              <div className="flex-1 min-w-0 pr-8">
                <h3 className="font-display text-xl tracking-tight text-ink">
                  {role.title}
                </h3>
                <p className="text-ink-soft text-[14px] mt-1.5 leading-relaxed max-w-[42ch]">
                  {role.body}
                </p>
                <span
                  className={`
                    inline-flex items-center gap-1.5 mt-4 text-[11px] font-medium rounded-full px-2.5 py-1
                    transition-colors duration-500
                    ${
                      active
                        ? 'bg-maize-bright/18 text-[oklch(0.32_0.10_85)]'
                        : 'bg-[oklch(0.97_0.008_75)] text-ink-soft'
                    }
                  `}
                >
                  <BadgeIcon size={11} weight="bold" />
                  {role.badge}
                </span>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

'use client'

import { SealCheck, GraduationCap, User, Check } from '@phosphor-icons/react/dist/ssr'

/**
 * The "Are you a University of Michigan student?" choice, as two clear cards
 * (matching RoleSelectorCards) instead of a cramped segmented toggle. The
 * answer decides the auth method: UMich → Google @umich.edu SSO only (2-step
 * verified, earns the blue check); not-UMich → Google / Apple / email.
 */

interface Props {
  selected: boolean | null
  onSelect: (isUmich: boolean) => void
}

const OPTIONS: {
  value: boolean
  icon: typeof GraduationCap
  title: string
  body: string
  badge: string
  accent: boolean
}[] = [
  {
    value: true,
    icon: GraduationCap,
    title: 'Yes, I’m a UMich student',
    body: 'Sign in with your @umich.edu Google account — the university’s secure 2-step login.',
    badge: 'Gets the blue verified check',
    accent: true,
  },
  {
    value: false,
    icon: User,
    title: 'No, I’m not',
    body: 'Sign up with Google, Apple, or email. You can still browse, inquire, and list.',
    badge: 'No verification needed',
    accent: false,
  },
]

export function UmichSelectorCards({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {OPTIONS.map(opt => {
        const active = selected === opt.value
        const Icon = opt.icon
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={active}
            className={`
              relative group w-full p-4 sm:p-5 rounded-2xl text-left overflow-hidden
              transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              focus:outline-none focus-visible:ring-4
              ${
                active && opt.accent
                  ? 'bg-[oklch(0.55_0.22_264/0.06)] border-[2px] border-[#2F6BFF] focus-visible:ring-[oklch(0.55_0.22_264/0.20)]'
                  : active
                    ? 'bg-white border-[2px] border-navy focus-visible:ring-[oklch(0.22_0.075_256/0.18)]'
                    : 'bg-white/70 backdrop-blur border-[2px] border-line hover:border-[oklch(0.55_0.22_264/0.40)] focus-visible:ring-[oklch(0.55_0.22_264/0.15)]'
              }
            `}
          >
            {active && (
              <span
                className="absolute top-3.5 right-3.5 inline-flex w-6 h-6 rounded-full items-center justify-center"
                style={{
                  background: opt.accent ? '#2F6BFF' : 'oklch(0.22 0.075 256)',
                  color: '#fff',
                }}
                aria-hidden
              >
                <Check size={13} weight="bold" />
              </span>
            )}
            <div className="flex items-start gap-3.5 pr-7">
              <span
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  active && opt.accent
                    ? 'bg-[#2F6BFF] text-white'
                    : active
                      ? 'bg-navy text-white'
                      : 'bg-[oklch(0.97_0.008_75)] text-ink-soft group-hover:bg-[#2F6BFF] group-hover:text-white'
                }`}
              >
                <Icon size={22} weight={active ? 'fill' : 'duotone'} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-[17px] tracking-tight text-ink leading-snug">
                  {opt.title}
                </h3>
                <p className="text-ink-soft text-[13px] mt-1 leading-relaxed">
                  {opt.body}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                    opt.accent
                      ? 'bg-[oklch(0.55_0.22_264/0.10)] text-[#2F6BFF]'
                      : 'bg-[oklch(0.97_0.008_75)] text-ink-soft'
                  }`}
                >
                  {opt.accent && <SealCheck size={12} weight="fill" />}
                  {opt.badge}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

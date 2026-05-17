import type { LucideIcon } from 'lucide-react'

interface BrandChipProps {
  children: React.ReactNode
  icon?: LucideIcon
  /** Visual variant — primary (maize fill), ghost (outline), accent (subtle maize tint) */
  variant?: 'primary' | 'ghost' | 'accent' | 'navy'
  className?: string
}

/**
 * Brand micro-chip. Used for "Sublet", "Furnished", "Pets OK", etc.
 * Pure presentational — safe in Server Components.
 */
export function BrandChip({
  children,
  icon: Icon,
  variant = 'ghost',
  className = '',
}: BrandChipProps) {
  const styles = {
    primary:
      'bg-[oklch(0.84_0.17_85)] text-[oklch(0.10_0.02_260)] border border-[oklch(0.84_0.17_85)]',
    ghost:
      'bg-white/85 backdrop-blur text-ink border border-line shadow-[0_1px_2px_oklch(0_0_0/0.04)]',
    accent:
      'bg-[oklch(0.84_0.17_85_/_0.12)] text-[oklch(0.45_0.13_85)] border border-[oklch(0.84_0.17_85_/_0.25)]',
    navy:
      'bg-[oklch(0.10_0.02_260)] text-[oklch(0.84_0.17_85)] border border-[oklch(0.10_0.02_260)]',
  } as const

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${styles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
      {children}
    </span>
  )
}

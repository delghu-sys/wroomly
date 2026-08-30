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
      'bg-maize-bright text-navy-deep border border-maize-bright',
    ghost:
      'bg-white/85 backdrop-blur text-ink border border-line shadow-[0_1px_2px_oklch(0_0_0/0.04)]',
    accent:
      'bg-maize-bright/12 text-gold-deep border border-maize-bright/25',
    navy:
      'bg-navy-deep text-maize-bright border border-navy-deep',
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

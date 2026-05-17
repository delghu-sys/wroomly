'use client'

import { forwardRef } from 'react'

interface BrandFormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helper?: string
  /** Right-side accessory (e.g. "Forgot password?" link) */
  trailing?: React.ReactNode
}

/**
 * Branded form input. Labels above, brand-colored focus ring,
 * inline error below — no default blue browser styling.
 */
export const BrandFormInput = forwardRef<HTMLInputElement, BrandFormInputProps>(
  function BrandFormInput(
    { label, error, helper, trailing, className = '', id, ...rest },
    ref
  ) {
    const inputId = id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold"
          >
            {label}
          </label>
          {trailing}
        </div>

        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={`
            h-12 w-full rounded-2xl bg-white border px-4 text-[15px] text-ink
            placeholder:text-ink-muted/60
            shadow-[0_1px_2px_oklch(0_0_0/0.04)]
            transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            focus:outline-none focus:ring-4
            ${
              error
                ? 'border-[oklch(0.65_0.20_25)] focus:ring-[oklch(0.65_0.20_25/0.15)]'
                : 'border-line focus:border-[oklch(0.45_0.13_85)] focus:ring-[oklch(0.84_0.17_85/0.20)]'
            }
            ${className}
          `}
        />

        {error ? (
          <p className="text-xs text-[oklch(0.55_0.20_25)] mt-1.5">{error}</p>
        ) : helper ? (
          <p className="text-xs text-ink-muted mt-1.5">{helper}</p>
        ) : null}
      </div>
    )
  }
)

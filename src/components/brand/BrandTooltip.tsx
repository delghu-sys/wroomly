'use client'

import { Tooltip } from '@base-ui/react/tooltip'
import type { ReactNode } from 'react'

interface BrandTooltipProps {
  /** Element that owns the hover/focus state. */
  children: ReactNode
  /** Tooltip body — short, plain-language explanation. */
  content: ReactNode
  /** Side to place the tooltip. Default 'top'. */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Delay before showing (ms). Default 200. */
  delay?: number
}

/**
 * Brand-styled tooltip on top of Base UI's primitive. Dark glass panel,
 * maize accent border, spring-feel transition driven by data-state attrs
 * + the brand's standard `cubic-bezier(0.22,1,0.36,1)` curve.
 *
 * Use `BrandTooltip` directly — the parent app already wraps the tree in
 * `<Tooltip.Provider />` only when needed; the Root supports its own delay,
 * so an explicit Provider isn't required for one-offs.
 */
export function BrandTooltip({
  children,
  content,
  side = 'top',
  delay = 200,
}: BrandTooltipProps) {
  return (
    <Tooltip.Provider delay={delay} closeDelay={120}>
      <Tooltip.Root>
        <Tooltip.Trigger render={children as React.ReactElement} />
        <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={8}>
          <Tooltip.Popup
            className="
              z-[80]
              max-w-[260px] sm:max-w-[300px]
              px-3.5 py-2.5
              rounded-2xl
              text-[12.5px] leading-snug
              text-white/85
              border border-white/[0.10]
              shadow-[0_18px_50px_oklch(0_0_0/0.40)]
              backdrop-blur-xl
              origin-[var(--transform-origin)]
              transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.94]
              data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.96]
              data-[instant]:duration-0
            "
            style={{
              background: 'oklch(0.10 0.02 260 / 0.92)',
              boxShadow:
                'inset 0 1px 0 oklch(1 0 0 / 0.10), 0 18px 50px oklch(0 0 0 / 0.40)',
            }}
          >
            {/* Soft maize accent stripe along the top for brand recognition */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-0 h-px"
              style={{ background: 'oklch(0.84 0.17 85 / 0.40)' }}
            />
            {content}
            <Tooltip.Arrow
              className="
                fill-[oklch(0.10_0.02_260/0.92)]
                stroke-white/[0.10]
                data-[side=top]:-bottom-[7px]
                data-[side=bottom]:-top-[7px]
              "
            />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

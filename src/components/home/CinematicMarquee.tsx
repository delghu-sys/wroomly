'use client'

import { useState } from 'react'

const buildings = [
  'The Standard',
  'Foundry Lofts',
  'Six11',
  'Landmark',
  'Hub William',
  'Vic Village',
  'Saga',
  'The Yard',
  'The Legacy',
  'Verve',
]

const buildingsAlt = [
  'Verve',
  'The Yard',
  'Landmark',
  'Saga',
  'Foundry Lofts',
  'Hub William',
  'Six11',
  'Vic Village',
  'The Standard',
  'The Legacy',
]

export function CinematicMarquee() {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative overflow-hidden py-7 border-y border-white/[0.04]"
      style={{ background: 'oklch(0.09 0.02 260)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient fade masks */}
      <div
        className="absolute inset-y-0 left-0 w-32 sm:w-48 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, oklch(0.09 0.02 260), transparent)' }}
      />
      <div
        className="absolute inset-y-0 right-0 w-32 sm:w-48 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, oklch(0.09 0.02 260), transparent)' }}
      />

      {/* Row 1 */}
      <div
        className="flex whitespace-nowrap will-change-transform animate-marquee mb-3"
        style={{ animationDuration: hovered ? '70s' : '35s' }}
      >
        {[0, 1, 2].map(dup => (
          <div key={dup} className="flex items-center shrink-0">
            {buildings.map(name => (
              <span
                key={`${dup}-${name}`}
                className={`font-display text-xl sm:text-2xl tracking-tight uppercase px-6 sm:px-8 transition-colors duration-700 ${
                  hovered ? 'text-white/30' : 'text-white/[0.12]'
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Row 2 — reverse direction */}
      <div
        className="flex whitespace-nowrap will-change-transform animate-marquee-reverse"
        style={{ animationDuration: hovered ? '90s' : '45s' }}
      >
        {[0, 1, 2].map(dup => (
          <div key={dup} className="flex items-center shrink-0">
            {buildingsAlt.map(name => (
              <span
                key={`${dup}-${name}`}
                className={`font-display text-xl sm:text-2xl tracking-tight uppercase px-6 sm:px-8 transition-colors duration-700 ${
                  hovered ? 'text-white/30' : 'text-white/[0.12]'
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

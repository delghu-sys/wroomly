/**
 * Subtle background atmosphere for the message thread.
 *
 * Pure server-renderable — no animation, no JS. Provides depth via
 * a cream base, two very-low-opacity mesh blobs, and a fine grain.
 * Less intense than the homepage hero so the chat reads as functional.
 */

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

export function MessageAtmosphere() {
  return (
    <>
      {/* Base */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'oklch(0.97 0.008 75)' }}
        aria-hidden
      />
      {/* Grain */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-[0.025] mix-blend-multiply"
        style={{
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
        aria-hidden
      />
      {/* Two soft mesh blobs */}
      <div
        className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full blur-[120px] opacity-[0.18] -z-10"
        style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
        aria-hidden
      />
      <div
        className="absolute -bottom-20 -left-32 w-[480px] h-[480px] rounded-full blur-[140px] opacity-[0.10] -z-10"
        style={{ background: 'oklch(0.45 0.10 280 / 0.30)' }}
        aria-hidden
      />
    </>
  )
}

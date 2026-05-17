/**
 * Server-safe atmospheric background — dark navy mesh + noise overlay.
 * Matches the homepage hero / CTA section treatment.
 *
 * Use as the first child of a `relative isolate overflow-hidden` section
 * so the noise + mesh sits behind real content.
 */

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

interface AtmosphericBackgroundProps {
  /** Background base color — defaults to homepage dark navy */
  base?: string
  /** Slightly different mesh layout flavor */
  variant?: 'hero' | 'panel' | 'auth'
}

export function AtmosphericBackground({
  base = 'oklch(0.10 0.02 260)',
  variant = 'hero',
}: AtmosphericBackgroundProps) {
  return (
    <>
      {/* Base color */}
      <div className="absolute inset-0 -z-10" style={{ background: base }} aria-hidden />

      {/* Noise overlay */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
        aria-hidden
      />

      {/* Mesh gradients — three blobs, position varies by variant */}
      {variant === 'hero' && (
        <>
          <div
            className="absolute top-[-10%] left-[5%] w-[700px] h-[700px] rounded-full blur-[140px] opacity-30 -z-10 animate-float-slow"
            style={{ background: 'oklch(0.22 0.06 265)' }}
            aria-hidden
          />
          <div
            className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 -z-10 animate-float"
            style={{ background: 'oklch(0.84 0.17 85 / 0.35)' }}
            aria-hidden
          />
          <div
            className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 -z-10"
            style={{ background: 'oklch(0.50 0.10 280)' }}
            aria-hidden
          />
        </>
      )}
      {variant === 'panel' && (
        <>
          <div
            className="absolute -top-20 left-[12%] w-[420px] h-[420px] rounded-full blur-3xl opacity-30 -z-10 animate-float"
            style={{ background: 'oklch(0.84 0.17 85 / 0.25)' }}
            aria-hidden
          />
          <div
            className="absolute bottom-0 right-[8%] w-[520px] h-[520px] rounded-full blur-3xl opacity-25 -z-10 animate-float-slow"
            style={{ background: 'oklch(0.50 0.10 280 / 0.5)' }}
            aria-hidden
          />
        </>
      )}
      {variant === 'auth' && (
        <>
          <div
            className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-45 -z-10 animate-float"
            style={{ background: 'oklch(0.84 0.17 85 / 0.30)' }}
            aria-hidden
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[560px] h-[560px] rounded-full blur-[140px] opacity-25 -z-10 animate-float-slow"
            style={{ background: 'oklch(0.45 0.10 280 / 0.55)' }}
            aria-hidden
          />
          <div
            className="absolute top-[35%] right-[25%] w-[260px] h-[260px] rounded-full blur-[100px] opacity-15 -z-10"
            style={{ background: 'oklch(0.22 0.06 265)' }}
            aria-hidden
          />
        </>
      )}
    </>
  )
}

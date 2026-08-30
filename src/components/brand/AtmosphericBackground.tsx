/**
 * Server-safe atmospheric background — dark navy base + noise overlay.
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
  /** Accepted for call-site compatibility; the variants only differed in
      their decorative mesh blobs, which are gone. */
  variant?: 'hero' | 'panel' | 'auth'
}

export function AtmosphericBackground({
  base = 'var(--navy-deep)',
}: AtmosphericBackgroundProps) {
  return (
    <>
      {/* Base color */}
      <div className="absolute inset-0 -z-10" style={{ background: base }} aria-hidden />

      {/* Noise overlay — desktop only. At 3.5% opacity it's imperceptible on
          a phone screen, but it costs real money there: mix-blend-overlay
          forces an extra compositing pass over the giant blurred mesh blobs
          (seconds of raster on a throttled CPU), and Chrome counts the
          full-viewport image background as the page's LCP element — home's
          "7.6s LCP" was literally this invisible layer finishing its paint. */}
      <div
        className="hidden sm:block absolute inset-0 -z-10 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
        aria-hidden
      />
    </>
  )
}

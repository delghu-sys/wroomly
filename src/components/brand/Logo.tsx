import Image from 'next/image'

interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <Image
      src="/logo.png"
      alt="Wroomly logo"
      width={size}
      height={size}
      className={className || undefined}
      style={{ width: size, height: size }}
    />
  )
}

interface LogoFullProps {
  size?: number
  className?: string
  dark?: boolean
}

export function LogoFull({ size = 32, className = '', dark = false }: LogoFullProps) {
  const textColor = dark ? 'text-white' : 'text-ink'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-display text-lg font-semibold tracking-tighter ${textColor}`}>
        wroomly
      </span>
    </span>
  )
}

import Image from 'next/image'

interface ElivLogoProps {
  size?: number
  className?: string
}

export function ElivLogo({ size = 32, className }: ElivLogoProps) {
  return (
    <Image
      src="/logo_eliv.svg"
      alt="Eliv"
      width={size}
      height={size}
      className={className}
    />
  )
}

type BrandSize = 'sm' | 'md' | 'lg'

const sizeConfig = {
  sm: { icon: 28, font: 24, pt: 3 },
  md: { icon: 36, font: 30, pt: 3 },
  lg: { icon: 48, font: 40, pt: 5 },
}

interface ElivBrandProps {
  /** Fixed size (backwards compat) */
  size?: number
  /** Responsive: 'sm' | 'md' | 'lg' — overrides size */
  responsive?: `${BrandSize}/${BrandSize}`
  className?: string
  dark?: boolean
}

export function ElivBrand({ size, responsive, className, dark = true }: ElivBrandProps) {
  if (responsive) {
    const [mobile, desktop] = responsive.split('/') as [BrandSize, BrandSize]
    const m = sizeConfig[mobile]
    const d = sizeConfig[desktop]

    return (
      <span className={className ?? ''}>
        {/* Mobile */}
        <span className="flex items-center gap-2 md:hidden">
          <Image
            src="/logo_eliv.svg"
            alt="Eliv"
            width={m.icon}
            height={m.icon}
            className="rounded-lg"
            style={{ width: m.icon, height: m.icon }}
          />
          <span
            style={{
              fontFamily: "'Eugusto', serif",
              fontSize: m.font,
              lineHeight: 1,
              letterSpacing: '0.02em',
              fontWeight: 700,
              WebkitTextStroke: '0.3px currentColor',
              display: 'flex',
              alignItems: 'center',
              height: m.icon,
              paddingTop: m.pt,
            }}
            className={dark ? 'text-theme-textPrimary' : 'text-white'}
          >
            ELIV
          </span>
        </span>
        {/* Desktop */}
        <span className="hidden md:flex items-center gap-2">
          <Image
            src="/logo_eliv.svg"
            alt="Eliv"
            width={d.icon}
            height={d.icon}
            className="rounded-lg"
            style={{ width: d.icon, height: d.icon }}
          />
          <span
            style={{
              fontFamily: "'Eugusto', serif",
              fontSize: d.font,
              lineHeight: 1,
              letterSpacing: '0.02em',
              fontWeight: 700,
              WebkitTextStroke: '0.3px currentColor',
              display: 'flex',
              alignItems: 'center',
              height: d.icon,
              paddingTop: d.pt,
            }}
            className={dark ? 'text-theme-textPrimary' : 'text-white'}
          >
            ELIV
          </span>
        </span>
      </span>
    )
  }

  // Fallback: fixed size (for nav, smaller uses)
  const s = size ?? 32
  return (
    <span className={`flex items-center gap-2 ${className ?? ''}`}>
      <Image
        src="/logo_eliv.svg"
        alt="Eliv"
        width={s}
        height={s}
        className="rounded-lg"
      />
      <span
        style={{
          fontFamily: "'Eugusto', serif",
          fontSize: s * 0.85,
          lineHeight: 1,
          letterSpacing: '0.02em',
          fontWeight: 700,
          WebkitTextStroke: '0.3px currentColor',
          display: 'flex',
          alignItems: 'center',
          height: s,
          paddingTop: s * 0.1,
        }}
        className={dark ? 'text-theme-textPrimary' : 'text-white'}
      >
        ELIV
      </span>
    </span>
  )
}

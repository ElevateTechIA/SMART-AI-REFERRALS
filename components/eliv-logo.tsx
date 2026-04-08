interface ElivLogoProps {
  size?: number
  className?: string
}

function ElivIcon({ size = 32 }: { size: number }) {
  return (
    <svg
      viewBox="0 0 1080 1080"
      preserveAspectRatio="xMidYMid meet"
      width={size}
      height={size}
      fill="currentColor"
    >
      <path d="M267.58,195.56c-74.42,16.63-136.43,63.14-163.42,145.13-26.58,80.73-6.23,170.16,55.45,228.64,39.73,37.67,91.91,58.88,155.82,64.57,89.62,1.73,161.19-30.23,214.03-97.18-5.8-33.71-25.45-52.12-55.53-59-33.43,57-83.72,81.93-145.77,84.45-74.28-6.31-127.5-38.58-148.08-111.06h386.41c1.35-123.19-60.42-216.94-166.16-250.27-42.93-13.53-88.8-15.1-132.73-5.29ZM175.44,380.54c18.99-54.61,52.79-91.65,105.39-106.39,30.42-8.52,62.73-7.96,93.02,1.02,52.86,15.67,87.43,52.03,107.01,105.37H175.44Z" />
      <path d="M620.85,476.57l83.3,134.2,182.79-382.93,59,60.16-201.3,430.37-49.75,40.49-128.39-208.24c6.18-36.12,23.93-61.14,54.35-74.04Z" />
      <path d="M556.06,282.21l34.71,98.34c59.28-101.62,140.26-125.58,237.16-92.55l34.71-71.73c-111.88-43.92-215.67-32.82-306.58,65.94Z" />
      <path d="M792.07,674.4c193.33-122.35,225.31-241.37,172.38-358.64l-172.38,358.64Z" />
      <path d="M254.11,648.94l280.24,241.79,143.18-120.9-41.65-67.68-101.53,90.24-158.77-137.67c-40.19,6.75-80.71,4.09-121.47-5.78Z" />
    </svg>
  )
}

export function ElivLogo({ size = 32, className }: ElivLogoProps) {
  return (
    <span className={className} style={{ color: 'var(--theme-secondary)' }}>
      <ElivIcon size={size} />
    </span>
  )
}

type BrandSize = 'sm' | 'md' | 'lg'

const sizeConfig = {
  sm: { icon: 28, font: 28, pt: 2 },
  md: { icon: 36, font: 36, pt: 3 },
  lg: { icon: 48, font: 48, pt: 4 },
}

interface ElivBrandProps {
  /** Fixed size (backwards compat) */
  size?: number
  /** Responsive: 'sm' | 'md' | 'lg' — overrides size */
  responsive?: `${BrandSize}/${BrandSize}`
  className?: string
  dark?: boolean
  /** Force dark text for light backgrounds (overrides dark prop) */
  forceDark?: boolean
  /** Override logo color directly */
  color?: string
}

export function ElivBrand({ size, responsive, className, forceDark = false, color }: ElivBrandProps) {
  // forceDark uses CSS class for light/dark adaptation on public pages
  // default (dashboard) → adapts via textPrimary
  const logoColor = color ?? (forceDark ? undefined : 'var(--theme-textPrimary)')
  const logoClass = forceDark ? 'text-theme-highlight' : ''

  if (responsive) {
    const [mobile, desktop] = responsive.split('/') as [BrandSize, BrandSize]
    const m = sizeConfig[mobile]
    const d = sizeConfig[desktop]

    return (
      <span className={`${className ?? ''} ${logoClass}`}>
        {/* Mobile */}
        <span className="flex items-center gap-2 md:hidden" style={{ color: logoColor }}>
          <span
            style={{
              fontFamily: "'Eight One', sans-serif",
              fontSize: m.font,
              lineHeight: 1,
              letterSpacing: '0.02em',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              height: m.icon,
              paddingTop: m.pt,
            }}
          >
            eliv
          </span>
        </span>
        {/* Desktop */}
        <span className="hidden md:flex items-center gap-2" style={{ color: logoColor }}>
          <span
            style={{
              fontFamily: "'Eight One', sans-serif",
              fontSize: d.font,
              lineHeight: 1,
              letterSpacing: '0.02em',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              height: d.icon,
              paddingTop: d.pt,
            }}
          >
            eliv
          </span>
        </span>
      </span>
    )
  }

  // Fallback: fixed size (for nav, smaller uses)
  const s = size ?? 32
  return (
    <span className={`flex items-center gap-2 ${className ?? ''} ${logoClass}`} style={{ color: logoColor }}>
      <span
        style={{
          fontFamily: "'Eight One', sans-serif",
          fontSize: s,
          lineHeight: 1,
          letterSpacing: '0.02em',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          height: s,
          paddingTop: s * 0.08,
        }}
      >
        eliv
      </span>
    </span>
  )
}

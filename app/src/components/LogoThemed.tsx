import Image from 'next/image'

interface Props {
  size?: number
  className?: string
}

// CSS-driven logo swap based on data-theme on <html> — no JS flash
export default function LogoThemed({ size = 60, className = '' }: Props) {
  return (
    <span className="inline-block relative" style={{ width: size, height: size }}>
      <Image
        src="/logo-light.png"
        alt="Seven Lions Studio"
        width={size}
        height={size}
        className={`sl-logo-dark absolute inset-0 ${className}`}
      />
      <Image
        src="/logo-dark.png"
        alt=""
        width={size}
        height={size}
        aria-hidden
        className={`sl-logo-light absolute inset-0 ${className}`}
      />
    </span>
  )
}

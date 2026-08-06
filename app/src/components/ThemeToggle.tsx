'use client'

import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative w-14 h-7 border border-sl-accent/40 hover:border-sl-accent transition-all duration-300 overflow-hidden"
    >
      {/* Sliding pill — covers L in light mode, D in dark mode */}
      <div
        className="absolute top-0 bottom-0 w-7 bg-sl-accent transition-transform duration-300 ease-in-out"
        style={{ transform: theme === 'dark' ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {/* Labels rendered above the pill */}
      <div className="absolute inset-0 flex">
        <span
          className="flex-1 flex items-center justify-center text-[9px] font-display font-black tracking-wider transition-colors duration-300"
          style={{ color: theme === 'light' ? 'var(--sl-on-accent)' : 'var(--sl-muted)' }}
        >
          L
        </span>
        <span
          className="flex-1 flex items-center justify-center text-[9px] font-display font-black tracking-wider transition-colors duration-300"
          style={{ color: theme === 'dark' ? 'var(--sl-on-accent)' : 'var(--sl-muted)' }}
        >
          D
        </span>
      </div>
    </button>
  )
}

'use client'

export default function ThemeInitScript() {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `(function(){var s=localStorage.getItem('sl-theme');var p=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',s||p);})()`,
      }}
    />
  )
}

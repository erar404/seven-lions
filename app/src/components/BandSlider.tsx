'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Band } from '@/types/database'

const DURATION = 5800

export default function BandSlider() {
  const [bands, setBands] = useState<Band[]>([])
  const [active, setActive] = useState(0)
  const [burning, setBurning] = useState(false)
  const isFirstMount = useRef(true)

  useEffect(() => {
    const s = createClient()
    s.from('bands')
      .select('*')
      .order('band_name')
      .then(({ data }) => {
        if (data) setBands(data.filter(b => b.picture_urls?.length > 0))
      })
  }, [])

  // Auto-advance resets each time `active` changes
  useEffect(() => {
    if (bands.length <= 1) return
    const t = setTimeout(() => setActive(i => (i + 1) % bands.length), DURATION)
    return () => clearTimeout(t)
  }, [active, bands.length])

  // Film burn flash on slide change (skip initial mount)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setBurning(true)
    const t = setTimeout(() => setBurning(false), 380)
    return () => clearTimeout(t)
  }, [active])

  if (bands.length === 0) return null

  const band = bands[active]

  return (
    <section
      aria-label="Studio Artists"
      className="relative w-full overflow-hidden"
      style={{ height: '72vh', minHeight: '500px' }}
    >
      {/* Photo layers — crossfade per slide */}
      {bands.map((b, i) => (
        <div
          key={b.id}
          className="absolute inset-0"
          style={{
            opacity: i === active ? 1 : 0,
            transition: 'opacity 1.1s ease-in-out',
            zIndex: i === active ? 1 : 0,
          }}
        >
          <img
            /* key change forces remount → restarts kenburns animation */
            key={i === active ? `on-${b.id}` : `off-${b.id}`}
            src={b.picture_urls[0]}
            alt={b.band_name}
            className="absolute inset-0 w-full h-full object-cover grayscale"
            style={{
              animation: i === active
                ? `kenburns ${DURATION + 1200}ms ease-out forwards`
                : 'none',
              transformOrigin: '55% 50%',
            }}
          />
        </div>
      ))}

      {/* Layered gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, #000 0%, rgba(0,0,0,0.68) 30%, rgba(0,0,0,0.15) 100%)',
          zIndex: 2,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          zIndex: 2,
        }}
      />

      {/* Film burn flash on slide transition */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 4,
          background: 'rgba(255,255,255,1)',
          opacity: burning ? 0.07 : 0,
          transition: burning ? 'opacity 0.05s ease' : 'opacity 0.55s ease',
        }}
      />

      {/* Grain texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '220px 220px',
          mixBlendMode: 'overlay',
          opacity: 0.55,
        }}
      />

      {/* UI layer */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 lg:p-16" style={{ zIndex: 10 }}>
        {/* Top */}
        <div className="flex items-center justify-between">
          <p
            className="font-body text-white/35 uppercase"
            style={{ fontSize: '0.6rem', letterSpacing: '0.38em' }}
          >
            Studio Artists
          </p>
          <p
            className="font-display text-white/20 font-black"
            style={{ fontSize: '0.7rem', letterSpacing: '0.14em' }}
          >
            {String(active + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(bands.length).padStart(2, '0')}
          </p>
        </div>

        {/* Bottom — name + nav */}
        <div className="flex items-end justify-between gap-8">
          <div className="flex-1 min-w-0">
            {band.loyalty_card_count > 0 && (
              <p
                key={`meta-${active}`}
                className="font-body text-white/25 uppercase"
                style={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.32em',
                  marginBottom: '0.6rem',
                  animation: 'fadeInUp 0.5s ease-out forwards',
                }}
              >
                {band.loyalty_card_count}&nbsp;Reservation{band.loyalty_card_count !== 1 ? 's' : ''}
              </p>
            )}

            <h2
              key={`name-${active}`}
              className="font-display text-white font-black leading-none"
              style={{
                fontSize: 'clamp(2.25rem, 5.5vw + 1.25rem, 7rem)',
                letterSpacing: '-0.025em',
                animation: 'bandNameReveal 0.65s cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            >
              {band.band_name.toUpperCase()}
            </h2>

            {band.band_description && (
              <p
                key={`desc-${active}`}
                className="font-body text-white/30 mt-3 line-clamp-1"
                style={{
                  fontSize: '0.78rem',
                  maxWidth: '28rem',
                  animation: 'fadeInUp 0.9s ease-out forwards',
                }}
              >
                {band.band_description}
              </p>
            )}
          </div>

          {/* Vertical nav — thin bars */}
          {bands.length > 1 && (
            <div className="flex flex-col items-center gap-[7px] shrink-0 self-end pb-px">
              {bands.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to ${bands[i].band_name}`}
                  style={{
                    width: '2px',
                    height: i === active ? '30px' : '7px',
                    backgroundColor:
                      i === active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'height 0.35s ease, background-color 0.35s ease',
                    display: 'block',
                    borderRadius: '1px',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress line */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', zIndex: 11 }}
      >
        <div
          key={`prog-${active}`}
          style={{
            height: '100%',
            width: '0%',
            backgroundColor: 'rgba(255,255,255,0.55)',
            animation: `sliderProgress ${DURATION}ms linear forwards`,
          }}
        />
      </div>
    </section>
  )
}

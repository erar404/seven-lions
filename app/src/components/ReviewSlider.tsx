'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import clsx from 'clsx'
import type { StudioReview } from '@/types/database'

const DURATION = 7000

const ASPECTS = [
  { key: 'accommodation_rating', label: 'Accommodation' },
  { key: 'equipment_rating',     label: 'Equipment' },
  { key: 'personnel_rating',     label: 'Personnel' },
] as const

function AspectDots({ value, label }: { value: number | null; label: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <span className="font-body text-white/35 uppercase" style={{ fontSize: '0.58rem', letterSpacing: '0.28em', minWidth: '80px' }}>{label}</span>
      <div className="flex gap-[3px]">
        {[1,2,3,4,5].map(n => (
          <div
            key={n}
            style={{
              width: '14px',
              height: '2px',
              backgroundColor: n <= value ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ReviewSlider({ reviews }: { reviews: StudioReview[] }) {
  const [active, setActive] = useState(0)
  const [burning, setBurning] = useState(false)
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (reviews.length <= 1) return
    const t = setTimeout(() => setActive(i => (i + 1) % reviews.length), DURATION)
    return () => clearTimeout(t)
  }, [active, reviews.length])

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setBurning(true)
    const t = setTimeout(() => setBurning(false), 380)
    return () => clearTimeout(t)
  }, [active])

  const go = (dir: 1 | -1) => setActive(i => (i + dir + reviews.length) % reviews.length)

  if (reviews.length === 0) return null

  const rev = reviews[active]

  return (
    <section
      aria-label="Client Reviews"
      className="relative w-full overflow-hidden"
      style={{ minHeight: '640px' }}
    >
      {/* Photo backgrounds — crossfade per slide */}
      {reviews.map((r, i) => (
        <div
          key={r.id}
          className="absolute inset-0"
          style={{
            opacity: i === active ? 1 : 0,
            transition: 'opacity 1.2s ease-in-out',
            zIndex: i === active ? 1 : 0,
          }}
        >
          {r.photo_urls?.[0] ? (
            <img
              key={i === active ? `on-${r.id}` : `off-${r.id}`}
              src={r.photo_urls[0]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover grayscale"
              style={{
                animation: i === active
                  ? `${active % 2 === 0 ? 'panDown' : 'panUp'} ${DURATION + 1200}ms ease-in-out forwards`
                  : 'none',
              }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #141414 0%, #0A0A0A 100%)' }}
            />
          )}
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.4) 100%)', zIndex: 2 }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)', zIndex: 2 }} />

      {/* Film burn */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 4, background: 'rgba(255,255,255,1)', opacity: burning ? 0.06 : 0, transition: burning ? 'opacity 0.05s ease' : 'opacity 0.55s ease' }} />

      {/* Grain */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 3, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '220px 220px', mixBlendMode: 'overlay', opacity: 0.5 }} />

      {/* UI layer */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 lg:p-16" style={{ zIndex: 10 }}>

        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-body text-white/35 uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.38em' }}>What Our Clients Say</p>
          </div>
          <p className="font-display text-white/20 font-black" style={{ fontSize: '0.7rem', letterSpacing: '0.14em' }}>
            {String(active + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(reviews.length).padStart(2, '0')}
          </p>
        </div>

        {/* Center — quote block */}
        <div className="flex-1 flex items-center max-w-3xl">
          <div>
            <Quote
              key={`quote-icon-${active}`}
              size={28}
              className="text-sl-accent mb-4 opacity-60"
              style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}
            />
            {rev.review_text ? (
              <p
                key={`text-${active}`}
                className="font-body text-white/90 leading-relaxed"
                style={{
                  fontSize: 'clamp(1rem, 1.5vw + 0.5rem, 1.5rem)',
                  maxWidth: '36rem',
                  animation: 'fadeInUp 0.6s ease-out forwards',
                }}
              >
                {rev.review_text.length > 220
                  ? rev.review_text.slice(0, 220).trimEnd() + '…'
                  : rev.review_text}
              </p>
            ) : (
              <p
                key={`empty-${active}`}
                className="font-display text-white/40 italic"
                style={{ fontSize: '1.1rem', animation: 'fadeInUp 0.6s ease-out forwards' }}
              >
                — No written review
              </p>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between gap-6 flex-wrap">

          {/* Left — reviewer info */}
          <div className="flex flex-col gap-2">
            {/* Overall stars */}
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(n => (
                <Star
                  key={n}
                  size={15}
                  className={n <= rev.overall_rating ? 'text-white fill-white' : 'text-white/15'}
                />
              ))}
              <span className="font-body text-white/35 ml-1" style={{ fontSize: '0.65rem', letterSpacing: '0.12em' }}>
                {rev.overall_rating}.0 / 5
              </span>
            </div>

            {/* Name + date */}
            <h3
              key={`name-${active}`}
              className="font-display text-white font-black leading-none"
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw + 0.5rem, 2.8rem)',
                letterSpacing: '-0.02em',
                animation: 'bandNameReveal 0.65s cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            >
              {rev.reviewer_name.toUpperCase()}
            </h3>

            <p className="font-body text-white/25" style={{ fontSize: '0.65rem', letterSpacing: '0.2em' }}>
              {new Date(rev.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Right — aspects + nav */}
          <div className="flex items-end gap-8">

            {/* Aspect ratings */}
            {(rev.accommodation_rating || rev.equipment_rating || rev.personnel_rating) && (
              <div
                key={`aspects-${active}`}
                className="flex flex-col gap-2 pb-px"
                style={{ animation: 'fadeInUp 0.8s ease-out forwards' }}
              >
                {ASPECTS.map(({ key, label }) => (
                  <AspectDots
                    key={key}
                    value={rev[key as keyof StudioReview] as number | null}
                    label={label}
                  />
                ))}
              </div>
            )}

            {/* Prev / Next + vertical bar nav */}
            <div className="flex items-end gap-4">
              {reviews.length > 1 && (
                <div className="flex gap-2 pb-px">
                  <button
                    onClick={() => go(-1)}
                    aria-label="Previous review"
                    className="w-8 h-8 border border-white/20 flex items-center justify-center text-white/50 hover:border-white/60 hover:text-white transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => go(1)}
                    aria-label="Next review"
                    className="w-8 h-8 border border-white/20 flex items-center justify-center text-white/50 hover:border-white/60 hover:text-white transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {reviews.length > 1 && (
                <div className="flex flex-col items-center gap-[7px] shrink-0 self-end pb-px">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      aria-label={`Go to review ${i + 1}`}
                      style={{
                        width: '2px',
                        height: i === active ? '30px' : '7px',
                        backgroundColor: i === active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)',
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
        </div>
      </div>

      {/* Photo thumbnails strip (when multiple photos in one review) */}
      {rev.photo_urls?.length > 1 && (
        <div className="absolute bottom-0 right-0 flex gap-1 p-3" style={{ zIndex: 11 }}>
          {rev.photo_urls.slice(1, 4).map((url, i) => (
            <img key={i} src={url} alt="" className="w-12 h-12 object-cover grayscale opacity-50 hover:opacity-80 transition-opacity" />
          ))}
          {rev.photo_urls.length > 4 && (
            <div className="w-12 h-12 bg-black/60 flex items-center justify-center">
              <span className="font-display text-white/60 text-xs">+{rev.photo_urls.length - 4}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress line */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', zIndex: 11 }}>
        <div
          key={`prog-${active}`}
          style={{ height: '100%', width: '0%', backgroundColor: 'rgba(255,255,255,0.45)', animation: `sliderProgress ${DURATION}ms linear forwards` }}
        />
      </div>
    </section>
  )
}

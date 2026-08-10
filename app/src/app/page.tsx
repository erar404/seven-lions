import Image from 'next/image'
import Link from 'next/link'
import LogoThemed from '@/components/LogoThemed'
import BandSlider from '@/components/BandSlider'
import HeroBackground from '@/components/HeroBackground'
import LocationMap from '@/components/LocationMap'
import ReviewSlider from '@/components/ReviewSlider'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Music, Mic2, Guitar, Wrench, Video, Star } from 'lucide-react'
import clsx from 'clsx'

const services = [
  {
    icon: Music,
    title: 'Studio Rental',
    subtitle: 'Band Rehearsal',
    description: 'Full backline gear, microphones, speaker monitors, and mixer included. Bring your band and make noise.',
    price: '₱150/hour per gear',
    href: '/rehearsal-booking',
    cta: 'Book Rehearsal',
  },
  {
    icon: Mic2,
    title: 'Recording & Jingle',
    subtitle: 'Production',
    description: 'Single-track, multi-track recording, mixing, mastering, and custom jingle production packages.',
    price: 'Custom Package',
    href: '/request-service?type=recording',
    cta: 'Request Service',
  },
  {
    icon: Guitar,
    title: 'Guitar & Drum',
    subtitle: 'Lessons',
    description: 'Private lessons with professional tutors. Regular and student rates available.',
    price: 'From ₱300/hour',
    href: '/request-service?type=guitar_lesson',
    cta: 'Request Lesson',
  },
  {
    icon: Wrench,
    title: 'Guitar & Bass',
    subtitle: 'Setup & Repair',
    description: 'String action, intonation, hardware cleaning, fingerboard maintenance, fret leveling, and more.',
    price: 'Rate on Request',
    href: '/request-service?type=guitar_repair',
    cta: 'Request Repair',
  },
  {
    icon: Video,
    title: 'Video Shoot',
    subtitle: 'Production',
    description: 'Professional video production for music videos, promotional content, and live performance captures.',
    price: 'Custom Package',
    href: '/request-service?type=video_shoot',
    cta: 'Request Shoot',
  },
]

const houseRules = [
  'Walk-ins welcome; advance reservations recommended',
  'Arrive 10 minutes early for equipment checks',
  'Equipment inspected before departure',
  'Damage settlement required before leaving',
  'Food & drinks restricted to reception lounge only',
  'Pet-friendly facility',
  'No smoking inside the studio',
]

const galleryImages = [
  { src: 'https://sevenlions-studio.carrd.co/assets/images/gallery01/b00e64fc.jpg', alt: 'Studio space' },
  { src: 'https://sevenlions-studio.carrd.co/assets/images/gallery01/b6bbffd3.jpg', alt: 'Rehearsal area' },
  { src: 'https://sevenlions-studio.carrd.co/assets/images/gallery01/2b1b1c2f.jpg', alt: 'Studio interior' },
  { src: 'https://sevenlions-studio.carrd.co/assets/images/gallery02/1bd3d74c.jpg', alt: 'Backline gear' },
  { src: 'https://sevenlions-studio.carrd.co/assets/images/gallery02/53a0c917.jpg', alt: 'Equipment setup' },
  { src: 'https://sevenlions-studio.carrd.co/assets/images/gallery04/94604cee_original.jpg', alt: 'Lesson packages' },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: reviewData } = await supabase
    .from('studio_reviews')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(12)
  const reviews = reviewData ?? []
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div
            className="mb-8 flex justify-center fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            <span className="inline-block relative w-24 h-24 ring-2 ring-white/80 ring-offset-4 ring-offset-transparent rounded-full overflow-hidden">
              <LogoThemed size={96} />
            </span>
          </div>

          <p
            className="font-body text-white/60 text-xs tracking-[0.4em] uppercase mb-4 fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            Jorjo Bldg, Tandang Sora, Quezon City
          </p>

          <h1
            className="font-display text-white font-black mb-2 leading-none fade-in-up"
            style={{
              fontSize: 'clamp(3rem, 8vw + 1rem, 8rem)',
              letterSpacing: '-0.02em',
              animationDelay: '240ms',
            }}
          >
            SEVEN LIONS
          </h1>
          <h2
            className="font-display text-white/40 font-bold mb-8 fade-in-up"
            style={{
              fontSize: 'clamp(1.25rem, 2vw + 0.5rem, 2.5rem)',
              letterSpacing: '0.55em',
              animationDelay: '360ms',
            }}
          >
            STUDIO
          </h2>

          <p
            className="font-body text-white/65 text-base md:text-lg max-w-xl mx-auto mb-10 fade-in-up"
            style={{ lineHeight: 1.7, animationDelay: '460ms' }}
          >
            Where music comes to life. Professional recording, rehearsal, lessons, and instrument care in the heart of Quezon City.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up"
            style={{ animationDelay: '560ms' }}
          >
            <Link
              href="/rehearsal-booking"
              className="px-8 py-4 bg-white text-black font-body font-semibold text-xs tracking-[0.15em] uppercase hover:bg-white/90 transition-all duration-200"
            >
              Book Rehearsal
            </Link>
            <Link
              href="/services"
              className="px-8 py-4 border border-white/60 text-white font-body font-semibold text-xs tracking-[0.15em] uppercase hover:bg-white hover:text-black transition-all duration-200"
            >
              View Services
            </Link>
          </div>

          <div
            className="mt-12 flex items-center justify-center gap-6 text-sm text-white/40 fade-in-up"
            style={{ animationDelay: '660ms' }}
          >
            <a href="tel:09397321218" className="flex items-center gap-2 hover:text-white transition-colors font-body">
              <Phone size={14} />
              09397321218
            </a>
            <a
              href="https://maps.app.goo.gl/RDfGcAFp3UFiVFM86"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors font-body"
            >
              <MapPin size={14} />
              Get Directions
            </a>
          </div>
        </div>

        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce fade-in-up"
          style={{ animationDelay: '900ms' }}
        >
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent mx-auto" />
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3">What We Offer</p>
            <h2 className="font-display text-4xl md:text-5xl text-sl-fg font-black">OUR SERVICES</h2>
            <div className="w-16 h-px bg-sl-accent mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-sl-accent/10">
            {services.map((service, idx) => {
              const Icon = service.icon
              const isLast = idx === services.length - 1
              const danglesAtMd = isLast && services.length % 2 === 1
              const danglesAtLg = isLast && services.length % 3 === 2
              return (
                <div
                  key={service.title}
                  data-reveal=""
                  style={{ transitionDelay: `${idx * 70}ms` }}
                  className={clsx(
                    'bg-sl-bg p-8 group hover:bg-sl-card transition-all duration-300',
                    danglesAtMd && 'md:col-span-2',
                    danglesAtLg && 'lg:col-span-2'
                  )}
                >
                  <div className="w-10 h-10 border border-sl-accent/30 flex items-center justify-center mb-6 group-hover:bg-sl-accent group-hover:border-sl-accent transition-all duration-300">
                    <Icon size={18} className="text-sl-accent group-hover:text-sl-on-accent transition-colors duration-300" />
                  </div>
                  <h3 className="font-display text-sl-fg text-lg font-bold">{service.title}</h3>
                  <p className="font-body text-sl-muted text-xs tracking-widest uppercase mt-0.5 mb-4">
                    {service.subtitle}
                  </p>
                  <p className="font-body text-sm text-sl-muted/70 leading-relaxed mb-6">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sl-accent text-sm font-bold">{service.price}</span>
                    <Link
                      href={service.href}
                      className="text-xs font-body text-sl-accent border border-sl-accent/30 px-4 py-2 hover:bg-sl-accent hover:text-sl-on-accent hover:border-sl-accent transition-all duration-200 uppercase tracking-widest"
                    >
                      {service.cta}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 bg-sl-card px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12" data-reveal>
            <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3">The Space</p>
            <h2 className="font-display text-4xl md:text-5xl text-sl-fg font-black">STUDIO GALLERY</h2>
            <div className="w-16 h-px bg-sl-accent mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {galleryImages.map((img, i) => (
              <div
                key={i}
                data-reveal=""
                style={{ transitionDelay: `${i * 55}ms` }}
                className="relative aspect-square overflow-hidden group"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-sl-accent/0 group-hover:bg-sl-accent/10 transition-all duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <BandSlider />

      {/* Reviews */}
      {reviews.length > 0 && <ReviewSlider reviews={reviews} />}
      <section className="py-12 px-4 bg-sl-card border-b border-sl-accent/10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-body text-sl-muted text-xs tracking-[0.3em] uppercase mb-1">Been to the studio?</p>
            <h3 className="font-display text-sl-fg text-xl font-black">Share your experience with future clients.</h3>
          </div>
          <Link
            href="/review"
            className="shrink-0 px-7 py-3 border border-sl-accent text-sl-accent font-body font-semibold text-xs tracking-widest uppercase hover:bg-sl-accent hover:text-sl-on-accent transition-all"
          >
            Leave a Review
          </Link>
        </div>
      </section>

      {/* Loyalty Program */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-sl-card border border-sl-accent/20 p-10 relative overflow-hidden" data-reveal>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sl-accent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sl-accent to-transparent" />

            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="text-sl-accent fill-sl-accent" />
                ))}
              </div>
            </div>

            <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3">Members Only</p>
            <h2 className="font-display text-3xl md:text-4xl text-sl-fg font-black mb-6">LOYALTY PROGRAM</h2>
            <p className="font-body text-sl-muted text-lg leading-relaxed max-w-xl mx-auto">
              Complete <span className="text-sl-accent font-semibold">5 bookings</span> and earn{' '}
              <span className="text-sl-accent font-semibold">2 free hours</span> on your 6th booking.
              <br />
              <span className="text-sm text-sl-muted/60 mt-2 block">(Applicable to regular bookings only)</span>
            </p>
            <div className="mt-8">
              <Link
                href="/auth/signup"
                className="px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all inline-block"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* House Rules */}
      <section className="py-16 bg-sl-card px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12" data-reveal>
            <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3">Please Note</p>
            <h2 className="font-display text-4xl text-sl-fg font-black">HOUSE RULES</h2>
            <div className="w-16 h-px bg-sl-accent mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {houseRules.map((rule, i) => (
              <div
                key={i}
                data-reveal=""
                style={{ transitionDelay: `${i * 50}ms` }}
                className="flex items-start gap-3 py-3 border-b border-sl-accent/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sl-accent mt-2 shrink-0" />
                <p className="font-body text-sm text-sl-muted">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LocationMap />

      {/* CTA Banner */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center" data-reveal>
          <h2 className="font-display text-4xl md:text-5xl text-sl-fg font-black mb-6">READY TO CREATE?</h2>
          <p className="font-body text-sl-muted mb-10 text-lg max-w-xl mx-auto">
            Whether you&apos;re rehearsing, recording, learning, or getting your instrument serviced — we&apos;ve got the space and the team for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/rehearsal-booking"
              className="px-8 py-4 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
            >
              Book a Session
            </Link>
            <a
              href="https://m.me/sevenlions.studio"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-sl-accent text-sl-accent font-body font-semibold text-sm tracking-widest uppercase hover:bg-sl-accent hover:text-sl-on-accent transition-all"
            >
              Message Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

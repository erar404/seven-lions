import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Music, Mic2, Guitar, Wrench, Video, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Services | Seven Lions Studio',
  description: 'Complete list of services at Seven Lions Studio - studio rental, recording, lessons, repairs, and video shoots.',
}

const services = [
  {
    id: 'studio-rental',
    icon: Music,
    title: 'Studio Rental',
    subtitle: 'Band Rehearsal',
    tagline: 'Full backline. Plug in and play.',
    description:
      'Rent our fully-equipped rehearsal studio by the hour. All essential backline gear, microphones, speaker monitors, and mixing console are included in your rental — no hidden fees.',
    image: 'https://sevenlions-studio.carrd.co/assets/images/gallery01/b00e64fc.jpg',
    pricing: [
      { label: 'Studio Rate', value: '₱150/hour per gear' },
      { label: 'Drumsticks', value: '₱50/hour' },
    ],
    inclusions: [
      'Backline gear',
      'Microphones',
      'Speaker monitors',
      'Mixing console',
      'PA system',
    ],
    notes: 'Walk-ins welcome. Advance reservation recommended to guarantee your slot.',
    href: '/rehearsal-booking',
    cta: 'Book a Slot',
  },
  {
    id: 'recording',
    icon: Mic2,
    title: 'Recording & Jingle Production',
    subtitle: 'Studio Production',
    tagline: 'Your sound, professionally captured.',
    description:
      'From single-track demos to full multi-track productions, our recording services cover every stage of the production pipeline. Custom jingle packages available for businesses and content creators.',
    image: 'https://sevenlions-studio.carrd.co/assets/images/gallery01/b6bbffd3.jpg',
    pricing: [
      { label: 'Single-track Recording', value: 'Custom Quote' },
      { label: 'Multi-track Recording', value: 'Custom Quote' },
      { label: 'Mixing & Mastering', value: 'Custom Quote' },
      { label: 'Jingle Production', value: 'Tailored Package' },
    ],
    inclusions: [
      'Professional recording session',
      'Mixing and mastering',
      'Jingle composition (optional)',
      'Digital delivery',
    ],
    notes: 'Prices vary depending on project scope. Contact us for a custom quote.',
    href: '/request-service?type=recording',
    cta: 'Request Recording',
  },
  {
    id: 'lessons',
    icon: Guitar,
    title: 'Guitar & Drum Lessons',
    subtitle: 'Music Education',
    tagline: 'Learn from professional musicians.',
    description:
      'Private one-on-one lessons with professional tutors. Whether you\'re a complete beginner or looking to level up your skills, our instructors tailor each session to your goals. Minimum of 2 hours per session.',
    image: 'https://sevenlions-studio.carrd.co/assets/images/gallery04/94604cee_original.jpg',
    pricing: [
      { label: 'Regular Rate', value: '₱400/hour' },
      { label: 'Student Rate', value: '₱300/hour (with valid school ID)' },
      { label: 'Minimum Session', value: '2 hours' },
    ],
    inclusions: [
      'One-on-one instruction',
      'Tailored curriculum',
      'Guitar or drum lessons',
      'Studio space during lesson',
    ],
    notes: 'Student discount requires valid school ID at time of booking.',
    href: '/request-service?type=guitar_lesson',
    cta: 'Request a Lesson',
  },
  {
    id: 'repair',
    icon: Wrench,
    title: 'Guitar & Bass Setup & Repair',
    subtitle: 'Instrument Care',
    tagline: 'We keep your instrument playing its best.',
    description:
      'From basic setups to complex repairs, our technicians handle all your instrument needs. We service guitars, basses, and everything in between with professional attention to detail.',
    image: 'https://sevenlions-studio.carrd.co/assets/images/gallery02/c3629f44.jpg',
    pricing: [
      { label: 'Setup & Repair', value: 'Rate on Request' },
    ],
    inclusions: [
      'String action adjustment',
      'Intonation setup',
      'Hardware cleaning & lubrication',
      'Fingerboard cleaning & conditioning',
      'Fret leveling & crowning',
      'Truss rod adjustment',
      'Pickup height adjustment',
      'Electronics check & cleaning',
    ],
    notes: 'Please contact us to discuss your instrument\'s specific needs and get a quote.',
    href: '/request-service?type=guitar_repair',
    cta: 'Request Repair',
  },
  {
    id: 'video',
    icon: Video,
    title: 'Video Shoot',
    subtitle: 'Visual Production',
    tagline: 'Bring your music to the screen.',
    description:
      'Professional video production services for music videos, live performance captures, behind-the-scenes content, and promotional material. Showcase your artistry with high-quality video.',
    image: 'https://sevenlions-studio.carrd.co/assets/images/gallery01/77eac1ff.jpg',
    pricing: [
      { label: 'Video Production', value: 'Custom Package' },
    ],
    inclusions: [
      'Pre-production consultation',
      'Studio space for filming',
      'Video capture & direction',
      'Post-production editing',
      'Digital delivery',
    ],
    notes: 'Packages are fully customized based on project scope. Contact us for pricing.',
    href: '/request-service?type=video_shoot',
    cta: 'Request Video Shoot',
  },
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen pt-20">
      {/* Page Header */}
      <section className="py-20 text-center px-4 border-b border-sl-accent/10">
        <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3 fade-in-up" style={{ animationDelay: '0ms' }}>What We Offer</p>
        <h1 className="font-display text-5xl md:text-6xl text-sl-fg font-black mb-6 fade-in-up" style={{ animationDelay: '100ms' }}>OUR SERVICES</h1>
        <p className="font-body text-sl-muted max-w-xl mx-auto text-lg fade-in-up" style={{ animationDelay: '200ms' }}>
          Everything you need to create, learn, and perform — all under one roof.
        </p>
        <div className="w-16 h-px bg-sl-accent mx-auto mt-8 fade-in-up" style={{ animationDelay: '300ms' }} />
      </section>

      {/* Services */}
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        {services.map((service, index) => {
          const Icon = service.icon
          const isEven = index % 2 === 0

          return (
            <div
              key={service.id}
              id={service.id}
              data-reveal=""
              style={{ transitionDelay: '0ms' }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                !isEven ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover grayscale"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-2 bg-sl-accent px-4 py-2">
                    <Icon size={16} className="text-sl-on-accent" />
                    <span className="font-display text-sl-on-accent text-xs font-bold tracking-widest uppercase">
                      {service.subtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-sl-fg font-black mb-2">
                  {service.title}
                </h2>
                <p className="font-body text-sl-muted text-sm italic mb-5">&ldquo;{service.tagline}&rdquo;</p>
                <p className="font-body text-sl-muted text-sm leading-relaxed mb-7">{service.description}</p>

                {/* Pricing */}
                <div className="mb-7">
                  <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-3">Pricing</h3>
                  <div className="space-y-2">
                    {service.pricing.map((p) => (
                      <div key={p.label} className="flex justify-between items-center py-2 border-b border-sl-accent/10">
                        <span className="font-body text-sm text-sl-muted">{p.label}</span>
                        <span className="font-display text-sm text-sl-accent font-bold">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inclusions */}
                <div className="mb-7">
                  <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-3">Inclusions</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {service.inclusions.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-sl-accent shrink-0" />
                        <span className="font-body text-sm text-sl-muted">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {service.notes && (
                  <p className="font-body text-xs text-sl-muted/50 italic mb-7">{service.notes}</p>
                )}

                <Link
                  href={service.href}
                  className="inline-block px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
                >
                  {service.cta}
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <section className="bg-sl-card py-16 px-4 mt-16">
        <div className="max-w-3xl mx-auto text-center" data-reveal>
          <h2 className="font-display text-3xl md:text-4xl text-sl-fg font-black mb-4">NOT SURE WHERE TO START?</h2>
          <p className="font-body text-sl-muted mb-8">
            Message us directly and we&apos;ll help you find the right service for your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:09397321218"
              className="px-8 py-3 border border-sl-accent text-sl-accent font-body text-sm tracking-widest uppercase hover:bg-sl-accent hover:text-sl-on-accent transition-all"
            >
              Call Us
            </a>
            <a
              href="https://m.me/sevenlions.studio"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
            >
              Message on Facebook
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

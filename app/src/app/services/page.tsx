import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Music, Mic2, Guitar, Wrench, Video, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { StudioService } from '@/types/database'

export const metadata: Metadata = {
  title: 'Services | Seven Lions Studio',
  description: 'Complete list of services at Seven Lions Studio - studio rental, recording, lessons, repairs, and video shoots.',
}

type PricingPair = { key: string; value: string }

function formatPriceValue(value: string): string {
  const trimmed = value.trim()
  return /^\d[\d,]*(\.\d+)?$/.test(trimmed) ? `₱${trimmed}` : value
}

function getIcon(hyperlink: string | null) {
  if (!hyperlink) return Music
  if (hyperlink.includes('rehearsal')) return Music
  if (hyperlink.includes('recording') || hyperlink.includes('jingle')) return Mic2
  if (hyperlink.includes('lesson')) return Guitar
  if (hyperlink.includes('repair')) return Wrench
  if (hyperlink.includes('video')) return Video
  return Music
}

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('studio_services')
    .select('*')
    .eq('active', true)
    .order('sort_order')

  const services: StudioService[] = data ?? []

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
          const Icon = getIcon(service.request_hyperlink)
          const isEven = index % 2 === 0
          const pricing: PricingPair[] = Array.isArray(service.pricing)
            ? (service.pricing as unknown as PricingPair[])
            : []
          const inclusions = service.inclusions
            ? service.inclusions.split(',').map((s) => s.trim()).filter(Boolean)
            : []
          const [subtitle, tagline] = service.service_short_desc
            ? service.service_short_desc.split('—').map((s) => s.trim())
            : ['', '']

          return (
            <div
              key={service.id}
              id={service.id}
              data-reveal=""
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                !isEven ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-sl-card">
                {service.image_url ? (
                  <>
                    <Image
                      src={service.image_url}
                      alt={service.service_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon size={48} className="text-sl-accent/20" />
                  </div>
                )}
                {subtitle && (
                  <div className="absolute bottom-4 left-4">
                    <div className="flex items-center gap-2 bg-sl-accent px-4 py-2">
                      <Icon size={16} className="text-sl-on-accent" />
                      <span className="font-display text-sl-on-accent text-xs font-bold tracking-widest uppercase">
                        {subtitle}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-sl-fg font-black mb-2">
                  {service.service_name}
                </h2>
                {tagline && (
                  <p className="font-body text-sl-muted text-sm italic mb-5">&ldquo;{tagline}&rdquo;</p>
                )}
                {service.service_long_desc && (
                  <p className="font-body text-sl-muted text-sm leading-relaxed mb-7">{service.service_long_desc}</p>
                )}

                {/* Pricing */}
                {pricing.length > 0 && (
                  <div className="mb-7">
                    <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-3">Pricing</h3>
                    <div className="space-y-2">
                      {pricing.map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-sl-accent/10">
                          <span className="font-body text-sm text-sl-muted">{p.key}</span>
                          <span className="font-display text-sm text-sl-accent font-bold">{formatPriceValue(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inclusions */}
                {inclusions.length > 0 && (
                  <div className="mb-7">
                    <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-3">Inclusions</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inclusions.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-sl-accent shrink-0" />
                          <span className="font-body text-sm text-sl-muted">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {service.notes && (
                  <p className="font-body text-xs text-sl-muted/50 italic mb-7">{service.notes}</p>
                )}

                {service.action && service.request_hyperlink && (
                  <Link
                    href={service.request_hyperlink}
                    className="inline-block px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
                  >
                    {service.action}
                  </Link>
                )}
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

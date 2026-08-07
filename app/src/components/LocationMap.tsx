import { createClient } from '@/lib/supabase/server'
import { MapPin } from 'lucide-react'

export default async function LocationMap() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seven_lions_settings')
    .select('key, value')
    .in('key', ['map_lat', 'map_lng', 'contact_phone', 'contact_address'])

  const map: Record<string, string> = {}
  data?.forEach((row) => { if (row.value) map[row.key] = row.value })

  const lat = map['map_lat']
  const lng = map['map_lng']

  if (!lat || !lng) return null

  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&z=17&output=embed`
  const directionsHref = `https://maps.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`

  return (
    <section className="py-20 px-4 bg-sl-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12" data-reveal>
          <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3">Visit Us</p>
          <h2 className="font-display text-4xl md:text-5xl text-sl-fg font-black">FIND US</h2>
          <div className="w-16 h-px bg-sl-accent mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 border border-sl-accent/15 overflow-hidden">
          {/* Map iframe */}
          <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px]">
            <iframe
              src={embedSrc}
              className="absolute inset-0 w-full h-full border-0 grayscale"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Seven Lions Studio location"
            />
          </div>

          {/* Info panel */}
          <div className="bg-sl-bg p-8 flex flex-col justify-center gap-6 border-t border-sl-accent/15 lg:border-t-0 lg:border-l lg:border-sl-accent/15">
            <div>
              <p className="font-display text-sl-fg text-xs tracking-widest uppercase mb-1 text-sl-accent">Seven Lions Studio</p>
              {map['contact_address'] && (
                <p className="font-body text-sm text-sl-muted leading-relaxed whitespace-pre-line mt-2">
                  {map['contact_address']}
                </p>
              )}
            </div>

            {map['contact_phone'] && (
              <div className="flex items-center gap-3 text-sm font-body text-sl-muted">
                <div className="w-8 h-8 border border-sl-accent/20 flex items-center justify-center shrink-0">
                  <MapPin size={13} className="text-sl-accent" />
                </div>
                <span>{map['contact_phone']}</span>
              </div>
            )}

            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-xs tracking-widest uppercase hover:opacity-80 transition-all self-start"
            >
              <MapPin size={13} />
              Get Directions
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import LogoThemed from '@/components/LogoThemed'
import { createClient } from '@/lib/supabase/server'
import { SocialIcon } from '@/components/SocialIcons'

type SocialLink = { name: string; url: string; logo?: string }

export default async function Footer() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seven_lions_settings')
    .select('value')
    .eq('key', 'social_links')
    .single()

  let socialLinks: SocialLink[] = []
  try {
    const parsed = JSON.parse(data?.value || '[]')
    socialLinks = Array.isArray(parsed) ? parsed.filter((l: SocialLink) => l.url) : []
  } catch {}

  return (
    <footer className="bg-sl-card border-t border-sl-accent/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <LogoThemed size={44} />
              <div>
                <p className="font-display text-sl-fg text-sm font-bold tracking-widest uppercase">
                  SEVEN LIONS
                </p>
                <p className="font-body text-sl-muted text-[10px] tracking-[0.3em] uppercase">STUDIO</p>
              </div>
            </div>
            <p className="text-sm text-sl-muted/70 leading-relaxed font-body">
              Your professional space for recording, rehearsal, music education, and instrument care in the heart of Quezon City.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name}
                    title={link.name}
                    className="w-8 h-8 border border-sl-accent/30 flex items-center justify-center text-sl-accent hover:bg-sl-accent hover:text-sl-on-accent transition-all"
                  >
                    <SocialIcon platform={link.logo || ''} size={14} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Quick Links</h3>
            <ul className="flex flex-col gap-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/services', label: 'Services' },
                { href: '/request-service', label: 'Request a Service' },
                { href: '/rehearsal-booking', label: 'Book Rehearsal' },
                { href: '/auth/login', label: 'Sign In' },
                { href: '/auth/signup', label: 'Create Account' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-sl-muted/70 hover:text-sl-accent transition-colors font-body"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Contact & Location</h3>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-sl-accent mt-0.5 shrink-0" />
                <div>
                  <a
                    href="https://maps.app.goo.gl/RDfGcAFp3UFiVFM86"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sl-muted/70 hover:text-sl-accent transition-colors font-body"
                  >
                    Jorjo Bldg, Tandang Sora<br />Quezon City
                  </a>
                  <p className="text-xs text-sl-muted/40 mt-1 font-body">Ground level & elevated parking available</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-sl-accent shrink-0" />
                <a
                  href="tel:09397321218"
                  className="text-sm text-sl-muted/70 hover:text-sl-accent transition-colors font-body"
                >
                  09397321218
                </a>
              </li>
              <li className="flex flex-col gap-1">
                <p className="text-xs text-sl-muted/40 uppercase tracking-widest font-body">Walk-ins Welcome</p>
                <p className="text-sm text-sl-muted/70 font-body">Advance reservation recommended</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-sl-accent/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-sl-muted/40 font-body">
            &copy; {new Date().getFullYear()} Seven Lions Studio. All rights reserved.
          </p>
          <p className="text-xs text-sl-muted/40 font-body">
            Pet-friendly &bull; No Smoking Inside &bull; Complete 5 bookings, get 2 hours free
          </p>
        </div>
      </div>
    </footer>
  )
}

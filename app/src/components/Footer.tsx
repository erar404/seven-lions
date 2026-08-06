import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import LogoThemed from '@/components/LogoThemed'

export default function Footer() {
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
            <div className="flex items-center gap-3 mt-2">
              <a
                href="https://facebook.com/sevenlions.studio"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-sl-accent/30 flex items-center justify-center text-sl-accent hover:bg-sl-accent hover:text-sl-on-accent transition-all text-xs font-bold"
              >
                f
              </a>
              <a
                href="https://instagram.com/sevenlions.studio"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-sl-accent/30 flex items-center justify-center text-sl-accent hover:bg-sl-accent hover:text-sl-on-accent transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://tiktok.com/@sevenlions.studio"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-sl-accent/30 flex items-center justify-center text-sl-accent hover:bg-sl-accent hover:text-sl-on-accent transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                </svg>
              </a>
            </div>
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

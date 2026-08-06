'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/context/ThemeContext'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/request-service', label: 'Request Service' },
  { href: '/rehearsal-booking', label: 'Book Rehearsal' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<{ name: string | null; role: string; avatar_url: string | null } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name, role, avatar_url')
          .eq('auth_id', data.user.id)
          .single()
        if (profile) setUser(profile)
      } else {
        setUser(null)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name, role, avatar_url')
          .eq('auth_id', session.user.id)
          .single()
        if (profile) setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setDropdownOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <nav
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-sl-bg/95 backdrop-blur-md border-b border-sl-accent/10 shadow-lg shadow-black/20'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setOpen(false)}>
            <div className="relative w-10 h-10 group-hover:ring-2 ring-sl-accent ring-offset-2 ring-offset-sl-bg rounded-full transition-all overflow-hidden">
              <Image
                src="/logo-light.png"
                alt="Seven Lions Studio"
                fill
                className="object-cover sl-logo-dark"
              />
              <Image
                src="/logo-dark.png"
                alt=""
                fill
                aria-hidden
                className="object-cover sl-logo-light"
              />
            </div>
            <div>
              <span className="font-display text-sl-fg text-sm font-bold tracking-widest uppercase block leading-tight">
                SEVEN LIONS
              </span>
              <span className="font-body text-sl-muted text-[10px] tracking-[0.3em] uppercase block">
                STUDIO
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-4 py-2 text-xs font-body font-medium tracking-widest uppercase transition-all duration-200',
                  pathname === link.href
                    ? 'text-sl-accent border-b border-sl-accent'
                    : 'text-sl-muted hover:text-sl-accent'
                )}
              >
                {link.label}
              </Link>
            ))}

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={clsx(
                  'px-4 py-2 text-xs font-body font-medium tracking-widest uppercase transition-all duration-200',
                  pathname === '/admin'
                    ? 'text-sl-accent border-b border-sl-accent'
                    : 'text-sl-muted hover:text-sl-accent'
                )}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Right side: toggle + auth */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 border border-sl-accent/30 hover:border-sl-accent transition-all"
                >
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt="" width={28} height={28} className="rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-sl-accent/10 flex items-center justify-center">
                      <User size={14} className="text-sl-accent" />
                    </div>
                  )}
                  <span className="text-xs font-body text-sl-muted">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={12} className="text-sl-accent" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-sl-card border border-sl-accent/15 shadow-xl py-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-sl-muted hover:text-sl-accent hover:bg-sl-accent/5 transition-colors"
                    >
                      <User size={12} />
                      My Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-xs text-sl-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <LogOut size={12} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="px-5 py-2 text-xs font-body font-medium tracking-widest uppercase border border-sl-accent text-sl-accent hover:bg-sl-accent hover:text-sl-on-accent transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile: toggle + hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setOpen(!open)}
              className="p-2 text-sl-muted hover:text-sl-accent transition-colors"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-sl-card border-t border-sl-accent/10">
          <div className="px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'py-3 px-2 text-sm font-body tracking-widest uppercase border-b border-sl-accent/10 transition-colors',
                  pathname === link.href ? 'text-sl-accent' : 'text-sl-muted hover:text-sl-accent'
                )}
              >
                {link.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-sm font-body tracking-widest uppercase text-sl-muted hover:text-sl-accent border-b border-sl-accent/10 transition-colors"
              >
                Admin
              </Link>
            )}
            <div className="pt-3">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link href="/profile" onClick={() => setOpen(false)} className="py-2 text-sm text-sl-muted">
                    My Profile
                  </Link>
                  <button onClick={handleSignOut} className="py-2 text-sm text-red-400 text-left">
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-3 text-sm font-body tracking-widest uppercase border border-sl-accent text-sl-accent"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

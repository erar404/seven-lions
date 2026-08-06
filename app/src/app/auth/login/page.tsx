'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import LogoThemed from '@/components/LogoThemed'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <LogoThemed size={72} className="rounded-full" />
            <div>
              <p className="font-display text-sl-fg text-sm font-bold tracking-widest uppercase">SEVEN LIONS</p>
              <p className="font-body text-sl-muted text-[10px] tracking-[0.3em] uppercase">STUDIO</p>
            </div>
          </Link>
        </div>

        <div className="bg-sl-card border border-sl-accent/15 p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sl-accent to-transparent" />

          <h1 className="font-display text-2xl text-sl-fg text-center mb-2 font-black">WELCOME BACK</h1>
          <p className="font-body text-xs text-sl-muted/60 text-center tracking-widest uppercase mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              />
            </div>

            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 pr-12 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sl-muted/40 hover:text-sl-accent transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-body">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-sl-on-accent/30 border-t-sl-on-accent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-xs text-sl-muted/50">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-sl-accent hover:opacity-70 transition-opacity">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

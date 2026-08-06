'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import LogoThemed from '@/components/LogoThemed'

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('users').upsert({
        auth_id: data.user.id,
        email: form.email,
        name: form.name,
        phone: form.phone,
        role: 'user',
      }, { onConflict: 'auth_id' })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border border-sl-accent/30 flex items-center justify-center mx-auto mb-6">
            <UserPlus size={28} className="text-sl-accent" />
          </div>
          <h2 className="font-display text-3xl text-sl-fg font-black mb-4">ACCOUNT CREATED!</h2>
          <p className="font-body text-sl-muted mb-2">
            Please check your email to verify your account.
          </p>
          <p className="font-body text-sm text-sl-muted/50 mb-8">
            Once verified, you can sign in and start booking.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
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

          <h1 className="font-display text-2xl text-sl-fg text-center mb-2 font-black">CREATE ACCOUNT</h1>
          <p className="font-body text-xs text-sl-muted/60 text-center tracking-widest uppercase mb-8">
            Join the Seven Lions community
          </p>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              />
            </div>

            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              />
            </div>

            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09XXXXXXXXX"
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              />
            </div>

            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
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

            <div>
              <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repeat your password"
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              />
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
                <UserPlus size={16} />
              )}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-xs text-sl-muted/50">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-sl-accent hover:opacity-70 transition-opacity">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

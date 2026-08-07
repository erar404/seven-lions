'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'
import { Mic2, Guitar, Wrench, Video, Send, CheckCircle } from 'lucide-react'
import type { ServiceType } from '@/types/database'
import clsx from 'clsx'

const serviceOptions: { value: ServiceType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'recording',
    label: 'Recording Session',
    icon: Mic2,
    description: 'Single or multi-track recording, mixing & mastering',
  },
  {
    value: 'jingle',
    label: 'Jingle Production',
    icon: Mic2,
    description: 'Custom jingle for your brand or content',
  },
  {
    value: 'guitar_lesson',
    label: 'Guitar Lesson',
    icon: Guitar,
    description: 'Private guitar instruction (min. 2 hrs)',
  },
  {
    value: 'drum_lesson',
    label: 'Drum Lesson',
    icon: Guitar,
    description: 'Private drum instruction (min. 2 hrs)',
  },
  {
    value: 'guitar_repair',
    label: 'Guitar Setup & Repair',
    icon: Wrench,
    description: 'Action, intonation, frets, electronics',
  },
  {
    value: 'bass_repair',
    label: 'Bass Setup & Repair',
    icon: Wrench,
    description: 'Full bass guitar setup and repair service',
  },
  {
    value: 'video_shoot',
    label: 'Video Shoot',
    icon: Video,
    description: 'Music video and promotional video production',
  },
]

const timeSlots = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
  '08:00 PM', '09:00 PM',
]

function RequestServiceForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const supabase = createClient()

  const [serviceType, setServiceType] = useState<ServiceType>((searchParams.get('type') as ServiceType) || 'recording')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_date: '',
    preferred_time: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || '',
      }))
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userId = session?.user.id ?? null

      const { error: insertError } = await supabase.from('seven_lions_service_requests').insert({
        user_id: userId,
        service_type: serviceType,
        name: form.name,
        email: form.email,
        phone: form.phone,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        message: form.message || null,
      })

      if (insertError) throw insertError
      setSuccess(true)
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'request_submitted',
          to: form.email,
          data: {
            name: form.name,
            serviceType,
            preferredDate: form.preferred_date || undefined,
            preferredTime: form.preferred_time || undefined,
          },
        }),
      }).catch(() => {})
    } catch (err: unknown) {
      setError((err as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-lg fade-in-up">
          <div className="w-16 h-16 border border-sl-accent/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-sl-accent" />
          </div>
          <h2 className="font-display text-3xl text-sl-fg font-black mb-4">REQUEST SUBMITTED!</h2>
          <p className="font-body text-sl-muted mb-4 leading-relaxed">
            Thank you for your interest. Our team will review your request and get back to you within 24–48 hours.
          </p>
          <p className="font-body text-sm text-sl-muted/60 mb-8 leading-relaxed">
            Once approved, you&apos;ll receive an email with the final rate and payment instructions. You can track your request status in your profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setSuccess(false); setForm({ name: '', email: '', phone: '', preferred_date: '', preferred_time: '', message: '' }) }}
              className="px-6 py-3 border border-sl-accent text-sl-accent font-body text-sm tracking-widest uppercase hover:bg-sl-accent hover:text-sl-on-accent transition-all"
            >
              Submit Another
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <section className="py-16 text-center px-4 border-b border-sl-accent/10">
        <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3 fade-in-up" style={{ animationDelay: '0ms' }}>Get in Touch</p>
        <h1 className="font-display text-4xl md:text-5xl text-sl-fg font-black mb-4 fade-in-up" style={{ animationDelay: '100ms' }}>REQUEST A SERVICE</h1>
        <p className="font-body text-sl-muted max-w-lg mx-auto fade-in-up" style={{ animationDelay: '200ms' }}>
          Fill out the form below and our team will reach out to confirm your booking or inquiry.
        </p>
        <div className="w-16 h-px bg-sl-accent mx-auto mt-6 mb-10 fade-in-up" style={{ animationDelay: '300ms' }} />

        {/* How it works */}
        <div className="max-w-2xl mx-auto fade-in-up" style={{ animationDelay: '350ms' }}>
          <p className="font-body text-[10px] text-sl-muted/40 uppercase tracking-widest mb-6">How It Works</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Submit', desc: 'Fill out and submit your service request' },
              { step: '02', title: 'Approval', desc: 'Our team reviews and confirms the rate within 24–48 hrs' },
              { step: '03', title: 'Pay', desc: 'Complete payment via the indicated method and upload proof' },
              { step: '04', title: 'Confirmed', desc: 'Payment verified — your session is locked in' },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 3 && <div className="hidden sm:block absolute top-4 left-full w-full h-px bg-sl-accent/15 -translate-x-1/2" />}
                <div className="w-8 h-8 border border-sl-accent/30 flex items-center justify-center mx-auto mb-3">
                  <span className="font-display text-sl-accent text-[11px] font-bold">{item.step}</span>
                </div>
                <p className="font-display text-sl-fg text-[10px] font-bold tracking-widest uppercase mb-1">{item.title}</p>
                <p className="font-body text-[10px] text-sl-muted/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Selection */}
          <div data-reveal>
            <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-4">
              Select Service *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {serviceOptions.map((opt) => {
                const Icon = opt.icon
                const isSelected = serviceType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setServiceType(opt.value)}
                    className={clsx(
                      'flex items-start gap-3 p-4 text-left border transition-all duration-200',
                      isSelected
                        ? 'border-sl-accent bg-sl-accent/8'
                        : 'border-sl-accent/15 bg-sl-card hover:border-sl-accent/40'
                    )}
                  >
                    <div className={clsx(
                      'w-8 h-8 flex items-center justify-center shrink-0 mt-0.5',
                      isSelected ? 'bg-sl-accent' : 'bg-sl-accent/10'
                    )}>
                      <Icon size={15} className={isSelected ? 'text-sl-on-accent' : 'text-sl-accent'} />
                    </div>
                    <div>
                      <p className={clsx(
                        'font-display text-xs font-bold',
                        isSelected ? 'text-sl-accent' : 'text-sl-fg'
                      )}>
                        {opt.label}
                      </p>
                      <p className="font-body text-xs text-sl-muted/60 mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '80ms' }}>
            <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Your Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="scan-field">
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

              <div className="scan-field">
                <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="09XXXXXXXXX"
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
              </div>

              <div className="sm:col-span-2 scan-field">
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
            </div>
          </div>

          {/* Scheduling Preference */}
          <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '160ms' }}>
            <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">
              Preferred Schedule <span className="text-sl-muted/40 font-body font-normal normal-case tracking-normal">(optional)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="scan-field">
                <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={form.preferred_date}
                  onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors [color-scheme:dark] font-body"
                />
              </div>

              <div className="scan-field">
                <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">
                  Preferred Time
                </label>
                <select
                  value={form.preferred_time}
                  onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                >
                  <option value="">Select time</option>
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '240ms' }}>
            <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-4">
              Message / Additional Details
            </label>
            <textarea
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={
                serviceType === 'recording' || serviceType === 'jingle'
                  ? 'Tell us about your project — genre, number of tracks, reference songs, etc.'
                  : serviceType === 'guitar_lesson' || serviceType === 'drum_lesson'
                  ? 'Tell us your current skill level and what you want to learn...'
                  : serviceType === 'guitar_repair' || serviceType === 'bass_repair'
                  ? 'Describe the issue with your instrument...'
                  : 'Tell us about your video shoot concept, duration, and any special requirements...'
              }
              className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors resize-none font-body"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-body">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-sl-muted/40">
              * Required fields. We&apos;ll respond within 24–48 hours.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-sl-on-accent/30 border-t-sl-on-accent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {loading ? 'Sending...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RequestServicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RequestServiceForm />
    </Suspense>
  )
}

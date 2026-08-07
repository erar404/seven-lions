'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, CheckCircle, AlertCircle, Music, Search } from 'lucide-react'
import type { DateClickArg } from '@fullcalendar/interaction'
import clsx from 'clsx'
import type { Band } from '@/types/database'

const RehearsalCalendar = dynamic(() => import('@/components/RehearsalCalendar'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-sl-muted/40">
      <div className="w-6 h-6 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

const timeOptions = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const min = i % 2 === 0 ? '00' : '30'
  const ampm = hour < 12 ? 'AM' : 'PM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return {
    value: `${String(hour).padStart(2, '0')}:${min}`,
    label: `${displayHour}:${min} ${ampm}`,
  }
})

type Step = 'calendar' | 'details' | 'confirm' | 'success'

interface FormData {
  band_name: string
  contact_name: string
  email: string
  phone: string
  booking_date: string
  start_time: string
  end_time: string
  num_members: number
  notes: string
}

export default function RehearsalBookingPage() {
  const [step, setStep] = useState<Step>('calendar')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [bookedEvents, setBookedEvents] = useState<{ title: string; start: string; end: string; color: string }[]>([])
  const [form, setForm] = useState<FormData>({
    band_name: '',
    contact_name: '',
    email: '',
    phone: '',
    booking_date: '',
    start_time: '10:00',
    end_time: '12:00',
    num_members: 4,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [bands, setBands] = useState<Band[]>([])
  const [bandSearch, setBandSearch] = useState('')
  const [showBandDropdown, setShowBandDropdown] = useState(false)
  const bandInputRef = useRef<HTMLInputElement>(null)
  const bandDropdownRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { data: session } = useSession()
  const supabase = createClient()

  useEffect(() => {
    loadBookings()
    loadBands()
  }, [])

  // Close band dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        bandDropdownRef.current && !bandDropdownRef.current.contains(e.target as Node) &&
        bandInputRef.current && !bandInputRef.current.contains(e.target as Node)
      ) {
        setShowBandDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const loggedIn = !!session?.user
    setIsLoggedIn(loggedIn)
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        contact_name: session.user.name || '',
        email: session.user.email || '',
      }))
    }
  }, [session])

  const loadBands = async () => {
    const { data } = await supabase.from('bands').select('*').order('band_name')
    if (data) setBands(data)
  }

  const loadBookings = async () => {
    const { data } = await supabase
      .from('seven_lions_rehearsal_bookings')
      .select('band_name, booking_date, start_time, end_time, status')
      .eq('status', 'approved')

    if (data) {
      const events = data.map((b) => ({
        title: b.band_name,
        start: `${b.booking_date}T${b.start_time}`,
        end: `${b.booking_date}T${b.end_time}`,
        color: 'var(--sl-accent)',
      }))
      setBookedEvents(events)
    }
  }

  const handleDateSelect = (info: DateClickArg) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const clicked = new Date(info.dateStr)
    if (clicked < today) return

    setSelectedDate(info.dateStr)
    setForm((prev) => ({ ...prev, booking_date: info.dateStr }))
    setStep('details')
  }

  const validateTimes = () => {
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    return eh * 60 + em > sh * 60 + sm
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateTimes()) {
      setError('End time must be after start time.')
      return
    }
    setError('')
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (!isLoggedIn) {
      router.push('/auth/login?next=/rehearsal-booking')
      return
    }

    setLoading(true)
    setError('')

    try {
      const userId = session?.user.id ?? null

      const { data, error: insertError } = await supabase
        .from('seven_lions_rehearsal_bookings')
        .insert({
          user_id: userId,
          band_name: form.band_name,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
          booking_date: form.booking_date,
          start_time: form.start_time,
          end_time: form.end_time,
          num_members: form.num_members,
          notes: form.notes || null,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      setBookingId(data.id)
      setStep('success')
      loadBookings()
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit booking.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h < 12 ? 'AM' : 'PM'
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const getDuration = () => {
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs} hour${hrs !== 1 ? 's' : ''}`
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-lg fade-in-up">
          <div className="w-20 h-20 border border-sl-accent/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-sl-accent" />
          </div>
          <h2 className="font-display text-3xl text-sl-fg font-black mb-4">BOOKING SUBMITTED!</h2>
          <p className="font-body text-sl-muted mb-2">
            Your rehearsal booking request has been received.
          </p>
          <p className="font-body text-sm text-sl-muted/50 mb-2">
            Booking ID: <span className="text-sl-accent font-mono text-xs">{bookingId.slice(0, 8).toUpperCase()}</span>
          </p>
          <p className="font-body text-sm text-sl-muted/50 mb-10">
            Our team will review and confirm your slot within 24 hours. You&apos;ll receive a notification at <strong className="text-sl-muted">{form.email}</strong>.
          </p>
          <div className="bg-sl-card border border-sl-accent/15 p-5 text-left mb-8 space-y-2">
            <p className="font-display text-sl-accent text-xs tracking-widest uppercase mb-3">Booking Summary</p>
            <p className="font-body text-sm text-sl-muted"><span className="text-sl-muted/50">Band:</span> {form.band_name}</p>
            <p className="font-body text-sm text-sl-muted"><span className="text-sl-muted/50">Date:</span> {formatDate(form.booking_date)}</p>
            <p className="font-body text-sm text-sl-muted"><span className="text-sl-muted/50">Time:</span> {formatTime(form.start_time)} – {formatTime(form.end_time)} ({getDuration()})</p>
            <p className="font-body text-sm text-sl-muted"><span className="text-sl-muted/50">Status:</span> <span className="status-pending px-2 py-0.5 text-xs">Pending Approval</span></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setStep('calendar'); setSelectedDate(''); setBookingId('') }}
              className="px-6 py-3 border border-sl-accent text-sl-accent font-body text-sm tracking-widest uppercase hover:bg-sl-accent hover:text-sl-on-accent transition-all"
            >
              Book Another
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
        <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3 fade-in-up" style={{ animationDelay: '0ms' }}>Studio Sessions</p>
        <h1 className="font-display text-4xl md:text-5xl text-sl-fg font-black mb-4 fade-in-up" style={{ animationDelay: '100ms' }}>BOOK REHEARSAL</h1>
        <p className="font-body text-sl-muted max-w-lg mx-auto fade-in-up" style={{ animationDelay: '200ms' }}>
          Select a date on the calendar, fill in your details, and submit for admin approval.
        </p>
        <div className="w-16 h-px bg-sl-accent mx-auto mt-6 fade-in-up" style={{ animationDelay: '300ms' }} />

        {/* Steps */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {(['calendar', 'details', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-4">
              <div className={clsx(
                'flex items-center gap-2',
                step === s ? 'text-sl-accent' : ['calendar', 'details', 'confirm'].indexOf(step) > i ? 'text-sl-accent/60' : 'text-sl-muted/30'
              )}>
                <div className={clsx(
                  'w-7 h-7 flex items-center justify-center text-xs font-display border',
                  step === s ? 'border-sl-accent bg-sl-accent text-sl-on-accent' : 'border-current'
                )}>
                  {i + 1}
                </div>
                <span className="font-body text-xs uppercase tracking-widest hidden sm:block">
                  {s === 'calendar' ? 'Pick Date' : s === 'details' ? 'Your Info' : 'Confirm'}
                </span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-sl-accent/20" />}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Step 1: Calendar */}
        {step === 'calendar' && (
          <div className="fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <Calendar size={18} className="text-sl-accent" />
              <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase">Select a Date</h2>
            </div>
            <div className="bg-sl-card border border-sl-accent/10 p-4 md:p-6">
              <RehearsalCalendar
                events={bookedEvents}
                onDateClick={handleDateSelect}
              />
            </div>
            <p className="font-body text-xs text-sl-muted/40 mt-4 text-center">
              Marked slots are already booked. Click any available date to proceed.
            </p>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <div className="max-w-2xl mx-auto fade-in-up">
            <button onClick={() => setStep('calendar')} className="flex items-center gap-2 text-xs text-sl-muted/50 hover:text-sl-accent mb-8 uppercase tracking-widest font-body transition-colors">
              ← Back to Calendar
            </button>

            <div className="bg-sl-accent/5 border border-sl-accent/20 px-5 py-3 mb-8 flex items-center gap-3">
              <Calendar size={16} className="text-sl-accent shrink-0" />
              <span className="font-body text-sm text-sl-muted">
                Selected: <strong className="text-sl-accent">{formatDate(selectedDate)}</strong>
              </span>
            </div>

            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              <div className="bg-sl-card border border-sl-accent/10 p-6">
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Band & Contact Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Band / Artist Name *</label>
                    <div className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-sl-muted/40 pointer-events-none" />
                        <input
                          ref={bandInputRef}
                          type="text"
                          required
                          value={bandSearch || form.band_name}
                          onChange={(e) => {
                            setBandSearch(e.target.value)
                            setForm({ ...form, band_name: e.target.value })
                            setShowBandDropdown(true)
                          }}
                          onFocus={() => setShowBandDropdown(true)}
                          placeholder="Search or type your band name"
                          className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                        />
                      </div>
                      {showBandDropdown && (
                        <div ref={bandDropdownRef} className="absolute top-full left-0 right-0 z-20 bg-sl-card border border-sl-accent/20 border-t-0 max-h-56 overflow-y-auto shadow-lg">
                          {bands
                            .filter((b) =>
                              !bandSearch || b.band_name.toLowerCase().includes(bandSearch.toLowerCase())
                            )
                            .map((band) => (
                              <button
                                key={band.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setForm({ ...form, band_name: band.band_name })
                                  setBandSearch('')
                                  setShowBandDropdown(false)
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sl-accent/10 transition-colors text-left"
                              >
                                {band.picture_urls?.[0] ? (
                                  <img
                                    src={band.picture_urls[0]}
                                    alt={band.band_name}
                                    className="w-9 h-9 object-cover shrink-0 grayscale"
                                  />
                                ) : (
                                  <div className="w-9 h-9 bg-sl-bg border border-sl-accent/10 flex items-center justify-center shrink-0">
                                    <Music size={14} className="text-sl-accent/30" />
                                  </div>
                                )}
                                <span className="font-body text-sm text-sl-fg">{band.band_name}</span>
                              </button>
                            ))}
                          {bands.filter((b) =>
                            !bandSearch || b.band_name.toLowerCase().includes(bandSearch.toLowerCase())
                          ).length === 0 && (
                            <p className="px-4 py-3 font-body text-xs text-sl-muted/40 italic">No matching bands — your entry will be used as-is.</p>
                          )}
                        </div>
                      )}
                    </div>
                    {form.band_name && !showBandDropdown && (() => {
                      const matched = bands.find((b) => b.band_name === form.band_name)
                      return matched ? (
                        <div className="mt-2 flex items-center gap-3 px-3 py-2 bg-sl-accent/5 border border-sl-accent/20">
                          {matched.picture_urls?.[0] ? (
                            <img src={matched.picture_urls[0]} alt={matched.band_name} className="w-8 h-8 object-cover grayscale" />
                          ) : (
                            <div className="w-8 h-8 bg-sl-bg border border-sl-accent/10 flex items-center justify-center">
                              <Music size={12} className="text-sl-accent/30" />
                            </div>
                          )}
                          <span className="font-display text-sl-accent text-xs font-bold tracking-widest uppercase">{matched.band_name}</span>
                        </div>
                      ) : null
                    })()}
                  </div>

                  <div className="scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Contact Person *</label>
                    <input
                      type="text" required
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      placeholder="Your name"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  </div>

                  <div className="scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Number of Members *</label>
                    <input
                      type="number" required min={1} max={20}
                      value={form.num_members}
                      onChange={(e) => setForm({ ...form, num_members: Number(e.target.value) })}
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  </div>

                  <div className="scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Phone Number *</label>
                    <input
                      type="tel" required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="09XXXXXXXXX"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  </div>

                  <div className="scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Email Address *</label>
                    <input
                      type="email" required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-sl-card border border-sl-accent/10 p-6">
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Session Time</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Start Time *</label>
                    <select
                      required
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    >
                      {timeOptions.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="scan-field">
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">End Time *</label>
                    <select
                      required
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    >
                      {timeOptions.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-sl-accent/5 border border-sl-accent/10 flex items-center gap-3">
                  <Clock size={14} className="text-sl-accent shrink-0" />
                  <p className="font-body text-xs text-sl-muted/60">
                    Rate: <span className="text-sl-accent">₱150/hour per gear</span> + <span className="text-sl-accent">₱50/hour for drumsticks</span>. Backline, mics, monitors & mixer included.
                  </p>
                </div>
              </div>

              <div className="bg-sl-card border border-sl-accent/10 p-6">
                <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-4">
                  Additional Notes <span className="text-sl-muted/40 font-body font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special requirements or notes for the studio..."
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors resize-none font-body"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-body">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
                >
                  Review Booking →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="max-w-xl mx-auto fade-in-up">
            <button onClick={() => setStep('details')} className="flex items-center gap-2 text-xs text-sl-muted/50 hover:text-sl-accent mb-8 uppercase tracking-widest font-body transition-colors">
              ← Back to Details
            </button>

            <h2 className="font-display text-sl-fg text-2xl font-black mb-8">CONFIRM BOOKING</h2>

            <div className="bg-sl-card border border-sl-accent/15 divide-y divide-sl-accent/10">
              {[
                { label: 'Band / Artist', value: form.band_name },
                { label: 'Contact Person', value: form.contact_name },
                { label: 'Members', value: `${form.num_members} member${form.num_members !== 1 ? 's' : ''}` },
                { label: 'Email', value: form.email },
                { label: 'Phone', value: form.phone },
                { label: 'Date', value: formatDate(form.booking_date) },
                { label: 'Time', value: `${formatTime(form.start_time)} – ${formatTime(form.end_time)}` },
                { label: 'Duration', value: getDuration() },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="font-body text-xs text-sl-muted/50 uppercase tracking-widest">{row.label}</span>
                  <span className="font-body text-sm text-sl-fg">{row.value}</span>
                </div>
              ))}
              {form.notes && (
                <div className="px-5 py-3.5">
                  <span className="font-body text-xs text-sl-muted/50 uppercase tracking-widest block mb-1">Notes</span>
                  <span className="font-body text-sm text-sl-fg">{form.notes}</span>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-sl-accent/5 border border-sl-accent/15 flex items-start gap-3">
              <Music size={16} className="text-sl-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-display text-sl-accent text-xs tracking-widest uppercase mb-1">Pending Approval</p>
                <p className="font-body text-xs text-sl-muted/60">
                  Your booking will be reviewed by our admin team. You&apos;ll receive a confirmation within 24 hours.
                  {!isLoggedIn && ' You need to be logged in to submit.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-body">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-3 border border-sl-accent/30 text-sl-muted font-body text-sm tracking-widest uppercase hover:border-sl-accent transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-sl-on-accent/30 border-t-sl-on-accent rounded-full animate-spin" />
                ) : null}
                {loading ? 'Submitting...' : isLoggedIn ? 'Confirm Booking' : 'Sign In to Book'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

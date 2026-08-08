'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'
import { Mic2, Guitar, Wrench, Video, Send, CheckCircle, Plus, X, AlertTriangle } from 'lucide-react'
import type { ServiceType, VideoShootAddon, LessonPackage } from '@/types/database'
import clsx from 'clsx'

const serviceOptions: { value: ServiceType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'recording',     label: 'Recording Session',    icon: Mic2,   description: 'Single or multi-track recording, mixing & mastering' },
  { value: 'jingle',        label: 'Jingle Production',    icon: Mic2,   description: 'Custom jingle for your brand or content' },
  { value: 'guitar_lesson', label: 'Guitar Lesson',        icon: Guitar, description: 'Private guitar instruction (min. 2 hrs)' },
  { value: 'drum_lesson',   label: 'Drum Lesson',          icon: Guitar, description: 'Private drum instruction (min. 2 hrs)' },
  { value: 'guitar_repair', label: 'Guitar Setup & Repair', icon: Wrench, description: 'Action, intonation, frets, electronics' },
  { value: 'bass_repair',   label: 'Bass Setup & Repair',  icon: Wrench, description: 'Full bass guitar setup and repair service' },
  { value: 'video_shoot',   label: 'Video Shoot',          icon: Video,  description: 'Music video and promotional video production' },
]

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
]

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime12(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function addHours(time24: string, hours: number): string {
  const [h, m] = time24.split(':').map(Number)
  const total = h * 60 + m + hours * 60
  const clampedMinutes = Math.min(total, 23 * 60 + 59)
  const hh = Math.floor(clampedMinutes / 60)
  const mm = clampedMinutes % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function toMinutes(t: string) {
  const [h, m] = t.substring(0, 5).split(':').map(Number)
  return h * 60 + m
}

function generateRecurringDates(days: string[], startFrom: string, sessions: number): string[] {
  const dayIndexMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }
  const targetDays = days.map(d => dayIndexMap[d]).filter((d): d is number => d !== undefined)
  if (targetDays.length === 0 || sessions <= 0) return []
  const dates: string[] = []
  const start = new Date(startFrom || new Date().toISOString().split('T')[0])
  let current = new Date(start)
  let iterations = 0
  const maxIterations = sessions * 52
  while (dates.length < sessions && iterations < maxIterations) {
    if (targetDays.includes(current.getDay())) {
      dates.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 1)
    iterations++
  }
  return dates
}

function RequestServiceForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const supabase = createClient()

  const [serviceType, setServiceType] = useState<ServiceType>((searchParams.get('type') as ServiceType) || 'recording')
  const [form, setForm] = useState({ name: '', email: '', phone: '', preferred_date: '', preferred_time: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Video shoot state
  const [vsPackage, setVsPackage] = useState<'4hr' | '6hr' | ''>('')
  const [vsStoryboard, setVsStoryboard] = useState(false)
  const [vsAddonIds, setVsAddonIds] = useState<string[]>([])
  const [vsDate, setVsDate] = useState('')
  const [vsStartTime, setVsStartTime] = useState('')

  // Lesson state
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | ''>('')
  const [lessonPackageId, setLessonPackageId] = useState('')
  const [schedulingType, setSchedulingType] = useState<'recurring' | 'manual' | ''>('')
  const [recurringDays, setRecurringDays] = useState<string[]>([])
  const [recurringTime, setRecurringTime] = useState('')
  const [recurringStartDate, setRecurringStartDate] = useState('')
  const [manualDates, setManualDates] = useState<string[]>([])
  const [manualDateInput, setManualDateInput] = useState('')

  // Loaded data
  const [videoAddons, setVideoAddons] = useState<VideoShootAddon[]>([])
  const [lessonPackages, setLessonPackages] = useState<LessonPackage[]>([])
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({})
  const [conflictingRequests, setConflictingRequests] = useState<any[]>([])

  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({ ...prev, name: session.user.name || '', email: session.user.email || '' }))
    }
  }, [session])

  useEffect(() => {
    loadAddons()
    loadSettings()
  }, [])

  useEffect(() => {
    if (serviceType === 'guitar_lesson' || serviceType === 'drum_lesson') {
      loadLessonPackages(serviceType)
    }
    setVsPackage('')
    setVsStoryboard(false)
    setVsAddonIds([])
    setVsDate('')
    setVsStartTime('')
    setSkillLevel('')
    setLessonPackageId('')
    setSchedulingType('')
    setRecurringDays([])
    setRecurringTime('')
    setRecurringStartDate('')
    setManualDates([])
    setConflictingRequests([])
  }, [serviceType])

  useEffect(() => {
    if (serviceType === 'video_shoot' && vsDate) loadVideoConflicts(vsDate)
  }, [vsDate, serviceType])

  const loadAddons = async () => {
    const { data } = await (supabase as any).from('video_shoot_addons').select('*').eq('active', true).order('sort_order')
    if (data) setVideoAddons(data as VideoShootAddon[])
  }

  const loadSettings = async () => {
    const { data } = await supabase.from('seven_lions_settings').select('*')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((s: any) => { map[s.key] = s.value || '' })
      setSiteSettings(map)
    }
  }

  const loadLessonPackages = async (type: ServiceType) => {
    const { data } = await (supabase as any)
      .from('lesson_packages')
      .select('*')
      .eq('service_type', type)
      .eq('active', true)
      .order('sort_order')
    if (data) setLessonPackages(data as LessonPackage[])
  }

  const loadVideoConflicts = async (date: string) => {
    const { data } = await supabase
      .from('seven_lions_service_requests')
      .select('preferred_time, start_time, end_time, name')
      .eq('service_type', 'video_shoot')
      .eq('preferred_date', date)
      .not('status', 'in', '(rejected,cancelled)')
    setConflictingRequests(data || [])
  }

  const selectedPackage = useMemo(() => lessonPackages.find(p => p.id === lessonPackageId) || null, [lessonPackages, lessonPackageId])
  const vsHours = vsPackage === '4hr' ? 4 : vsPackage === '6hr' ? 6 : 0
  const vsEndTime = vsStartTime && vsHours ? addHours(vsStartTime, vsHours) : ''
  const storyboardPrice = parseInt(siteSettings['video_shoot_storyboard_price'] || '2000')
  const pkg4hrPrice = parseInt(siteSettings['video_shoot_package_4hr'] || '8000')
  const pkg6hrPrice = parseInt(siteSettings['video_shoot_package_6hr'] || '10000')

  const vsConflict = useMemo(() => {
    if (!vsStartTime || !vsEndTime) return null
    const selStart = toMinutes(vsStartTime)
    const selEnd = toMinutes(vsEndTime)
    return conflictingRequests.find((r) => {
      const s = r.start_time || r.preferred_time
      const e = r.end_time
      if (!s) return false
      const bStart = toMinutes(s.substring(0, 5))
      const bEnd = e ? toMinutes(e.substring(0, 5)) : bStart + 240
      return selStart < bEnd && selEnd > bStart
    }) || null
  }, [vsStartTime, vsEndTime, conflictingRequests])

  const vsTotalCost = useMemo(() => {
    const base = vsPackage === '4hr' ? pkg4hrPrice : vsPackage === '6hr' ? pkg6hrPrice : 0
    const storyboard = vsStoryboard ? storyboardPrice : 0
    const addons = videoAddons.filter(a => vsAddonIds.includes(a.id)).reduce((sum, a) => sum + a.price, 0)
    return base + storyboard + addons
  }, [vsPackage, vsStoryboard, vsAddonIds, videoAddons, pkg4hrPrice, pkg6hrPrice, storyboardPrice])

  const previewDates = useMemo(() => {
    if (schedulingType === 'recurring' && recurringDays.length > 0 && selectedPackage && recurringStartDate) {
      return generateRecurringDates(recurringDays, recurringStartDate, selectedPackage.sessions)
    }
    return []
  }, [schedulingType, recurringDays, selectedPackage, recurringStartDate])

  const sessionCount = schedulingType === 'recurring' ? previewDates.length : manualDates.length
  const requiredSessions = selectedPackage?.sessions || 0

  const toggleDay = (day: string) => {
    setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const toggleAddon = (id: string) => {
    setVsAddonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const addManualDate = () => {
    if (!manualDateInput) return
    if (manualDates.includes(manualDateInput)) return
    if (requiredSessions && manualDates.length >= requiredSessions) return
    setManualDates(prev => [...prev, manualDateInput].sort())
    setManualDateInput('')
  }

  const removeManualDate = (d: string) => setManualDates(prev => prev.filter(x => x !== d))

  const isLessonType = serviceType === 'guitar_lesson' || serviceType === 'drum_lesson'
  const isVideoShoot = serviceType === 'video_shoot'
  const isRepair = serviceType === 'guitar_repair' || serviceType === 'bass_repair'
  const isStudio = serviceType === 'recording' || serviceType === 'jingle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isVideoShoot && !vsDate) {
        setError('Please select a date for the video shoot.')
        setLoading(false)
        return
      }
      if (isVideoShoot && !vsStartTime) {
        setError('Please select a start time for the video shoot.')
        setLoading(false)
        return
      }
      if (isVideoShoot && vsConflict) {
        setError('The selected time overlaps with an existing booking. Please choose a different time.')
        setLoading(false)
        return
      }
      if (isVideoShoot && !vsPackage) {
        setError('Please select a video shoot package.')
        setLoading(false)
        return
      }
      if (isLessonType && !lessonPackageId) {
        setError('Please select a lesson package.')
        setLoading(false)
        return
      }
      if (isLessonType && !schedulingType) {
        setError('Please choose a scheduling type.')
        setLoading(false)
        return
      }
      if (isLessonType && schedulingType === 'recurring' && recurringDays.length === 0) {
        setError('Please select at least one recurring day.')
        setLoading(false)
        return
      }
      if (isLessonType && schedulingType === 'recurring' && !recurringStartDate) {
        setError('Please select a start date for the recurring schedule.')
        setLoading(false)
        return
      }
      if (isLessonType && schedulingType === 'manual' && manualDates.length < (requiredSessions || 1)) {
        setError(`Please add all ${requiredSessions} session dates.`)
        setLoading(false)
        return
      }

      const userId = (session?.user as any)?.id ?? null
      const payload: any = {
        user_id: userId,
        service_type: serviceType,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message || null,
      }

      if (isVideoShoot) {
        payload.preferred_date = vsDate || null
        payload.start_time = vsStartTime || null
        payload.end_time = vsEndTime || null
        payload.video_shoot_package = vsPackage || null
        payload.storyboard = vsStoryboard
        payload.video_addon_ids = vsAddonIds
      } else if (isLessonType) {
        payload.preferred_date = (schedulingType === 'recurring' ? recurringStartDate : manualDates[0]) || null
        payload.preferred_time = recurringTime || null
        payload.skill_level = skillLevel || null
        payload.lesson_package_id = lessonPackageId || null
        payload.scheduling_type = schedulingType || null
        payload.recurring_days = schedulingType === 'recurring' ? recurringDays : null
        payload.recurring_time = schedulingType === 'recurring' ? recurringTime : null
        payload.manual_dates = schedulingType === 'manual' ? manualDates : []
      } else {
        payload.preferred_date = form.preferred_date || null
        payload.preferred_time = form.preferred_time || null
      }

      const { error: insertError } = await supabase.from('seven_lions_service_requests').insert(payload)
      if (insertError) throw insertError

      setSuccess(true)
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'request_submitted',
          to: form.email,
          data: { name: form.name, serviceType, preferredDate: payload.preferred_date || undefined, preferredTime: payload.preferred_time || undefined },
        }),
      }).catch(() => {})
    } catch (err: unknown) {
      setError((err as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(false)
    setForm({ name: '', email: '', phone: '', preferred_date: '', preferred_time: '', message: '' })
    setVsPackage('')
    setVsStoryboard(false)
    setVsAddonIds([])
    setVsDate('')
    setVsStartTime('')
    setSkillLevel('')
    setLessonPackageId('')
    setSchedulingType('')
    setRecurringDays([])
    setRecurringTime('')
    setRecurringStartDate('')
    setManualDates([])
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
            Once approved, you&apos;ll receive an email with the final rate and payment instructions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={resetForm} className="px-6 py-3 border border-sl-accent text-sl-accent font-body text-sm tracking-widest uppercase hover:bg-sl-accent hover:text-sl-on-accent transition-all">
              Submit Another
            </button>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      <section className="py-16 text-center px-4 border-b border-sl-accent/10">
        <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3 fade-in-up" style={{ animationDelay: '0ms' }}>Get in Touch</p>
        <h1 className="font-display text-4xl md:text-5xl text-sl-fg font-black mb-4 fade-in-up" style={{ animationDelay: '100ms' }}>REQUEST A SERVICE</h1>
        <p className="font-body text-sl-muted max-w-lg mx-auto fade-in-up" style={{ animationDelay: '200ms' }}>
          Fill out the form below and our team will reach out to confirm your booking or inquiry.
        </p>
        <div className="w-16 h-px bg-sl-accent mx-auto mt-6 mb-10 fade-in-up" style={{ animationDelay: '300ms' }} />
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
        {siteSettings['non_refundable'] === 'true' && (
          <div className="mb-8 flex items-start gap-3 bg-yellow-500/8 border border-yellow-500/30 px-5 py-4">
            <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-display text-yellow-400 text-xs tracking-widest uppercase font-bold">Non-Refundable Policy</p>
              <p className="font-body text-xs text-yellow-400/70 mt-1 leading-relaxed">
                All payments for confirmed bookings are <strong className="text-yellow-400">non-refundable</strong>. Please ensure your schedule is confirmed before completing payment.
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Service Selection */}
          <div data-reveal>
            <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Select Service *</label>
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
                      isSelected ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 bg-sl-card hover:border-sl-accent/40'
                    )}
                  >
                    <div className={clsx('w-8 h-8 flex items-center justify-center shrink-0 mt-0.5', isSelected ? 'bg-sl-accent' : 'bg-sl-accent/10')}>
                      <Icon size={15} className={isSelected ? 'text-sl-on-accent' : 'text-sl-accent'} />
                    </div>
                    <div>
                      <p className={clsx('font-display text-xs font-bold', isSelected ? 'text-sl-accent' : 'text-sl-fg')}>{opt.label}</p>
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
                <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Full Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
              <div className="scan-field">
                <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Phone Number *</label>
                <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09XXXXXXXXX" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
              <div className="sm:col-span-2 scan-field">
                <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Email Address *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
            </div>
          </div>

          {/* ─── VIDEO SHOOT SECTION ─────────────────────────────────────── */}
          {isVideoShoot && (
            <>
              {/* Package */}
              <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '120ms' }}>
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Video Shoot Package *</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
                  {[
                    { value: '4hr' as const, hours: 4, price: pkg4hrPrice },
                    { value: '6hr' as const, hours: 6, price: pkg6hrPrice },
                  ].map((pkg) => (
                    <button
                      key={pkg.value}
                      type="button"
                      onClick={() => setVsPackage(pkg.value)}
                      className={clsx(
                        'flex items-center justify-between p-4 border text-left transition-all',
                        vsPackage === pkg.value ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 hover:border-sl-accent/40'
                      )}
                    >
                      <div>
                        <p className={clsx('font-display text-sm font-bold', vsPackage === pkg.value ? 'text-sl-accent' : 'text-sl-fg')}>
                          {pkg.hours} Hours
                        </p>
                        <p className="font-body text-xs text-sl-muted/50 mt-0.5">Studio performance shoot</p>
                      </div>
                      <span className={clsx('font-display text-sm font-bold', vsPackage === pkg.value ? 'text-sl-accent' : 'text-sl-muted')}>
                        ₱{pkg.price.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Storyboard */}
              <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '140ms' }}>
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Storyboard</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: false, label: 'No', desc: 'Proceed without a storyboard' },
                    { value: true, label: 'Yes', desc: `+₱${storyboardPrice.toLocaleString()} — storyboard included` },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setVsStoryboard(opt.value)}
                      className={clsx(
                        'flex flex-col gap-1 p-4 border text-left transition-all',
                        vsStoryboard === opt.value ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 hover:border-sl-accent/40'
                      )}
                    >
                      <span className={clsx('font-display text-xs font-bold', vsStoryboard === opt.value ? 'text-sl-accent' : 'text-sl-fg')}>{opt.label}</span>
                      <span className="font-body text-xs text-sl-muted/50">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {videoAddons.length > 0 && (
                <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '160ms' }}>
                  <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Add-ons <span className="font-body font-normal normal-case tracking-normal text-sl-muted/40">(optional)</span></h3>
                  <div className="space-y-2">
                    {videoAddons.map((addon) => {
                      const checked = vsAddonIds.includes(addon.id)
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleAddon(addon.id)}
                          className={clsx(
                            'w-full flex items-center justify-between px-4 py-3 border text-left transition-all',
                            checked ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 hover:border-sl-accent/40'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx('w-4 h-4 border flex items-center justify-center shrink-0', checked ? 'bg-sl-accent border-sl-accent' : 'border-sl-accent/30')}>
                              {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-sl-on-accent" /></svg>}
                            </div>
                            <span className={clsx('font-display text-xs font-bold', checked ? 'text-sl-accent' : 'text-sl-fg')}>{addon.name}</span>
                          </div>
                          <span className="font-body text-xs text-sl-muted/60">+₱{Number(addon.price).toLocaleString()}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Date & Time */}
              <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '180ms' }}>
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Preferred Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      value={vsDate}
                      onChange={(e) => setVsDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors [color-scheme:dark] font-body"
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Start Time</label>
                    <select
                      value={vsStartTime}
                      onChange={(e) => setVsStartTime(e.target.value)}
                      className={clsx(
                        'w-full bg-sl-bg border text-sl-fg px-4 py-3 text-sm focus:outline-none transition-colors font-body',
                        vsConflict ? 'border-red-500/60 focus:border-red-500' : 'border-sl-accent/20 focus:border-sl-accent'
                      )}
                    >
                      <option value="">Select start time</option>
                      {timeSlots.map((t) => <option key={t} value={t}>{formatTime12(t)}</option>)}
                    </select>
                  </div>
                </div>

                {vsStartTime && vsPackage && (
                  <div className={clsx(
                    'mt-4 px-4 py-3 border text-sm',
                    vsConflict ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-sl-accent/5 border-sl-accent/20 text-sl-muted'
                  )}>
                    {vsConflict ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <span className="font-display text-xs font-bold block mb-0.5">Time Slot Unavailable</span>
                          <span className="font-body text-xs">This time overlaps with an existing booking. Please choose a different start time.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-sl-muted/60">Session window</span>
                        <span className="font-display text-xs font-bold text-sl-accent">
                          {formatTime12(vsStartTime)} – {formatTime12(vsEndTime)} ({vsHours} hrs)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cost Breakdown */}
              {vsPackage && (
                <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal>
                  <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Estimated Cost</h3>
                  <div className="space-y-2.5 text-sm font-body">
                    <div className="flex justify-between">
                      <span className="text-sl-muted/70">{vsPackage === '4hr' ? '4-Hour' : '6-Hour'} Package</span>
                      <span className="text-sl-fg font-semibold">₱{(vsPackage === '4hr' ? pkg4hrPrice : pkg6hrPrice).toLocaleString()}</span>
                    </div>
                    {vsStoryboard && (
                      <div className="flex justify-between text-yellow-400/80">
                        <span>+ Storyboard</span>
                        <span>+₱{storyboardPrice.toLocaleString()}</span>
                      </div>
                    )}
                    {videoAddons.filter(a => vsAddonIds.includes(a.id)).map((addon) => (
                      <div key={addon.id} className="flex justify-between text-sl-muted/60">
                        <span>+ {addon.name}</span>
                        <span>+₱{Number(addon.price).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-sl-accent/15 pt-2.5 flex justify-between">
                      <span className="font-display text-sl-fg text-xs tracking-widest uppercase font-bold">Total</span>
                      <span className="font-display text-sl-accent font-bold">₱{vsTotalCost.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="font-body text-[10px] text-sl-muted/30 mt-3">Final rate confirmed by admin upon approval.</p>
                </div>
              )}
            </>
          )}

          {/* ─── GUITAR / DRUM LESSON SECTION ───────────────────────────── */}
          {isLessonType && (
            <>
              {/* Skill Level */}
              <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '120ms' }}>
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Skill Level *</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'beginner' as const, label: 'Beginner', desc: 'New to the instrument' },
                    { value: 'intermediate' as const, label: 'Intermediate', desc: 'Some experience, looking to improve' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSkillLevel(opt.value)}
                      className={clsx(
                        'flex flex-col gap-1 p-4 border text-left transition-all',
                        skillLevel === opt.value ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 hover:border-sl-accent/40'
                      )}
                    >
                      <span className={clsx('font-display text-xs font-bold', skillLevel === opt.value ? 'text-sl-accent' : 'text-sl-fg')}>{opt.label}</span>
                      <span className="font-body text-xs text-sl-muted/50">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package */}
              <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '140ms' }}>
                <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Lesson Package *</h3>
                {lessonPackages.length === 0 ? (
                  <p className="font-body text-xs text-sl-muted/40">No packages configured yet. Contact us directly.</p>
                ) : (
                  <div className="space-y-2">
                    {lessonPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => { setLessonPackageId(pkg.id); setManualDates([]); setRecurringDays([]) }}
                        className={clsx(
                          'w-full flex items-center justify-between px-4 py-3.5 border text-left transition-all',
                          lessonPackageId === pkg.id ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 hover:border-sl-accent/40'
                        )}
                      >
                        <div>
                          <p className={clsx('font-display text-xs font-bold', lessonPackageId === pkg.id ? 'text-sl-accent' : 'text-sl-fg')}>{pkg.name}</p>
                          <p className="font-body text-xs text-sl-muted/50 mt-0.5">
                            {pkg.sessions} sessions · {pkg.hours_per_session}hr/session · {pkg.times_per_week}x/week
                          </p>
                        </div>
                        {pkg.price > 0 && (
                          <span className="font-display text-sm font-bold text-sl-muted shrink-0">₱{Number(pkg.price).toLocaleString()}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduling Type */}
              {lessonPackageId && (
                <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '160ms' }}>
                  <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Scheduling *</h3>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { value: 'recurring' as const, label: 'Recurring', desc: `Every week on selected days` },
                      { value: 'manual' as const, label: 'Manual', desc: 'Pick specific dates yourself' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSchedulingType(opt.value); setManualDates([]); setRecurringDays([]) }}
                        className={clsx(
                          'flex flex-col gap-1 p-4 border text-left transition-all',
                          schedulingType === opt.value ? 'border-sl-accent bg-sl-accent/8' : 'border-sl-accent/15 hover:border-sl-accent/40'
                        )}
                      >
                        <span className={clsx('font-display text-xs font-bold', schedulingType === opt.value ? 'text-sl-accent' : 'text-sl-fg')}>{opt.label}</span>
                        <span className="font-body text-xs text-sl-muted/50">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Recurring options */}
                  {schedulingType === 'recurring' && (
                    <div className="space-y-4 pt-4 border-t border-sl-accent/10">
                      <div>
                        <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-3">Days of the Week</label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={clsx(
                                'px-3 py-1.5 text-xs font-display font-bold border transition-all',
                                recurringDays.includes(day)
                                  ? 'bg-sl-accent border-sl-accent text-sl-on-accent'
                                  : 'border-sl-accent/20 text-sl-muted/60 hover:border-sl-accent hover:text-sl-accent'
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        {selectedPackage && recurringDays.length > 0 && recurringDays.length !== selectedPackage.times_per_week && (
                          <p className="font-body text-xs text-yellow-400/70 mt-2">
                            This package requires {selectedPackage.times_per_week}x/week. Please select exactly {selectedPackage.times_per_week} day{selectedPackage.times_per_week > 1 ? 's' : ''}.
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Start Date</label>
                          <input
                            type="date"
                            value={recurringStartDate}
                            onChange={(e) => setRecurringStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors [color-scheme:dark] font-body"
                          />
                        </div>
                        <div>
                          <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Session Time</label>
                          <select
                            value={recurringTime}
                            onChange={(e) => setRecurringTime(e.target.value)}
                            className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                          >
                            <option value="">Select time</option>
                            {timeSlots.map((t) => <option key={t} value={t}>{formatTime12(t)}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Preview */}
                      {previewDates.length > 0 && (
                        <div className="bg-sl-bg border border-sl-accent/10 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-display text-sl-fg text-xs font-bold tracking-widest uppercase">Schedule Preview</span>
                            <span className={clsx('font-body text-xs', previewDates.length === requiredSessions ? 'text-green-400' : 'text-sl-muted/50')}>
                              {previewDates.length} / {requiredSessions} sessions
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {previewDates.map((d) => (
                              <span key={d} className="font-body text-xs text-sl-muted/60 bg-sl-card border border-sl-accent/15 px-2 py-1">
                                {new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual date picking */}
                  {schedulingType === 'manual' && (
                    <div className="space-y-4 pt-4 border-t border-sl-accent/10">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest">Pick Session Dates</label>
                        <span className={clsx('font-body text-xs', sessionCount === requiredSessions ? 'text-green-400' : 'text-sl-muted/50')}>
                          {sessionCount} / {requiredSessions} sessions
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={manualDateInput}
                          onChange={(e) => setManualDateInput(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="flex-1 bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-2.5 text-sm focus:outline-none focus:border-sl-accent transition-colors [color-scheme:dark] font-body"
                        />
                        <button
                          type="button"
                          onClick={addManualDate}
                          disabled={!manualDateInput || manualDates.includes(manualDateInput) || (requiredSessions > 0 && manualDates.length >= requiredSessions)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                      {manualDates.length > 0 && (
                        <div className="space-y-1.5">
                          {manualDates.map((d, i) => (
                            <div key={d} className="flex items-center justify-between px-3 py-2 bg-sl-bg border border-sl-accent/15">
                              <div className="flex items-center gap-3">
                                <span className="font-display text-sl-accent/50 text-[10px]">#{i + 1}</span>
                                <span className="font-body text-sm text-sl-fg">
                                  {new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                              <button type="button" onClick={() => removeManualDate(d)} className="text-sl-muted/30 hover:text-red-400 transition-colors p-1">
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {requiredSessions > 0 && sessionCount > 0 && sessionCount < requiredSessions && (
                        <p className="font-body text-xs text-yellow-400/70">
                          {requiredSessions - sessionCount} more date{requiredSessions - sessionCount !== 1 ? 's' : ''} needed to complete the package.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ─── STANDARD SCHEDULING (recording, jingle, repair) ─────────── */}
          {(isStudio || isRepair) && (
            <div className="bg-sl-card border border-sl-accent/10 p-6" data-reveal style={{ transitionDelay: '160ms' }}>
              <h3 className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">
                Preferred Schedule <span className="text-sl-muted/40 font-body font-normal normal-case tracking-normal">(optional)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="scan-field">
                  <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Preferred Date</label>
                  <input
                    type="date"
                    value={form.preferred_date}
                    onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors [color-scheme:dark] font-body"
                  />
                </div>
                <div className="scan-field">
                  <label className="block font-body text-xs text-sl-muted/70 uppercase tracking-widest mb-2">Preferred Time</label>
                  <select
                    value={form.preferred_time}
                    onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                    className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                  >
                    <option value="">Select time</option>
                    {timeSlots.map((t) => <option key={t} value={t}>{formatTime12(t)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

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
                isStudio
                  ? 'Tell us about your project — genre, number of tracks, reference songs, etc.'
                  : isLessonType
                  ? 'Tell us your musical background, goals, or any specific songs or techniques you want to learn...'
                  : isRepair
                  ? 'Describe the issue with your instrument...'
                  : 'Tell us about your video shoot concept, reference videos, or any special requirements...'
              }
              className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors resize-none font-body"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-body flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-sl-muted/40">* Required fields. We&apos;ll respond within 24–48 hours.</p>
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

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createClient } from '@/lib/supabase/client'
import { Star, Upload, X, CheckCircle, AlertCircle, Camera } from 'lucide-react'
import clsx from 'clsx'

const ASPECTS = [
  { key: 'accommodation_rating', label: 'Accommodation', desc: 'Space comfort and facilities' },
  { key: 'equipment_rating',     label: 'Equipment',     desc: 'Gear quality and condition' },
  { key: 'personnel_rating',     label: 'Personnel',     desc: 'Staff helpfulness and attitude' },
] as const

const OVERALL_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

function StarPicker({
  value,
  onChange,
  size = 28,
}: {
  value: number
  onChange: (v: number) => void
  size?: number
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95"
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={clsx(
              'transition-colors',
              n <= (hover || value)
                ? 'text-sl-accent fill-sl-accent'
                : 'text-sl-muted/20'
            )}
          />
        </button>
      ))}
    </div>
  )
}

type Form = {
  reviewer_name: string
  overall_rating: number
  accommodation_rating: number
  equipment_rating: number
  personnel_rating: number
  review_text: string
}

export default function ReviewPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<Form>({
    reviewer_name: (session?.user?.name as string) ?? '',
    overall_rating: 0,
    accommodation_rating: 0,
    equipment_rating: 0,
    personnel_rating: 0,
    review_text: '',
  })
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = 5 - photos.length
    files.slice(0, remaining).forEach((file) => {
      const preview = URL.createObjectURL(file)
      setPhotos((prev) => [...prev, { file, preview }])
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(photos[i].preview)
    setPhotos((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.overall_rating === 0) { setError('Please select an overall rating.'); return }
    if (!form.reviewer_name.trim()) { setError('Please enter your name.'); return }

    setUploading(true)
    setError('')

    try {
      const photoUrls: string[] = []
      for (const { file } of photos) {
        const ext = file.name.split('.').pop()
        const name = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data: up, error: upErr } = await supabase.storage
          .from('seven-lions-photos')
          .upload(name, file, { upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage
          .from('seven-lions-photos')
          .getPublicUrl(up.path)
        photoUrls.push(publicUrl)
      }

      const { error: insertErr } = await supabase.from('studio_reviews').insert({
        user_id: (session?.user as any)?.id ?? null,
        reviewer_name: form.reviewer_name.trim(),
        overall_rating: form.overall_rating,
        accommodation_rating: form.accommodation_rating || null,
        equipment_rating: form.equipment_rating || null,
        personnel_rating: form.personnel_rating || null,
        review_text: form.review_text.trim() || null,
        photo_urls: photoUrls,
        status: 'pending',
      })
      if (insertErr) throw insertErr
      setSubmitted(true)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit review.')
    } finally {
      setUploading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md fade-in-up">
          <div className="w-20 h-20 border border-sl-accent/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-sl-accent" />
          </div>
          <h2 className="font-display text-3xl text-sl-fg font-black mb-4">THANK YOU!</h2>
          <p className="font-body text-sl-muted mb-2">Your review has been submitted and is pending approval.</p>
          <p className="font-body text-sm text-sl-muted/50 mb-10">We'll review it shortly and publish it once verified.</p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      <section className="py-16 text-center px-4 border-b border-sl-accent/10">
        <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-3 fade-in-up">Share Your Experience</p>
        <h1 className="font-display text-4xl md:text-5xl text-sl-fg font-black mb-4 fade-in-up" style={{ animationDelay: '80ms' }}>LEAVE A REVIEW</h1>
        <p className="font-body text-sl-muted max-w-md mx-auto fade-in-up" style={{ animationDelay: '160ms' }}>
          Help other musicians find us. Tell us about your session at Seven Lions Studio.
        </p>
        <div className="w-16 h-px bg-sl-accent mx-auto mt-6 fade-in-up" style={{ animationDelay: '240ms' }} />
      </section>

      <div className="max-w-2xl mx-auto px-4 py-14">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Overall rating */}
          <div className="bg-sl-card border border-sl-accent/10 p-7 text-center">
            <p className="font-display text-sl-fg text-xs tracking-widest uppercase mb-5">Overall Rating *</p>
            <div className="flex justify-center mb-3">
              <StarPicker value={form.overall_rating} onChange={(v) => setForm(p => ({ ...p, overall_rating: v }))} size={36} />
            </div>
            <p className={clsx('font-display text-sm tracking-widest uppercase transition-opacity', form.overall_rating ? 'text-sl-accent opacity-100' : 'opacity-0')}>
              {OVERALL_LABELS[form.overall_rating]}
            </p>
          </div>

          {/* Aspect ratings */}
          <div className="bg-sl-card border border-sl-accent/10 p-7">
            <p className="font-display text-sl-fg text-xs tracking-widest uppercase mb-6">Rate the Experience</p>
            <div className="space-y-6">
              {ASPECTS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-sl-fg font-medium">{label}</p>
                    <p className="font-body text-xs text-sl-muted/50">{desc}</p>
                  </div>
                  <StarPicker
                    value={form[key as keyof Form] as number}
                    onChange={(v) => setForm(p => ({ ...p, [key]: v }))}
                    size={22}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div className="bg-sl-card border border-sl-accent/10 p-7 scan-field">
            <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Your Review</label>
            <textarea
              rows={5}
              value={form.review_text}
              onChange={(e) => setForm(p => ({ ...p, review_text: e.target.value }))}
              placeholder="Tell us about your experience — the vibe, the sound, the team…"
              className="w-full bg-sl-bg border border-sl-accent/15 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent resize-none transition-colors font-body"
            />
          </div>

          {/* Photos */}
          <div className="bg-sl-card border border-sl-accent/10 p-7">
            <p className="font-display text-sl-fg text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
              <Camera size={13} className="text-sl-accent" /> Photos <span className="font-body font-normal normal-case tracking-normal text-sl-muted/40 text-xs ml-1">(optional, up to 5)</span>
            </p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {photos.map((p, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={p.preview} alt="" className="w-full h-full object-cover grayscale" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border border-dashed border-sl-accent/25 flex flex-col items-center justify-center gap-1 hover:border-sl-accent text-sl-muted/30 hover:text-sl-accent transition-all"
                >
                  <Upload size={16} />
                  <span className="font-body text-[9px] uppercase tracking-widest">Add</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
            <p className="font-body text-xs text-sl-muted/30">Hover a photo and click × to remove</p>
          </div>

          {/* Your name */}
          <div className="bg-sl-card border border-sl-accent/10 p-7 scan-field">
            <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-4">Your Name *</label>
            <input
              type="text"
              required
              value={form.reviewer_name}
              onChange={(e) => setForm(p => ({ ...p, reviewer_name: e.target.value }))}
              placeholder="How should we credit you?"
              className="w-full bg-sl-bg border border-sl-accent/15 text-sl-fg placeholder-sl-muted/30 px-4 py-3 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 font-body">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-4 bg-sl-accent text-sl-on-accent font-body font-semibold text-sm tracking-widest uppercase hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {uploading && <span className="w-4 h-4 border-2 border-sl-on-accent/30 border-t-sl-on-accent rounded-full animate-spin" />}
            {uploading ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  )
}

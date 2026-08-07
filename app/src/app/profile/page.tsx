'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession, signOut } from 'next-auth/react'
import { User, Phone, Mail, Calendar, ClipboardList, Edit3, Save, X, LogOut, Camera, Star, Upload, ExternalLink, CreditCard } from 'lucide-react'
import type { ServiceRequest, RehearsalBooking } from '@/types/database'
import { format } from 'date-fns'
import clsx from 'clsx'

const STATUS_LABEL: Record<string, string> = {
  for_approval: 'FOR APPROVAL',
  approved_pending_payment: 'PENDING PAYMENT',
  confirmed: 'CONFIRMED',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
  pending: 'PENDING',
  approved: 'APPROVED',
}

const STATUS_CSS: Record<string, string> = {
  for_approval: 'status-for-approval',
  approved_pending_payment: 'status-pending-payment',
  confirmed: 'status-confirmed',
  rejected: 'status-rejected',
  cancelled: 'status-cancelled',
  pending: 'status-for-approval',
  approved: 'status-confirmed',
}

const serviceLabels: Record<string, string> = {
  recording: 'Recording Session',
  jingle: 'Jingle Production',
  guitar_lesson: 'Guitar Lesson',
  drum_lesson: 'Drum Lesson',
  guitar_repair: 'Guitar Repair',
  bass_repair: 'Bass Repair',
  video_shoot: 'Video Shoot',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ id: string; name: string | null; email: string | null; phone: string | null; role: string; avatar_url: string | null; created_at: string } | null>(null)
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
  const [rehearsalBookings, setRehearsalBookings] = useState<RehearsalBooking[]>([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'requests' | 'bookings'>('bookings')
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<RehearsalBooking | null>(null)
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<ServiceRequest | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()
  const supabase = createClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const proofRequestInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/login'); return }
    loadProfile(session.user.id)
  }, [session, status])

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single()
    if (!data) { router.push('/auth/login'); return }

    setProfile(data)
    setEditForm({ name: data.name || '', phone: data.phone || '' })
    setLoading(false)

    const [{ data: reqs }, { data: bookings }] = await Promise.all([
      supabase.from('seven_lions_service_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('seven_lions_rehearsal_bookings').select('*').eq('user_id', userId).order('booking_date', { ascending: false }),
    ])

    if (reqs) setServiceRequests(reqs)
    if (bookings) setRehearsalBookings(bookings)
  }

  const saveProfile = async () => {
    if (!profile) return
    await supabase.from('users').update({ name: editForm.name, phone: editForm.phone }).eq('id', profile.id)
    setProfile({ ...profile, name: editForm.name, phone: editForm.phone })
    setEditing(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setAvatarUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `avatars/${profile.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('seven-lions-photos')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(filePath)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: publicUrl })
    }

    setAvatarUploading(false)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const cancelRequest = async (type: 'service' | 'rehearsal', id: string) => {
    const table = type === 'service' ? 'seven_lions_service_requests' : 'seven_lions_rehearsal_bookings'
    await supabase.from(table).update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
    setSelectedBookingDetail(null)
    setSelectedRequestDetail(null)
    if (session?.user.id) loadProfile(session.user.id)
  }

  const uploadProof = async (type: 'rehearsal' | 'service', id: string, file: File) => {
    setProofUploading(true)
    const ext = file.name.split('.').pop()
    const path = `payment-proofs/${id}-${Date.now()}.${ext}`
    const { data: uploadData, error } = await supabase.storage.from('seven-lions-photos').upload(path, file, { upsert: false })
    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(path)
      const table = type === 'rehearsal' ? 'seven_lions_rehearsal_bookings' : 'seven_lions_service_requests'
      await (supabase as any).from(table).update({ payment_proof_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', id)
      if (session?.user.id) {
        await loadProfile(session.user.id)
        if (type === 'rehearsal') {
          const updated = rehearsalBookings.find(b => b.id === id)
          if (updated) setSelectedBookingDetail({ ...updated, payment_proof_url: publicUrl } as any)
        } else {
          const updated = serviceRequests.find(r => r.id === id)
          if (updated) setSelectedRequestDetail({ ...updated, payment_proof_url: publicUrl } as any)
        }
      }
    }
    setProofUploading(false)
    if (proofInputRef.current) proofInputRef.current.value = ''
    if (proofRequestInputRef.current) proofRequestInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      <section className="py-12 px-4 border-b border-sl-accent/10">
        <div className="max-w-4xl mx-auto fade-in-up">
          <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-2">Account</p>
          <h1 className="font-display text-4xl text-sl-fg font-black">MY PROFILE</h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Profile Card */}
        <div className="bg-sl-card border border-sl-accent/15 p-6 mb-8 fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 border border-sl-accent/20 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover grayscale" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-sl-card">
                      <User size={28} className="text-sl-accent" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {avatarUploading
                    ? <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={16} className="text-white" />
                  }
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
              <div>
                {editing ? (
                  <div className="space-y-3">
                    <div className="scan-field max-w-xs">
                      <label className="block font-body text-[10px] text-sl-muted/50 uppercase tracking-widest mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Your name"
                        className="bg-sl-bg border border-sl-accent/30 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent w-full font-body"
                      />
                    </div>
                    <div className="scan-field max-w-xs">
                      <label className="block font-body text-[10px] text-sl-muted/50 uppercase tracking-widest mb-1">Contact Number</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="09XXXXXXXXX"
                        className="bg-sl-bg border border-sl-accent/30 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent w-full font-body"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-sl-fg text-xl font-bold">{profile?.name || 'Set your name'}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={clsx(
                        'text-xs font-body px-2 py-0.5 border',
                        profile?.role === 'admin'
                          ? 'border-sl-accent text-sl-accent bg-sl-accent/10'
                          : 'border-sl-accent/20 text-sl-muted/40'
                      )}>
                        {profile?.role?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-sl-muted/60 font-body">
                      {profile?.email && (
                        <span className="flex items-center gap-1.5"><Mail size={12} className="text-sl-accent" />{profile.email}</span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} className="text-sl-accent" />
                        {profile?.phone
                          ? profile.phone
                          : <span className="text-sl-muted/30 italic text-xs">No contact number — click edit to add</span>
                        }
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-sl-accent" />
                        Member since {format(new Date(profile?.created_at || ''), 'MMMM yyyy')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <button onClick={saveProfile} className="p-2 text-green-400 hover:text-green-300 transition-colors">
                    <Save size={16} />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-2 text-red-400 hover:text-red-300 transition-colors">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={handleSignOut} className="p-2 text-sl-muted/40 hover:text-red-400 transition-colors">
                    <LogOut size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Session Milestone Card */}
        {(() => {
          const milestoneCount = rehearsalBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected' && b.status !== 'for_approval').length
          const progressInCycle = milestoneCount % 5
          const bookingsToNext = progressInCycle === 0 ? 5 : 5 - progressInCycle
          const isEligible = milestoneCount > 0 && progressInCycle === 0
          return (
            <div className="bg-sl-card border border-sl-accent/15 p-6 mb-8 fade-in-up" style={{ animationDelay: '110ms' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-sl-accent" />
                  <span className="font-display text-sl-fg text-xs tracking-widest uppercase">Session Milestones</span>
                </div>
                <span className="font-display text-sl-accent font-black text-lg">{milestoneCount}</span>
              </div>
              <div className="flex gap-1.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 transition-all ${i < progressInCycle || isEligible ? 'bg-sl-accent' : 'bg-sl-accent/15'}`}
                  />
                ))}
              </div>
              {isEligible ? (
                <p className="font-body text-xs text-green-400">
                  Your next booking comes with <strong>2 free hours</strong> — you&apos;ve earned it!
                </p>
              ) : (
                <p className="font-body text-xs text-sl-muted/50">
                  {bookingsToNext} more booking{bookingsToNext !== 1 ? 's' : ''} until your next free 2-hour session
                </p>
              )}
              <p className="font-body text-[10px] text-sl-muted/30 mt-1">
                {milestoneCount} total session{milestoneCount !== 1 ? 's' : ''} · every 5th booking earns 2 free hours
              </p>
            </div>
          )
        })()}

        {/* Booking History */}
        <div className="fade-in-up" style={{ animationDelay: '160ms' }}>
          <div className="flex gap-4 border-b border-sl-accent/10 mb-6">
            <button
              onClick={() => setActiveTab('bookings')}
              className={clsx(
                'flex items-center gap-2 pb-3 text-xs font-body uppercase tracking-widest border-b-2 transition-all',
                activeTab === 'bookings' ? 'text-sl-accent border-sl-accent' : 'text-sl-muted/40 border-transparent hover:text-sl-accent'
              )}
            >
              <Calendar size={13} />
              Rehearsal Bookings ({rehearsalBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={clsx(
                'flex items-center gap-2 pb-3 text-xs font-body uppercase tracking-widest border-b-2 transition-all',
                activeTab === 'requests' ? 'text-sl-accent border-sl-accent' : 'text-sl-muted/40 border-transparent hover:text-sl-accent'
              )}
            >
              <ClipboardList size={13} />
              Service Requests ({serviceRequests.length})
            </button>
          </div>

          {activeTab === 'bookings' && (
            <div className="space-y-3 fade-in-up">
              {rehearsalBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-body text-sm text-sl-muted/40 mb-4">No rehearsal bookings yet</p>
                  <a href="/rehearsal-booking" className="text-xs font-body text-sl-accent border border-sl-accent/30 px-4 py-2 hover:bg-sl-accent/5 uppercase tracking-widest transition-all">
                    Book a Session
                  </a>
                </div>
              ) : rehearsalBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBookingDetail(b)}
                  className="w-full text-left bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-display text-sl-fg text-sm font-bold">{b.band_name}</span>
                        <span className={clsx('text-xs px-2 py-0.5 font-body', STATUS_CSS[b.status] ?? 'status-for-approval')}>
                          {STATUS_LABEL[b.status] ?? b.status.toUpperCase()}
                        </span>
                        {b.status === 'approved_pending_payment' && !(b as any).payment_proof_url && (
                          <span className="text-xs font-body text-blue-400 border border-blue-400/30 px-2 py-0.5 animate-pulse">Action Required</span>
                        )}
                      </div>
                      <div className="text-xs text-sl-muted/50 font-body flex flex-wrap gap-3">
                        <span className="text-sl-accent">{b.booking_date}</span>
                        <span>{b.start_time} – {b.end_time}</span>
                        <span>{b.num_members} members</span>
                      </div>
                      {(b as any).final_rate && (
                        <p className="font-body text-xs text-blue-400/80 mt-1.5">Final Rate: ₱{Number((b as any).final_rate).toLocaleString()}</p>
                      )}
                      {b.admin_notes && (
                        <p className="font-body text-xs text-sl-accent/70 mt-1">Admin: {b.admin_notes}</p>
                      )}
                    </div>
                    <span className="text-sl-accent/40 text-xs font-body shrink-0">View →</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-3 fade-in-up">
              {serviceRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-body text-sm text-sl-muted/40 mb-4">No service requests yet</p>
                  <a href="/request-service" className="text-xs font-body text-sl-accent border border-sl-accent/30 px-4 py-2 hover:bg-sl-accent/5 uppercase tracking-widest transition-all">
                    Request a Service
                  </a>
                </div>
              ) : serviceRequests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRequestDetail(r)}
                  className="w-full text-left bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-display text-sl-fg text-sm font-bold">{serviceLabels[r.service_type]}</span>
                        <span className={clsx('text-xs px-2 py-0.5 font-body', STATUS_CSS[r.status] ?? 'status-for-approval')}>
                          {STATUS_LABEL[r.status] ?? r.status.toUpperCase()}
                        </span>
                        {r.status === 'approved_pending_payment' && !(r as any).payment_proof_url && (
                          <span className="text-xs font-body text-blue-400 border border-blue-400/30 px-2 py-0.5 animate-pulse">Action Required</span>
                        )}
                      </div>
                      <div className="text-xs text-sl-muted/50 font-body flex flex-wrap gap-3">
                        {r.preferred_date && <span>{r.preferred_date}</span>}
                        {r.preferred_time && <span>{r.preferred_time}</span>}
                        <span>{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {(r as any).final_rate && (
                        <p className="font-body text-xs text-blue-400/80 mt-1.5">Final Rate: ₱{Number((r as any).final_rate).toLocaleString()}</p>
                      )}
                      {r.admin_notes && (
                        <p className="font-body text-xs text-sl-accent/70 mt-1">Admin: {r.admin_notes}</p>
                      )}
                    </div>
                    <span className="text-sl-accent/40 text-xs font-body shrink-0">View →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rehearsal Booking Detail Modal ───────────────────────────────── */}
      {selectedBookingDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-sl-fg text-base font-black">BOOKING DETAILS</h3>
                <span className={clsx('text-xs px-2 py-0.5 font-body mt-1 inline-block', STATUS_CSS[selectedBookingDetail.status] ?? 'status-for-approval')}>
                  {STATUS_LABEL[selectedBookingDetail.status] ?? selectedBookingDetail.status.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setSelectedBookingDetail(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Band / Artist</p><p className="text-sl-fg font-body">{selectedBookingDetail.band_name}</p></div>
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Contact</p><p className="text-sl-fg font-body">{selectedBookingDetail.contact_name}</p></div>
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Date</p><p className="text-sl-accent font-body">{selectedBookingDetail.booking_date}</p></div>
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Time</p><p className="text-sl-fg font-body">{selectedBookingDetail.start_time} – {selectedBookingDetail.end_time}</p></div>
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Members</p><p className="text-sl-fg font-body">{selectedBookingDetail.num_members}</p></div>
                {(selectedBookingDetail as any).final_rate && (
                  <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Final Rate</p><p className="text-blue-400 font-body font-bold text-base">₱{Number((selectedBookingDetail as any).final_rate).toLocaleString()}</p></div>
                )}
              </div>
              {selectedBookingDetail.admin_notes && (
                <div className="bg-sl-accent/5 border border-sl-accent/15 p-3">
                  <p className="text-sl-muted/40 text-[10px] uppercase font-body mb-1">Note from Studio</p>
                  <p className="font-body text-sm text-sl-fg">{selectedBookingDetail.admin_notes}</p>
                </div>
              )}

              {/* Payment Proof */}
              {selectedBookingDetail.status === 'approved_pending_payment' && (
                <div className="border border-blue-400/20 bg-blue-400/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={14} className="text-blue-400" />
                    <p className="font-display text-blue-400 text-xs tracking-widest uppercase">Payment Required</p>
                  </div>
                  {(selectedBookingDetail as any).payment_proof_url ? (
                    <div>
                      <p className="font-body text-xs text-sl-muted/60 mb-2">Proof submitted — awaiting admin confirmation.</p>
                      <a href={(selectedBookingDetail as any).payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-body text-blue-400 hover:opacity-80 transition-opacity">
                        <ExternalLink size={12} /> View uploaded proof
                      </a>
                    </div>
                  ) : (
                    <div>
                      <p className="font-body text-xs text-sl-muted/60 mb-3">
                        Please complete payment and upload your proof to confirm your booking.
                      </p>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadProof('rehearsal', selectedBookingDetail.id, file)
                        }}
                      />
                      <button
                        onClick={() => proofInputRef.current?.click()}
                        disabled={proofUploading}
                        className="flex items-center gap-2 px-4 py-2.5 border border-blue-400/40 text-blue-400 text-xs font-body uppercase tracking-widest hover:bg-blue-400/10 transition-all disabled:opacity-50 w-full justify-center"
                      >
                        {proofUploading
                          ? <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                          : <Upload size={13} />
                        }
                        {proofUploading ? 'Uploading...' : 'Upload Proof of Payment'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(selectedBookingDetail.status === 'for_approval' || selectedBookingDetail.status === 'pending') && (
              <button
                onClick={() => cancelRequest('rehearsal', selectedBookingDetail.id)}
                className="w-full py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Service Request Detail Modal ─────────────────────────────────── */}
      {selectedRequestDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-sl-fg text-base font-black">REQUEST DETAILS</h3>
                <span className={clsx('text-xs px-2 py-0.5 font-body mt-1 inline-block', STATUS_CSS[selectedRequestDetail.status] ?? 'status-for-approval')}>
                  {STATUS_LABEL[selectedRequestDetail.status] ?? selectedRequestDetail.status.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setSelectedRequestDetail(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2"><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Service</p><p className="text-sl-accent font-body font-semibold">{serviceLabels[selectedRequestDetail.service_type]}</p></div>
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Name</p><p className="text-sl-fg font-body">{selectedRequestDetail.name}</p></div>
                <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Phone</p><p className="text-sl-fg font-body">{selectedRequestDetail.phone}</p></div>
                {selectedRequestDetail.preferred_date && <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Preferred Date</p><p className="text-sl-fg font-body">{selectedRequestDetail.preferred_date}</p></div>}
                {selectedRequestDetail.preferred_time && <div><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Preferred Time</p><p className="text-sl-fg font-body">{selectedRequestDetail.preferred_time}</p></div>}
                {(selectedRequestDetail as any).final_rate && (
                  <div className="col-span-2"><p className="text-sl-muted/40 text-[10px] uppercase font-body mb-0.5">Final Rate</p><p className="text-blue-400 font-body font-bold text-base">₱{Number((selectedRequestDetail as any).final_rate).toLocaleString()}</p></div>
                )}
              </div>
              {selectedRequestDetail.message && (
                <div className="bg-sl-bg p-3">
                  <p className="text-sl-muted/40 text-[10px] uppercase font-body mb-1">Your Message</p>
                  <p className="font-body text-sm text-sl-muted">{selectedRequestDetail.message}</p>
                </div>
              )}
              {selectedRequestDetail.admin_notes && (
                <div className="bg-sl-accent/5 border border-sl-accent/15 p-3">
                  <p className="text-sl-muted/40 text-[10px] uppercase font-body mb-1">Note from Studio</p>
                  <p className="font-body text-sm text-sl-fg">{selectedRequestDetail.admin_notes}</p>
                </div>
              )}

              {/* Payment Proof */}
              {selectedRequestDetail.status === 'approved_pending_payment' && (
                <div className="border border-blue-400/20 bg-blue-400/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={14} className="text-blue-400" />
                    <p className="font-display text-blue-400 text-xs tracking-widest uppercase">Payment Required</p>
                  </div>
                  {(selectedRequestDetail as any).payment_proof_url ? (
                    <div>
                      <p className="font-body text-xs text-sl-muted/60 mb-2">Proof submitted — awaiting admin confirmation.</p>
                      <a href={(selectedRequestDetail as any).payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-body text-blue-400 hover:opacity-80 transition-opacity">
                        <ExternalLink size={12} /> View uploaded proof
                      </a>
                    </div>
                  ) : (
                    <div>
                      <p className="font-body text-xs text-sl-muted/60 mb-3">
                        Please complete payment and upload your proof to confirm your request.
                      </p>
                      <input
                        ref={proofRequestInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadProof('service', selectedRequestDetail.id, file)
                        }}
                      />
                      <button
                        onClick={() => proofRequestInputRef.current?.click()}
                        disabled={proofUploading}
                        className="flex items-center gap-2 px-4 py-2.5 border border-blue-400/40 text-blue-400 text-xs font-body uppercase tracking-widest hover:bg-blue-400/10 transition-all disabled:opacity-50 w-full justify-center"
                      >
                        {proofUploading
                          ? <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                          : <Upload size={13} />
                        }
                        {proofUploading ? 'Uploading...' : 'Upload Proof of Payment'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(selectedRequestDetail.status === 'for_approval' || selectedRequestDetail.status === 'pending') && (
              <button
                onClick={() => cancelRequest('service', selectedRequestDetail.id)}
                className="w-full py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

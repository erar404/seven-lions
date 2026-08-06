'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession, signOut } from 'next-auth/react'
import { User, Phone, Mail, Calendar, ClipboardList, Edit3, Save, X, LogOut, Camera } from 'lucide-react'
import type { ServiceRequest, RehearsalBooking } from '@/types/database'
import { format } from 'date-fns'
import clsx from 'clsx'

type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

const statusColors: Record<BookingStatus, string> = {
  pending: 'status-pending',
  approved: 'status-approved',
  rejected: 'status-rejected',
  cancelled: 'status-cancelled',
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
  const router = useRouter()
  const { data: session, status } = useSession()
  const supabase = createClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)

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
    if (session?.user.id) loadProfile(session.user.id)
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
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Your name"
                        className="bg-sl-bg border border-sl-accent/30 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent w-full font-body"
                      />
                    </div>
                    <div className="scan-field max-w-xs">
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="Phone number"
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
                      {profile?.phone && (
                        <span className="flex items-center gap-1.5"><Phone size={12} className="text-sl-accent" />{profile.phone}</span>
                      )}
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
                <div key={b.id} className="bg-sl-card border border-sl-accent/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-display text-sl-fg text-sm font-bold">{b.band_name}</span>
                        <span className={clsx('text-xs px-2 py-0.5 font-body', statusColors[b.status as BookingStatus])}>
                          {b.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-sl-muted/50 font-body flex flex-wrap gap-3">
                        <span className="text-sl-accent">{b.booking_date}</span>
                        <span>{b.start_time} – {b.end_time}</span>
                        <span>{b.num_members} members</span>
                      </div>
                      {b.admin_notes && (
                        <p className="font-body text-xs text-sl-accent/70 mt-2">Admin: {b.admin_notes}</p>
                      )}
                    </div>
                    {b.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest('rehearsal', b.id)}
                        className="text-xs font-body text-red-400 border border-red-400/30 px-3 py-1.5 hover:bg-red-400/10 uppercase tracking-widest transition-all shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
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
                <div key={r.id} className="bg-sl-card border border-sl-accent/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-display text-sl-fg text-sm font-bold">{serviceLabels[r.service_type]}</span>
                        <span className={clsx('text-xs px-2 py-0.5 font-body', statusColors[r.status as BookingStatus])}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-sl-muted/50 font-body flex flex-wrap gap-3">
                        {r.preferred_date && <span>{r.preferred_date}</span>}
                        {r.preferred_time && <span>{r.preferred_time}</span>}
                        <span>{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {r.admin_notes && (
                        <p className="font-body text-xs text-sl-accent/70 mt-2">Admin: {r.admin_notes}</p>
                      )}
                    </div>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest('service', r.id)}
                        className="text-xs font-body text-red-400 border border-red-400/30 px-3 py-1.5 hover:bg-red-400/10 uppercase tracking-widest transition-all shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ClipboardList, Calendar, Users, Image as ImageIcon, Settings,
  CheckCircle, XCircle, Search, Upload, Trash2, Edit3, Save, X, Music2, Plus
} from 'lucide-react'
import clsx from 'clsx'
import type { ServiceRequest, RehearsalBooking, User, GalleryItem, Band } from '@/types/database'
import { format } from 'date-fns'

type Tab = 'service-requests' | 'rehearsal-bookings' | 'users' | 'gallery' | 'settings'
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('service-requests')
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
  const [rehearsalBookings, setRehearsalBookings] = useState<RehearsalBooking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<RehearsalBooking | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editSettings, setEditSettings] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({})
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [userEditRole, setUserEditRole] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bands, setBands] = useState<Band[]>([])
  const [bandModal, setBandModal] = useState<{ mode: 'create' | 'edit'; band?: Band } | null>(null)
  const [bandForm, setBandForm] = useState({ band_name: '', band_description: '', loyalty_card_count: 0, picture_urls: [] as string[] })
  const [bandUploading, setBandUploading] = useState(false)
  const bandFileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const { data: session, status } = useSession()
  const supabase = createClient()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/login'); return }
    if ((session.user as any).role !== 'admin') { router.push('/'); return }
    setLoading(false)
    loadServiceRequests()
  }, [session, status])

  useEffect(() => {
    if (activeTab === 'service-requests') loadServiceRequests()
    else if (activeTab === 'rehearsal-bookings') loadRehearsalBookings()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'gallery') loadGallery()
    else if (activeTab === 'settings') { loadSettings(); loadBands() }
  }, [activeTab])

  const loadServiceRequests = async () => {
    const { data } = await supabase.from('seven_lions_service_requests').select('*').order('created_at', { ascending: false })
    if (data) setServiceRequests(data)
  }

  const loadRehearsalBookings = async () => {
    const { data } = await supabase.from('seven_lions_rehearsal_bookings').select('*').order('booking_date', { ascending: false })
    if (data) setRehearsalBookings(data)
  }

  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
  }

  const loadGallery = async () => {
    const { data } = await supabase.from('seven_lions_gallery').select('*').order('sort_order')
    if (data) setGallery(data)
  }

  const loadSettings = async () => {
    const { data } = await supabase.from('seven_lions_settings').select('*')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((s) => { map[s.key] = s.value || '' })
      setSettings(map)
      setSettingsDraft(map)
    }
  }

  const updateRequestStatus = async (id: string, status: BookingStatus, note: string) => {
    await supabase.from('seven_lions_service_requests').update({ status, admin_notes: note, updated_at: new Date().toISOString() }).eq('id', id)
    setSelectedRequest(null)
    setAdminNote('')
    loadServiceRequests()
  }

  const updateBookingStatus = async (id: string, status: BookingStatus, note: string) => {
    await supabase.from('seven_lions_rehearsal_bookings').update({ status, admin_notes: note, updated_at: new Date().toISOString() }).eq('id', id)
    setSelectedBooking(null)
    setAdminNote('')
    loadRehearsalBookings()
  }

  const updateUserRole = async (userId: string, role: string) => {
    await supabase.from('users').update({ role }).eq('id', userId)
    setEditUserId(null)
    loadUsers()
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`

    const { data: uploadData, error } = await supabase.storage
      .from('seven-lions-photos')
      .upload(fileName, file, { upsert: false })

    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(fileName)
      await supabase.from('seven_lions_gallery').insert({ url: publicUrl, alt: file.name, category: 'general', sort_order: gallery.length + 1 })
      loadGallery()
    }
    setUploading(false)
  }

  const deleteGalleryItem = async (id: string) => {
    await supabase.from('seven_lions_gallery').delete().eq('id', id)
    loadGallery()
  }

  const toggleGalleryActive = async (id: string, active: boolean) => {
    await supabase.from('seven_lions_gallery').update({ active: !active }).eq('id', id)
    loadGallery()
  }

  const loadBands = async () => {
    const { data } = await supabase.from('bands').select('*').order('band_name')
    if (data) setBands(data)
  }

  const openCreateBand = () => {
    setBandForm({ band_name: '', band_description: '', loyalty_card_count: 0, picture_urls: [] })
    setBandModal({ mode: 'create' })
  }

  const openEditBand = (band: Band) => {
    setBandForm({
      band_name: band.band_name,
      band_description: band.band_description || '',
      loyalty_card_count: band.loyalty_card_count,
      picture_urls: band.picture_urls || [],
    })
    setBandModal({ mode: 'edit', band })
  }

  const saveBand = async () => {
    if (!bandForm.band_name.trim()) return
    if (bandModal?.mode === 'create') {
      await supabase.from('bands').insert({
        band_name: bandForm.band_name,
        band_description: bandForm.band_description || null,
        loyalty_card_count: bandForm.loyalty_card_count,
        picture_urls: bandForm.picture_urls,
      })
    } else if (bandModal?.band) {
      await supabase.from('bands').update({
        band_name: bandForm.band_name,
        band_description: bandForm.band_description || null,
        loyalty_card_count: bandForm.loyalty_card_count,
        picture_urls: bandForm.picture_urls,
        updated_at: new Date().toISOString(),
      }).eq('id', bandModal.band.id)
    }
    setBandModal(null)
    loadBands()
  }

  const deleteBand = async (id: string) => {
    if (!confirm('Delete this band?')) return
    await supabase.from('bands').delete().eq('id', id)
    loadBands()
  }

  const uploadBandPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || bandForm.picture_urls.length >= 5) return
    setBandUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `bands/${Date.now()}.${fileExt}`
    const { data: uploadData, error } = await supabase.storage
      .from('seven-lions-photos')
      .upload(fileName, file, { upsert: false })
    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(fileName)
      setBandForm(prev => ({ ...prev, picture_urls: [...prev.picture_urls, publicUrl] }))
    }
    setBandUploading(false)
    if (bandFileInputRef.current) bandFileInputRef.current.value = ''
  }

  const removeBandPicture = (index: number) => {
    setBandForm(prev => ({ ...prev, picture_urls: prev.picture_urls.filter((_, i) => i !== index) }))
  }

  const saveSettings = async () => {
    for (const [key, value] of Object.entries(settingsDraft)) {
      await supabase.from('seven_lions_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setSettings(settingsDraft)
    setEditSettings(false)
  }

  const filteredRequests = serviceRequests.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchSearch = !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.service_type.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredBookings = rehearsalBookings.filter((b) => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const matchSearch = !searchQuery ||
      b.band_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredUsers = users.filter((u) =>
    !searchQuery || (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { id: 'service-requests' as Tab, label: 'Service Requests', icon: ClipboardList, count: serviceRequests.filter(r => r.status === 'pending').length },
    { id: 'rehearsal-bookings' as Tab, label: 'Rehearsal Bookings', icon: Calendar, count: rehearsalBookings.filter(b => b.status === 'pending').length },
    { id: 'users' as Tab, label: 'Users', icon: Users, count: null },
    { id: 'gallery' as Tab, label: 'Gallery', icon: ImageIcon, count: null },
    { id: 'settings' as Tab, label: 'Page Settings', icon: Settings, count: null },
  ]

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
        <div className="max-w-7xl mx-auto">
          <p className="font-body text-sl-muted text-xs tracking-[0.4em] uppercase mb-2">Admin Portal</p>
          <h1 className="font-display text-4xl text-sl-fg font-black">DASHBOARD</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-sl-accent/10 pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setStatusFilter('all'); setSearchQuery('') }}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-body tracking-widest uppercase transition-all border-b-2',
                  activeTab === tab.id
                    ? 'text-sl-accent border-sl-accent'
                    : 'text-sl-muted/60 border-transparent hover:text-sl-accent hover:border-sl-accent/30'
                )}
              >
                <Icon size={14} />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="bg-sl-accent text-sl-on-accent text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Filters */}
        {(activeTab === 'service-requests' || activeTab === 'rehearsal-bookings' || activeTab === 'users') && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sl-muted/40" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-sl-card border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              />
            </div>
            {activeTab !== 'users' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-sl-card border border-sl-accent/20 text-sl-fg px-4 py-2.5 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
        )}

        {/* Service Requests Tab */}
        {activeTab === 'service-requests' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No service requests found</div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-display text-sl-fg text-sm font-bold">{req.name}</span>
                        <span className={clsx('text-xs px-2 py-0.5 font-body', statusColors[req.status as BookingStatus])}>
                          {req.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-sl-on-accent font-body bg-sl-accent px-2 py-0.5">
                          {serviceLabels[req.service_type] || req.service_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body">
                        <span>{req.email}</span>
                        <span>{req.phone}</span>
                        {req.preferred_date && <span>Preferred: {req.preferred_date}</span>}
                        <span>{format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {req.message && (
                        <p className="font-body text-xs text-sl-muted/60 mt-2 line-clamp-2">{req.message}</p>
                      )}
                      {req.admin_notes && (
                        <p className="font-body text-xs text-sl-accent/70 mt-1">Note: {req.admin_notes}</p>
                      )}
                    </div>
                    {req.status === 'pending' && (
                      <button
                        onClick={() => { setSelectedRequest(req); setAdminNote(req.admin_notes || '') }}
                        className="shrink-0 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 hover:border-sl-accent hover:bg-sl-accent/5 uppercase tracking-widest transition-all"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rehearsal Bookings Tab */}
        {activeTab === 'rehearsal-bookings' && (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No rehearsal bookings found</div>
            ) : (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-display text-sl-fg text-sm font-bold">{booking.band_name}</span>
                        <span className={clsx('text-xs px-2 py-0.5 font-body', statusColors[booking.status as BookingStatus])}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body">
                        <span>Contact: {booking.contact_name}</span>
                        <span>{booking.email}</span>
                        <span>{booking.phone}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-sl-muted/60 font-body mt-1">
                        <span className="text-sl-accent">{booking.booking_date}</span>
                        <span>{booking.start_time} – {booking.end_time}</span>
                        <span>{booking.num_members} member{booking.num_members !== 1 ? 's' : ''}</span>
                      </div>
                      {booking.admin_notes && (
                        <p className="font-body text-xs text-sl-accent/70 mt-1">Note: {booking.admin_notes}</p>
                      )}
                    </div>
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => { setSelectedBooking(booking); setAdminNote(booking.admin_notes || '') }}
                        className="shrink-0 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 hover:border-sl-accent hover:bg-sl-accent/5 uppercase tracking-widest transition-all"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-sl-card border border-sl-accent/10 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-display text-sl-fg text-sm font-bold">{u.name || 'No name'}</span>
                      <span className={clsx('text-xs px-2 py-0.5 font-body border',
                        u.role === 'admin'
                          ? 'border-sl-accent text-sl-accent bg-sl-accent/10'
                          : 'border-sl-accent/20 text-sl-muted/50'
                      )}>
                        {u.role?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body mt-1">
                      <span>{u.email}</span>
                      {u.phone && <span>{u.phone}</span>}
                      <span>Joined {format(new Date(u.created_at), 'MMM yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editUserId === u.id ? (
                      <>
                        <select
                          value={userEditRole}
                          onChange={(e) => setUserEditRole(e.target.value)}
                          className="bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-1.5 text-xs focus:outline-none focus:border-sl-accent font-body"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => updateUserRole(u.id, userEditRole)} className="p-1.5 text-green-400 hover:text-green-300">
                          <Save size={14} />
                        </button>
                        <button onClick={() => setEditUserId(null)} className="p-1.5 text-red-400 hover:text-red-300">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditUserId(u.id); setUserEditRole(u.role || 'user') }}
                        className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="font-body text-xs text-sl-muted/50">{gallery.length} images</p>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sl-accent text-sl-on-accent font-body text-xs tracking-widest uppercase hover:opacity-80 transition-all disabled:opacity-50"
                >
                  <Upload size={14} />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((item) => (
                <div key={item.id} className={clsx('relative group', !item.active && 'opacity-40')}>
                  <div className="relative aspect-square overflow-hidden bg-sl-card">
                    <img src={item.url} alt={item.alt || ''} className="w-full h-full object-cover grayscale" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => toggleGalleryActive(item.id, item.active)}
                        className={clsx('p-2', item.active ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white')}
                      >
                        {item.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button
                        onClick={() => deleteGalleryItem(item.id)}
                        className="p-2 bg-red-600/80 text-white hover:bg-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="font-body text-xs text-sl-muted/50 mt-1 truncate">{item.alt || item.category}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase">Page Content Settings</h2>
              <div className="flex gap-3">
                {editSettings ? (
                  <>
                    <button onClick={() => { setEditSettings(false); setSettingsDraft(settings) }} className="px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent transition-all">
                      Cancel
                    </button>
                    <button onClick={saveSettings} className="px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest font-semibold hover:opacity-80 transition-all">
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditSettings(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 uppercase tracking-widest hover:bg-sl-accent/5 transition-all">
                    <Edit3 size={12} />
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(settingsDraft).map(([key, value]) => (
                <div key={key} className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">
                    {key.replace(/_/g, ' ')}
                  </label>
                  {editSettings ? (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, [key]: e.target.value })}
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  ) : (
                    <p className="font-body text-sm text-sl-fg">{value || <span className="text-sl-muted/30 italic">Not set</span>}</p>
                  )}
                  {key === 'hero_image' && value && (
                    <img src={value} alt="preview" className="mt-2 h-24 w-full object-cover opacity-60 grayscale" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bands CRUD */}
          <div className="mt-10 pt-8 border-t border-sl-accent/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                <Music2 size={14} className="text-sl-accent" />
                Bands / Artists
              </h2>
              <button
                onClick={openCreateBand}
                className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all"
              >
                <Plus size={12} /> Add Band
              </button>
            </div>

            {bands.length === 0 ? (
              <div className="text-center py-12 text-sl-muted/40 font-body text-sm">No bands registered yet</div>
            ) : (
              <div className="space-y-3">
                {bands.map((band) => (
                  <div key={band.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4 flex-1 min-w-0">
                        {band.picture_urls?.[0] ? (
                          <img src={band.picture_urls[0]} alt={band.band_name} className="w-14 h-14 object-cover shrink-0 grayscale" />
                        ) : (
                          <div className="w-14 h-14 bg-sl-bg border border-sl-accent/10 flex items-center justify-center shrink-0">
                            <Music2 size={18} className="text-sl-accent/30" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-display text-sl-fg text-sm font-bold block">{band.band_name}</span>
                          {band.band_description && (
                            <p className="font-body text-xs text-sl-muted/50 mt-0.5 line-clamp-2">{band.band_description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1.5 text-xs font-body text-sl-muted/40">
                            <span>{band.loyalty_card_count} reservation{band.loyalty_card_count !== 1 ? 's' : ''}</span>
                            <span>{band.picture_urls?.length || 0} photo{(band.picture_urls?.length || 0) !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => openEditBand(band)} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => deleteBand(band.id)} className="p-2 text-sl-muted/40 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {/* Band Modal */}
      {bandModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">
                {bandModal.mode === 'create' ? 'ADD BAND' : 'EDIT BAND'}
              </h3>
              <button onClick={() => setBandModal(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Band / Artist Name *</label>
                <input
                  type="text"
                  value={bandForm.band_name}
                  onChange={(e) => setBandForm(prev => ({ ...prev, band_name: e.target.value }))}
                  placeholder="Enter name..."
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
              </div>

              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Description</label>
                <textarea
                  rows={3}
                  value={bandForm.band_description}
                  onChange={(e) => setBandForm(prev => ({ ...prev, band_description: e.target.value }))}
                  placeholder="About this band or artist..."
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none transition-colors font-body"
                />
              </div>

              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Number of Reservations</label>
                <input
                  type="number"
                  min={0}
                  value={bandForm.loyalty_card_count}
                  onChange={(e) => setBandForm(prev => ({ ...prev, loyalty_card_count: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
              </div>

              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">
                  Photos ({bandForm.picture_urls.length}/5)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {bandForm.picture_urls.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover grayscale" />
                      <button
                        type="button"
                        onClick={() => removeBandPicture(i)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {bandForm.picture_urls.length < 5 && (
                    <button
                      type="button"
                      onClick={() => bandFileInputRef.current?.click()}
                      disabled={bandUploading}
                      className="aspect-square border border-dashed border-sl-accent/30 flex items-center justify-center hover:border-sl-accent text-sl-muted/30 hover:text-sl-accent transition-all disabled:opacity-50"
                    >
                      {bandUploading
                        ? <div className="w-4 h-4 border border-sl-accent border-t-transparent rounded-full animate-spin" />
                        : <Upload size={14} />
                      }
                    </button>
                  )}
                </div>
                <input ref={bandFileInputRef} type="file" accept="image/*" onChange={uploadBandPicture} className="hidden" />
                <p className="font-body text-xs text-sl-muted/30">Hover a photo and click × to remove it</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBandModal(null)}
                className="flex-1 py-2.5 border border-sl-accent/20 text-sl-muted/60 text-xs font-body uppercase tracking-widest hover:border-sl-accent transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveBand}
                disabled={!bandForm.band_name.trim()}
                className="flex-1 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body font-semibold uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50"
              >
                {bandModal.mode === 'create' ? 'Add Band' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">REVIEW REQUEST</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Name</p><p className="text-sl-fg font-body">{selectedRequest.name}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Service</p><p className="text-sl-accent font-body">{serviceLabels[selectedRequest.service_type]}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Email</p><p className="text-sl-fg font-body">{selectedRequest.email}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Phone</p><p className="text-sl-fg font-body">{selectedRequest.phone}</p></div>
                {selectedRequest.preferred_date && <div><p className="text-sl-muted/40 text-xs uppercase font-body">Preferred Date</p><p className="text-sl-fg font-body">{selectedRequest.preferred_date}</p></div>}
                {selectedRequest.preferred_time && <div><p className="text-sl-muted/40 text-xs uppercase font-body">Preferred Time</p><p className="text-sl-fg font-body">{selectedRequest.preferred_time}</p></div>}
              </div>
              {selectedRequest.message && (
                <div><p className="text-sl-muted/40 text-xs uppercase mb-1 font-body">Message</p><p className="text-sl-muted text-sm bg-sl-bg p-3 font-body">{selectedRequest.message}</p></div>
              )}
            </div>

            <div className="mb-5">
              <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Admin Note</label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional note to the client..."
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all">
                <XCircle size={14} /> Reject
              </button>
              <button onClick={() => updateRequestStatus(selectedRequest.id, 'approved', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sl-accent text-sl-on-accent hover:opacity-80 text-xs font-body font-semibold uppercase tracking-widest transition-all">
                <CheckCircle size={14} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rehearsal Booking Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">REVIEW BOOKING</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Band</p><p className="text-sl-fg font-body">{selectedBooking.band_name}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Contact</p><p className="text-sl-fg font-body">{selectedBooking.contact_name}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Date</p><p className="text-sl-accent font-body">{selectedBooking.booking_date}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Time</p><p className="text-sl-fg font-body">{selectedBooking.start_time} – {selectedBooking.end_time}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Members</p><p className="text-sl-fg font-body">{selectedBooking.num_members}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Phone</p><p className="text-sl-fg font-body">{selectedBooking.phone}</p></div>
              </div>
              {selectedBooking.notes && (
                <div><p className="text-sl-muted/40 text-xs uppercase mb-1 font-body">Notes</p><p className="text-sl-muted text-sm bg-sl-bg p-3 font-body">{selectedBooking.notes}</p></div>
              )}
            </div>

            <div className="mb-5">
              <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Admin Note</label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Confirmation message or instructions..."
                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => updateBookingStatus(selectedBooking.id, 'rejected', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all">
                <XCircle size={14} /> Reject
              </button>
              <button onClick={() => updateBookingStatus(selectedBooking.id, 'approved', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sl-accent text-sl-on-accent hover:opacity-80 text-xs font-body font-semibold uppercase tracking-widest transition-all">
                <CheckCircle size={14} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

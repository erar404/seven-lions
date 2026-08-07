'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ClipboardList, Calendar, Users, Image as ImageIcon, Settings,
  CheckCircle, XCircle, Search, Upload, Trash2, Edit3, Save, X, Music2, Plus,
  Link2, Package, Globe, Phone,
} from 'lucide-react'
import clsx from 'clsx'
import type { ServiceRequest, RehearsalBooking, User, GalleryItem, Band, StudioService } from '@/types/database'
import { format } from 'date-fns'

type Tab = 'service-requests' | 'rehearsal-bookings' | 'users' | 'gallery' | 'settings'
type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

type Equipment = {
  id: string
  equipment_name: string
  equipment_desc: string | null
  equipment_price_hr: number | null
  equipment_photo_url: string | null
  created_at: string
}

type SocialLink = { name: string; url: string }
type PricingPair = { key: string; value: string }

const HYPERLINK_PRESETS = [
  { label: 'Rehearsal Booking', value: '/rehearsal-booking' },
  { label: 'Recording', value: '/request-service?type=recording' },
  { label: 'Jingle Production', value: '/request-service?type=jingle' },
  { label: 'Guitar Lesson', value: '/request-service?type=guitar_lesson' },
  { label: 'Drum Lesson', value: '/request-service?type=drum_lesson' },
  { label: 'Guitar Repair', value: '/request-service?type=guitar_repair' },
  { label: 'Bass Repair', value: '/request-service?type=bass_repair' },
  { label: 'Video Shoot', value: '/request-service?type=video_shoot' },
]

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

const SOCIAL_PLATFORMS = [
  'Instagram', 'Facebook', 'YouTube', 'TikTok', 'X (Twitter)',
  'Spotify', 'SoundCloud', 'Bandcamp', 'Custom',
]

const PAGE_PHOTO_SLOTS = [
  { key: 'hero_image', label: 'Hero / Background Image' },
  { key: 'about_image', label: 'About Section Photo' },
  { key: 'studio_photo', label: 'Studio Interior Photo' },
]

const IMAGE_KEYS = new Set([...PAGE_PHOTO_SLOTS.map(s => s.key), 'gcash_qr_url'])

const CONTACT_PAYMENT_KEYS = new Set(['contact_phone', 'contact_address', 'gcash_number', 'gcash_qr_url'])

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
  const [editContact, setEditContact] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [userEditRole, setUserEditRole] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bands
  const [bands, setBands] = useState<Band[]>([])
  const [bandSearch, setBandSearch] = useState('')
  const [bandModal, setBandModal] = useState<{ mode: 'create' | 'edit'; band?: Band } | null>(null)
  const [bandForm, setBandForm] = useState({ band_name: '', band_description: '', loyalty_card_count: 0, picture_urls: [] as string[] })
  const [bandUploading, setBandUploading] = useState(false)
  const bandFileInputRef = useRef<HTMLInputElement>(null)

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [socialLinksDraft, setSocialLinksDraft] = useState<SocialLink[]>([])
  const [editSocialLinks, setEditSocialLinks] = useState(false)

  // Equipment
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [equipmentModal, setEquipmentModal] = useState<{ mode: 'create' | 'edit'; item?: Equipment } | null>(null)
  const [equipmentForm, setEquipmentForm] = useState({ equipment_name: '', equipment_desc: '', equipment_price_hr: '', equipment_photo_url: '' })
  const [equipmentUploading, setEquipmentUploading] = useState(false)
  const equipmentFileInputRef = useRef<HTMLInputElement>(null)

  // Studio Services
  const [studioServices, setStudioServices] = useState<StudioService[]>([])
  const [serviceModal, setServiceModal] = useState<{ mode: 'create' | 'edit'; svc?: StudioService } | null>(null)
  const [serviceForm, setServiceForm] = useState({
    service_name: '',
    service_short_desc: '',
    service_long_desc: '',
    inclusions: '',
    pricing: [] as PricingPair[],
    action: '',
    request_hyperlink: '/rehearsal-booking',
    image_url: '',
    notes: '',
    sort_order: 0,
    active: true,
  })

  // Page photo upload
  const [photoUploading, setPhotoUploading] = useState<string | null>(null)
  const pagePhotoRefs = useRef<Record<string, HTMLInputElement | null>>({})

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
    else if (activeTab === 'settings') { loadSettings(); loadBands(); loadEquipment(); loadStudioServices() }
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
      try {
        const links: SocialLink[] = JSON.parse(map['social_links'] || '[]')
        const parsed = Array.isArray(links) ? links : []
        setSocialLinks(parsed)
        setSocialLinksDraft(parsed)
      } catch {
        setSocialLinks([])
        setSocialLinksDraft([])
      }
    }
  }

  const loadEquipment = async () => {
    const { data } = await (supabase as any).from('studio_equipment').select('*').order('equipment_name')
    if (data) setEquipment(data as Equipment[])
  }

  // ── Studio Services ───────────────────────────────────────────────────────

  const loadStudioServices = async () => {
    const { data } = await supabase.from('studio_services').select('*').order('sort_order')
    if (data) setStudioServices(data as StudioService[])
  }

  const openCreateService = () => {
    setServiceForm({ service_name: '', service_short_desc: '', service_long_desc: '', inclusions: '', pricing: [], action: '', request_hyperlink: '/rehearsal-booking', image_url: '', notes: '', sort_order: studioServices.length + 1, active: true })
    setServiceModal({ mode: 'create' })
  }

  const openEditService = (svc: StudioService) => {
    const pricing = Array.isArray(svc.pricing) ? (svc.pricing as unknown as PricingPair[]) : []
    setServiceForm({
      service_name: svc.service_name,
      service_short_desc: svc.service_short_desc || '',
      service_long_desc: svc.service_long_desc || '',
      inclusions: svc.inclusions || '',
      pricing,
      action: svc.action || '',
      request_hyperlink: svc.request_hyperlink || '/rehearsal-booking',
      image_url: svc.image_url || '',
      notes: svc.notes || '',
      sort_order: svc.sort_order,
      active: svc.active,
    })
    setServiceModal({ mode: 'edit', svc })
  }

  const saveService = async () => {
    if (!serviceForm.service_name.trim()) return
    const payload = {
      service_name: serviceForm.service_name,
      service_short_desc: serviceForm.service_short_desc || null,
      service_long_desc: serviceForm.service_long_desc || null,
      inclusions: serviceForm.inclusions || null,
      pricing: serviceForm.pricing,
      action: serviceForm.action || null,
      request_hyperlink: serviceForm.request_hyperlink || null,
      image_url: serviceForm.image_url || null,
      notes: serviceForm.notes || null,
      sort_order: serviceForm.sort_order,
      active: serviceForm.active,
    }
    if (serviceModal?.mode === 'create') {
      await supabase.from('studio_services').insert(payload)
    } else if (serviceModal?.svc) {
      await supabase.from('studio_services').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', serviceModal.svc.id)
    }
    setServiceModal(null); loadStudioServices()
  }

  const deleteService = async (id: string) => {
    if (!confirm('Delete this service?')) return
    await supabase.from('studio_services').delete().eq('id', id); loadStudioServices()
  }

  const addPricingPair = () => setServiceForm(prev => ({ ...prev, pricing: [...prev.pricing, { key: '', value: '' }] }))
  const removePricingPair = (i: number) => setServiceForm(prev => ({ ...prev, pricing: prev.pricing.filter((_, idx) => idx !== i) }))
  const updatePricingPair = (i: number, field: 'key' | 'value', val: string) =>
    setServiceForm(prev => ({ ...prev, pricing: prev.pricing.map((p, idx) => idx === i ? { ...p, [field]: val } : p) }))

  const updateRequestStatus = async (id: string, s: BookingStatus, note: string) => {
    await supabase.from('seven_lions_service_requests').update({ status: s, admin_notes: note, updated_at: new Date().toISOString() }).eq('id', id)
    setSelectedRequest(null); setAdminNote(''); loadServiceRequests()
  }

  const updateBookingStatus = async (id: string, s: BookingStatus, note: string) => {
    await supabase.from('seven_lions_rehearsal_bookings').update({ status: s, admin_notes: note, updated_at: new Date().toISOString() }).eq('id', id)
    setSelectedBooking(null); setAdminNote(''); loadRehearsalBookings()
  }

  const updateUserRole = async (userId: string, role: string) => {
    await supabase.from('users').update({ role }).eq('id', userId)
    setEditUserId(null); loadUsers()
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { data: uploadData, error } = await supabase.storage.from('seven-lions-photos').upload(fileName, file, { upsert: false })
    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(fileName)
      await supabase.from('seven_lions_gallery').insert({ url: publicUrl, alt: file.name, category: 'general', sort_order: gallery.length + 1 })
      loadGallery()
    }
    setUploading(false)
  }

  const deleteGalleryItem = async (id: string) => {
    await supabase.from('seven_lions_gallery').delete().eq('id', id); loadGallery()
  }

  const toggleGalleryActive = async (id: string, active: boolean) => {
    await supabase.from('seven_lions_gallery').update({ active: !active }).eq('id', id); loadGallery()
  }

  // ── Bands ────────────────────────────────────────────────────────────────

  const loadBands = async () => {
    const { data } = await supabase.from('bands').select('*').order('band_name')
    if (data) setBands(data)
  }

  const openCreateBand = () => {
    setBandForm({ band_name: '', band_description: '', loyalty_card_count: 0, picture_urls: [] })
    setBandModal({ mode: 'create' })
  }

  const openEditBand = (band: Band) => {
    setBandForm({ band_name: band.band_name, band_description: band.band_description || '', loyalty_card_count: band.loyalty_card_count, picture_urls: band.picture_urls || [] })
    setBandModal({ mode: 'edit', band })
  }

  const saveBand = async () => {
    if (!bandForm.band_name.trim()) return
    if (bandModal?.mode === 'create') {
      await supabase.from('bands').insert({ band_name: bandForm.band_name, band_description: bandForm.band_description || null, loyalty_card_count: bandForm.loyalty_card_count, picture_urls: bandForm.picture_urls })
    } else if (bandModal?.band) {
      await supabase.from('bands').update({ band_name: bandForm.band_name, band_description: bandForm.band_description || null, loyalty_card_count: bandForm.loyalty_card_count, picture_urls: bandForm.picture_urls, updated_at: new Date().toISOString() }).eq('id', bandModal.band.id)
    }
    setBandModal(null); loadBands()
  }

  const deleteBand = async (id: string) => {
    if (!confirm('Delete this band?')) return
    await supabase.from('bands').delete().eq('id', id); loadBands()
  }

  const uploadBandPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || bandForm.picture_urls.length >= 5) return
    setBandUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `bands/${Date.now()}.${fileExt}`
    const { data: uploadData, error } = await supabase.storage.from('seven-lions-photos').upload(fileName, file, { upsert: false })
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

  // ── Settings (text) ───────────────────────────────────────────────────────

  const saveSettings = async () => {
    for (const [key, value] of Object.entries(settingsDraft)) {
      if (key === 'social_links') continue
      await supabase.from('seven_lions_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setSettings(settingsDraft); setEditSettings(false)
  }

  const saveContactPayment = async () => {
    const keys = ['contact_phone', 'contact_address', 'gcash_number']
    for (const key of keys) {
      await supabase.from('seven_lions_settings').upsert({ key, value: settingsDraft[key] ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setSettings(prev => ({ ...prev, ...Object.fromEntries(keys.map(k => [k, settingsDraft[k] ?? ''])) }))
    setEditContact(false)
  }

  // ── Page photos ───────────────────────────────────────────────────────────

  const uploadPagePhoto = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(key)
    const fileExt = file.name.split('.').pop()
    const fileName = `page/${key}-${Date.now()}.${fileExt}`
    const { data: uploadData, error } = await supabase.storage.from('seven-lions-photos').upload(fileName, file, { upsert: false })
    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(fileName)
      const next = { ...settingsDraft, [key]: publicUrl }
      setSettingsDraft(next)
      setSettings(next)
      await supabase.from('seven_lions_settings').upsert({ key, value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setPhotoUploading(null)
    const ref = pagePhotoRefs.current[key]
    if (ref) ref.value = ''
  }

  // ── Social links ─────────────────────────────────────────────────────────

  const saveSocialLinks = async () => {
    const value = JSON.stringify(socialLinksDraft)
    await supabase.from('seven_lions_settings').upsert({ key: 'social_links', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSocialLinks(socialLinksDraft); setEditSocialLinks(false)
  }

  const addSocialLink = () => {
    setSocialLinksDraft(prev => [...prev, { name: 'Instagram', url: '' }])
  }

  const removeSocialLink = (i: number) => {
    setSocialLinksDraft(prev => prev.filter((_, idx) => idx !== i))
  }

  const updateSocialLink = (i: number, field: 'name' | 'url', val: string) => {
    setSocialLinksDraft(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  // ── Equipment ─────────────────────────────────────────────────────────────

  const openCreateEquipment = () => {
    setEquipmentForm({ equipment_name: '', equipment_desc: '', equipment_price_hr: '', equipment_photo_url: '' })
    setEquipmentModal({ mode: 'create' })
  }

  const openEditEquipment = (item: Equipment) => {
    setEquipmentForm({
      equipment_name: item.equipment_name,
      equipment_desc: item.equipment_desc || '',
      equipment_price_hr: item.equipment_price_hr != null ? String(item.equipment_price_hr) : '',
      equipment_photo_url: item.equipment_photo_url || '',
    })
    setEquipmentModal({ mode: 'edit', item })
  }

  const saveEquipment = async () => {
    if (!equipmentForm.equipment_name.trim()) return
    const payload = {
      equipment_name: equipmentForm.equipment_name,
      equipment_desc: equipmentForm.equipment_desc || null,
      equipment_price_hr: equipmentForm.equipment_price_hr ? parseFloat(equipmentForm.equipment_price_hr) : null,
      equipment_photo_url: equipmentForm.equipment_photo_url || null,
    }
    const db = supabase as any
    if (equipmentModal?.mode === 'create') {
      await db.from('studio_equipment').insert(payload)
    } else if (equipmentModal?.item) {
      await db.from('studio_equipment').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', equipmentModal.item.id)
    }
    setEquipmentModal(null); loadEquipment()
  }

  const deleteEquipment = async (id: string) => {
    if (!confirm('Delete this equipment?')) return
    await (supabase as any).from('studio_equipment').delete().eq('id', id); loadEquipment()
  }

  const uploadEquipmentPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEquipmentUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `equipment/${Date.now()}.${fileExt}`
    const { data: uploadData, error } = await supabase.storage.from('seven-lions-photos').upload(fileName, file, { upsert: false })
    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(fileName)
      setEquipmentForm(prev => ({ ...prev, equipment_photo_url: publicUrl }))
    }
    setEquipmentUploading(false)
    if (equipmentFileInputRef.current) equipmentFileInputRef.current.value = ''
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  const filteredRequests = serviceRequests.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.email.toLowerCase().includes(searchQuery.toLowerCase()) || r.service_type.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredBookings = rehearsalBookings.filter((b) => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const matchSearch = !searchQuery || b.band_name.toLowerCase().includes(searchQuery.toLowerCase()) || b.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredUsers = users.filter((u) =>
    !searchQuery || (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
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

  // ── Text settings entries (exclude image keys and social_links) ───────────
  const textSettingEntries = Object.entries(settingsDraft).filter(([key]) => !IMAGE_KEYS.has(key) && !CONTACT_PAYMENT_KEYS.has(key) && key !== 'social_links')

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

        {/* ── Service Requests ────────────────────────────────────────────── */}
        {activeTab === 'service-requests' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No service requests found</div>
            ) : filteredRequests.map((req) => (
              <div key={req.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-display text-sl-fg text-sm font-bold">{req.name}</span>
                      <span className={clsx('text-xs px-2 py-0.5 font-body', statusColors[req.status as BookingStatus])}>{req.status.toUpperCase()}</span>
                      <span className="text-xs text-sl-on-accent font-body bg-sl-accent px-2 py-0.5">{serviceLabels[req.service_type] || req.service_type}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body">
                      <span>{req.email}</span><span>{req.phone}</span>
                      {req.preferred_date && <span>Preferred: {req.preferred_date}</span>}
                      <span>{format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    {req.message && <p className="font-body text-xs text-sl-muted/60 mt-2 line-clamp-2">{req.message}</p>}
                    {req.admin_notes && <p className="font-body text-xs text-sl-accent/70 mt-1">Note: {req.admin_notes}</p>}
                  </div>
                  {req.status === 'pending' && (
                    <button onClick={() => { setSelectedRequest(req); setAdminNote(req.admin_notes || '') }} className="shrink-0 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 hover:border-sl-accent hover:bg-sl-accent/5 uppercase tracking-widest transition-all">
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Rehearsal Bookings ───────────────────────────────────────────── */}
        {activeTab === 'rehearsal-bookings' && (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No rehearsal bookings found</div>
            ) : filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-display text-sl-fg text-sm font-bold">{booking.band_name}</span>
                      <span className={clsx('text-xs px-2 py-0.5 font-body', statusColors[booking.status as BookingStatus])}>{booking.status.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body">
                      <span>Contact: {booking.contact_name}</span><span>{booking.email}</span><span>{booking.phone}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-sl-muted/60 font-body mt-1">
                      <span className="text-sl-accent">{booking.booking_date}</span>
                      <span>{booking.start_time} – {booking.end_time}</span>
                      <span>{booking.num_members} member{booking.num_members !== 1 ? 's' : ''}</span>
                    </div>
                    {booking.admin_notes && <p className="font-body text-xs text-sl-accent/70 mt-1">Note: {booking.admin_notes}</p>}
                  </div>
                  {booking.status === 'pending' && (
                    <button onClick={() => { setSelectedBooking(booking); setAdminNote(booking.admin_notes || '') }} className="shrink-0 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 hover:border-sl-accent hover:bg-sl-accent/5 uppercase tracking-widest transition-all">
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Users ───────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-sl-card border border-sl-accent/10 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-display text-sl-fg text-sm font-bold">{u.name || 'No name'}</span>
                      <span className={clsx('text-xs px-2 py-0.5 font-body border', u.role === 'admin' ? 'border-sl-accent text-sl-accent bg-sl-accent/10' : 'border-sl-accent/20 text-sl-muted/50')}>
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
                        <select value={userEditRole} onChange={(e) => setUserEditRole(e.target.value)} className="bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-1.5 text-xs focus:outline-none focus:border-sl-accent font-body">
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => updateUserRole(u.id, userEditRole)} className="p-1.5 text-green-400 hover:text-green-300"><Save size={14} /></button>
                        <button onClick={() => setEditUserId(null)} className="p-1.5 text-red-400 hover:text-red-300"><X size={14} /></button>
                      </>
                    ) : (
                      <button onClick={() => { setEditUserId(u.id); setUserEditRole(u.role || 'user') }} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors">
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Gallery ─────────────────────────────────────────────────────── */}
        {activeTab === 'gallery' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="font-body text-xs text-sl-muted/50">{gallery.length} images</p>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-5 py-2.5 bg-sl-accent text-sl-on-accent font-body text-xs tracking-widest uppercase hover:opacity-80 transition-all disabled:opacity-50">
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
                      <button onClick={() => toggleGalleryActive(item.id, item.active)} className={clsx('p-2', item.active ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white')}>
                        {item.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button onClick={() => deleteGalleryItem(item.id)} className="p-2 bg-red-600/80 text-white hover:bg-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="font-body text-xs text-sl-muted/50 mt-1 truncate">{item.alt || item.category}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Settings ────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-12">

            {/* ─ Display Photos ─────────────────────────────────────────── */}
            <div>
              <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase mb-5 flex items-center gap-2">
                <ImageIcon size={14} className="text-sl-accent" /> Display Photos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PAGE_PHOTO_SLOTS.map(({ key, label }) => {
                  const url = settingsDraft[key] || ''
                  const isLoading = photoUploading === key
                  return (
                    <div key={key} className="bg-sl-card border border-sl-accent/10 overflow-hidden">
                      <div className="relative aspect-video bg-sl-bg group">
                        {url ? (
                          <img src={url} alt={label} className="w-full h-full object-cover grayscale" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <ImageIcon size={22} className="text-sl-accent/20" />
                            <span className="font-body text-xs text-sl-muted/30">No photo set</span>
                          </div>
                        )}
                        <label className={clsx(
                          'absolute inset-0 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-opacity',
                          url ? 'bg-black/60 opacity-0 group-hover:opacity-100' : 'opacity-100'
                        )}>
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Upload size={16} className="text-white" />
                              <span className="font-body text-[10px] text-white/80 uppercase tracking-widest">{url ? 'Replace' : 'Upload'}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isLoading}
                            ref={(el) => { pagePhotoRefs.current[key] = el }}
                            onChange={(e) => uploadPagePhoto(e, key)}
                          />
                        </label>
                      </div>
                      <div className="px-3 py-2">
                        <p className="font-display text-sl-muted/50 text-[10px] tracking-widest uppercase">{label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ─ Text Settings ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Settings size={14} className="text-sl-accent" /> Page Content Settings
                </h2>
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
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>
              {textSettingEntries.length === 0 ? (
                <p className="font-body text-xs text-sl-muted/30 italic">No text settings configured.</p>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  {textSettingEntries.map(([key, value]) => (
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─ Contact & Payment ──────────────────────────────────────── */}
            <div className="border-t border-sl-accent/10 pt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Phone size={14} className="text-sl-accent" /> Contact & Payment Info
                </h2>
                <div className="flex gap-3">
                  {editContact ? (
                    <>
                      <button onClick={() => { setEditContact(false); setSettingsDraft(settings) }} className="px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent transition-all">
                        Cancel
                      </button>
                      <button onClick={saveContactPayment} className="px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest font-semibold hover:opacity-80 transition-all">
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditContact(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 uppercase tracking-widest hover:bg-sl-accent/5 transition-all">
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                {/* Contact Number */}
                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Contact Number</label>
                  {editContact ? (
                    <input
                      type="tel"
                      value={settingsDraft['contact_phone'] ?? ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, contact_phone: e.target.value })}
                      placeholder="e.g. 09397321218"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  ) : (
                    <p className="font-body text-sm text-sl-fg">{settingsDraft['contact_phone'] || <span className="text-sl-muted/30 italic">Not set</span>}</p>
                  )}
                </div>

                {/* Address */}
                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Address</label>
                  {editContact ? (
                    <textarea
                      rows={3}
                      value={settingsDraft['contact_address'] ?? ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, contact_address: e.target.value })}
                      placeholder="e.g. 123 Makiling St., Brgy. San Isidro, Batangas City"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none transition-colors font-body"
                    />
                  ) : (
                    <p className="font-body text-sm text-sl-fg whitespace-pre-line">{settingsDraft['contact_address'] || <span className="text-sl-muted/30 italic">Not set</span>}</p>
                  )}
                </div>

                {/* GCash Number */}
                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">GCash Payment Number</label>
                  {editContact ? (
                    <input
                      type="tel"
                      value={settingsDraft['gcash_number'] ?? ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, gcash_number: e.target.value })}
                      placeholder="e.g. 09XXXXXXXXX"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  ) : (
                    <p className="font-body text-sm text-sl-fg">{settingsDraft['gcash_number'] || <span className="text-sl-muted/30 italic">Not set</span>}</p>
                  )}
                </div>

                {/* GCash QR */}
                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-3">GCash Payment QR Code</label>
                  <div className="flex gap-5 items-start">
                    {settingsDraft['gcash_qr_url'] ? (
                      <div className="relative group shrink-0">
                        <img src={settingsDraft['gcash_qr_url']} alt="GCash QR" className="w-32 h-32 object-contain bg-white p-1 border border-sl-accent/10" />
                        <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          {photoUploading === 'gcash_qr_url' ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Upload size={14} className="text-white" />
                              <span className="font-body text-[10px] text-white/80 uppercase tracking-widest">Replace</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" disabled={photoUploading === 'gcash_qr_url'} ref={(el) => { pagePhotoRefs.current['gcash_qr_url'] = el }} onChange={(e) => uploadPagePhoto(e, 'gcash_qr_url')} />
                        </label>
                      </div>
                    ) : (
                      <label className="w-32 h-32 border border-dashed border-sl-accent/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-sl-accent transition-colors shrink-0">
                        {photoUploading === 'gcash_qr_url' ? (
                          <div className="w-5 h-5 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload size={18} className="text-sl-accent/40" />
                            <span className="font-body text-[10px] text-sl-muted/40 uppercase tracking-widest text-center px-2">Upload QR</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" disabled={photoUploading === 'gcash_qr_url'} ref={(el) => { pagePhotoRefs.current['gcash_qr_url'] = el }} onChange={(e) => uploadPagePhoto(e, 'gcash_qr_url')} />
                      </label>
                    )}
                    <div className="text-xs font-body text-sl-muted/40 space-y-1">
                      <p>Upload a QR code image for GCash payments.</p>
                      <p>Recommended: square image, PNG or JPG.</p>
                      {settingsDraft['gcash_qr_url'] && (
                        <button
                          type="button"
                          onClick={async () => {
                            const next = { ...settingsDraft, gcash_qr_url: '' }
                            setSettingsDraft(next); setSettings(next)
                            await supabase.from('seven_lions_settings').upsert({ key: 'gcash_qr_url', value: '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
                          }}
                          className="mt-2 text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Remove QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─ Social Media Links ─────────────────────────────────────── */}
            <div className="border-t border-sl-accent/10 pt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Globe size={14} className="text-sl-accent" /> Social Media Links
                </h2>
                <div className="flex gap-3">
                  {editSocialLinks ? (
                    <>
                      <button
                        onClick={() => { setEditSocialLinks(false); setSocialLinksDraft(socialLinks) }}
                        className="px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent transition-all"
                      >
                        Cancel
                      </button>
                      <button onClick={saveSocialLinks} className="px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest font-semibold hover:opacity-80 transition-all">
                        Save Links
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditSocialLinks(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 uppercase tracking-widest hover:bg-sl-accent/5 transition-all">
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              {editSocialLinks ? (
                <div className="space-y-3 max-w-2xl">
                  {socialLinksDraft.map((link, i) => (
                    <div key={i} className="bg-sl-card border border-sl-accent/10 p-4 flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                        <div>
                          <label className="block font-display text-sl-muted/40 text-[10px] tracking-widest uppercase mb-1.5">Platform</label>
                          <select
                            value={SOCIAL_PLATFORMS.includes(link.name) ? link.name : 'Custom'}
                            onChange={(e) => {
                              const val = e.target.value
                              updateSocialLink(i, 'name', val === 'Custom' ? '' : val)
                            }}
                            className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                          >
                            {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {!SOCIAL_PLATFORMS.slice(0, -1).includes(link.name) && (
                            <input
                              type="text"
                              value={link.name}
                              onChange={(e) => updateSocialLink(i, 'name', e.target.value)}
                              placeholder="Website name"
                              className="w-full mt-2 bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block font-display text-sl-muted/40 text-[10px] tracking-widest uppercase mb-1.5">URL</label>
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                          />
                        </div>
                      </div>
                      <button onClick={() => removeSocialLink(i)} className="mt-6 p-1.5 text-sl-muted/40 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSocialLink}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-sl-accent/30 text-sl-muted/50 text-xs font-body uppercase tracking-widest hover:border-sl-accent hover:text-sl-accent transition-all w-full justify-center"
                  >
                    <Plus size={12} /> Add Link
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-w-2xl">
                  {socialLinks.length === 0 ? (
                    <p className="font-body text-xs text-sl-muted/30 italic">No social links added yet.</p>
                  ) : socialLinks.map((link, i) => (
                    <div key={i} className="bg-sl-card border border-sl-accent/10 px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Link2 size={12} className="text-sl-accent shrink-0" />
                        <span className="font-display text-sl-fg text-xs font-bold uppercase tracking-widest">{link.name}</span>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-sl-muted/50 hover:text-sl-accent truncate max-w-xs transition-colors">
                        {link.url}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─ Bands / Artists ────────────────────────────────────────── */}
            <div className="border-t border-sl-accent/10 pt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Music2 size={14} className="text-sl-accent" /> Bands / Artists
                </h2>
                <button onClick={openCreateBand} className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all">
                  <Plus size={12} /> Add Band
                </button>
              </div>
              <div className="relative mb-5 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sl-muted/40" />
                <input
                  type="text"
                  placeholder="Search bands..."
                  value={bandSearch}
                  onChange={(e) => setBandSearch(e.target.value)}
                  className="w-full bg-sl-card border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
              </div>
              {bands.length === 0 ? (
                <div className="text-center py-12 text-sl-muted/40 font-body text-sm">No bands registered yet</div>
              ) : (
                <div className="space-y-3">
                  {bands.filter((b) => !bandSearch || b.band_name.toLowerCase().includes(bandSearch.toLowerCase())).length === 0 && (
                    <div className="text-center py-8 text-sl-muted/40 font-body text-sm">No bands match your search</div>
                  )}
                  {bands.filter((b) => !bandSearch || b.band_name.toLowerCase().includes(bandSearch.toLowerCase())).map((band) => (
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
                            {band.band_description && <p className="font-body text-xs text-sl-muted/50 mt-0.5 line-clamp-2">{band.band_description}</p>}
                            <div className="flex items-center gap-4 mt-1.5 text-xs font-body text-sl-muted/40">
                              <span>{band.loyalty_card_count} reservation{band.loyalty_card_count !== 1 ? 's' : ''}</span>
                              <span>{band.picture_urls?.length || 0} photo{(band.picture_urls?.length || 0) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEditBand(band)} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors"><Edit3 size={14} /></button>
                          <button onClick={() => deleteBand(band.id)} className="p-2 text-sl-muted/40 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─ Studio Equipment Rentals ───────────────────────────────── */}
            <div className="border-t border-sl-accent/10 pt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Package size={14} className="text-sl-accent" /> Studio Equipment Rentals
                </h2>
                <button onClick={openCreateEquipment} className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all">
                  <Plus size={12} /> Add Equipment
                </button>
              </div>
              {equipment.length === 0 ? (
                <div className="text-center py-12 text-sl-muted/40 font-body text-sm">No equipment added yet</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((item) => (
                    <div key={item.id} className="bg-sl-card border border-sl-accent/10 hover:border-sl-accent/25 transition-all overflow-hidden">
                      {item.equipment_photo_url ? (
                        <div className="aspect-video overflow-hidden bg-sl-bg">
                          <img src={item.equipment_photo_url} alt={item.equipment_name} className="w-full h-full object-cover grayscale" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-sl-bg flex items-center justify-center">
                          <Package size={28} className="text-sl-accent/20" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-display text-sl-fg text-sm font-bold leading-tight">{item.equipment_name}</span>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEditEquipment(item)} className="p-1.5 text-sl-muted/40 hover:text-sl-accent transition-colors"><Edit3 size={13} /></button>
                            <button onClick={() => deleteEquipment(item.id)} className="p-1.5 text-sl-muted/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {item.equipment_desc && <p className="font-body text-xs text-sl-muted/50 line-clamp-2 mb-2">{item.equipment_desc}</p>}
                        {item.equipment_price_hr != null && (
                          <p className="font-display text-sl-accent text-xs font-bold tracking-widest">
                            ₱{Number(item.equipment_price_hr).toLocaleString()} / hr
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─ Studio Services ───────────────────────────────────────── */}
            <div className="border-t border-sl-accent/10 pt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <ClipboardList size={14} className="text-sl-accent" /> Studio Services
                </h2>
                <button onClick={openCreateService} className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all">
                  <Plus size={12} /> Add Service
                </button>
              </div>
              {studioServices.length === 0 ? (
                <div className="text-center py-12 text-sl-muted/40 font-body text-sm">No services added yet</div>
              ) : (
                <div className="space-y-3">
                  {studioServices.map((svc) => {
                    const pairs = Array.isArray(svc.pricing) ? (svc.pricing as unknown as PricingPair[]) : []
                    return (
                      <div key={svc.id} className={clsx('bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all', !svc.active && 'opacity-50')}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 flex-1 min-w-0">
                            {svc.image_url ? (
                              <img src={svc.image_url} alt={svc.service_name} className="w-16 h-16 object-cover shrink-0 grayscale" />
                            ) : (
                              <div className="w-16 h-16 bg-sl-bg border border-sl-accent/10 flex items-center justify-center shrink-0">
                                <ClipboardList size={18} className="text-sl-accent/30" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-display text-sl-fg text-sm font-bold">{svc.service_name}</span>
                                {!svc.active && <span className="text-[10px] font-body text-sl-muted/40 border border-sl-accent/20 px-1.5 py-0.5 uppercase tracking-widest">Hidden</span>}
                              </div>
                              {svc.service_short_desc && <p className="font-body text-xs text-sl-muted/50 mb-1">{svc.service_short_desc}</p>}
                              <div className="flex flex-wrap gap-3 text-xs font-body text-sl-muted/40 mt-1">
                                <span>{pairs.length} pricing row{pairs.length !== 1 ? 's' : ''}</span>
                                {svc.inclusions && <span>{svc.inclusions.split(',').length} inclusion{svc.inclusions.split(',').length !== 1 ? 's' : ''}</span>}
                                {svc.request_hyperlink && <span className="text-sl-accent/60">{svc.request_hyperlink}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-body text-xs text-sl-muted/30">#{svc.sort_order}</span>
                            <button onClick={() => openEditService(svc)} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors"><Edit3 size={14} /></button>
                            <button onClick={() => deleteService(svc.id)} className="p-2 text-sl-muted/40 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Band Modal ──────────────────────────────────────────────────────── */}
      {bandModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">{bandModal.mode === 'create' ? 'ADD BAND' : 'EDIT BAND'}</h3>
              <button onClick={() => setBandModal(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Band / Artist Name *</label>
                <input type="text" value={bandForm.band_name} onChange={(e) => setBandForm(prev => ({ ...prev, band_name: e.target.value }))} placeholder="Enter name..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Description</label>
                <textarea rows={3} value={bandForm.band_description} onChange={(e) => setBandForm(prev => ({ ...prev, band_description: e.target.value }))} placeholder="About this band or artist..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none transition-colors font-body" />
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Number of Reservations</label>
                <input type="number" min={0} value={bandForm.loyalty_card_count} onChange={(e) => setBandForm(prev => ({ ...prev, loyalty_card_count: parseInt(e.target.value) || 0 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Photos ({bandForm.picture_urls.length}/5)</label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {bandForm.picture_urls.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover grayscale" />
                      <button type="button" onClick={() => removeBandPicture(i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {bandForm.picture_urls.length < 5 && (
                    <button type="button" onClick={() => bandFileInputRef.current?.click()} disabled={bandUploading} className="aspect-square border border-dashed border-sl-accent/30 flex items-center justify-center hover:border-sl-accent text-sl-muted/30 hover:text-sl-accent transition-all disabled:opacity-50">
                      {bandUploading ? <div className="w-4 h-4 border border-sl-accent border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
                    </button>
                  )}
                </div>
                <input ref={bandFileInputRef} type="file" accept="image/*" onChange={uploadBandPicture} className="hidden" />
                <p className="font-body text-xs text-sl-muted/30">Hover a photo and click × to remove</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBandModal(null)} className="flex-1 py-2.5 border border-sl-accent/20 text-sl-muted/60 text-xs font-body uppercase tracking-widest hover:border-sl-accent transition-all">Cancel</button>
              <button onClick={saveBand} disabled={!bandForm.band_name.trim()} className="flex-1 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body font-semibold uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50">
                {bandModal.mode === 'create' ? 'Add Band' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Equipment Modal ─────────────────────────────────────────────────── */}
      {equipmentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">
                {equipmentModal.mode === 'create' ? 'ADD EQUIPMENT' : 'EDIT EQUIPMENT'}
              </h3>
              <button onClick={() => setEquipmentModal(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Equipment Name *</label>
                <input
                  type="text"
                  value={equipmentForm.equipment_name}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, equipment_name: e.target.value }))}
                  placeholder="e.g. Shure SM7B"
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Description</label>
                <textarea
                  rows={3}
                  value={equipmentForm.equipment_desc}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, equipment_desc: e.target.value }))}
                  placeholder="Specs, included accessories, notes..."
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none transition-colors font-body"
                />
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Price per Hour (₱)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={equipmentForm.equipment_price_hr}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, equipment_price_hr: e.target.value }))}
                  placeholder="0.00"
                  className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                />
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Photo</label>
                {equipmentForm.equipment_photo_url && (
                  <div className="relative group mb-3">
                    <img src={equipmentForm.equipment_photo_url} alt="" className="w-full aspect-video object-cover grayscale" />
                    <button
                      type="button"
                      onClick={() => setEquipmentForm(prev => ({ ...prev, equipment_photo_url: '' }))}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white hover:bg-red-500/80 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => equipmentFileInputRef.current?.click()}
                  disabled={equipmentUploading}
                  className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-sl-accent/30 text-sl-muted/50 text-xs font-body uppercase tracking-widest hover:border-sl-accent hover:text-sl-accent transition-all w-full justify-center disabled:opacity-50"
                >
                  {equipmentUploading
                    ? <div className="w-4 h-4 border border-sl-accent border-t-transparent rounded-full animate-spin" />
                    : <Upload size={14} />
                  }
                  {equipmentUploading ? 'Uploading...' : equipmentForm.equipment_photo_url ? 'Replace Photo' : 'Upload Photo'}
                </button>
                <input ref={equipmentFileInputRef} type="file" accept="image/*" onChange={uploadEquipmentPhoto} className="hidden" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEquipmentModal(null)} className="flex-1 py-2.5 border border-sl-accent/20 text-sl-muted/60 text-xs font-body uppercase tracking-widest hover:border-sl-accent transition-all">Cancel</button>
              <button onClick={saveEquipment} disabled={!equipmentForm.equipment_name.trim()} className="flex-1 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body font-semibold uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50">
                {equipmentModal.mode === 'create' ? 'Add Equipment' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Studio Service Modal ──────────────────────────────────────────── */}
      {serviceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">{serviceModal.mode === 'create' ? 'ADD SERVICE' : 'EDIT SERVICE'}</h3>
              <button onClick={() => setServiceModal(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>

            <div className="space-y-5 mb-6">
              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-4 items-end">
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Service Name *</label>
                  <input type="text" value={serviceForm.service_name} onChange={(e) => setServiceForm(p => ({ ...p, service_name: e.target.value }))} placeholder="e.g. Studio Rental" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body" />
                </div>
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Order</label>
                  <input type="number" min={1} value={serviceForm.sort_order} onChange={(e) => setServiceForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body" />
                </div>
              </div>

              {/* Short desc */}
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Short Description <span className="font-body font-normal normal-case tracking-normal text-sl-muted/30">(subtitle — tagline)</span></label>
                <input type="text" value={serviceForm.service_short_desc} onChange={(e) => setServiceForm(p => ({ ...p, service_short_desc: e.target.value }))} placeholder="e.g. Band Rehearsal — Full backline. Plug in and play." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body" />
              </div>

              {/* Long desc */}
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Long Description</label>
                <textarea rows={4} value={serviceForm.service_long_desc} onChange={(e) => setServiceForm(p => ({ ...p, service_long_desc: e.target.value }))} placeholder="Full description of the service..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body" />
              </div>

              {/* Inclusions */}
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Inclusions <span className="font-body font-normal normal-case tracking-normal text-sl-muted/30">(comma-separated)</span></label>
                <textarea rows={3} value={serviceForm.inclusions} onChange={(e) => setServiceForm(p => ({ ...p, inclusions: e.target.value }))} placeholder="Backline gear, Microphones, Speaker monitors, Mixing console" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body" />
                <p className="font-body text-xs text-sl-muted/30 mt-1">Each item separated by a comma will appear as a separate bullet point.</p>
              </div>

              {/* Pricing pairs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase">Pricing</label>
                  <button type="button" onClick={addPricingPair} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-sl-accent/30 text-sl-muted/50 text-xs font-body uppercase tracking-widest hover:border-sl-accent hover:text-sl-accent transition-all">
                    <Plus size={10} /> Add Row
                  </button>
                </div>
                {serviceForm.pricing.length === 0 && (
                  <p className="font-body text-xs text-sl-muted/30 italic">No pricing rows. Click "Add Row" to add one.</p>
                )}
                <div className="space-y-2">
                  {serviceForm.pricing.map((pair, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                      <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => updatePricingPair(i, 'key', e.target.value)}
                        placeholder="Label (e.g. Studio Rate)"
                        className="bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body"
                      />
                      <input
                        type="text"
                        value={pair.value}
                        onChange={(e) => updatePricingPair(i, 'value', e.target.value)}
                        placeholder="Value (e.g. ₱150/hour)"
                        className="bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body"
                      />
                      <button type="button" onClick={() => removePricingPair(i)} className="flex items-center justify-center h-full text-sl-muted/40 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA + hyperlink */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Button Label <span className="font-body font-normal normal-case tracking-normal text-sl-muted/30">(action)</span></label>
                  <input type="text" value={serviceForm.action} onChange={(e) => setServiceForm(p => ({ ...p, action: e.target.value }))} placeholder="e.g. Book a Slot" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body" />
                </div>
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Links To</label>
                  <select value={serviceForm.request_hyperlink} onChange={(e) => setServiceForm(p => ({ ...p, request_hyperlink: e.target.value }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body">
                    {HYPERLINK_PRESETS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label} — {opt.value}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Image URL <span className="font-body font-normal normal-case tracking-normal text-sl-muted/30">(optional)</span></label>
                <input type="url" value={serviceForm.image_url} onChange={(e) => setServiceForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body" />
                {serviceForm.image_url && (
                  <img src={serviceForm.image_url} alt="" className="mt-2 w-full max-h-32 object-cover grayscale" />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Notes / Disclaimer <span className="font-body font-normal normal-case tracking-normal text-sl-muted/30">(optional)</span></label>
                <input type="text" value={serviceForm.notes} onChange={(e) => setServiceForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Student discount requires valid school ID." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent font-body" />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setServiceForm(p => ({ ...p, active: !p.active }))}
                  className={clsx('w-10 h-5 relative transition-colors', serviceForm.active ? 'bg-sl-accent' : 'bg-sl-accent/20')}
                >
                  <span className={clsx('absolute top-0.5 w-4 h-4 bg-white transition-transform', serviceForm.active ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                <span className="font-body text-sm text-sl-muted/60">{serviceForm.active ? 'Visible on services page' : 'Hidden from services page'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setServiceModal(null)} className="flex-1 py-2.5 border border-sl-accent/20 text-sl-muted/60 text-xs font-body uppercase tracking-widest hover:border-sl-accent transition-all">Cancel</button>
              <button onClick={saveService} disabled={!serviceForm.service_name.trim()} className="flex-1 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body font-semibold uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50">
                {serviceModal.mode === 'create' ? 'Add Service' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Request Modal ──────────────────────────────────────────── */}
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
              <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Optional note to the client..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body" />
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

      {/* ── Rehearsal Booking Modal ────────────────────────────────────────── */}
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
              <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Confirmation message or instructions..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body" />
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

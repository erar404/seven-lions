'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const AdminBookingCalendar = dynamic(() => import('@/components/AdminBookingCalendar'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 text-sl-muted/30">
      <div className="w-5 h-5 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})
import {
  ClipboardList, Calendar, Users, Image as ImageIcon, Settings,
  CheckCircle, XCircle, Search, Upload, Trash2, Edit3, Save, X, Music2, Plus,
  Link2, Package, Globe, Phone, MapPin, Star, Mail, Banknote, Video, Guitar, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import type { ServiceRequest, RehearsalBooking, User, GalleryItem, Band, StudioService, StudioReview, VideoShootAddon, LessonPackage } from '@/types/database'
import { SocialIcon, SOCIAL_ICON_MAP, SOCIAL_ICON_KEYS } from '@/components/SocialIcons'
import { format } from 'date-fns'

type Tab = 'bookings' | 'users' | 'gallery' | 'settings' | 'reviews'
type BookingStatus = 'for_approval' | 'approved_pending_payment' | 'confirmed' | 'rejected' | 'cancelled' | 'pending' | 'approved'
type SettingsSection = 'photos' | 'content' | 'contact' | 'email' | 'payments' | 'social' | 'bands' | 'equipment' | 'services' | 'video_addons' | 'lesson_packages' | 'reschedule_policy'

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

type Equipment = {
  id: string
  equipment_name: string
  equipment_desc: string | null
  equipment_price_hr: number | null
  equipment_photo_url: string | null
  created_at: string
}

type SocialLink = { name: string; url: string; logo?: string }
type BankTransfer = { id: string; bank_name: string; account_name: string; account_number: string; qr_url: string }
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

const SETTINGS_NAV: { id: SettingsSection; Icon: React.ElementType; label: string; group?: string }[] = [
  { id: 'photos',           Icon: ImageIcon,    label: 'Display Photos',    group: 'Page' },
  { id: 'content',          Icon: Settings,     label: 'Page Content',      group: 'Page' },
  { id: 'contact',          Icon: Phone,        label: 'Contact & Payment', group: 'Page' },
  { id: 'email',            Icon: Mail,         label: 'Email',             group: 'Page' },
  { id: 'payments',         Icon: Banknote,     label: 'Bank Transfers',    group: 'Page' },
  { id: 'social',           Icon: Globe,        label: 'Social Media',      group: 'Page' },
  { id: 'bands',            Icon: Music2,       label: 'Bands / Artists',   group: 'Catalog' },
  { id: 'equipment',        Icon: Package,      label: 'Equipment',         group: 'Catalog' },
  { id: 'services',         Icon: ClipboardList,label: 'Studio Services',   group: 'Catalog' },
  { id: 'video_addons',     Icon: Video,        label: 'Video Add-ons',     group: 'Catalog' },
  { id: 'lesson_packages',  Icon: Guitar,       label: 'Lesson Packages',   group: 'Catalog' },
  { id: 'reschedule_policy',Icon: AlertTriangle,label: 'Reschedule Policy', group: 'Policy' },
]

const statusColors = STATUS_CSS

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

const CONTACT_PAYMENT_KEYS = new Set(['contact_phone', 'contact_address', 'gcash_number', 'gcash_qr_url', 'map_lat', 'map_lng'])
const EMAIL_KEYS = new Set(['email_sender', 'email_app_password'])
const BANK_KEYS = new Set(['bank_transfers'])

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('bookings')
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('photos')
  const [bookingsSubTab, setBookingsSubTab] = useState<'rehearsal' | 'service'>('rehearsal')
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
  const [finalRate, setFinalRate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editSettings, setEditSettings] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({})
  const [editContact, setEditContact] = useState(false)
  const [editEmail, setEditEmail] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [userEditRole, setUserEditRole] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bands
  const [bands, setBands] = useState<Band[]>([])
  const [bandSearch, setBandSearch] = useState('')
  const [bandPage, setBandPage] = useState(0)
  const [bandModal, setBandModal] = useState<{ mode: 'create' | 'edit'; band?: Band } | null>(null)
  const [bandForm, setBandForm] = useState({ band_name: '', band_description: '', loyalty_card_count: 0, picture_urls: [] as string[] })
  const [bandUploading, setBandUploading] = useState(false)
  const bandFileInputRef = useRef<HTMLInputElement>(null)

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [socialLinksDraft, setSocialLinksDraft] = useState<SocialLink[]>([])
  const [editSocialLinks, setEditSocialLinks] = useState(false)

  // Bank transfers
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([])
  const [bankTransfersDraft, setBankTransfersDraft] = useState<BankTransfer[]>([])
  const [editBankTransfers, setEditBankTransfers] = useState(false)
  const [bankQrUploading, setBankQrUploading] = useState<string | null>(null)
  const bankQrRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Equipment
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [equipmentModal, setEquipmentModal] = useState<{ mode: 'create' | 'edit'; item?: Equipment } | null>(null)
  const [equipmentForm, setEquipmentForm] = useState({ equipment_name: '', equipment_desc: '', equipment_price_hr: '', equipment_photo_url: '' })
  const [equipmentUploading, setEquipmentUploading] = useState(false)
  const equipmentFileInputRef = useRef<HTMLInputElement>(null)

  // Video Addons
  const [videoAddons, setVideoAddons] = useState<VideoShootAddon[]>([])
  const [videoAddonModal, setVideoAddonModal] = useState<{ mode: 'create' | 'edit'; item?: VideoShootAddon } | null>(null)
  const [videoAddonForm, setVideoAddonForm] = useState({ name: '', price: '', sort_order: 0, active: true })

  // Lesson Packages
  const [lessonPackages, setLessonPackages] = useState<LessonPackage[]>([])
  const [lessonPkgModal, setLessonPkgModal] = useState<{ mode: 'create' | 'edit'; item?: LessonPackage } | null>(null)
  const [lessonPkgForm, setLessonPkgForm] = useState({ service_type: 'guitar_lesson' as 'guitar_lesson' | 'drum_lesson', name: '', sessions: 8, hours_per_session: 1, times_per_week: 2, price: '', active: true, sort_order: 0 })

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

  // Reviews
  const [reviews, setReviews] = useState<StudioReview[]>([])
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

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
    if (activeTab === 'bookings') { loadServiceRequests(); loadRehearsalBookings() }
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'gallery') loadGallery()
    else if (activeTab === 'settings') { loadSettings(); loadBands(); loadEquipment(); loadStudioServices(); loadVideoAddons(); loadLessonPackages() }
    else if (activeTab === 'reviews') loadReviews()
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
      try {
        const banks: BankTransfer[] = JSON.parse(map['bank_transfers'] || '[]')
        const parsed = Array.isArray(banks) ? banks : []
        setBankTransfers(parsed)
        setBankTransfersDraft(parsed)
      } catch {
        setBankTransfers([])
        setBankTransfersDraft([])
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

  // ── Video Shoot Addons ────────────────────────────────────────────────────

  const loadVideoAddons = async () => {
    const { data } = await (supabase as any).from('video_shoot_addons').select('*').order('sort_order')
    if (data) setVideoAddons(data as VideoShootAddon[])
  }

  const openCreateVideoAddon = () => {
    setVideoAddonForm({ name: '', price: '', sort_order: videoAddons.length + 1, active: true })
    setVideoAddonModal({ mode: 'create' })
  }

  const openEditVideoAddon = (item: VideoShootAddon) => {
    setVideoAddonForm({ name: item.name, price: String(item.price), sort_order: item.sort_order, active: item.active })
    setVideoAddonModal({ mode: 'edit', item })
  }

  const saveVideoAddon = async () => {
    if (!videoAddonForm.name.trim()) return
    const payload = { name: videoAddonForm.name, price: parseFloat(videoAddonForm.price) || 0, sort_order: videoAddonForm.sort_order, active: videoAddonForm.active }
    if (videoAddonModal?.mode === 'create') {
      await (supabase as any).from('video_shoot_addons').insert(payload)
    } else if (videoAddonModal?.item) {
      await (supabase as any).from('video_shoot_addons').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', videoAddonModal.item.id)
    }
    setVideoAddonModal(null); loadVideoAddons()
  }

  const deleteVideoAddon = async (id: string) => {
    if (!confirm('Delete this add-on?')) return
    await (supabase as any).from('video_shoot_addons').delete().eq('id', id); loadVideoAddons()
  }

  const toggleVideoAddonActive = async (id: string, active: boolean) => {
    await (supabase as any).from('video_shoot_addons').update({ active: !active, updated_at: new Date().toISOString() }).eq('id', id)
    loadVideoAddons()
  }

  // ── Lesson Packages ───────────────────────────────────────────────────────

  const loadLessonPackages = async () => {
    const { data } = await (supabase as any).from('lesson_packages').select('*').order('service_type').order('sort_order')
    if (data) setLessonPackages(data as LessonPackage[])
  }

  const openCreateLessonPkg = () => {
    setLessonPkgForm({ service_type: 'guitar_lesson', name: '', sessions: 8, hours_per_session: 1, times_per_week: 2, price: '', active: true, sort_order: lessonPackages.length + 1 })
    setLessonPkgModal({ mode: 'create' })
  }

  const openEditLessonPkg = (item: LessonPackage) => {
    setLessonPkgForm({ service_type: item.service_type, name: item.name, sessions: item.sessions, hours_per_session: item.hours_per_session, times_per_week: item.times_per_week, price: item.price > 0 ? String(item.price) : '', active: item.active, sort_order: item.sort_order })
    setLessonPkgModal({ mode: 'edit', item })
  }

  const saveLessonPkg = async () => {
    if (!lessonPkgForm.name.trim()) return
    const payload = {
      service_type: lessonPkgForm.service_type,
      name: lessonPkgForm.name,
      sessions: lessonPkgForm.sessions,
      hours_per_session: lessonPkgForm.hours_per_session,
      times_per_week: lessonPkgForm.times_per_week,
      price: parseFloat(lessonPkgForm.price) || 0,
      active: lessonPkgForm.active,
      sort_order: lessonPkgForm.sort_order,
    }
    if (lessonPkgModal?.mode === 'create') {
      await (supabase as any).from('lesson_packages').insert(payload)
    } else if (lessonPkgModal?.item) {
      await (supabase as any).from('lesson_packages').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', lessonPkgModal.item.id)
    }
    setLessonPkgModal(null); loadLessonPackages()
  }

  const deleteLessonPkg = async (id: string) => {
    if (!confirm('Delete this package?')) return
    await (supabase as any).from('lesson_packages').delete().eq('id', id); loadLessonPackages()
  }

  // ── Reschedule Policy ─────────────────────────────────────────────────────

  const savePolicySetting = async (key: string, value: string) => {
    await supabase.from('seven_lions_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSettings(prev => ({ ...prev, [key]: value }))
    setSettingsDraft(prev => ({ ...prev, [key]: value }))
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  const loadReviews = async () => {
    const { data } = await supabase.from('studio_reviews').select('*').order('created_at', { ascending: false })
    if (data) setReviews(data as StudioReview[])
  }

  const updateReviewStatus = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('studio_reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    loadReviews()
  }

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return
    await supabase.from('studio_reviews').delete().eq('id', id)
    loadReviews()
  }

  const addPricingPair = () => setServiceForm(prev => ({ ...prev, pricing: [...prev.pricing, { key: '', value: '' }] }))
  const removePricingPair = (i: number) => setServiceForm(prev => ({ ...prev, pricing: prev.pricing.filter((_, idx) => idx !== i) }))
  const updatePricingPair = (i: number, field: 'key' | 'value', val: string) =>
    setServiceForm(prev => ({ ...prev, pricing: prev.pricing.map((p, idx) => idx === i ? { ...p, [field]: val } : p) }))

  const updateRequestStatus = async (id: string, s: string, note: string, rate?: number) => {
    const upd: any = { status: s, admin_notes: note, updated_at: new Date().toISOString() }
    if (rate !== undefined) upd.final_rate = rate
    await supabase.from('seven_lions_service_requests').update(upd).eq('id', id)
    if (selectedRequest) {
      if (s === 'approved_pending_payment') {
        const payDetails = getPaymentDetailsForEmail()
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'request_approved_payment',
            to: selectedRequest.email,
            data: {
              name: selectedRequest.name,
              serviceType: selectedRequest.service_type,
              finalRate: rate,
              adminNote: note || undefined,
              ...payDetails,
              profileUrl: `${window.location.origin}/profile`,
            },
          }),
        }).catch(() => {})
      } else {
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'request_status',
            to: selectedRequest.email,
            data: { name: selectedRequest.name, serviceType: selectedRequest.service_type, status: s, adminNote: note || undefined },
          }),
        }).catch(() => {})
      }
    }
    setSelectedRequest(null); setAdminNote(''); setFinalRate(''); loadServiceRequests()
  }

  const getPaymentDetailsForEmail = () => {
    const gcash = settings['gcash_number']
    if (gcash) return { paymentMethod: 'GCash', paymentNumber: gcash, paymentQrUrl: settings['gcash_qr_url'] || undefined }
    const bank = bankTransfers[0]
    if (bank) return { paymentMethod: bank.bank_name, paymentNumber: bank.account_number, paymentAccountName: bank.account_name, paymentQrUrl: bank.qr_url || undefined }
    return {}
  }

  const getBookingPaymentDetails = (booking: RehearsalBooking) => {
    const notes = booking.notes || ''
    const match = notes.match(/Payment method: (.+?)(\n|$)/)
    const methodLabel = match ? match[1].trim() : null
    if (!methodLabel || methodLabel === 'Cash') return { paymentMethod: methodLabel || undefined }
    if (methodLabel === 'GCash') {
      return { paymentMethod: 'GCash', paymentNumber: settings['gcash_number'] || undefined, paymentQrUrl: settings['gcash_qr_url'] || undefined }
    }
    const bank = bankTransfers.find(b => b.bank_name === methodLabel)
    if (bank) return { paymentMethod: bank.bank_name, paymentNumber: bank.account_number, paymentAccountName: bank.account_name, paymentQrUrl: bank.qr_url || undefined }
    return { paymentMethod: methodLabel }
  }

  const autoRegisterBand = async (booking: RehearsalBooking) => {
    const name = booking.band_name?.trim()
    if (!name) return
    const { data: existing } = await supabase
      .from('bands')
      .select('id')
      .ilike('band_name', name)
      .maybeSingle()
    if (!existing) {
      await supabase.from('bands').insert({
        band_name: name,
        user_id: booking.user_id ?? null,
        loyalty_card_count: 0,
        picture_urls: [],
      })
      loadBands()
    }
  }

  const updateBookingStatus = async (id: string, s: string, note: string, rate?: number) => {
    const upd: any = { status: s, admin_notes: note, updated_at: new Date().toISOString() }
    if (rate !== undefined) upd.final_rate = rate
    await supabase.from('seven_lions_rehearsal_bookings').update(upd).eq('id', id)
    if (selectedBooking) {
      if (s === 'confirmed') {
        await autoRegisterBand(selectedBooking)
      }
      if (s === 'approved_pending_payment') {
        const payDetails = getBookingPaymentDetails(selectedBooking)
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_approved_payment',
            to: selectedBooking.email,
            data: {
              bandName: selectedBooking.band_name,
              date: selectedBooking.booking_date,
              startTime: selectedBooking.start_time,
              endTime: selectedBooking.end_time,
              finalRate: rate ?? 0,
              adminNote: note || undefined,
              ...payDetails,
              profileUrl: `${window.location.origin}/profile`,
            },
          }),
        }).catch(() => {})
      } else {
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_status',
            to: selectedBooking.email,
            data: {
              bandName: selectedBooking.band_name,
              date: selectedBooking.booking_date,
              startTime: selectedBooking.start_time,
              endTime: selectedBooking.end_time,
              status: s,
              adminNote: note || undefined,
            },
          }),
        }).catch(() => {})
      }
    }
    setSelectedBooking(null); setAdminNote(''); setFinalRate(''); loadRehearsalBookings()
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

  useEffect(() => { setBandPage(0) }, [bandSearch])

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

  const saveEmailSettings = async () => {
    for (const key of ['email_sender', 'email_app_password']) {
      await supabase.from('seven_lions_settings').upsert({ key, value: settingsDraft[key] ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setSettings(prev => ({ ...prev, email_sender: settingsDraft['email_sender'] ?? '', email_app_password: settingsDraft['email_app_password'] ?? '' }))
    setEditEmail(false)
  }

  const saveContactPayment = async () => {
    const keys = ['contact_phone', 'contact_address', 'gcash_number', 'map_lat', 'map_lng']
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

  // ── Bank transfers ────────────────────────────────────────────────────────

  const saveBankTransfers = async () => {
    const value = JSON.stringify(bankTransfersDraft)
    await supabase.from('seven_lions_settings').upsert({ key: 'bank_transfers', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setBankTransfers(bankTransfersDraft); setEditBankTransfers(false)
  }

  const addBankTransfer = () => {
    const newEntry: BankTransfer = { id: crypto.randomUUID(), bank_name: '', account_name: '', account_number: '', qr_url: '' }
    setBankTransfersDraft(prev => [...prev, newEntry])
  }

  const removeBankTransfer = (id: string) => {
    setBankTransfersDraft(prev => prev.filter(b => b.id !== id))
  }

  const updateBankTransfer = (id: string, field: keyof BankTransfer, val: string) => {
    setBankTransfersDraft(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b))
  }

  const uploadBankQr = async (id: string, file: File) => {
    setBankQrUploading(id)
    const ext = file.name.split('.').pop()
    const path = `page/bank-qr-${id}-${Date.now()}.${ext}`
    const { data: uploadData, error } = await supabase.storage.from('seven-lions-photos').upload(path, file, { upsert: false })
    if (!error && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('seven-lions-photos').getPublicUrl(path)
      setBankTransfersDraft(prev => prev.map(b => b.id === id ? { ...b, qr_url: publicUrl } : b))
    }
    setBankQrUploading(null)
    const ref = bankQrRefs.current[id]
    if (ref) ref.value = ''
  }

  const addSocialLink = () => {
    setSocialLinksDraft(prev => [...prev, { name: '', url: '', logo: '' }])
  }

  const removeSocialLink = (i: number) => {
    setSocialLinksDraft(prev => prev.filter((_, idx) => idx !== i))
  }

  const updateSocialLink = (i: number, field: keyof SocialLink, val: string) => {
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

  const pendingBookingsCount =
    serviceRequests.filter(r => r.status === 'for_approval' || r.status === 'pending').length +
    rehearsalBookings.filter(b => b.status === 'for_approval' || b.status === 'pending').length

  const tabs = [
    { id: 'bookings' as Tab, label: 'Bookings', icon: Calendar, count: pendingBookingsCount },
    { id: 'users' as Tab, label: 'Users', icon: Users, count: null },
    { id: 'gallery' as Tab, label: 'Gallery', icon: ImageIcon, count: null },
    { id: 'settings' as Tab, label: 'Page Settings', icon: Settings, count: null },
    { id: 'reviews' as Tab, label: 'Reviews', icon: Star, count: reviews.filter(r => r.status === 'pending').length },
  ]

  const calendarEvents = rehearsalBookings.map((b) => ({
    title: b.band_name,
    start: `${b.booking_date}T${b.start_time}`,
    end: `${b.booking_date}T${b.end_time}`,
    color: b.status === 'confirmed' || b.status === 'approved' ? '#22c55e'
      : b.status === 'approved_pending_payment' ? '#3b82f6'
      : b.status === 'rejected' ? '#ef4444'
      : b.status === 'cancelled' ? '#6b7280'
      : '#ca8a04',
  }))

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Text settings entries (exclude image keys and social_links) ───────────
  const textSettingEntries = Object.entries(settingsDraft).filter(([key]) => !IMAGE_KEYS.has(key) && !CONTACT_PAYMENT_KEYS.has(key) && !EMAIL_KEYS.has(key) && !BANK_KEYS.has(key) && key !== 'social_links')

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
        {(activeTab === 'bookings' || activeTab === 'users') && (
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
                <option value="for_approval">For Approval</option>
                <option value="approved_pending_payment">Pending Payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
        )}

        {/* ── Bookings ─────────────────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="space-y-8">

            {/* Calendar */}
            <div className="bg-sl-card border border-sl-accent/10 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={13} className="text-sl-accent" />
                <span className="font-display text-sl-fg text-xs tracking-widest uppercase">Rehearsal Schedule</span>
                <div className="flex items-center gap-3 ml-auto text-[10px] font-body text-sl-muted/50 flex-wrap">
                  {[
                    { color: '#ca8a04', label: 'For Approval' },
                    { color: '#3b82f6', label: 'Pending Payment' },
                    { color: '#22c55e', label: 'Confirmed' },
                    { color: '#ef4444', label: 'Rejected' },
                    { color: '#6b7280', label: 'Cancelled' },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <AdminBookingCalendar events={calendarEvents} />
            </div>

            {/* Sub-tabs */}
            <div>
              <div className="flex gap-1 mb-6 border-b border-sl-accent/10">
                {([
                  { id: 'rehearsal' as const, label: 'Rehearsal Bookings', count: rehearsalBookings.filter(b => b.status === 'for_approval' || b.status === 'pending').length },
                  { id: 'service' as const, label: 'Service Requests', count: serviceRequests.filter(r => r.status === 'for_approval' || r.status === 'pending').length },
                ] as const).map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setBookingsSubTab(st.id)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2.5 text-xs font-body tracking-widest uppercase border-b-2 transition-all -mb-px',
                      bookingsSubTab === st.id
                        ? 'text-sl-accent border-sl-accent'
                        : 'text-sl-muted/50 border-transparent hover:text-sl-accent'
                    )}
                  >
                    {st.label}
                    {st.count > 0 && (
                      <span className="bg-sl-accent text-sl-on-accent text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                        {st.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Rehearsal Bookings list */}
              {bookingsSubTab === 'rehearsal' && (
                <div className="space-y-3">
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No rehearsal bookings found</div>
                  ) : filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="font-display text-sl-fg text-sm font-bold">{booking.band_name}</span>
                            <span className={clsx('text-xs px-2 py-0.5 font-body', STATUS_CSS[booking.status] ?? 'status-for-approval')}>{STATUS_LABEL[booking.status] ?? booking.status.toUpperCase()}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body">
                            <span>Contact: {booking.contact_name}</span><span>{booking.email}</span><span>{booking.phone}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-sl-muted/60 font-body mt-1">
                            <span className="text-sl-accent">{booking.booking_date}</span>
                            <span>{booking.start_time} – {booking.end_time}</span>
                            <span>{booking.num_members} member{booking.num_members !== 1 ? 's' : ''}</span>
                          </div>
                          {booking.notes && <p className="font-body text-xs text-sl-muted/50 mt-1 line-clamp-1">{booking.notes}</p>}
                          {booking.admin_notes && <p className="font-body text-xs text-sl-accent/70 mt-1">Note: {booking.admin_notes}</p>}
                          {(booking as any).final_rate && <p className="font-body text-xs text-blue-400/80 mt-1">Final Rate: ₱{Number((booking as any).final_rate).toLocaleString()}</p>}
                        </div>
                        {(booking.status === 'for_approval' || booking.status === 'pending') && (
                          <button onClick={() => { setSelectedBooking(booking); setAdminNote(booking.admin_notes || ''); setFinalRate('') }} className="shrink-0 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 hover:border-sl-accent hover:bg-sl-accent/5 uppercase tracking-widest transition-all">
                            Review
                          </button>
                        )}
                        {booking.status === 'approved_pending_payment' && (
                          <button onClick={() => { setSelectedBooking(booking); setAdminNote(booking.admin_notes || ''); setFinalRate(String((booking as any).final_rate ?? '')) }} className="shrink-0 px-4 py-2 text-xs font-body text-blue-400 border border-blue-400/30 hover:border-blue-400 hover:bg-blue-400/5 uppercase tracking-widest transition-all">
                            {(booking as any).payment_proof_url ? 'Confirm Payment' : 'View'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Service Requests list */}
              {bookingsSubTab === 'service' && (
                <div className="space-y-3">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No service requests found</div>
                  ) : filteredRequests.map((req) => (
                    <div key={req.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="font-display text-sl-fg text-sm font-bold">{req.name}</span>
                            <span className={clsx('text-xs px-2 py-0.5 font-body', STATUS_CSS[req.status] ?? 'status-for-approval')}>{STATUS_LABEL[req.status] ?? req.status.toUpperCase()}</span>
                            <span className="text-xs text-sl-on-accent font-body bg-sl-accent px-2 py-0.5">{serviceLabels[req.service_type] || req.service_type}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-sl-muted/50 font-body">
                            <span>{req.email}</span><span>{req.phone}</span>
                            {req.preferred_date && <span>Preferred: {req.preferred_date}</span>}
                            <span>{format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          {req.message && <p className="font-body text-xs text-sl-muted/60 mt-2 line-clamp-2">{req.message}</p>}
                          {req.admin_notes && <p className="font-body text-xs text-sl-accent/70 mt-1">Note: {req.admin_notes}</p>}
                          {(req as any).final_rate && <p className="font-body text-xs text-blue-400/80 mt-1">Final Rate: ₱{Number((req as any).final_rate).toLocaleString()}</p>}
                        </div>
                        {(req.status === 'for_approval' || req.status === 'pending') && (
                          <button onClick={() => { setSelectedRequest(req); setAdminNote(req.admin_notes || ''); setFinalRate('') }} className="shrink-0 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 hover:border-sl-accent hover:bg-sl-accent/5 uppercase tracking-widest transition-all">
                            Review
                          </button>
                        )}
                        {req.status === 'approved_pending_payment' && (
                          <button onClick={() => { setSelectedRequest(req); setAdminNote(req.admin_notes || ''); setFinalRate(String((req as any).final_rate ?? '')) }} className="shrink-0 px-4 py-2 text-xs font-body text-blue-400 border border-blue-400/30 hover:border-blue-400 hover:bg-blue-400/5 uppercase tracking-widest transition-all">
                            {(req as any).payment_proof_url ? 'Confirm Payment' : 'View'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div className="flex gap-0 min-h-[600px] -mx-4 md:-mx-8">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <nav className="w-52 shrink-0 border-r border-sl-accent/10 sticky top-20 self-start py-1">
              {(['Page', 'Catalog', 'Policy'] as const).map((group) => {
                const items = SETTINGS_NAV.filter(n => n.group === group)
                return (
                  <div key={group} className="mb-1">
                    <p className="px-5 pt-3 pb-1 font-display text-[9px] tracking-[0.2em] text-sl-muted/30 uppercase">{group}</p>
                    {items.map(({ id, Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => setSettingsSection(id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all border-l-2 group',
                          settingsSection === id
                            ? 'border-sl-accent text-sl-fg bg-sl-accent/[0.06]'
                            : 'border-transparent text-sl-muted/40 hover:text-sl-fg hover:bg-sl-accent/[0.03]'
                        )}
                      >
                        <Icon size={12} className={clsx('shrink-0 transition-colors', settingsSection === id ? 'text-sl-accent' : 'group-hover:text-sl-fg')} />
                        <span className="font-display text-[10px] tracking-widest uppercase leading-none">{label}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </nav>

            {/* ── Content panel ───────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 px-8 py-1">

            {/* ─ Display Photos ─────────────────────────────────────────── */}
            {settingsSection === 'photos' && (
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

            )}

            {/* ─ Text Settings ──────────────────────────────────────────── */}
            {settingsSection === 'content' && (
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

            )}

            {/* ─ Contact & Payment ──────────────────────────────────────── */}
            {settingsSection === 'contact' && (
            <div>
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

                {/* Map coordinates */}
                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
                    <MapPin size={12} className="text-sl-accent" /> Map Location (Coordinates)
                  </label>
                  {editContact ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-body text-xs text-sl-muted/40 mb-1.5 uppercase tracking-widest">Latitude</label>
                        <input
                          type="text"
                          value={settingsDraft['map_lat'] ?? ''}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, map_lat: e.target.value })}
                          placeholder="e.g. 14.6774"
                          className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-body text-xs text-sl-muted/40 mb-1.5 uppercase tracking-widest">Longitude</label>
                        <input
                          type="text"
                          value={settingsDraft['map_lng'] ?? ''}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, map_lng: e.target.value })}
                          placeholder="e.g. 121.0437"
                          className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body font-mono"
                        />
                      </div>
                      <p className="col-span-2 font-body text-xs text-sl-muted/30">
                        Find coordinates via Google Maps → right-click the pin → copy the numbers shown (lat, lng).
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {settingsDraft['map_lat'] && settingsDraft['map_lng'] ? (
                        <>
                          <span className="font-body text-sm text-sl-fg font-mono">{settingsDraft['map_lat']}, {settingsDraft['map_lng']}</span>
                          <a
                            href={`https://maps.google.com/maps?q=${settingsDraft['map_lat']},${settingsDraft['map_lng']}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-body text-sl-accent hover:opacity-70 transition-opacity flex items-center gap-1"
                          >
                            <MapPin size={11} /> View on Maps
                          </a>
                        </>
                      ) : (
                        <span className="text-sl-muted/30 italic text-sm font-body">Not set</span>
                      )}
                    </div>
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

            )}

            {/* ─ Email Settings ─────────────────────────────────────────── */}
            {settingsSection === 'email' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Mail size={14} className="text-sl-accent" /> Email Settings
                </h2>
                <div className="flex gap-3">
                  {editEmail ? (
                    <>
                      <button onClick={() => { setEditEmail(false); setSettingsDraft(settings) }} className="px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent transition-all">
                        Cancel
                      </button>
                      <button onClick={saveEmailSettings} className="px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest font-semibold hover:opacity-80 transition-all">
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditEmail(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 uppercase tracking-widest hover:bg-sl-accent/5 transition-all">
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Sender Email (Gmail)</label>
                  {editEmail ? (
                    <input
                      type="email"
                      value={settingsDraft['email_sender'] ?? ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, email_sender: e.target.value })}
                      placeholder="yourstudio@gmail.com"
                      className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                    />
                  ) : (
                    <p className="font-body text-sm text-sl-fg">{settingsDraft['email_sender'] || <span className="text-sl-muted/30 italic">Not set</span>}</p>
                  )}
                </div>

                <div className="bg-sl-card border border-sl-accent/10 p-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Gmail App Password</label>
                  {editEmail ? (
                    <>
                      <input
                        type="password"
                        value={settingsDraft['email_app_password'] ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, email_app_password: e.target.value })}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body font-mono"
                      />
                      <p className="font-body text-[11px] text-sl-muted/35 mt-2">
                        Generate at Google Account → Security → 2-Step Verification → App Passwords.
                        Must be a 16-character App Password, not your regular Gmail password.
                      </p>
                    </>
                  ) : (
                    <p className="font-body text-sm text-sl-fg">
                      {settingsDraft['email_app_password']
                        ? <span className="font-mono tracking-widest text-sl-muted/60">{'•'.repeat(16)}</span>
                        : <span className="text-sl-muted/30 italic">Not set</span>
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            )}

            {/* ─ Bank Transfer Payment Methods ──────────────────────────── */}
            {settingsSection === 'payments' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Banknote size={14} className="text-sl-accent" /> Bank Transfer Payment Methods
                </h2>
                <div className="flex gap-3">
                  {editBankTransfers ? (
                    <>
                      <button onClick={() => { setEditBankTransfers(false); setBankTransfersDraft(bankTransfers) }} className="px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent transition-all">
                        Cancel
                      </button>
                      <button onClick={saveBankTransfers} className="px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest font-semibold hover:opacity-80 transition-all">
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditBankTransfers(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-accent border border-sl-accent/30 uppercase tracking-widest hover:bg-sl-accent/5 transition-all">
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              {bankTransfersDraft.length === 0 && !editBankTransfers ? (
                <p className="font-body text-xs text-sl-muted/30 italic">No bank transfer methods set up.</p>
              ) : (
                <div className="space-y-4">
                  {bankTransfersDraft.map((bank) => (
                    <div key={bank.id} className="bg-sl-card border border-sl-accent/10 p-5">
                      {editBankTransfers ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-display text-sl-fg text-xs tracking-widest uppercase">Bank Account</p>
                            <button onClick={() => removeBankTransfer(bank.id)} className="text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1 text-xs font-body">
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-body text-[10px] text-sl-muted/50 uppercase tracking-widest mb-1.5">Bank Name *</label>
                              <input
                                type="text"
                                value={bank.bank_name}
                                onChange={(e) => updateBankTransfer(bank.id, 'bank_name', e.target.value)}
                                placeholder="e.g. BDO, BPI, UnionBank"
                                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                              />
                            </div>
                            <div>
                              <label className="block font-body text-[10px] text-sl-muted/50 uppercase tracking-widest mb-1.5">Account Name *</label>
                              <input
                                type="text"
                                value={bank.account_name}
                                onChange={(e) => updateBankTransfer(bank.id, 'account_name', e.target.value)}
                                placeholder="e.g. Juan Dela Cruz"
                                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block font-body text-[10px] text-sl-muted/50 uppercase tracking-widest mb-1.5">Account Number *</label>
                              <input
                                type="text"
                                value={bank.account_number}
                                onChange={(e) => updateBankTransfer(bank.id, 'account_number', e.target.value)}
                                placeholder="e.g. 0012 3456 7890"
                                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body font-mono"
                              />
                            </div>
                          </div>
                          {/* QR upload */}
                          <div>
                            <label className="block font-body text-[10px] text-sl-muted/50 uppercase tracking-widest mb-2">QR Code (optional)</label>
                            <div className="flex items-start gap-4">
                              {bank.qr_url ? (
                                <div className="relative group shrink-0">
                                  <img src={bank.qr_url} alt="QR" className="w-28 h-28 object-contain bg-white p-1 border border-sl-accent/10" />
                                  <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {bankQrUploading === bank.id
                                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : <><Upload size={14} className="text-white" /><span className="font-body text-[10px] text-white/80 uppercase tracking-widest">Replace</span></>
                                    }
                                    <input ref={(el) => { bankQrRefs.current[bank.id] = el }} type="file" accept="image/*" className="hidden" disabled={bankQrUploading === bank.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBankQr(bank.id, f) }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="w-28 h-28 border border-dashed border-sl-accent/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-sl-accent transition-colors shrink-0">
                                  {bankQrUploading === bank.id
                                    ? <div className="w-5 h-5 border-2 border-sl-accent border-t-transparent rounded-full animate-spin" />
                                    : <><Upload size={16} className="text-sl-accent/40" /><span className="font-body text-[10px] text-sl-muted/40 uppercase tracking-widest text-center px-2">Upload QR</span></>
                                  }
                                  <input ref={(el) => { bankQrRefs.current[bank.id] = el }} type="file" accept="image/*" className="hidden" disabled={bankQrUploading === bank.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBankQr(bank.id, f) }} />
                                </label>
                              )}
                              <div className="text-xs font-body text-sl-muted/40 space-y-1 pt-1">
                                <p>Optional — upload a QR code for direct bank transfers.</p>
                                {bank.qr_url && (
                                  <button type="button" onClick={() => updateBankTransfer(bank.id, 'qr_url', '')} className="text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1 mt-2">
                                    <Trash2 size={11} /> Remove QR
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-5">
                          {bank.qr_url && (
                            <img src={bank.qr_url} alt={`${bank.bank_name} QR`} className="w-20 h-20 object-contain bg-white p-1 border border-sl-accent/10 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-sl-fg text-sm font-bold tracking-wide">{bank.bank_name || <span className="text-sl-muted/30 italic font-normal">No bank name</span>}</p>
                            {bank.account_name && <p className="font-body text-xs text-sl-muted/60 mt-0.5">{bank.account_name}</p>}
                            <p className="font-body text-sm text-sl-accent font-mono mt-1">{bank.account_number || <span className="text-sl-muted/30 italic text-xs">No account number</span>}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {editBankTransfers && (
                    <button
                      onClick={addBankTransfer}
                      className="w-full py-3 border border-dashed border-sl-accent/30 text-xs font-body text-sl-accent uppercase tracking-widest hover:border-sl-accent hover:bg-sl-accent/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={13} /> Add Bank Account
                    </button>
                  )}
                </div>
              )}
              {editBankTransfers && bankTransfersDraft.length === 0 && (
                <button
                  onClick={addBankTransfer}
                  className="w-full max-w-2xl py-3 border border-dashed border-sl-accent/30 text-xs font-body text-sl-accent uppercase tracking-widest hover:border-sl-accent hover:bg-sl-accent/5 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Plus size={13} /> Add Bank Account
                </button>
              )}
            </div>

            )}

            {/* ─ Social Media Links ─────────────────────────────────────── */}
            {settingsSection === 'social' && (
            <div>
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
                    <div key={i} className="bg-sl-card border border-sl-accent/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          {/* Icon picker */}
                          <label className="block font-display text-sl-muted/40 text-[10px] tracking-widest uppercase mb-2">Platform Icon</label>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {SOCIAL_ICON_KEYS.map((key) => (
                              <button
                                key={key}
                                type="button"
                                title={SOCIAL_ICON_MAP[key].label}
                                onClick={() => {
                                  updateSocialLink(i, 'logo', key)
                                  if (!link.name) updateSocialLink(i, 'name', SOCIAL_ICON_MAP[key].label)
                                }}
                                className={clsx(
                                  'w-8 h-8 border flex items-center justify-center transition-all',
                                  link.logo === key
                                    ? 'bg-sl-accent border-sl-accent text-sl-on-accent'
                                    : 'border-sl-accent/20 text-sl-muted/50 hover:border-sl-accent hover:text-sl-accent'
                                )}
                              >
                                <SocialIcon platform={key} size={14} />
                              </button>
                            ))}
                            <button
                              type="button"
                              title="Generic link (no platform icon)"
                              onClick={() => updateSocialLink(i, 'logo', '')}
                              className={clsx(
                                'w-8 h-8 border flex items-center justify-center transition-all',
                                !link.logo
                                  ? 'bg-sl-accent border-sl-accent text-sl-on-accent'
                                  : 'border-sl-accent/20 text-sl-muted/50 hover:border-sl-accent hover:text-sl-accent'
                              )}
                            >
                              <Link2 size={12} />
                            </button>
                          </div>
                          {/* Name + URL */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-display text-sl-muted/40 text-[10px] tracking-widest uppercase mb-1.5">Display Name</label>
                              <input
                                type="text"
                                value={link.name}
                                onChange={(e) => updateSocialLink(i, 'name', e.target.value)}
                                placeholder="e.g. Instagram"
                                className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                              />
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
                        </div>
                        <button onClick={() => removeSocialLink(i)} className="mt-7 p-1.5 text-sl-muted/40 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
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
                        {link.logo ? (
                          <SocialIcon platform={link.logo} size={14} className="text-sl-accent shrink-0" />
                        ) : (
                          <Link2 size={12} className="text-sl-accent shrink-0" />
                        )}
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

            )}

            {/* ─ Bands / Artists ────────────────────────────────────────── */}
            {settingsSection === 'bands' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Music2 size={14} className="text-sl-accent" /> Bands / Artists
                </h2>
                <button onClick={openCreateBand} className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all">
                  <Plus size={12} /> Add Band
                </button>
              </div>
              {(() => {
                const BANDS_PER_PAGE = 10
                const filtered = bands.filter((b) => !bandSearch || b.band_name.toLowerCase().includes(bandSearch.toLowerCase()))
                const totalPages = Math.ceil(filtered.length / BANDS_PER_PAGE)
                const page = Math.min(bandPage, Math.max(0, totalPages - 1))
                const paged = filtered.slice(page * BANDS_PER_PAGE, (page + 1) * BANDS_PER_PAGE)
                return (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sl-muted/40" />
                        <input
                          type="text"
                          placeholder="Search bands..."
                          value={bandSearch}
                          onChange={(e) => setBandSearch(e.target.value)}
                          className="w-full bg-sl-card border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                        />
                      </div>
                      {filtered.length > 0 && (
                        <span className="font-body text-xs text-sl-muted/40 shrink-0">
                          {filtered.length} band{filtered.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {bands.length === 0 ? (
                      <div className="text-center py-12 text-sl-muted/40 font-body text-sm">No bands registered yet</div>
                    ) : filtered.length === 0 ? (
                      <div className="text-center py-8 text-sl-muted/40 font-body text-sm">No bands match your search</div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {paged.map((band) => (
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

                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-5 pt-4 border-t border-sl-accent/10">
                            <button
                              onClick={() => setBandPage((p) => Math.max(0, p - 1))}
                              disabled={page === 0}
                              className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent hover:text-sl-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ← Prev
                            </button>
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setBandPage(i)}
                                  className={clsx(
                                    'w-7 h-7 text-xs font-display transition-all border',
                                    i === page
                                      ? 'bg-sl-accent border-sl-accent text-sl-on-accent'
                                      : 'border-sl-accent/20 text-sl-muted/50 hover:border-sl-accent hover:text-sl-accent'
                                  )}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setBandPage((p) => Math.min(totalPages - 1, p + 1))}
                              disabled={page === totalPages - 1}
                              className="flex items-center gap-2 px-4 py-2 text-xs font-body text-sl-muted/60 border border-sl-accent/20 uppercase tracking-widest hover:border-sl-accent hover:text-sl-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )
              })()}
            </div>

            )}

            {/* ─ Studio Equipment Rentals ───────────────────────────────── */}
            {settingsSection === 'equipment' && (
            <div>
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

            )}

            {/* ─ Studio Services ───────────────────────────────────────── */}
            {settingsSection === 'services' && (
            <div>
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
            )}

            {/* ─ Video Shoot Add-ons ────────────────────────────────────── */}
            {settingsSection === 'video_addons' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Video size={14} className="text-sl-accent" /> Video Shoot Add-ons
                </h2>
                <button onClick={openCreateVideoAddon} className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all">
                  <Plus size={12} /> Add Add-on
                </button>
              </div>
              {videoAddons.length === 0 ? (
                <div className="text-center py-12 text-sl-muted/40 font-body text-sm">No add-ons yet</div>
              ) : (
                <div className="space-y-2">
                  {videoAddons.map((addon) => (
                    <div key={addon.id} className={clsx('bg-sl-card border border-sl-accent/10 p-4 hover:border-sl-accent/25 transition-all flex items-center justify-between gap-4', !addon.active && 'opacity-50')}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sl-fg text-sm font-bold">{addon.name}</span>
                            {!addon.active && <span className="text-[10px] font-body text-sl-muted/40 border border-sl-accent/20 px-1.5 py-0.5 uppercase tracking-widest">Hidden</span>}
                          </div>
                          <span className="font-display text-sl-accent text-xs font-bold">₱{Number(addon.price).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleVideoAddonActive(addon.id, addon.active)} className={clsx('text-xs font-body px-2 py-1 border transition-all', addon.active ? 'border-sl-accent/20 text-sl-muted/40 hover:text-sl-accent' : 'border-green-500/30 text-green-400/60 hover:text-green-400')}>
                          {addon.active ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={() => openEditVideoAddon(addon)} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors"><Edit3 size={13} /></button>
                        <button onClick={() => deleteVideoAddon(addon.id)} className="p-2 text-sl-muted/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* ─ Lesson Packages ───────────────────────────────────────── */}
            {settingsSection === 'lesson_packages' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2">
                  <Guitar size={14} className="text-sl-accent" /> Lesson Packages
                </h2>
                <button onClick={openCreateLessonPkg} className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all">
                  <Plus size={12} /> Add Package
                </button>
              </div>
              {(['guitar_lesson', 'drum_lesson'] as const).map((stype) => {
                const pkgs = lessonPackages.filter(p => p.service_type === stype)
                return (
                  <div key={stype} className="mb-8">
                    <h3 className="font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-3">
                      {stype === 'guitar_lesson' ? 'Guitar Lessons' : 'Drum Lessons'}
                    </h3>
                    {pkgs.length === 0 ? (
                      <p className="font-body text-xs text-sl-muted/30 italic">No packages for this type</p>
                    ) : (
                      <div className="space-y-2">
                        {pkgs.map((pkg) => (
                          <div key={pkg.id} className={clsx('bg-sl-card border border-sl-accent/10 p-4 hover:border-sl-accent/25 transition-all flex items-center justify-between gap-4', !pkg.active && 'opacity-50')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-display text-sl-fg text-sm font-bold">{pkg.name}</span>
                                {!pkg.active && <span className="text-[10px] font-body text-sl-muted/40 border border-sl-accent/20 px-1.5 py-0.5 uppercase tracking-widest">Hidden</span>}
                              </div>
                              <span className="font-body text-xs text-sl-muted/50">
                                {pkg.sessions} sessions · {pkg.hours_per_session}hr/session · {pkg.times_per_week}x/week
                                {pkg.price > 0 && ` · ₱${Number(pkg.price).toLocaleString()}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => openEditLessonPkg(pkg)} className="p-2 text-sl-muted/40 hover:text-sl-accent transition-colors"><Edit3 size={13} /></button>
                              <button onClick={() => deleteLessonPkg(pkg.id)} className="p-2 text-sl-muted/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )}

            {/* ─ Reschedule Policy ─────────────────────────────────────── */}
            {settingsSection === 'reschedule_policy' && (
            <div>
              <h2 className="font-display text-sl-fg text-sm tracking-widest uppercase flex items-center gap-2 mb-6">
                <AlertTriangle size={14} className="text-sl-accent" /> Reschedule & Pricing Policy
              </h2>
              <div className="space-y-6 max-w-lg">
                {[
                  { key: 'reschedule_hours_before', label: 'Minimum Notice (hours)', desc: 'How many hours in advance a client must reschedule', suffix: 'hours' },
                  { key: 'reschedule_fee', label: 'Reschedule Fee (₱)', desc: 'Amount charged per reschedule request', suffix: '₱' },
                  { key: 'video_shoot_storyboard_price', label: 'Storyboard Add-on Price (₱)', desc: 'Additional cost when storyboard is selected for video shoot', suffix: '₱' },
                  { key: 'video_shoot_package_4hr', label: '4-Hour Video Shoot Package (₱)', desc: 'Base price for the 4-hour video shoot package', suffix: '₱' },
                  { key: 'video_shoot_package_6hr', label: '6-Hour Video Shoot Package (₱)', desc: 'Base price for the 6-hour video shoot package', suffix: '₱' },
                ].map(({ key, label, desc, suffix }) => (
                  <div key={key} className="bg-sl-card border border-sl-accent/10 p-5">
                    <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-1">{label}</label>
                    <p className="font-body text-xs text-sl-muted/40 mb-3">{desc}</p>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min={0}
                        value={settingsDraft[key] ?? ''}
                        onChange={(e) => setSettingsDraft(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 bg-sl-bg border border-sl-accent/20 text-sl-fg px-4 py-2.5 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                      />
                      <button
                        type="button"
                        onClick={() => savePolicySetting(key, settingsDraft[key] ?? '')}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-body bg-sl-accent text-sl-on-accent uppercase tracking-widest hover:opacity-80 transition-all"
                      >
                        <Save size={12} /> Save
                      </button>
                    </div>
                    <p className="font-body text-[10px] text-sl-muted/30 mt-2">Current: {settings[key] || '—'} {suffix}</p>
                  </div>
                ))}

                <div className="bg-sl-card border border-sl-accent/10 p-5">
                  <label className="block font-display text-sl-fg text-xs tracking-widest uppercase mb-1">Non-Refundable Policy</label>
                  <p className="font-body text-xs text-sl-muted/40 mb-3">When enabled, bookings are marked as non-refundable on confirmation pages</p>
                  <div className="flex items-center gap-4">
                    {['false', 'true'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => savePolicySetting('non_refundable', val)}
                        className={clsx(
                          'px-4 py-2 text-xs font-display font-bold border transition-all tracking-widest uppercase',
                          settings['non_refundable'] === val
                            ? 'bg-sl-accent border-sl-accent text-sl-on-accent'
                            : 'border-sl-accent/20 text-sl-muted/60 hover:border-sl-accent hover:text-sl-accent'
                        )}
                      >
                        {val === 'true' ? 'Enabled' : 'Disabled'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}

            </div>
          </div>
        )}
      </div>

        {/* ── Reviews ─────────────────────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <div>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => {
                const count = f === 'all' ? reviews.length : reviews.filter(r => r.status === f).length
                return (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={clsx(
                      'px-4 py-2 text-xs font-body tracking-widest uppercase transition-all border',
                      reviewFilter === f
                        ? 'bg-sl-accent text-sl-on-accent border-sl-accent'
                        : 'border-sl-accent/20 text-sl-muted/60 hover:border-sl-accent/40'
                    )}
                  >
                    {f} {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                  </button>
                )
              })}
            </div>

            <div className="space-y-4">
              {reviews
                .filter(r => reviewFilter === 'all' || r.status === reviewFilter)
                .map((review) => (
                  <div key={review.id} className="bg-sl-card border border-sl-accent/10 p-5 hover:border-sl-accent/25 transition-all">
                    <div className="flex items-start gap-4">

                      {/* Photo thumbnail */}
                      {review.photo_urls?.[0] ? (
                        <img src={review.photo_urls[0]} alt="" className="w-16 h-16 object-cover shrink-0 grayscale" />
                      ) : (
                        <div className="w-16 h-16 bg-sl-bg border border-sl-accent/10 flex items-center justify-center shrink-0">
                          <Star size={18} className="text-sl-accent/20" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                          <div>
                            <span className="font-display text-sl-fg text-sm font-bold">{review.reviewer_name}</span>
                            <span className={clsx('ml-3 text-xs px-2 py-0.5 font-body', statusColors[review.status as BookingStatus] ?? 'border border-sl-accent/20 text-sl-muted/50')}>
                              {review.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="font-body text-xs text-sl-muted/40">
                            {format(new Date(review.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1 mb-2">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} size={13} className={n <= review.overall_rating ? 'text-sl-accent fill-sl-accent' : 'text-sl-muted/20'} />
                          ))}
                          <span className="font-body text-xs text-sl-muted/40 ml-1">{review.overall_rating}/5</span>
                          {review.accommodation_rating && <span className="font-body text-xs text-sl-muted/30 ml-3">Accom: {review.accommodation_rating}</span>}
                          {review.equipment_rating && <span className="font-body text-xs text-sl-muted/30 ml-1">Equip: {review.equipment_rating}</span>}
                          {review.personnel_rating && <span className="font-body text-xs text-sl-muted/30 ml-1">Staff: {review.personnel_rating}</span>}
                        </div>

                        {review.review_text && (
                          <p className="font-body text-xs text-sl-muted/60 line-clamp-2 mb-2">{review.review_text}</p>
                        )}

                        {/* Photo strip */}
                        {review.photo_urls?.length > 1 && (
                          <div className="flex gap-1 mt-2">
                            {review.photo_urls.slice(1).map((url, i) => (
                              <img key={i} src={url} alt="" className="w-10 h-10 object-cover grayscale opacity-60" />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {review.status !== 'approved' && (
                          <button
                            onClick={() => updateReviewStatus(review.id, 'approved')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sl-accent text-sl-on-accent text-xs font-body uppercase tracking-widest hover:opacity-80 transition-all"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            onClick={() => updateReviewStatus(review.id, 'rejected')}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-400 text-xs font-body uppercase tracking-widest hover:bg-red-500/10 transition-all"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        )}
                        <button
                          onClick={() => deleteReview(review.id)}
                          className="p-1.5 text-sl-muted/30 hover:text-red-400 transition-colors flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {reviews.filter(r => reviewFilter === 'all' || r.status === reviewFilter).length === 0 && (
                <div className="text-center py-16 text-sl-muted/40 font-body text-sm">No {reviewFilter === 'all' ? '' : reviewFilter + ' '}reviews</div>
              )}
            </div>
          </div>
        )}

      {/* ── Video Addon Modal ──────────────────────────────────────────────── */}
      {videoAddonModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">{videoAddonModal.mode === 'create' ? 'ADD ADD-ON' : 'EDIT ADD-ON'}</h3>
              <button onClick={() => setVideoAddonModal(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Name *</label>
                <input type="text" value={videoAddonForm.name} onChange={(e) => setVideoAddonForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Additional Camera" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Price (₱)</label>
                  <input type="number" min={0} value={videoAddonForm.price} onChange={(e) => setVideoAddonForm(p => ({ ...p, price: e.target.value }))} placeholder="0" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Sort Order</label>
                  <input type="number" min={1} value={videoAddonForm.sort_order} onChange={(e) => setVideoAddonForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={clsx('w-9 h-5 border relative transition-all', videoAddonForm.active ? 'bg-sl-accent border-sl-accent' : 'border-sl-accent/20 bg-transparent')} onClick={() => setVideoAddonForm(p => ({ ...p, active: !p.active }))}>
                  <div className={clsx('absolute top-0.5 w-4 h-4 bg-sl-on-accent/80 transition-all', videoAddonForm.active ? 'left-4' : 'left-0.5')} />
                </div>
                <span className="font-body text-sm text-sl-muted/70">Active (shown to clients)</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setVideoAddonModal(null)} className="flex-1 py-2.5 border border-sl-accent/20 text-sl-muted/60 text-xs font-body uppercase tracking-widest hover:border-sl-accent transition-all">Cancel</button>
              <button onClick={saveVideoAddon} disabled={!videoAddonForm.name.trim()} className="flex-1 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body font-semibold uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50">
                {videoAddonModal.mode === 'create' ? 'Add Add-on' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lesson Package Modal ────────────────────────────────────────────── */}
      {lessonPkgModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sl-fg text-base font-black">{lessonPkgModal.mode === 'create' ? 'ADD PACKAGE' : 'EDIT PACKAGE'}</h3>
              <button onClick={() => setLessonPkgModal(null)} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Service Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['guitar_lesson', 'Guitar Lesson'], ['drum_lesson', 'Drum Lesson']] as const).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setLessonPkgForm(p => ({ ...p, service_type: val }))} className={clsx('py-2 text-xs font-display font-bold border transition-all tracking-widest uppercase', lessonPkgForm.service_type === val ? 'bg-sl-accent border-sl-accent text-sl-on-accent' : 'border-sl-accent/20 text-sl-muted/60 hover:border-sl-accent hover:text-sl-accent')}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Package Name *</label>
                <input type="text" value={lessonPkgForm.name} onChange={(e) => setLessonPkgForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 8-Session Package" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Sessions</label>
                  <input type="number" min={1} value={lessonPkgForm.sessions} onChange={(e) => setLessonPkgForm(p => ({ ...p, sessions: parseInt(e.target.value) || 1 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Hrs/Session</label>
                  <input type="number" min={0.5} step={0.5} value={lessonPkgForm.hours_per_session} onChange={(e) => setLessonPkgForm(p => ({ ...p, hours_per_session: parseFloat(e.target.value) || 1 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Times/Week</label>
                  <input type="number" min={1} max={7} value={lessonPkgForm.times_per_week} onChange={(e) => setLessonPkgForm(p => ({ ...p, times_per_week: parseInt(e.target.value) || 1 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Price (₱, 0 = TBD)</label>
                  <input type="number" min={0} value={lessonPkgForm.price} onChange={(e) => setLessonPkgForm(p => ({ ...p, price: e.target.value }))} placeholder="0" className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
                <div>
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Sort Order</label>
                  <input type="number" min={1} value={lessonPkgForm.sort_order} onChange={(e) => setLessonPkgForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={clsx('w-9 h-5 border relative transition-all', lessonPkgForm.active ? 'bg-sl-accent border-sl-accent' : 'border-sl-accent/20 bg-transparent')} onClick={() => setLessonPkgForm(p => ({ ...p, active: !p.active }))}>
                  <div className={clsx('absolute top-0.5 w-4 h-4 bg-sl-on-accent/80 transition-all', lessonPkgForm.active ? 'left-4' : 'left-0.5')} />
                </div>
                <span className="font-body text-sm text-sl-muted/70">Active (shown to clients)</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLessonPkgModal(null)} className="flex-1 py-2.5 border border-sl-accent/20 text-sl-muted/60 text-xs font-body uppercase tracking-widest hover:border-sl-accent transition-all">Cancel</button>
              <button onClick={saveLessonPkg} disabled={!lessonPkgForm.name.trim()} className="flex-1 py-2.5 bg-sl-accent text-sl-on-accent text-xs font-body font-semibold uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50">
                {lessonPkgModal.mode === 'create' ? 'Add Package' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div>
                <h3 className="font-display text-sl-fg text-base font-black">
                  {selectedRequest.status === 'approved_pending_payment' ? 'REQUEST — AWAITING PAYMENT' : 'REVIEW REQUEST'}
                </h3>
                <span className={clsx('text-xs px-2 py-0.5 font-body mt-1 inline-block', STATUS_CSS[selectedRequest.status] ?? 'status-for-approval')}>
                  {STATUS_LABEL[selectedRequest.status] ?? selectedRequest.status.toUpperCase()}
                </span>
              </div>
              <button onClick={() => { setSelectedRequest(null); setAdminNote(''); setFinalRate('') }} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
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
              {(selectedRequest as any).payment_proof_url && (
                <div>
                  <p className="text-sl-muted/40 text-xs uppercase mb-2 font-body">Proof of Payment</p>
                  <a href={(selectedRequest as any).payment_proof_url} target="_blank" rel="noopener noreferrer">
                    <img src={(selectedRequest as any).payment_proof_url} alt="Payment Proof" className="max-h-52 object-contain border border-sl-accent/20" />
                  </a>
                </div>
              )}
            </div>

            {selectedRequest.status === 'approved_pending_payment' ? (
              <div className="flex gap-3">
                <button onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all">
                  <XCircle size={14} /> Reject
                </button>
                <button onClick={() => updateRequestStatus(selectedRequest.id, 'confirmed', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:opacity-80 text-xs font-body font-semibold uppercase tracking-widest transition-all">
                  <CheckCircle size={14} /> Confirm Payment
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Final Rate (₱)</label>
                  <input
                    type="number"
                    min={0}
                    value={finalRate}
                    onChange={(e) => setFinalRate(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                  />
                </div>
                <div className="mb-5">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Admin Note</label>
                  <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Payment instructions, scheduling note, or reason for rejection..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all">
                    <XCircle size={14} /> Reject
                  </button>
                  <button onClick={() => updateRequestStatus(selectedRequest.id, 'approved_pending_payment', adminNote, finalRate ? parseFloat(finalRate) : undefined)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sl-accent text-sl-on-accent hover:opacity-80 text-xs font-body font-semibold uppercase tracking-widest transition-all">
                    <CheckCircle size={14} /> Approve & Request Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Rehearsal Booking Modal ────────────────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-sl-card border border-sl-accent/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-sl-fg text-base font-black">
                  {selectedBooking.status === 'approved_pending_payment' ? 'BOOKING — AWAITING PAYMENT' : 'REVIEW BOOKING'}
                </h3>
                <span className={clsx('text-xs px-2 py-0.5 font-body mt-1 inline-block', STATUS_CSS[selectedBooking.status] ?? 'status-for-approval')}>
                  {STATUS_LABEL[selectedBooking.status] ?? selectedBooking.status.toUpperCase()}
                </span>
              </div>
              <button onClick={() => { setSelectedBooking(null); setAdminNote(''); setFinalRate('') }} className="text-sl-muted/40 hover:text-sl-accent"><X size={18} /></button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Band</p><p className="text-sl-fg font-body">{selectedBooking.band_name}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Contact</p><p className="text-sl-fg font-body">{selectedBooking.contact_name}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Date</p><p className="text-sl-accent font-body">{selectedBooking.booking_date}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Time</p><p className="text-sl-fg font-body">{selectedBooking.start_time} – {selectedBooking.end_time}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Members</p><p className="text-sl-fg font-body">{selectedBooking.num_members}</p></div>
                <div><p className="text-sl-muted/40 text-xs uppercase font-body">Phone</p><p className="text-sl-fg font-body">{selectedBooking.phone}</p></div>
                {(selectedBooking as any).final_rate && (
                  <div className="col-span-2"><p className="text-sl-muted/40 text-xs uppercase font-body">Final Rate</p><p className="text-blue-400 font-body font-semibold">₱{Number((selectedBooking as any).final_rate).toLocaleString()}</p></div>
                )}
              </div>
              {selectedBooking.notes && (
                <div><p className="text-sl-muted/40 text-xs uppercase mb-1 font-body">Booking Notes</p><p className="text-sl-muted text-sm bg-sl-bg p-3 font-body whitespace-pre-line">{selectedBooking.notes}</p></div>
              )}
              {selectedBooking.admin_notes && (
                <div><p className="text-sl-muted/40 text-xs uppercase mb-1 font-body">Admin Note</p><p className="text-sl-accent/80 text-sm bg-sl-bg p-3 font-body">{selectedBooking.admin_notes}</p></div>
              )}
              {(selectedBooking as any).payment_proof_url && (
                <div>
                  <p className="text-sl-muted/40 text-xs uppercase mb-2 font-body">Proof of Payment</p>
                  <a href={(selectedBooking as any).payment_proof_url} target="_blank" rel="noopener noreferrer">
                    <img src={(selectedBooking as any).payment_proof_url} alt="Payment Proof" className="max-h-52 object-contain border border-sl-accent/20" />
                  </a>
                </div>
              )}
            </div>

            {selectedBooking.status === 'approved_pending_payment' ? (
              <div className="flex gap-3">
                <button onClick={() => updateBookingStatus(selectedBooking.id, 'rejected', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all">
                  <XCircle size={14} /> Reject
                </button>
                <button onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:opacity-80 text-xs font-body font-semibold uppercase tracking-widest transition-all">
                  <CheckCircle size={14} /> Confirm Payment
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Final Rate (₱) *</label>
                  <input
                    type="number"
                    min={0}
                    value={finalRate}
                    onChange={(e) => setFinalRate(e.target.value)}
                    placeholder="Set the total amount due"
                    className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent transition-colors font-body"
                  />
                </div>
                <div className="mb-5">
                  <label className="block font-display text-sl-muted/50 text-xs tracking-widest uppercase mb-2">Admin Note</label>
                  <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Confirmation instructions, payment details, or reason for rejection..." className="w-full bg-sl-bg border border-sl-accent/20 text-sl-fg placeholder-sl-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-sl-accent resize-none font-body" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => updateBookingStatus(selectedBooking.id, 'rejected', adminNote)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body uppercase tracking-widest transition-all">
                    <XCircle size={14} /> Reject
                  </button>
                  <button onClick={() => updateBookingStatus(selectedBooking.id, 'approved_pending_payment', adminNote, finalRate ? parseFloat(finalRate) : undefined)} disabled={!finalRate} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sl-accent text-sl-on-accent hover:opacity-80 text-xs font-body font-semibold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <CheckCircle size={14} /> Approve & Request Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

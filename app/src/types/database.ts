export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ServiceType =
  | 'recording'
  | 'jingle'
  | 'guitar_lesson'
  | 'drum_lesson'
  | 'guitar_repair'
  | 'bass_repair'
  | 'video_shoot'

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type GalleryCategory = 'studio' | 'gear' | 'lessons' | 'parking' | 'general'

export type Database = {
  'seven-lions-db': {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string | null
          email: string | null
          name: string | null
          middle_initial: string | null
          username: string | null
          phone: string | null
          role: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          email?: string | null
          name?: string | null
          middle_initial?: string | null
          username?: string | null
          phone?: string | null
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          email?: string | null
          name?: string | null
          middle_initial?: string | null
          username?: string | null
          phone?: string | null
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      seven_lions_service_requests: {
        Row: {
          id: string
          user_id: string | null
          service_type: ServiceType
          name: string
          email: string
          phone: string
          message: string | null
          preferred_date: string | null
          preferred_time: string | null
          status: BookingStatus
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          service_type: ServiceType
          name: string
          email: string
          phone: string
          message?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: BookingStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          service_type?: ServiceType
          name?: string
          email?: string
          phone?: string
          message?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: BookingStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seven_lions_rehearsal_bookings: {
        Row: {
          id: string
          user_id: string | null
          band_name: string
          contact_name: string
          email: string
          phone: string
          booking_date: string
          start_time: string
          end_time: string
          num_members: number
          notes: string | null
          status: BookingStatus
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          band_name: string
          contact_name: string
          email: string
          phone: string
          booking_date: string
          start_time: string
          end_time: string
          num_members?: number
          notes?: string | null
          status?: BookingStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          band_name?: string
          contact_name?: string
          email?: string
          phone?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          num_members?: number
          notes?: string | null
          status?: BookingStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seven_lions_gallery: {
        Row: {
          id: string
          url: string
          alt: string | null
          caption: string | null
          category: GalleryCategory
          sort_order: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          url: string
          alt?: string | null
          caption?: string | null
          category?: GalleryCategory
          sort_order?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          url?: string
          alt?: string | null
          caption?: string | null
          category?: GalleryCategory
          sort_order?: number
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      seven_lions_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bands: {
        Row: {
          id: string
          user_id: string | null
          band_name: string
          band_description: string | null
          loyalty_card_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          band_name: string
          band_description?: string | null
          loyalty_card_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          band_name?: string
          band_description?: string | null
          loyalty_card_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type User = Database['seven-lions-db']['Tables']['users']['Row']
export type ServiceRequest = Database['seven-lions-db']['Tables']['seven_lions_service_requests']['Row']
export type RehearsalBooking = Database['seven-lions-db']['Tables']['seven_lions_rehearsal_bookings']['Row']
export type GalleryItem = Database['seven-lions-db']['Tables']['seven_lions_gallery']['Row']
export type Setting = Database['seven-lions-db']['Tables']['seven_lions_settings']['Row']
export type Band = Database['seven-lions-db']['Tables']['bands']['Row']

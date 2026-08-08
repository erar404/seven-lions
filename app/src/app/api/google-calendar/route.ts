import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { upsertCalendarEvent, deleteCalendarEvent, testCalendarConnection, listExternalCalendarEvents } from '@/lib/google-calendar'
import type { Database } from '@/types/database'

function db() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'seven-lions-db' } }
  )
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

async function getCalendarId(): Promise<string | null> {
  const supabase = db()
  const { data } = await supabase
    .from('seven_lions_settings')
    .select('value')
    .eq('key', 'google_calendar_id')
    .maybeSingle()
  return data?.value ?? null
}

// POST /api/google-calendar
// body: { action: 'test' | 'sync_booking' | 'sync_selected' | 'sync_all' | 'delete_booking', bookingId?: string, bookingIds?: string[] }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'admin') return forbidden()

  const body = await req.json().catch(() => ({}))
  const { action, bookingId } = body as { action: string; bookingId?: string; bookingIds?: string[] }

  const calendarId = await getCalendarId()
  if (!calendarId && action !== 'test') {
    return NextResponse.json({ error: 'Google Calendar ID is not configured in settings.' }, { status: 400 })
  }

  const supabase = db()

  try {
    if (action === 'test') {
      const testId = calendarId || body.calendarId
      if (!testId) return NextResponse.json({ error: 'No calendar ID provided.' }, { status: 400 })
      const info = await testCalendarConnection(testId)
      return NextResponse.json({ ok: true, calendar: info })
    }

    if (action === 'sync_booking') {
      if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      const { data: booking } = await supabase
        .from('seven_lions_rehearsal_bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      const result = await upsertCalendarEvent(calendarId!, {
        id: booking.id,
        summary: `🎵 ${booking.band_name}`,
        description: buildBookingDescription(booking),
        date: booking.booking_date,
        start: booking.start_time.substring(0, 5),
        end: booking.end_time.substring(0, 5),
      })
      return NextResponse.json(result)
    }

    if (action === 'sync_all') {
      const { data: bookings } = await supabase
        .from('seven_lions_rehearsal_bookings')
        .select('*')
        .in('status', ['confirmed', 'approved_pending_payment', 'for_approval', 'approved'])
        .order('booking_date', { ascending: true })

      if (!bookings?.length) return NextResponse.json({ synced: 0 })

      const results = await Promise.allSettled(
        bookings.map((b) =>
          upsertCalendarEvent(calendarId!, {
            id: b.id,
            summary: `🎵 ${b.band_name}`,
            description: buildBookingDescription(b),
            date: b.booking_date,
            start: b.start_time.substring(0, 5),
            end: b.end_time.substring(0, 5),
          })
        )
      )

      const synced = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - synced
      return NextResponse.json({ synced, failed })
    }

    if (action === 'sync_selected') {
      const bookingIds: string[] = body.bookingIds ?? []
      if (!bookingIds.length) return NextResponse.json({ synced: 0, failed: 0 })

      const { data: bookings } = await supabase
        .from('seven_lions_rehearsal_bookings')
        .select('*')
        .in('id', bookingIds)

      if (!bookings?.length) return NextResponse.json({ synced: 0, failed: 0 })

      const results = await Promise.allSettled(
        bookings.map((b) =>
          upsertCalendarEvent(calendarId!, {
            id: b.id,
            summary: `🎵 ${b.band_name}`,
            description: buildBookingDescription(b),
            date: b.booking_date,
            start: b.start_time.substring(0, 5),
            end: b.end_time.substring(0, 5),
          })
        )
      )

      const synced = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - synced
      return NextResponse.json({ synced, failed })
    }

    if (action === 'delete_booking') {
      if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      const deleted = await deleteCalendarEvent(calendarId!, bookingId)
      return NextResponse.json({ deleted })
    }

    if (action === 'list_events') {
      const events = await listExternalCalendarEvents(calendarId!)
      return NextResponse.json({ events })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[google-calendar]', err)
    return NextResponse.json({ error: err.message || 'Calendar API error' }, { status: 500 })
  }
}

function buildBookingDescription(booking: any): string {
  const lines = [
    `Contact: ${booking.contact_name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `Members: ${booking.num_members}`,
    `Status: ${booking.status?.toUpperCase()}`,
  ]
  if (booking.final_rate) lines.push(`Rate: ₱${Number(booking.final_rate).toLocaleString()}`)
  if (booking.notes) lines.push(`\nNotes:\n${booking.notes}`)
  return lines.join('\n')
}

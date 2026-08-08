import { google } from 'googleapis'

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Google service account credentials are not configured.')

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth() })
}

export type CalendarEvent = {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  date: string
  location?: string
}

function buildEventResource(event: CalendarEvent) {
  return {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: `${event.date}T${event.start}`, timeZone: 'Asia/Manila' },
    end:   { dateTime: `${event.date}T${event.end}`,   timeZone: 'Asia/Manila' },
    extendedProperties: {
      private: { sevenLionsId: event.id },
    },
  }
}

export async function upsertCalendarEvent(calendarId: string, event: CalendarEvent) {
  const cal = getCalendar()

  // Check if an event with this booking ID already exists
  const existing = await cal.events.list({
    calendarId,
    privateExtendedProperty: [`sevenLionsId=${event.id}`],
    maxResults: 1,
  })

  const extant = existing.data.items?.[0]

  if (extant?.id) {
    const updated = await cal.events.update({
      calendarId,
      eventId: extant.id,
      requestBody: buildEventResource(event),
    })
    return { action: 'updated' as const, googleEventId: updated.data.id }
  }

  const created = await cal.events.insert({
    calendarId,
    requestBody: buildEventResource(event),
  })
  return { action: 'created' as const, googleEventId: created.data.id }
}

export async function deleteCalendarEvent(calendarId: string, bookingId: string) {
  const cal = getCalendar()
  const existing = await cal.events.list({
    calendarId,
    privateExtendedProperty: [`sevenLionsId=${bookingId}`],
    maxResults: 1,
  })
  const extant = existing.data.items?.[0]
  if (extant?.id) {
    await cal.events.delete({ calendarId, eventId: extant.id })
    return true
  }
  return false
}

export async function testCalendarConnection(calendarId: string) {
  const cal = getCalendar()
  const { data } = await cal.calendars.get({ calendarId })
  return { summary: data.summary, timeZone: data.timeZone }
}

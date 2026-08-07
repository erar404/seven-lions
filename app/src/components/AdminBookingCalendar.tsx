'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'

interface CalEvent {
  title: string
  start: string
  end?: string
  color: string
}

export default function AdminBookingCalendar({ events }: { events: CalEvent[] }) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin]}
      initialView="dayGridMonth"
      events={events}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek',
      }}
      height="auto"
      aspectRatio={2}
      eventDisplay="block"
      dayMaxEvents={4}
      eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
    />
  )
}

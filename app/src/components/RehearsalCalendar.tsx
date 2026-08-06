'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'

interface Event {
  title: string
  start: string
  end: string
  color: string
}

interface Props {
  events: Event[]
  onDateClick: (info: DateClickArg) => void
}

export default function RehearsalCalendar({ events, onDateClick }: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      dateClick={onDateClick}
      events={events}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek',
      }}
      height="auto"
      aspectRatio={1.8}
      validRange={{ start: new Date().toISOString().split('T')[0] }}
      eventDisplay="block"
      dayMaxEvents={3}
    />
  )
}

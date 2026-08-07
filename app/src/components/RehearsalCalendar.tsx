'use client'

import { useState, useCallback, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventHoveringArg, EventContentArg } from '@fullcalendar/core'

interface CalendarEvent {
  title: string
  start: string
  end: string
  color: string
}

interface TooltipState {
  x: number
  y: number
  title: string
  timeRange: string
  color: string
}

interface Props {
  events: CalendarEvent[]
  onDateClick: (info: DateClickArg) => void
}

function formatDisplayTime(isoStr: string): string {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function CustomEventContent({ arg }: { arg: EventContentArg }) {
  const isTimeGrid = arg.view.type.startsWith('timeGrid')
  return (
    <div className="fc-custom-event-inner">
      <span className="fc-custom-event-dot" />
      <div className="fc-custom-event-body">
        <span className="fc-custom-event-title">{arg.event.title}</span>
        {isTimeGrid && arg.timeText && (
          <span className="fc-custom-event-time">{arg.timeText}</span>
        )}
      </div>
    </div>
  )
}

export default function RehearsalCalendar({ events, onDateClick }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleEventMouseEnter = useCallback((info: EventHoveringArg) => {
    const rect = info.el.getBoundingClientRect()
    const startStr = info.event.startStr
    const endStr = info.event.endStr
    const timeRange =
      startStr && endStr
        ? `${formatDisplayTime(startStr)} – ${formatDisplayTime(endStr)}`
        : ''
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      title: info.event.title || 'Reserved',
      timeRange,
      color: info.event.backgroundColor || '#6b7280',
    })
  }, [])

  const handleEventMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <>
      <div className="rehearsal-cal">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          dateClick={onDateClick}
          events={events}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{ month: 'Month', week: 'Week', day: 'Day', today: 'Today' }}
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
          eventContent={(arg: EventContentArg) => <CustomEventContent arg={arg} />}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
          validRange={{ start: new Date().toISOString().split('T')[0] }}
          nowIndicator
          allDaySlot={false}
          dayMaxEvents={4}
          expandRows={false}
          stickyHeaderDates
          eventInteractive
          dayCellClassNames="cal-day-cell"
        />
      </div>

      {mounted && tooltip && (
        <div
          className="fc-slot-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translateX(-50%) translateY(-100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            className="fc-slot-tooltip-card"
            style={{ '--tip-accent': tooltip.color } as React.CSSProperties}
          >
            <div className="fc-slot-tooltip-header">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3.5 4.5L4.5 5.5L6.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Slot Already Taken</span>
            </div>
            <p className="fc-slot-tooltip-band">{tooltip.title}</p>
            {tooltip.timeRange && (
              <p className="fc-slot-tooltip-time">{tooltip.timeRange}</p>
            )}
            <div className="fc-slot-tooltip-arrow" />
          </div>
        </div>
      )}
    </>
  )
}

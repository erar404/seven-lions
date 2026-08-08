import nodemailer from 'nodemailer'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function shell(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-top:3px solid #000;">
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #ebebeb;">
            <span style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888;">Seven Lions Studio</span>
          </td>
        </tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #ebebeb;background:#fafafa;">
            <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
              This is an automated message from Seven Lions Studio.<br>
              Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function badge(status: string) {
  const colors: Record<string, string> = {
    approved: '#16a34a',
    confirmed: '#16a34a',
    approved_pending_payment: '#2563eb',
    for_approval: '#ca8a04',
    rejected: '#dc2626',
    pending: '#ca8a04',
    cancelled: '#6b7280',
  }
  const bg = colors[status] ?? '#6b7280'
  return `<span style="display:inline-block;padding:3px 10px;background:${bg};color:#fff;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-radius:2px;">${esc(status)}</span>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:12px;color:#888;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#222;font-weight:500;">${value}</td>
  </tr>`
}

// ── Templates ────────────────────────────────────────────────────────────────

export type EmailPayload =
  | { type: 'booking_submitted'; to: string; data: { bandName: string; contactName: string; date: string; startTime: string; endTime: string; bookingId: string } }
  | { type: 'booking_status'; to: string; data: { bandName: string; date: string; startTime: string; endTime: string; status: string; adminNote?: string } }
  | { type: 'booking_approved_payment'; to: string; data: { bandName: string; date: string; startTime: string; endTime: string; finalRate: number; adminNote?: string; paymentMethod?: string; paymentNumber?: string; paymentAccountName?: string; paymentQrUrl?: string; profileUrl: string } }
  | { type: 'request_submitted'; to: string; data: { name: string; serviceType: string; preferredDate?: string; preferredTime?: string } }
  | { type: 'request_status'; to: string; data: { name: string; serviceType: string; status: string; adminNote?: string } }
  | { type: 'request_approved_payment'; to: string; data: { name: string; serviceType: string; finalRate?: number; adminNote?: string; paymentMethod?: string; paymentNumber?: string; paymentAccountName?: string; paymentQrUrl?: string; profileUrl: string } }

const SERVICE_LABELS: Record<string, string> = {
  recording: 'Recording Session',
  jingle: 'Jingle Production',
  guitar_lesson: 'Guitar Lesson',
  drum_lesson: 'Drum Lesson',
  guitar_repair: 'Guitar Setup & Repair',
  bass_repair: 'Bass Setup & Repair',
  video_shoot: 'Video Shoot',
}

function buildEmail(payload: EmailPayload): { to: string; subject: string; html: string } {
  switch (payload.type) {

    case 'booking_submitted': {
      const { bandName, contactName, date, startTime, endTime, bookingId } = payload.data
      return {
        to: payload.to,
        subject: `Booking Received — ${bandName}`,
        html: shell(`
          <h2 style="margin:0 0 6px;font-size:22px;color:#111;">Booking Received</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#555;">
            Hi ${esc(contactName)}, your rehearsal booking has been submitted and is pending admin approval.
            We'll confirm your slot within 24 hours.
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #ebebeb;">
            ${row('Booking ID', `<span style="font-family:monospace;font-size:12px;">${esc(bookingId.slice(0, 8).toUpperCase())}</span>`)}
            ${row('Band / Artist', esc(bandName))}
            ${row('Date', date)}
            ${row('Time', `${startTime} – ${endTime}`)}
            ${row('Status', badge('pending'))}
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#aaa;">
            You can view and manage your booking in your profile.
          </p>
        `),
      }
    }

    case 'booking_status': {
      const { bandName, date, startTime, endTime, status, adminNote } = payload.data
      const approved = status === 'confirmed' || status === 'approved'
      return {
        to: payload.to,
        subject: `Booking ${approved ? 'Confirmed' : 'Update'} — ${bandName}`,
        html: shell(`
          <h2 style="margin:0 0 6px;font-size:22px;color:#111;">
            Booking ${approved ? 'Confirmed' : 'Status Update'}
          </h2>
          <p style="margin:0 0 24px;font-size:13px;color:#555;">
            ${approved
              ? `Great news! Your rehearsal session for <strong>${esc(bandName)}</strong> has been confirmed.`
              : `We have an update regarding your booking for <strong>${esc(bandName)}</strong>.`
            }
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #ebebeb;">
            ${row('Band / Artist', esc(bandName))}
            ${row('Date', date)}
            ${row('Time', `${startTime} – ${endTime}`)}
            ${row('Status', badge(status))}
            ${adminNote ? row('Note from studio', `<em style="color:#555;">${esc(adminNote)}</em>`) : ''}
          </table>
          ${approved ? `<p style="margin:24px 0 0;font-size:13px;color:#555;">
            Please arrive a few minutes before your session. See you at the studio!
          </p>` : ''}
        `),
      }
    }

    case 'booking_approved_payment': {
      const { bandName, date, startTime, endTime, finalRate, adminNote, paymentMethod, paymentNumber, paymentAccountName, paymentQrUrl, profileUrl } = payload.data
      return {
        to: payload.to,
        subject: `Booking Approved — Payment Required — ${bandName}`,
        html: shell(`
          <h2 style="margin:0 0 6px;font-size:22px;color:#111;">Booking Approved</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#555;">
            Your rehearsal booking for <strong>${esc(bandName)}</strong> has been approved!
            Please complete payment to confirm your slot.
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #ebebeb;">
            ${row('Band / Artist', esc(bandName))}
            ${row('Date', date)}
            ${row('Time', `${startTime} – ${endTime}`)}
            ${row('Final Rate', `<strong style="font-size:16px;color:#111;">₱${finalRate.toLocaleString()}</strong>`)}
            ${row('Status', badge('approved_pending_payment'))}
            ${adminNote ? row('Note from studio', `<em style="color:#555;">${esc(adminNote)}</em>`) : ''}
          </table>
          ${paymentMethod ? `
          <div style="margin:24px 0;padding:20px;background:#f9f9f9;border-left:3px solid #000;">
            <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;">Payment Instructions</p>
            <p style="margin:0 0 8px;font-size:13px;color:#222;">Please send <strong>₱${finalRate.toLocaleString()}</strong> via <strong>${esc(paymentMethod)}</strong></p>
            ${paymentNumber ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">Number / Account: <strong>${esc(paymentNumber)}</strong></p>` : ''}
            ${paymentAccountName ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">Account Name: <strong>${esc(paymentAccountName)}</strong></p>` : ''}
            ${paymentQrUrl ? `<div style="margin-top:12px;"><img src="${paymentQrUrl}" alt="Payment QR" style="width:140px;height:140px;object-fit:contain;border:1px solid #ddd;" /></div>` : ''}
          </div>` : ''}
          <p style="margin:24px 0 16px;font-size:13px;color:#555;">
            Once you have paid, upload your proof of payment through your profile page to complete the booking.
          </p>
          <a href="${profileUrl}" style="display:inline-block;padding:12px 28px;background:#000;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">
            Upload Proof of Payment →
          </a>
        `),
      }
    }

    case 'request_submitted': {
      const { name, serviceType, preferredDate, preferredTime } = payload.data
      return {
        to: payload.to,
        subject: `Request Received — ${SERVICE_LABELS[serviceType] ?? serviceType}`,
        html: shell(`
          <h2 style="margin:0 0 6px;font-size:22px;color:#111;">Request Received</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#555;">
            Hi ${esc(name)}, we've received your service request and will get back to you shortly.
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #ebebeb;">
            ${row('Service', SERVICE_LABELS[serviceType] ?? serviceType)}
            ${preferredDate ? row('Preferred Date', preferredDate) : ''}
            ${preferredTime ? row('Preferred Time', preferredTime) : ''}
            ${row('Status', badge('pending'))}
          </table>
        `),
      }
    }

    case 'request_approved_payment': {
      const { name, serviceType, finalRate, adminNote, paymentMethod, paymentNumber, paymentAccountName, paymentQrUrl, profileUrl } = payload.data
      return {
        to: payload.to,
        subject: `Request Approved — Payment Required — ${SERVICE_LABELS[serviceType] ?? serviceType}`,
        html: shell(`
          <h2 style="margin:0 0 6px;font-size:22px;color:#111;">Request Approved</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#555;">
            Hi ${esc(name)}, your <strong>${SERVICE_LABELS[serviceType] ?? serviceType}</strong> request has been approved!
            ${finalRate ? `Please complete payment to confirm your session.` : 'Our team will reach out to finalise the details.'}
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #ebebeb;">
            ${row('Service', SERVICE_LABELS[serviceType] ?? serviceType)}
            ${finalRate ? row('Final Rate', `<strong style="font-size:16px;color:#111;">₱${finalRate.toLocaleString()}</strong>`) : ''}
            ${row('Status', badge('approved_pending_payment'))}
            ${adminNote ? row('Note from studio', `<em style="color:#555;">${esc(adminNote)}</em>`) : ''}
          </table>
          ${paymentMethod ? `
          <div style="margin:24px 0;padding:20px;background:#f9f9f9;border-left:3px solid #000;">
            <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;">Payment Instructions</p>
            ${finalRate ? `<p style="margin:0 0 8px;font-size:13px;color:#222;">Please send <strong>₱${finalRate.toLocaleString()}</strong> via <strong>${esc(paymentMethod)}</strong></p>` : ''}
            ${paymentNumber ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">Number / Account: <strong>${esc(paymentNumber)}</strong></p>` : ''}
            ${paymentAccountName ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">Account Name: <strong>${esc(paymentAccountName)}</strong></p>` : ''}
            ${paymentQrUrl ? `<div style="margin-top:12px;"><img src="${paymentQrUrl}" alt="Payment QR" style="width:140px;height:140px;object-fit:contain;border:1px solid #ddd;" /></div>` : ''}
          </div>` : ''}
          <p style="margin:24px 0 16px;font-size:13px;color:#555;">
            Once payment is done, upload your proof of payment through your profile page.
          </p>
          <a href="${profileUrl}" style="display:inline-block;padding:12px 28px;background:#000;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">
            Upload Proof of Payment →
          </a>
        `),
      }
    }

    case 'request_status': {
      const { name, serviceType, status, adminNote } = payload.data
      const approved = status === 'approved'
      return {
        to: payload.to,
        subject: `Service Request ${approved ? 'Approved' : 'Update'} — ${SERVICE_LABELS[serviceType] ?? serviceType}`,
        html: shell(`
          <h2 style="margin:0 0 6px;font-size:22px;color:#111;">
            Request ${approved ? 'Approved' : 'Status Update'}
          </h2>
          <p style="margin:0 0 24px;font-size:13px;color:#555;">
            Hi ${esc(name)}, here's an update on your <strong>${SERVICE_LABELS[serviceType] ?? serviceType}</strong> request.
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #ebebeb;">
            ${row('Service', SERVICE_LABELS[serviceType] ?? serviceType)}
            ${row('Status', badge(status))}
            ${adminNote ? row('Note from studio', `<em style="color:#555;">${esc(adminNote)}</em>`) : ''}
          </table>
        `),
      }
    }
  }
}

export async function sendEmail(credentials: { user: string; pass: string }, payload: EmailPayload) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: credentials.user, pass: credentials.pass },
  })
  const { to, subject, html } = buildEmail(payload)
  await transporter.sendMail({ from: `"Seven Lions Studio" <${credentials.user}>`, to, subject, html })
}

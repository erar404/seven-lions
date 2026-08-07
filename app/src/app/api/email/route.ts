import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, type EmailPayload } from '@/lib/mailer'
import type { Database } from '@/types/database'

async function getEmailCredentials() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'seven-lions-db' } }
  )
  const { data } = await supabase
    .from('seven_lions_settings')
    .select('key, value')
    .in('key', ['email_sender', 'email_app_password'])

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? '']))
  return {
    user: map['email_sender'] || process.env.GMAIL_USER || '',
    pass: map['email_app_password'] || process.env.GMAIL_APP_PASSWORD || '',
  }
}

export async function POST(req: NextRequest) {
  const credentials = await getEmailCredentials()

  if (!credentials.user || !credentials.pass) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
  }

  const payload: EmailPayload = await req.json()

  try {
    await sendEmail(credentials, payload)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email]', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

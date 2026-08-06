'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  if (typeof window === 'undefined') {
    // SSR prerender — useEffect/handlers gate all real calls, stub is never invoked
    return {} as ReturnType<typeof createBrowserClient<Database>>
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'seven-lions-db' } }
  )
}

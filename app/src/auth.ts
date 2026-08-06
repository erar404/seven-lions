import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import authConfig from './auth.config'
import type { Database } from '@/types/database'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role: string
    }
  }
  interface JWT {
    role: string
  }
}

function db() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'seven-lions-db' } }
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const supabase = db()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })
        if (error || !data.user) return null

        const { data: profile } = await supabase
          .from('users')
          .select('id, name, role, avatar_url')
          .eq('auth_id', data.user.id)
          .single()

        return {
          id: profile?.id ?? '',
          email: data.user.email ?? '',
          name: profile?.name ?? null,
          image: profile?.avatar_url ?? null,
          role: profile?.role ?? 'user',
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        // Google sign-in: upsert to users table, no Supabase auth involved
        const supabase = db()
        const { data: existing } = await supabase
          .from('users')
          .select('id, role')
          .eq('email', user.email)
          .maybeSingle()

        if (existing) {
          token.sub = existing.id
          token.role = existing.role
        } else {
          const { data: created } = await supabase
            .from('users')
            .insert({ email: user.email, name: user.name ?? null, avatar_url: user.image ?? null, role: 'user' })
            .select('id, role')
            .single()
          token.sub = created?.id ?? ''
          token.role = created?.role ?? 'user'
        }
      } else if (account?.provider === 'credentials' && user) {
        token.sub = user.id ?? ''
        token.role = (user as any).role ?? 'user'
      }
      return token
    },
  },
})

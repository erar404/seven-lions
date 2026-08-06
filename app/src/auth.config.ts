import type { NextAuthConfig } from 'next-auth'

// Edge-compatible config — no Supabase imports, only JWT decoding + session shape
export default {
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        ;(session.user as any).role = token.role ?? 'user'
      }
      return session
    },
  },
  pages: { signIn: '/auth/login' },
} satisfies NextAuthConfig

import NextAuth from 'next-auth'
import authConfig from '@/auth.config'
import { NextResponse, type NextRequest } from 'next/server'

const { auth } = NextAuth(authConfig)

const adminRoutes = ['/admin']
const authRoutes = ['/auth/login', '/auth/signup']

export async function proxy(request: NextRequest) {
  const session = await auth()
  const path = request.nextUrl.pathname

  if (adminRoutes.some((r) => path.startsWith(r))) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login?next=' + path, request.url))
    }
    if ((session.user as any).role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (authRoutes.includes(path) && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

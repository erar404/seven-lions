import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Providers from '@/components/Providers'
import AnimationObserver from '@/components/AnimationObserver'
import GrainOverlay from '@/components/GrainOverlay'

export const metadata: Metadata = {
  title: 'Seven Lions Studio | Recording Studio & Rehearsal Space',
  description:
    'Professional recording studio, band rehearsal space, music lessons, and instrument repair in Quezon City. Book your session today.',
  keywords: 'recording studio, band rehearsal, music lessons, guitar lessons, drum lessons, Quezon City',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('sl-theme');var p=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',s||p);})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-sl-bg text-sl-fg">
        <Providers>
          <GrainOverlay />
          <AnimationObserver />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

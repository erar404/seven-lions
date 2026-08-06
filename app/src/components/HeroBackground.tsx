'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

export default function HeroBackground() {
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className="absolute inset-0">
      {/* Static photo — always renders first; fades out when video takes over */}
      <Image
        src="https://sevenlions-studio.carrd.co/assets/images/gallery01/b00e64fc.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        unoptimized
        style={{
          opacity: videoReady ? 0 : 1,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* Video — fades in once it can play */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      >
        <source src="/video-banner.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay — always on top of whichever layer is showing */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-[var(--sl-bg)]" />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { adController } from '@/lib/adController'
import type { VideoSegment } from '@/types'

interface Props {
  segment: VideoSegment
}

export function DownloadGate({ segment }: Props) {
  const [status, setStatus] = useState<'locked' | 'watching' | 'unlocked'>(
    adController.isUnlocked(segment.id) ? 'unlocked' : 'locked'
  )
  const [countdown, setCountdown] = useState(5)

  const handleWatch = async () => {
    setStatus('watching')
    // Simula countdown del reward ad
    let t = 5
    const iv = setInterval(() => {
      t--
      setCountdown(t)
      if (t <= 0) clearInterval(iv)
    }, 1000)

    await adController.watchRewardAd(segment.id)
    setStatus('unlocked')
  }

  const handleDownload = () => {
    if (!segment.objectUrl) return
    const a = document.createElement('a')
    a.href = segment.objectUrl
    a.download = `clip_${segment.id}.mp4`
    a.click()
  }

  if (status === 'unlocked') {
    return (
      <button
        onClick={handleDownload}
        className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        ⬇ Descargar clip
      </button>
    )
  }

  if (status === 'watching') {
    return (
      <div className="w-full py-2.5 bg-slate-700 rounded-xl text-center">
        <p className="text-slate-300 text-sm font-medium">
          📺 Viendo anuncio... <span className="text-sky-400 font-mono">{countdown}s</span>
        </p>
        {/* AD SLOT — Reward video */}
        <div className="mt-2 mx-auto w-full h-8 bg-slate-600 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <button
      onClick={handleWatch}
      className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-slate-600"
    >
      🔒 Ver anuncio para descargar
    </button>
  )
}

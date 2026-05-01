'use client'

import { useEffect, useRef } from 'react'

interface Props {
  slotId: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  className?: string
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export function AdSlot({ slotId, format = 'auto', className = '' }: Props) {
  const ref = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window.adsbygoogle as any).push({})
        pushed.current = true
      }
    } catch (e) {
      console.warn('[AdSlot] Error pushing ad:', e)
    }
  }, [])

  // En development muestra placeholder visual
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={`bg-slate-800/60 border border-dashed border-slate-600 rounded-xl flex items-center justify-center ${className}`}>
        <p className="text-slate-600 text-xs uppercase tracking-widest">
          Ad Slot: {slotId} [{format}]
        </p>
      </div>
    )
  }

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // ← reemplaza con tu publisher ID
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}

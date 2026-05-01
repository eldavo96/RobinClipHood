'use client'

import { useState } from 'react'
import { DownloadGate } from './DownloadGate'
import type { VideoSegment } from '@/types'

interface Props {
  segments: VideoSegment[]
  onReset: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'text-emerald-400 bg-emerald-900/40' : pct >= 40 ? 'text-amber-400 bg-amber-900/40' : 'text-slate-400 bg-slate-700'
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${color}`}>
      {pct}% relevancia
    </span>
  )
}

function TranscriptExpand({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  return (
    <div>
      <p className={`text-slate-400 text-xs leading-relaxed italic ${expanded ? '' : 'line-clamp-3'}`}>
        &quot;{text}&quot;
      </p>
      {text.length > 100 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sky-500 text-xs mt-1 hover:text-sky-400 transition-colors"
        >
          {expanded ? 'Ver menos ▲' : 'Ver más ▼'}
        </button>
      )}
    </div>
  )
}

export function ClipPreview({ segments, onReset }: Props) {
  const [playing, setPlaying] = useState<string | null>(null)

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-100 font-bold text-xl">Clips generados</h2>
          <p className="text-slate-400 text-sm">{segments.length} clips en formato 9:16</p>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 px-4 py-2 rounded-xl transition-colors"
        >
          ↩ Nuevo video
        </button>
      </div>

      <div className="w-full h-20 bg-slate-800/60 border border-slate-700 border-dashed rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-xs uppercase tracking-widest mb-1">Publicidad</p>
          <div className="w-96 h-8 bg-slate-700 rounded-lg animate-pulse mx-auto" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((seg, idx) => (
          <div
            key={seg.id}
            className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="relative bg-slate-900" style={{ paddingBottom: '177.78%' }}>
              {seg.objectUrl ? (
                <video
                  src={seg.objectUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  controls
                  playsInline
                  onPlay={() => setPlaying(seg.id)}
                  onPause={() => setPlaying(null)}
                  muted={playing !== null && playing !== seg.id}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                  Sin preview
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-mono px-2 py-1 rounded-lg">
                #{idx + 1}
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm font-mono">
                  {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
                </span>
                <ConfidenceBadge value={seg.confidence} />
              </div>

              <TranscriptExpand text={seg.transcript} />

              <div className="mt-auto pt-2">
                <DownloadGate segment={seg} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
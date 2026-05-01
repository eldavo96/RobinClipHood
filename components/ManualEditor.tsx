'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useFFmpeg } from '@/hooks/useFFmpeg'
import { memoryManager } from '@/lib/memoryManager'

interface Marker { id: string; time: number }
interface Segment { id: string; start: number; end: number; objectUrl?: string; exporting?: boolean }

function uid() { return Math.random().toString(36).slice(2, 8) }

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ManualEditor({ file, onBack }: { file: File; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const isDragging = useRef(false)
  const animFrameRef = useRef<number | null>(null)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false)
  const [waveformReady, setWaveformReady] = useState(false)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [exportDone, setExportDone] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [background, setBackground] = useState<'blur' | 'black'>('blur')
  const [previewSeg, setPreviewSeg] = useState<Segment | null>(null)
  const ffmpeg = useFFmpeg()

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const sync = () => {
      if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
      animFrameRef.current = requestAnimationFrame(sync)
    }
    animFrameRef.current = requestAnimationFrame(sync)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [])

  const handleMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }

  const drawWaveform = useCallback((amplitudes: { time: number; rms: number }[]) => {
    const canvas = waveformRef.current
    if (!canvas || amplitudes.length === 0) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const maxRms = Math.max(...amplitudes.map(a => a.rms))
    if (maxRms === 0) return
    const gradient = ctx.createLinearGradient(0, H, 0, 0)
    gradient.addColorStop(0, 'rgba(14,165,233,0.25)')
    gradient.addColorStop(0.6, 'rgba(14,165,233,0.6)')
    gradient.addColorStop(1, 'rgba(56,189,248,0.9)')
    ctx.fillStyle = gradient
    const barW = W / amplitudes.length
    for (let i = 0; i < amplitudes.length; i++) {
      const normalized = amplitudes[i].rms / maxRms
      const barH = normalized * H
      ctx.fillRect(i * barW, H - barH, Math.max(barW - 0.5, 1), barH)
    }
  }, [])

  const loadWaveform = useCallback(async () => {
    if (waveformReady || isLoadingWaveform) return
    setIsLoadingWaveform(true)
    try {
      await ffmpeg.load()
      const amplitudes = await ffmpeg.analyzeAudioAmplitude(file)
      const canvas = waveformRef.current
      if (canvas) { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
      drawWaveform(amplitudes)
      setWaveformReady(true)
    } catch (err) {
      console.error('Waveform error:', err)
    } finally {
      setIsLoadingWaveform(false)
    }
  }, [file, ffmpeg, drawWaveform, waveformReady, isLoadingWaveform])

  useEffect(() => {
    if (duration > 0 && !waveformReady) loadWaveform()
  }, [duration, waveformReady, loadWaveform])

  const seekToX = useCallback((clientX: number) => {
    if (!timelineRef.current || duration === 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = pct * duration
  }, [duration])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true
    if (videoRef.current) { videoRef.current.pause(); setPlaying(false) }
    seekToX(e.clientX)
  }, [seekToX])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    seekToX(e.clientX)
  }, [seekToX])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    isDragging.current = true
    if (videoRef.current) { videoRef.current.pause(); setPlaying(false) }
    seekToX(e.touches[0].clientX)
  }, [seekToX])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    seekToX(e.touches[0].clientX)
  }, [seekToX])

  const addMarkerAtCurrentTime = useCallback(() => {
    const time = videoRef.current?.currentTime ?? 0
    if (markers.some(m => Math.abs(m.time - time) < 0.5)) return
    const newMarker: Marker = { id: uid(), time }
    setMarkers(prev => {
      const updated = [...prev, newMarker].sort((a, b) => a.time - b.time)
      recalcSegments(updated, duration)
      return updated
    })
  }, [duration, markers])

  const recalcSegments = (sortedMarkers: Marker[], dur: number) => {
    if (sortedMarkers.length === 0) { setSegments([]); return }
    const points = [0, ...sortedMarkers.map(m => m.time), dur]
    const segs: Segment[] = []
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1] - points[i] > 1) {
        segs.push({ id: uid(), start: points[i], end: points[i + 1] })
      }
    }
    setSegments(segs)
  }

  const removeMarker = (id: string) => {
    setMarkers(prev => {
      const updated = prev.filter(m => m.id !== id)
      recalcSegments(updated, duration)
      return updated
    })
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause() } else { videoRef.current.play() }
    setPlaying(!playing)
  }

  const exportOne = useCallback(async (segId: string, mode: 'fast' | 'quality') => {
    const seg = segments.find(s => s.id === segId)
    if (!seg) return
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, exporting: true, objectUrl: undefined } : s))
    try {
      await ffmpeg.load()
      const url = await ffmpeg.exportSegment(file, seg.start, seg.end, seg.id, mode, background)
      setSegments(prev => prev.map(s => s.id === segId ? { ...s, objectUrl: url, exporting: false } : s))
    } catch (err) {
      console.error('Export error:', err)
      setSegments(prev => prev.map(s => s.id === segId ? { ...s, exporting: false } : s))
    }
  }, [segments, file, ffmpeg, background])

  const exportAll = useCallback(async (mode: 'fast' | 'quality') => {
    if (segments.length === 0) return
    setIsExportingAll(true)
    setExportDone(0)
    setSegments(prev => prev.map(s => ({ ...s, objectUrl: undefined })))
    try {
      await ffmpeg.load()
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, exporting: true } : s))
        const url = await ffmpeg.exportSegment(file, seg.start, seg.end, seg.id, mode, background)
        setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, objectUrl: url, exporting: false } : s))
        setExportDone(i + 1)
        await new Promise(r => setTimeout(r, 30))
      }
    } catch (err) {
      console.error('Export all error:', err)
    } finally {
      setIsExportingAll(false)
    }
  }, [segments, file, ffmpeg, background])

  const allExported = segments.length > 0 && segments.every(s => s.objectUrl)
  const exportedCount = segments.filter(s => s.objectUrl).length

  if (previewSeg?.objectUrl) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-100 font-bold text-lg">Preview clip</h2>
          <button onClick={() => setPreviewSeg(null)}
            className="text-sm text-slate-400 hover:text-slate-200 border border-slate-600 px-3 py-1.5 rounded-xl transition-colors">
            Volver al editor
          </button>
        </div>
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden mx-auto" style={{ maxWidth: 360, paddingBottom: '177.78%' }}>
          <video src={previewSeg.objectUrl} className="absolute inset-0 w-full h-full object-contain" controls autoPlay playsInline />
        </div>
        <a href={previewSeg.objectUrl} download="robincliphood_clip.mp4"
          className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-colors text-center">
          Descargar clip
        </a>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-100 font-bold text-lg">Editor manual</h2>
          <p className="text-slate-500 text-xs truncate max-w-xs">{file.name}</p>
        </div>
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200 border border-slate-600 px-3 py-1.5 rounded-xl transition-colors">
          Volver
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl overflow-hidden">
        {videoUrl && (
          <video ref={videoRef} src={videoUrl} className="w-full max-h-64 object-contain"
            onLoadedMetadata={handleMetadata}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)} />
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={togglePlay}
          className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors min-w-[90px]">
          {playing ? 'Pausa' : 'Play'}
        </button>
        <span className="text-slate-400 text-sm font-mono tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <button onClick={addMarkerAtCurrentTime}
          className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
          Cortar aqui
          <span className="font-mono text-xs opacity-70 tabular-nums">{formatTime(currentTime)}</span>
        </button>
        {isLoadingWaveform && (
          <span className="text-xs text-sky-400 animate-pulse ml-auto">Generando forma de onda...</span>
        )}
      </div>

      <p className="text-slate-500 text-xs">
        Arrastra para navegar. Pulsa Cortar aqui para marcar. {markers.length} cortes. {segments.length} segmentos
      </p>

      {/* Timeline */}
      <div className="space-y-1">
        <div
          ref={timelineRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className="relative w-full h-20 bg-slate-800 rounded-xl cursor-ew-resize overflow-hidden border border-slate-700 hover:border-sky-600/50 transition-colors select-none"
        >
          <canvas ref={waveformRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: waveformReady ? 1 : 0, transition: 'opacity 0.6s ease' }}
          />
          {!waveformReady && (
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-slate-600 mx-3" />
            </div>
          )}
          {duration > 0 && segments.map((seg, i) => {
            const colors = ['bg-sky-500/20 border-sky-500/40', 'bg-emerald-500/20 border-emerald-500/40', 'bg-violet-500/20 border-violet-500/40', 'bg-amber-500/20 border-amber-500/40', 'bg-rose-500/20 border-rose-500/40']
            return (
              <div key={seg.id}
                className={'absolute top-0 bottom-0 border-x pointer-events-none ' + colors[i % 5]}
                style={{ left: (seg.start / duration * 100) + '%', width: ((seg.end - seg.start) / duration * 100) + '%' }}
              />
            )
          })}
          {duration > 0 && markers.map(marker => (
            <div key={marker.id} className="absolute top-0 bottom-0 z-10"
              style={{ left: (marker.time / duration * 100) + '%' }}>
              <div className="w-0.5 h-full bg-red-500" />
              <button
                className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full hover:bg-red-400 flex items-center justify-center z-20 transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); removeMarker(marker.id) }}>
                <span className="text-white text-xs leading-none">x</span>
              </button>
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-200 text-xs font-mono px-1 rounded whitespace-nowrap pointer-events-none">
                {formatTime(marker.time)}
              </div>
            </div>
          ))}
          {duration > 0 && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-20"
              style={{ left: (currentTime / duration * 100) + '%' }} />
          )}
        </div>
        {duration > 0 && (
          <div className="flex justify-between text-slate-600 text-xs font-mono px-0.5">
            <span>0:00</span>
            <span>{formatTime(duration / 4)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime(duration * 3 / 4)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}
        {waveformReady && (
          <p className="text-slate-600 text-xs">Forma de onda — los picos indican momentos de alta energia</p>
        )}
      </div>

      {/* Selector de fondo */}
      {segments.length > 0 && (
        <div className="flex items-center gap-2">
          <p className="text-slate-400 text-xs shrink-0">Fondo 9:16:</p>
          <button onClick={() => setBackground('blur')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              background === 'blur' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-700/50 border-slate-600/50 text-slate-300'
            }`}>
            🌫️ Borroso
          </button>
          <button onClick={() => setBackground('black')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              background === 'black' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-700/50 border-slate-600/50 text-slate-300'
            }`}>
            ⬛ Negro
          </button>
        </div>
      )}

      {/* Segmentos */}
      {segments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Segmentos — {exportedCount}/{segments.length} exportados
            </p>
            {markers.length > 0 && (
              <button onClick={() => { setMarkers([]); setSegments([]) }}
                className="text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 px-2 py-1 rounded-lg transition-colors">
                Borrar todo
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {segments.map((seg, i) => {
              const colors = ['text-sky-400', 'text-emerald-400', 'text-violet-400', 'text-amber-400', 'text-rose-400']
              return (
                <div key={seg.id} className="bg-slate-800/60 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={'text-xs font-bold ' + colors[i % 5]}>#{i + 1}</span>
                    <button
                      className="text-slate-300 text-xs font-mono flex-1 tabular-nums text-left hover:text-sky-400 transition-colors"
                      onClick={() => { if (videoRef.current) videoRef.current.currentTime = seg.start }}>
                      {formatTime(seg.start)} a {formatTime(seg.end)}
                    </button>
                    <span className="text-slate-500 text-xs">{Math.round(seg.end - seg.start)}s</span>
                    {!seg.exporting && (
                      <div className="flex gap-1">
                        <button onClick={() => exportOne(seg.id, 'fast')} disabled={isExportingAll}
                          className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap">
                          Rapido
                        </button>
                        <button onClick={() => exportOne(seg.id, 'quality')} disabled={isExportingAll}
                          className="text-xs bg-sky-700 hover:bg-sky-600 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap">
                          9:16
                        </button>
                        {seg.objectUrl && (
                          <button onClick={() => setPreviewSeg(seg)}
                            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                            Ver
                          </button>
                        )}
                      </div>
                    )}
                    {seg.exporting && (
                      <span className="text-xs text-amber-400 animate-pulse">Procesando...</span>
                    )}
                  </div>
                  {seg.objectUrl && !seg.exporting && (
                    <p className="text-emerald-600 text-xs mt-1">Listo — pulsa Ver para previsualizar y descargar</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Marcadores */}
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {markers.map(m => (
            <button key={m.id} onClick={() => removeMarker(m.id)}
              className="text-xs bg-red-900/30 border border-red-800/40 text-red-400 hover:bg-red-900/50 px-2 py-1 rounded-lg transition-colors tabular-nums">
              x {formatTime(m.time)}
            </button>
          ))}
        </div>
      )}

      {/* Progreso exportar todos */}
      {isExportingAll && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: Math.round(exportDone / segments.length * 100) + '%' }} />
          </div>
          <p className="text-slate-400 text-xs text-center animate-pulse">
            Procesando clip {exportDone + 1} de {segments.length}... el navegador puede pausarse brevemente
          </p>
        </div>
      )}

      {/* Botones exportar todos */}
      {segments.length > 0 && !isExportingAll && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => exportAll('fast')}
            className="py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-2xl transition-colors text-sm">
            Todos rapido
          </button>
          <button onClick={() => exportAll('quality')}
            className="py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl transition-colors text-sm">
            Todos en 9:16
          </button>
        </div>
      )}

      {allExported && !isExportingAll && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 text-center">
          <p className="text-emerald-400 font-semibold">Todos los clips exportados</p>
          <p className="text-emerald-600 text-xs mt-1">Pulsa Ver en cada segmento para previsualizar y descargar</p>
        </div>
      )}

      {segments.length === 0 && duration > 0 && (
        <p className="text-center text-slate-600 text-sm py-2">
          Arrastra la barra de tiempo y pulsa Cortar aqui para marcar los puntos de corte
        </p>
      )}
    </div>
  )
}
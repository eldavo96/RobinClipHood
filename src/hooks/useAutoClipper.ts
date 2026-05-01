'use client'

import { useState, useCallback, useEffect } from 'react'
import { useFFmpeg } from './useFFmpeg'
import { useWhisper } from './useWhisper'
import { useFaceDetector } from './useFaceDetector'
import { detectClips } from '@/lib/clipDetector'
import { memoryManager } from '@/lib/memoryManager'
import type { ProcessingState, VideoSegment } from '@/types'
import type { ClipOptions } from '@/components/VideoUploader'

const CHUNK_DURATION = 120

const INITIAL: ProcessingState = {
  stage: 'idle', progress: 0, message: '', segments: [], error: null,
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration) }
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la duracion')) }
    video.src = url
  })
}

export function useAutoClipper() {
  const [state, setState] = useState<ProcessingState>(INITIAL)
  const ffmpeg = useFFmpeg()
  const whisper = useWhisper()
  const faceDetector = useFaceDetector()

  const set = useCallback((p: Partial<ProcessingState>) => {
    setState(prev => ({ ...prev, ...p }))
  }, [])

  const processVideo = useCallback(async (file: File, options: ClipOptions) => {
    try {
      set({ stage: 'loading', progress: 5, message: 'Iniciando motor de video...' })
      await ffmpeg.load()

      set({ progress: 10, message: 'Cargando modelo de IA...' })
      await whisper.loadModel()

      set({ stage: 'detecting-clips', progress: 15, message: 'Analizando video...' })
      const duration = await getVideoDuration(file)
      const totalChunks = Math.ceil(duration / CHUNK_DURATION)

      set({ stage: 'extracting-audio', progress: 20, message: `Extrayendo audio (${totalChunks} partes)...` })
      const audioChunks = await ffmpeg.extractAudio(file, duration, (p) => {
        set({
          progress: 20 + Math.round(p * 0.15),
          message: `Extrayendo audio... parte ${Math.ceil(p / (100 / totalChunks))} de ${totalChunks}`,
        })
      })

      set({ stage: 'transcribing', progress: 35, message: 'IA analizando contenido... (el navegador puede pausarse, es normal)' })
      const chunks = await whisper.transcribeChunks(audioChunks, CHUNK_DURATION, (p) => {
        const part = Math.ceil((p / 100) * totalChunks)
        set({
          progress: 35 + Math.round(p * 0.25),
          message: `Analizando parte ${part} de ${totalChunks}... (no cierres el navegador)`,
        })
      })

      set({ stage: 'detecting-clips', progress: 62, message: 'Detectando mejores momentos...' })
      await new Promise(r => setTimeout(r, 100))
      const rawSegments = detectClips(chunks, duration, {
        minDuration: options.minDuration,
        maxDuration: options.maxDuration,
      })

      if (rawSegments.length === 0) {
        throw new Error('No se detectaron segmentos. Prueba con otra duracion de clip.')
      }

      set({ stage: 'exporting', progress: 63, message: 'Detectando caras para encuadre inteligente...' })
      const facePosition = await faceDetector.detectFacePosition(file)

      const bgLabel = options.background === 'black' ? 'fondo negro' : 'fondo borroso'
      set({
        progress: 65,
        message: `Exportando ${rawSegments.length} clips con ${bgLabel}${facePosition ? ' y encuadre inteligente' : ''}...`,
      })

      const exported: VideoSegment[] = []
      for (let idx = 0; idx < rawSegments.length; idx++) {
        const seg = rawSegments[idx]
        set({
          message: `Exportando clip ${idx + 1} de ${rawSegments.length}...`,
          progress: 65 + Math.round((idx / rawSegments.length) * 33),
        })
        await new Promise(r => setTimeout(r, 50))
        const url = await ffmpeg.exportClip(
          seg.startTime,
          seg.endTime,
          seg.id,
          facePosition?.centerX,
          options.background,
        )
        exported.push({ ...seg, objectUrl: url })
      }

      await ffmpeg.cleanup()
      set({ stage: 'done', progress: 100, message: `${exported.length} clips listos!`, segments: exported })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      set({ stage: 'error', error: msg, message: msg })
      await ffmpeg.cleanup()
    }
  }, [ffmpeg, whisper, faceDetector, set])

  const reset = useCallback(() => {
    state.segments.forEach(s => { if (s.objectUrl) memoryManager.revokeObjectUrl(s.objectUrl) })
    setState(INITIAL)
  }, [state.segments])

  useEffect(() => () => { memoryManager.fullCleanup() }, [])

  return {
    state, processVideo, reset,
    ffmpegReady: ffmpeg.isLoaded,
    whisperReady: whisper.isReady,
    modelProgress: whisper.modelProgress,
  }
}
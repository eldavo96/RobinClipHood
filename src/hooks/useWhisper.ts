'use client'

import { useState, useRef, useCallback } from 'react'
import type { WhisperChunk } from '@/types'

type Pipeline = any

// Convierte WAV (8kHz en este caso) a Float32
function wavToFloat32(wav: Uint8Array): Float32Array {
  const HEADER = 44
  if (wav.byteLength <= HEADER) return new Float32Array(0)
  const pcm = new Int16Array(
    wav.buffer,
    wav.byteOffset + HEADER,
    (wav.byteLength - HEADER) / 2
  )
  const f32 = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768.0
  return f32
}

export function useWhisper() {
  const pipeRef = useRef<Pipeline | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modelProgress, setModelProgress] = useState(0)

  const loadModel = useCallback(async () => {
    if (isReady || isLoading) return
    setIsLoading(true)
    try {
      const { pipeline, env } = await import('@xenova/transformers')
      env.allowLocalModels = false
      env.useBrowserCache = true
      env.backends.onnx.wasm.proxy = false
      env.backends.onnx.wasm.numThreads = 1

      pipeRef.current = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        {
          progress_callback: (d: any) => {
            if (d.progress) setModelProgress(Math.round(d.progress))
          },
          quantized: true,
        }
      )
      setIsReady(true)
    } catch (err) {
      console.error('[Whisper] error:', err)
      throw new Error('No se pudo cargar el modelo de IA')
    } finally {
      setIsLoading(false)
    }
  }, [isReady, isLoading])

  const transcribeChunks = useCallback(
    async (
      audioChunks: Uint8Array[],
      chunkDuration: number,
      onProgress?: (p: number) => void
    ): Promise<WhisperChunk[]> => {
      if (!pipeRef.current) throw new Error('Whisper no inicializado')
      const all: WhisperChunk[] = []

      for (let i = 0; i < audioChunks.length; i++) {
        const offset = i * chunkDuration
        const float32 = wavToFloat32(audioChunks[i])

        // Si el chunk está vacío o tiene muy poco audio, saltarlo
        if (float32.length < 1600) {
          onProgress?.(Math.round(((i + 1) / audioChunks.length) * 100))
          continue
        }

        const result = await pipeRef.current(float32, {
          task: 'transcribe',
          return_timestamps: true,
          chunk_length_s: 30,
          // sampling_rate debe coincidir con lo que extrae FFmpeg
          sampling_rate: 8000,
        })

        const chunks = (result.chunks as WhisperChunk[]) ?? []
        const adjusted = chunks.map(c => ({
          ...c,
          timestamp: [
            c.timestamp[0] + offset,
            c.timestamp[1] !== null ? c.timestamp[1] + offset : null,
          ] as [number, number | null],
        }))

        all.push(...adjusted)
        onProgress?.(Math.round(((i + 1) / audioChunks.length) * 100))

        // 100ms entre chunks — suficiente para que Chrome no mate la página
        await new Promise(r => setTimeout(r, 100))
      }

      return all
    },
    []
  )

  return { loadModel, transcribeChunks, isReady, isLoading, modelProgress }
}
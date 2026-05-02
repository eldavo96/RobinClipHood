'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { memoryManager } from '@/lib/memoryManager'

type FFmpegType = any

export function useFFmpeg() {
  const ffRef = useRef<FFmpegType | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (ffRef.current && isLoaded) return
    if (isLoading) return
    setIsLoading(true)
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const ff = new FFmpeg()
      ffRef.current = ff
      await ff.load({
        coreURL: `${window.location.origin}/ffmpeg/ffmpeg-core.js`,
        wasmURL: `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`,
      })
      setIsLoaded(true)
    } catch (err) {
      console.error('[FFmpeg] load error:', err)
      throw new Error('No se pudo cargar el motor de video')
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isLoading])

  const extractAudio = useCallback(
    async (videoFile: File, videoDuration: number, onProgress?: (p: number) => void): Promise<Uint8Array[]> => {
      const ff = ffRef.current!
      const { fetchFile } = await import('@ffmpeg/util')
      const CHUNK = 120
      const chunks: Uint8Array[] = []
      const total = Math.ceil(videoDuration / CHUNK)
      await ff.writeFile('input.mp4', await fetchFile(videoFile))
      for (let i = 0; i < total; i++) {
        const chunkFile = `chunk_${i}.wav`
        await ff.exec(['-ss', String(i * CHUNK), '-t', String(CHUNK), '-i', 'input.mp4', '-vn', '-acodec', 'pcm_s16le', '-ar', '8000', '-ac', '1', chunkFile])
        const data = await ff.readFile(chunkFile)
        chunks.push(data as Uint8Array)
        await ff.deleteFile(chunkFile)
        onProgress?.(Math.round(((i + 1) / total) * 100))
        await new Promise(r => setTimeout(r, 50))
      }
      return chunks
    }, []
  )

  const exportClip = useCallback(
    async (
      startTime: number,
      endTime: number,
      clipId: string,
      faceOffsetX?: number,
      background: 'blur' | 'black' = 'blur',
      onProgress?: (p: number) => void
    ): Promise<string> => {
      const ff = ffRef.current!
      ff.on('progress', ({ progress }: { progress: number }) => onProgress?.(Math.round(progress * 100)))
      const out = `out_${clipId}.mp4`

      let vf: string
      if (background === 'black') {
        if (faceOffsetX !== undefined) {
          vf = `crop=ih*9/16:ih:iw*${faceOffsetX.toFixed(3)}-ih*9/16/2:0,scale=1080:1920,setsar=1,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black`
        } else {
          vf = 'scale=iw*min(1080/iw\\,1920/ih):ih*min(1080/iw\\,1920/ih),pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black,setsar=1'
        }
      } else {
        if (faceOffsetX !== undefined) {
          vf = `split[a][b];[a]crop=ih*9/16:ih:iw*${faceOffsetX.toFixed(3)}-ih*9/16/2:0[fg];[b]scale=1080:1920,boxblur=30:5[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2,scale=1080:1920,setsar=1`
        } else {
          vf = 'split[a][b];[a]scale=1080:-2[fg];[b]scale=1080:1920,boxblur=30:5[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1'
        }
      }

      await ff.exec([
        '-ss', String(startTime), '-to', String(endTime),
        '-i', 'input.mp4', '-vf', vf,
        '-c:v', 'libx264', '-crf', '28', '-preset', 'ultrafast', '-tune', 'fastdecode',
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
        out,
      ])
      const clipData = await ff.readFile(out)
      await ff.deleteFile(out)
      const blob = new Blob([clipData as unknown as BlobPart], { type: 'video/mp4' })
      return memoryManager.trackObjectUrl(URL.createObjectURL(blob))
    }, []
  )

  const analyzeAudioAmplitude = useCallback(
    async (videoFile: File): Promise<{ time: number; rms: number }[]> => {
      const ff = ffRef.current!
      const { fetchFile } = await import('@ffmpeg/util')
      try { await ff.readFile('input.mp4') } catch {
        await ff.writeFile('input.mp4', await fetchFile(videoFile))
      }
      await ff.exec(['-i', 'input.mp4', '-vn', '-acodec', 'pcm_s16le', '-ar', '8000', '-ac', '1', 'analysis.wav'])
      const audioData = await ff.readFile('analysis.wav') as Uint8Array
      await ff.deleteFile('analysis.wav')
      const HEADER = 44
      if (audioData.byteLength <= HEADER) return []
      const pcm = new Int16Array(audioData.buffer, audioData.byteOffset + HEADER, (audioData.byteLength - HEADER) / 2)
      const sampleRate = 8000
      const windowSamples = sampleRate * 0.5
      const results: { time: number; rms: number }[] = []
      for (let i = 0; i < pcm.length; i += windowSamples) {
        const w = pcm.slice(i, Math.min(i + windowSamples, pcm.length))
        const rms = Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length)
        results.push({ time: i / sampleRate, rms })
      }
      return results
    }, []
  )

  const exportSegment = useCallback(
    async (
      videoFile: File,
      start: number,
      end: number,
      clipId: string,
      mode: 'fast' | 'quality' = 'fast',
      background: 'blur' | 'black' = 'blur'
    ): Promise<string> => {
      const ff = ffRef.current!
      const { fetchFile } = await import('@ffmpeg/util')
      try { await ff.readFile('input.mp4') } catch {
        await ff.writeFile('input.mp4', await fetchFile(videoFile))
      }
      const out = `seg_${clipId}.mp4`

      if (mode === 'fast') {
        await ff.exec(['-ss', String(start), '-to', String(end), '-i', 'input.mp4', '-c', 'copy', '-movflags', '+faststart', out])
      } else {
        const vf = background === 'black'
          ? 'scale=iw*min(1080/iw\\,1920/ih):ih*min(1080/iw\\,1920/ih),pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black,setsar=1'
          : 'split[a][b];[a]scale=1080:-2[fg];[b]scale=1080:1920,boxblur=30:5[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1'
        await ff.exec([
          '-ss', String(start), '-to', String(end),
          '-i', 'input.mp4', '-vf', vf,
          '-c:v', 'libx264', '-crf', '26', '-preset', 'ultrafast',
          '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
          out,
        ])
      }

      const data = await ff.readFile(out) as Uint8Array
      await ff.deleteFile(out)
      const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
      return memoryManager.trackObjectUrl(URL.createObjectURL(blob))
    }, []
  )

  const cleanup = useCallback(async () => {
    try { await ffRef.current?.deleteFile('input.mp4') } catch {}
  }, [])

  useEffect(() => () => { ffRef.current?.terminate?.() }, [])

  return { load, isLoaded, isLoading, extractAudio, exportClip, cleanup, analyzeAudioAmplitude, exportSegment }
}

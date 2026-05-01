import type { WhisperChunk, VideoSegment } from '@/types'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

interface ClipDetectorOptions {
  minDuration: number
  maxDuration: number
}

export function detectClips(
  chunks: WhisperChunk[],
  videoDuration: number,
  options: Partial<ClipDetectorOptions> = {}
): Omit<VideoSegment, 'objectUrl'>[] {
  const minDuration = options.minDuration ?? 20
  const maxDuration = options.maxDuration ?? 60

  if (chunks.length === 0) {
    return divideEvenly(0, videoDuration, maxDuration, minDuration)
  }

  const segments: Omit<VideoSegment, 'objectUrl'>[] = []
  let windowStart = chunks[0].timestamp[0]
  let windowText = ''
  let windowEnd = windowStart

  for (let i = 0; i < chunks.length; i++) {
    const [start, end] = chunks[i].timestamp
    const chunkEnd = end ?? start + 2

    // Detectar silencio largo — cortar aqui si es buen punto
    const gap = i > 0 ? start - (chunks[i - 1].timestamp[1] ?? chunks[i - 1].timestamp[0] + 2) : 0
    const isNaturalBreak = gap > 2 // pausa de mas de 2 segundos
    const windowDuration = chunkEnd - windowStart

    windowText += ' ' + chunks[i].text
    windowEnd = chunkEnd

    const shouldCut = windowDuration >= maxDuration ||
      (isNaturalBreak && windowDuration >= minDuration) ||
      i === chunks.length - 1

    if (shouldCut && windowDuration >= minDuration) {
      segments.push({
        id: uid(),
        startTime: windowStart,
        endTime: windowEnd,
        duration: windowDuration,
        hasVoice: true,
        confidence: estimateConfidence(windowText),
        transcript: windowText.trim(),
      })
      windowStart = chunkEnd
      windowText = ''
    }
  }

  // Rellenar huecos sin transcripcion
  const lastCovered = segments.length > 0 ? segments[segments.length - 1].endTime : 0
  if (videoDuration - lastCovered > minDuration) {
    const extras = divideEvenly(lastCovered, videoDuration, maxDuration, minDuration)
    // Los segmentos sin voz tienen menos prioridad
    segments.push(...extras)
  }

  // Ordenar: primero los que tienen voz y mas confianza
  return segments.sort((a, b) => {
    if (a.hasVoice !== b.hasVoice) return a.hasVoice ? -1 : 1
    return b.confidence - a.confidence
  })
}

function divideEvenly(
  start: number,
  end: number,
  maxDuration: number,
  minDuration: number
): Omit<VideoSegment, 'objectUrl'>[] {
  const segs: Omit<VideoSegment, 'objectUrl'>[] = []
  let cur = start
  while (cur + minDuration < end) {
    const segEnd = Math.min(cur + maxDuration, end)
    segs.push({
      id: uid(),
      startTime: cur,
      endTime: segEnd,
      duration: segEnd - cur,
      hasVoice: false,
      confidence: 0.3,
      transcript: '',
    })
    cur = segEnd
  }
  return segs
}

function estimateConfidence(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const unique = new Set(words.map(w => w.toLowerCase()))
  const diversity = unique.size / words.length
  const lengthScore = Math.min(words.length / 40, 1)
  // Penalizar texto repetitivo (posible error de Whisper)
  const penalty = diversity < 0.3 ? 0.5 : 1
  return Math.round((diversity * 0.5 + lengthScore * 0.5) * penalty * 100) / 100
}
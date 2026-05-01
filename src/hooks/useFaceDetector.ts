'use client'

import { useCallback } from 'react'

interface FacePosition {
  centerX: number  // 0-1, posición relativa horizontal
  confidence: number
}

export function useFaceDetector() {

  const detectFacePosition = useCallback(
    async (videoFile: File, sampleCount = 5): Promise<FacePosition | null> => {
      // Comprobar soporte
      if (!('FaceDetector' in window)) {
        console.log('[FaceDetector] No soportado en este navegador')
        return null
      }

      return new Promise((resolve) => {
        const video = document.createElement('video')
        const url = URL.createObjectURL(videoFile)
        video.src = url
        video.muted = true
        video.preload = 'metadata'

        video.onloadedmetadata = async () => {
          const duration = video.duration
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          // @ts-expect-error — FaceDetector es experimental
          const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 })

          const positions: number[] = []

          for (let i = 0; i < sampleCount; i++) {
            // Muestra en distintos momentos del video
            const seekTime = (duration / (sampleCount + 1)) * (i + 1)
            
            await new Promise<void>(res => {
              video.currentTime = seekTime
              video.onseeked = () => res()
            })

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)

            try {
              const faces = await detector.detect(canvas)
              for (const face of faces) {
                // Centro X de la cara como fracción del ancho total
                const faceCenterX = (face.boundingBox.x + face.boundingBox.width / 2) / video.videoWidth
                positions.push(faceCenterX)
              }
            } catch {
              // Frame sin caras — ignorar
            }

            await new Promise(r => setTimeout(r, 50))
          }

          URL.revokeObjectURL(url)

          if (positions.length === 0) {
            resolve(null)
            return
          }

          // Media de posiciones detectadas
          const avg = positions.reduce((s, p) => s + p, 0) / positions.length
          console.log(`[FaceDetector] ${positions.length} caras detectadas, posición media: ${(avg * 100).toFixed(1)}%`)
          resolve({ centerX: avg, confidence: positions.length / sampleCount })
        }

        video.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(null)
        }
      })
    },
    []
  )

  const isSupported = typeof window !== 'undefined' && 'FaceDetector' in window

  return { detectFacePosition, isSupported }
}
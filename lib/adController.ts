'use client'

// Controla cuándo mostrar anuncios y bloquear la descarga
// hasta que el usuario complete el Reward Ad

export type AdGateStatus = 'locked' | 'watching' | 'unlocked'

class AdController {
  private unlockedClips = new Set<string>()

  isUnlocked(clipId: string): boolean {
    return this.unlockedClips.has(clipId)
  }

  // Simula el flujo de Reward Ad (swap por SDK real de AdSense/AdMob)
  async watchRewardAd(clipId: string): Promise<boolean> {
    return new Promise((resolve) => {
      // En producción: window.googletag o AdSense Rewarded API
      // Por ahora: simulamos 5 segundos de ad watch
      console.log('[AdController] Mostrando reward ad para clip:', clipId)
      setTimeout(() => {
        this.unlockedClips.add(clipId)
        resolve(true)
      }, 5000)
    })
  }

  // Dispara un ad de display en el slot dado (no bloquea)
  triggerDisplayAd(slotId: string): void {
    if (typeof window === 'undefined') return
    // En producción: (window.adsbygoogle = window.adsbygoogle || []).push({})
    console.log('[AdController] Display ad triggered en slot:', slotId)
  }

  lockAll(): void {
    this.unlockedClips.clear()
  }
}

export const adController = new AdController()

class MemoryManager {
  private objectUrls = new Set<string>()
  private workers = new Set<Worker>()

  trackObjectUrl(url: string): string {
    this.objectUrls.add(url)
    return url
  }

  revokeObjectUrl(url: string): void {
    URL.revokeObjectURL(url)
    this.objectUrls.delete(url)
  }

  revokeAll(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls.clear()
  }

  trackWorker(worker: Worker): Worker {
    this.workers.add(worker)
    return worker
  }

  terminateWorker(worker: Worker): void {
    worker.terminate()
    this.workers.delete(worker)
  }

  terminateAll(): void {
    this.workers.forEach((w) => w.terminate())
    this.workers.clear()
  }

  fullCleanup(): void {
    this.revokeAll()
    this.terminateAll()
  }
}

export const memoryManager = new MemoryManager()

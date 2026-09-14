// Simple navigation history tracker for WikiLink navigation

type Listener = () => void

class NavigationTracker {
  private history: string[] = []
  private currentIndex = -1
  private listeners: Set<Listener> = new Set()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(l => l())
  }

  push(fileId: string) {
    // If we're not at the end, truncate forward history
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }
    // Don't add duplicate if same as current
    if (this.history[this.currentIndex] === fileId) return
    this.history.push(fileId)
    this.currentIndex = this.history.length - 1
    // Limit history size
    if (this.history.length > 50) {
      this.history = this.history.slice(-50)
      this.currentIndex = this.history.length - 1
    }
    this.notify()
  }

  back(): string | undefined {
    if (this.currentIndex <= 0) return undefined
    this.currentIndex--
    this.notify()
    return this.history[this.currentIndex]
  }

  forward(): string | undefined {
    if (this.currentIndex >= this.history.length - 1) return undefined
    this.currentIndex++
    this.notify()
    return this.history[this.currentIndex]
  }

  canBack(): boolean { return this.currentIndex > 0 }
  canForward(): boolean { return this.currentIndex < this.history.length - 1 }

  getCurrent(): string | undefined { return this.history[this.currentIndex] }

  getHistory(): { fileId: string; isCurrent: boolean }[] {
    return this.history.map((id, i) => ({ fileId: id, isCurrent: i === this.currentIndex }))
  }

  clear() {
    this.history = []
    this.currentIndex = -1
    this.notify()
  }
}

// Singleton instance
export const navigationTracker = new NavigationTracker()

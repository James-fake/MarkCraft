export interface HistoryEntry {
  content: string
  cursorStart: number
  cursorEnd: number
  timestamp: number
  groupKey?: string
}

export interface UndoRedoState {
  canUndo: boolean
  canRedo: boolean
}

const MAX_STACK_SIZE = 200
const GROUP_INTERVAL_MS = 800

export class UndoRedoManager {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private currentEntry: HistoryEntry | null = null
  private lastGroupKey: string | undefined = undefined
  private lastGroupTimestamp: number = 0
  private maxSize: number
  private groupInterval: number
  private listeners: Set<() => void> = new Set()

  constructor(maxSize: number = MAX_STACK_SIZE, groupInterval: number = GROUP_INTERVAL_MS) {
    this.maxSize = maxSize
    this.groupInterval = groupInterval
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach(fn => fn())
  }

  initialize(content: string, cursorStart: number = 0, cursorEnd: number = 0) {
    this.undoStack = []
    this.redoStack = []
    this.currentEntry = {
      content,
      cursorStart,
      cursorEnd,
      timestamp: Date.now(),
    }
    this.lastGroupKey = undefined
    this.lastGroupTimestamp = 0
    this.notify()
  }

  push(content: string, cursorStart: number, cursorEnd: number, groupKey?: string) {
    if (!this.currentEntry) {
      this.initialize(content, cursorStart, cursorEnd)
      return
    }

    if (content === this.currentEntry.content) return

    const now = Date.now()
    let shouldGroup = false

    if (
      groupKey &&
      groupKey === this.lastGroupKey &&
      now - this.lastGroupTimestamp < this.groupInterval
    ) {
      shouldGroup = true
    }

    if (shouldGroup) {
      this.currentEntry = {
        content,
        cursorStart,
        cursorEnd,
        timestamp: now,
        groupKey,
      }
    } else {
      this.undoStack.push({ ...this.currentEntry })
      if (this.undoStack.length > this.maxSize) {
        this.undoStack = this.undoStack.slice(-this.maxSize)
      }
      this.redoStack = []
      this.currentEntry = {
        content,
        cursorStart,
        cursorEnd,
        timestamp: now,
        groupKey,
      }
    }

    this.lastGroupKey = groupKey
    this.lastGroupTimestamp = now
    this.notify()
  }

  undo(): HistoryEntry | null {
    if (this.undoStack.length === 0) return null

    if (this.currentEntry) {
      this.redoStack.push({ ...this.currentEntry })
    }

    const prevEntry = this.undoStack.pop()!
    this.currentEntry = { ...prevEntry }

    this.lastGroupKey = undefined
    this.lastGroupTimestamp = 0

    this.notify()
    return { ...prevEntry }
  }

  redo(): HistoryEntry | null {
    if (this.redoStack.length === 0) return null

    if (this.currentEntry) {
      this.undoStack.push({ ...this.currentEntry })
    }

    const nextEntry = this.redoStack.pop()!
    this.currentEntry = { ...nextEntry }

    this.lastGroupKey = undefined
    this.lastGroupTimestamp = 0

    this.notify()
    return { ...nextEntry }
  }

  getState(): UndoRedoState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
    }
  }

  getCurrentContent(): string | null {
    return this.currentEntry?.content ?? null
  }

  reset() {
    this.undoStack = []
    this.redoStack = []
    this.currentEntry = null
    this.lastGroupKey = undefined
    this.lastGroupTimestamp = 0
    this.notify()
  }
}

export class FileHistoryManager {
  private managers: Map<string, UndoRedoManager> = new Map()
  private listeners: Set<() => void> = new Set()
  private maxManagers: number

  constructor(maxManagers: number = 10) {
    this.maxManagers = maxManagers
  }

  getManager(fileId: string): UndoRedoManager {
    let manager = this.managers.get(fileId)
    if (!manager) {
      // Evict least-recently-used manager if at capacity
      if (this.managers.size >= this.maxManagers) {
        // The first key in the Map is the oldest (least recently accessed)
        const oldestKey = this.managers.keys().next().value
        if (oldestKey) {
          this.managers.delete(oldestKey)
        }
      }
      manager = new UndoRedoManager()
      manager.subscribe(() => this.notify())
      this.managers.set(fileId, manager)
    } else {
      // Move to end of Map to mark as most recently used
      this.managers.delete(fileId)
      this.managers.set(fileId, manager)
    }
    return manager
  }

  removeManager(fileId: string) {
    this.managers.delete(fileId)
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach(fn => fn())
  }

  clearAll() {
    this.managers.clear()
    this.notify()
  }
}

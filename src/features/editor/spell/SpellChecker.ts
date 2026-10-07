import { EXTENDED_DICTIONARY } from '../spellCheckDict'

const CUSTOM_WORDS_KEY = 'markcraft_spell_custom_words'

class SpellChecker {
  private dictionary: Set<string> = new Set()
  private customWords: Set<string> = new Set()
  private loaded: boolean = false
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.loaded) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._init()
    return this.initPromise
  }

  private async _init(): Promise<void> {
    // Try to load from a hosted dictionary file first
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/an-array-of-english-words@2/index.json')
      if (res.ok) {
        const words: string[] = await res.json()
        words.forEach((w: string) => this.dictionary.add(w.toLowerCase()))
        this.loaded = true
      }
    } catch {
      // Network error or CDN unavailable, fall through to built-in dictionary
    }

    // Fallback: use the existing spellCheckDict.ts words
    if (!this.loaded) {
      this.dictionary = new Set(EXTENDED_DICTIONARY)
      this.loaded = true
    } else {
      // Merge built-in dictionary as well to ensure technical terms are covered
      for (const word of EXTENDED_DICTIONARY) {
        this.dictionary.add(word)
      }
    }

    // Load custom words from localStorage
    this.loadCustomWords()
  }

  isReady(): boolean {
    return this.loaded
  }

  isCorrect(word: string): boolean {
    const lower = word.toLowerCase()
    if (this.customWords.has(lower)) return true
    // Skip short words, numbers, code
    if (word.length <= 1 || /^\d+$/.test(word)) return true
    // Skip words with non-alpha characters (likely code or abbreviations)
    if (/[^a-z]/i.test(lower)) return true
    return this.dictionary.has(lower)
  }

  getSuggestions(word: string, maxResults: number = 5): string[] {
    const lower = word.toLowerCase()
    const candidates: { word: string; dist: number }[] = []

    for (const dictWord of this.dictionary) {
      // First letter must match for better performance
      if (dictWord[0] !== lower[0]) continue
      // Skip words that are too different in length
      if (Math.abs(dictWord.length - lower.length) > 2) continue

      const dist = this.levenshtein(lower, dictWord)
      if (dist <= 2) {
        candidates.push({ word: dictWord, dist })
      }
    }

    candidates.sort((a, b) => a.dist - b.dist)
    return candidates.slice(0, maxResults).map(c => c.word)
  }

  addWord(word: string): void {
    const lower = word.toLowerCase()
    this.customWords.add(lower)
    this.dictionary.add(lower)
    this.saveCustomWords()
  }

  removeCustomWord(word: string): void {
    const lower = word.toLowerCase()
    this.customWords.delete(lower)
    this.saveCustomWords()
  }

  getCustomWords(): string[] {
    return [...this.customWords]
  }

  private loadCustomWords(): void {
    try {
      const raw = localStorage.getItem(CUSTOM_WORDS_KEY)
      if (raw) {
        const words: string[] = JSON.parse(raw)
        words.forEach((w: string) => {
          this.customWords.add(w)
          this.dictionary.add(w)
        })
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveCustomWords(): void {
    try {
      localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify([...this.customWords]))
    } catch {
      // Ignore storage errors
    }
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[])
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        )
      }
    }
    return dp[m][n]
  }
}

export const spellChecker = new SpellChecker()

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface Bookmark {
  id: string;
  type: 'file' | 'heading';
  fileId: string;
  fileName: string;           // 冗余存储，方便显示
  headingText?: string;       // type='heading' 时
  groupName: string;          // 所属分组，默认 '默认'
  createdAt: number;
  note?: string;
}

export interface BookmarkContextType {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (fileId: string, headingText?: string) => boolean;
  getBookmarksByGroup: (group: string) => Bookmark[];
  groups: string[];
  addGroup: (name: string) => void;
  removeGroup: (name: string) => void;
}

const STORAGE_KEY = 'markcraft-bookmarks'
const DEFAULT_GROUP = '默认'

interface PersistedState {
  bookmarks: Bookmark[];
  groups: string[];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const bookmarks: Bookmark[] = Array.isArray(parsed?.bookmarks) ? parsed.bookmarks : []
      const groups: string[] =
        Array.isArray(parsed?.groups) && parsed.groups.length > 0
          ? parsed.groups
          : [DEFAULT_GROUP]
      return { bookmarks, groups }
    }
  } catch {}
  return { bookmarks: [], groups: [DEFAULT_GROUP] }
}

const BookmarkContext = createContext<BookmarkContextType>({
  bookmarks: [],
  addBookmark: () => {},
  removeBookmark: () => {},
  isBookmarked: () => false,
  getBookmarksByGroup: () => [],
  groups: [DEFAULT_GROUP],
  addGroup: () => {},
  removeGroup: () => {},
})

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadState())

  // 自动保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      groupName: bookmark.groupName || DEFAULT_GROUP,
      id: generateId(),
      createdAt: Date.now(),
    }
    setState(prev => ({ ...prev, bookmarks: [...prev.bookmarks, newBookmark] }))
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      bookmarks: prev.bookmarks.filter(b => b.id !== id),
    }))
  }, [])

  const isBookmarked = useCallback((fileId: string, headingText?: string) => {
    return state.bookmarks.some(
      b =>
        b.fileId === fileId &&
        (headingText === undefined ? !b.headingText : b.headingText === headingText)
    )
  }, [state.bookmarks])

  const getBookmarksByGroup = useCallback(
    (group: string) => state.bookmarks.filter(b => b.groupName === group),
    [state.bookmarks]
  )

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState(prev =>
      prev.groups.includes(trimmed) ? prev : { ...prev, groups: [...prev.groups, trimmed] }
    )
  }, [])

  const removeGroup = useCallback((name: string) => {
    // 不允许删除默认分组
    if (name === DEFAULT_GROUP) return
    setState(prev => ({
      groups: prev.groups.filter(g => g !== name),
      // 将被删除分组下的书签迁移到默认分组，避免数据丢失
      bookmarks: prev.bookmarks.map(b =>
        b.groupName === name ? { ...b, groupName: DEFAULT_GROUP } : b
      ),
    }))
  }, [])

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks: state.bookmarks,
        addBookmark,
        removeBookmark,
        isBookmarked,
        getBookmarksByGroup,
        groups: state.groups,
        addGroup,
        removeGroup,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  )
}

export function useBookmark() {
  return useContext(BookmarkContext)
}

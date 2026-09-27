import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FileNode } from '../../types/fileManager';
import { useFileManager } from '../../stores/FileStore';
import { useLanguage } from '../../stores/LanguageStore';

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileItem {
  id: string;
  name: string;
  path: string;
  depth: number;
}

interface MatchResult {
  item: FileItem;
  score: number;
  matches: number[];
}

const HISTORY_KEY = 'quick-open-history';
const MAX_HISTORY = 10;

function getFilePath(node: FileNode, root: FileNode): string {
  const parts: string[] = [];
  const find = (current: FileNode, target: string): boolean => {
    if (current.id === target) {
      parts.unshift(current.name);
      return true;
    }
    if (current.children) {
      for (const child of current.children) {
        if (find(child, target)) {
          parts.unshift(current.name);
          return true;
        }
      }
    }
    return false;
  };
  find(root, node.id);
  return parts.slice(1).join(' / ');
}

function collectFiles(node: FileNode, root: FileNode, depth: number = 0): FileItem[] {
  const items: FileItem[] = [];
  if (node.type === 'file') {
    items.push({
      id: node.id,
      name: node.name,
      path: getFilePath(node, root),
      depth,
    });
  }
  if (node.children) {
    for (const child of node.children) {
      items.push(...collectFiles(child, root, depth + 1));
    }
  }
  return items;
}

function fuzzyMatch(query: string, item: FileItem): MatchResult | null {
  const q = query.toLowerCase();
  const name = item.name.toLowerCase();
  const path = item.path.toLowerCase();

  if (name === q) {
    return { item, score: 1000, matches: Array.from({ length: name.length }, (_, i) => i) };
  }

  if (name.startsWith(q)) {
    return { item, score: 900, matches: Array.from({ length: q.length }, (_, i) => i) };
  }

  if (name.includes(q)) {
    const idx = name.indexOf(q);
    return { item, score: 800, matches: Array.from({ length: q.length }, (_, i) => idx + i) };
  }

  if (path.includes(q)) {
    return { item, score: 700, matches: [] };
  }

  let score = 0;
  const matches: number[] = [];
  let qi = 0;
  let lastMatchIdx = -2;
  let consecutiveBonus = 0;

  for (let i = 0; i < name.length && qi < q.length; i++) {
    if (name[i] === q[qi]) {
      matches.push(i);
      if (i === lastMatchIdx + 1) {
        consecutiveBonus += 10;
      }
      if (i === 0 || name[i - 1] === ' ' || name[i - 1] === '-' || name[i - 1] === '_' || name[i - 1] === '.') {
        score += 50;
      }
      score += 10 + consecutiveBonus;
      lastMatchIdx = i;
      qi++;
    }
  }

  if (qi === q.length) {
    return { item, score, matches };
  }

  let pathScore = 0;
  let pathQi = 0;
  for (let i = 0; i < path.length && pathQi < q.length; i++) {
    if (path[i] === q[pathQi]) {
      pathScore += 5;
      pathQi++;
    }
  }
  if (pathQi === q.length) {
    return { item, score: pathScore, matches: [] };
  }

  return null;
}

function getSearchHistory(): string[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string) {
  if (!query.trim()) return;
  const history = getSearchHistory().filter(h => h !== query);
  history.unshift(query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function getRecentFileIds(): string[] {
  try {
    const data = localStorage.getItem('quick-open-recent-files');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function addRecentFileId(fileId: string) {
  const ids = getRecentFileIds().filter(id => id !== fileId);
  ids.unshift(fileId);
  localStorage.setItem('quick-open-recent-files', JSON.stringify(ids.slice(0, 20)));
}

const QuickOpen: React.FC<QuickOpenProps> = ({ isOpen, onClose }) => {
  const { rootFolder, openFile, tabs } = useFileManager();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // V4-L5: Debounce query to avoid re-computing fuzzy match on every keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 100)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const allFiles = useMemo(() => collectFiles(rootFolder, rootFolder), [rootFolder]);

  // V6-L2: Refresh recent files and search history when QuickOpen opens
  const [recentFileIds, setRecentFileIds] = useState<string[]>(() => getRecentFileIds())
  const [searchHistory, setSearchHistory] = useState<string[]>(() => getSearchHistory())

  useEffect(() => {
    if (isOpen) {
      setRecentFileIds(getRecentFileIds())
      setSearchHistory(getSearchHistory())
    }
  }, [isOpen])

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      const recentItems = recentFileIds
        .map(id => allFiles.find(f => f.id === id))
        .filter((f): f is FileItem => f !== undefined);
      return recentItems.map(item => ({ item, score: 0, matches: [] }));
    }

    const matched: MatchResult[] = [];
    for (const file of allFiles) {
      const result = fuzzyMatch(debouncedQuery, file);
      if (result) {
        matched.push(result);
      }
    }
    matched.sort((a, b) => b.score - a.score);
    return matched.slice(0, 50);
  }, [debouncedQuery, allFiles, recentFileIds]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((fileId: string) => {
    addRecentFileId(fileId);
    if (query.trim()) {
      addToSearchHistory(query.trim());
    }
    openFile(fileId);
    onClose();
  }, [openFile, onClose, query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].item.id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  const highlightMatch = (name: string, matches: number[]) => {
    if (!matches.length) return name;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    const sortedMatches = [...matches].sort((a, b) => a - b);
    for (const idx of sortedMatches) {
      if (idx > lastIdx) {
        parts.push(name.slice(lastIdx, idx));
      }
      parts.push(
        <span key={idx} style={{ color: 'var(--link-color)', fontWeight: 600 }}>
          {name[idx]}
        </span>
      );
      lastIdx = idx + 1;
    }
    if (lastIdx < name.length) {
      parts.push(name.slice(lastIdx));
    }
    return parts;
  };

  const isFileOpen = (fileId: string) => tabs.some(tab => tab.fileId === fileId);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'fadeIn 0.1s ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--mc-bg-panel)',
          border: '1px solid var(--mc-border-subtle)',
          animation: 'scaleIn 0.12s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-3 border-b" style={{ borderColor: 'var(--mc-border-subtle)' }}>
          <span style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '14px', marginRight: '8px' }}>
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.quickOpen.searchPlaceholder}
            className="flex-1 py-3 bg-transparent outline-none quick-open-input"
            style={{
              color: 'var(--mc-text-primary)',
              fontSize: '14px',
              border: 'none',
            }}
          />
          <span
            className="px-1.5 py-0.5 rounded text-xs"
            style={{
              backgroundColor: 'rgba(128, 128, 128, 0.15)',
              color: 'var(--mc-text-secondary)',
              opacity: 0.6,
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            Esc
          </span>
        </div>

        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto py-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {results.length === 0 && query.trim() && (
            <div
              className="px-4 py-8 text-center"
              style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '13px' }}
            >
              {t.quickOpen.noMatchFound}
            </div>
          )}

          {results.length === 0 && !query.trim() && searchHistory.length > 0 && (
            <div className="px-2">
              <div
                className="px-2 py-1.5 text-xs font-medium"
                style={{ color: 'var(--mc-text-secondary)', opacity: 0.4 }}
              >
                {t.quickOpen.recentSearches}
              </div>
              {searchHistory.slice(0, 5).map((h, i) => (
                <div
                  key={i}
                  className="px-2 py-1.5 rounded cursor-pointer flex items-center gap-2"
                  style={{ color: 'var(--mc-text-secondary)', fontSize: '13px' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => setQuery(h)}
                >
                  <span style={{ opacity: 0.4, fontSize: '11px' }}>🕐</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}

          {!query.trim() && results.length > 0 && (
            <div
              className="px-4 py-1.5 text-xs font-medium"
              style={{ color: 'var(--mc-text-secondary)', opacity: 0.4 }}
            >
              {t.quickOpen.recentOpen}
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={result.item.id}
              className="px-3 py-2 cursor-pointer flex items-center gap-2 mx-1 rounded"
              style={{
                backgroundColor: index === selectedIndex ? 'var(--mc-accent-soft)' : 'transparent',
                color: 'var(--mc-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)';
                }
                setSelectedIndex(index);
              }}
              onMouseLeave={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              onClick={() => handleSelect(result.item.id)}
            >
              <span className="flex-shrink-0 text-sm">
                {isFileOpen(result.item.id) ? '📝' : '📄'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: index === selectedIndex ? 'var(--mc-text-primary)' : 'var(--mc-text-secondary)' }}>
                  {result.matches.length > 0
                    ? highlightMatch(result.item.name, result.matches)
                    : result.item.name}
                </div>
                <div
                  className="text-xs truncate"
                  style={{ opacity: 0.4, marginTop: '1px' }}
                >
                  {result.item.path}
                </div>
              </div>
              {isFileOpen(result.item.id) && (
                <span
                  className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--mc-accent-soft)',
                    color: 'var(--link-color)',
                    fontSize: '10px',
                  }}
                >
                  {t.quickOpen.opened}
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between px-3 py-2 border-t text-xs"
          style={{
            borderColor: 'var(--mc-border-subtle)',
            color: 'var(--mc-text-secondary)',
            opacity: 0.4,
          }}
        >
          <div className="flex items-center gap-3">
            <span>{t.quickOpen.navigate}</span>
            <span>{t.quickOpen.open}</span>
            <span>{t.quickOpen.escClose}</span>
          </div>
          <span>{allFiles.length} {t.quickOpen.fileCount}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickOpen;

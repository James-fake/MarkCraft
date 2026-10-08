import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { platform } from '@platform';
import { useFileManager } from '../../stores/FileStore';
import { useLanguage } from '../../stores/LanguageStore';
import { useTagIndex } from '../../stores/TagIndexStore';
import { useGlobalSearch, GlobalSearchResult, GlobalSearchMatch, SearchFilters } from './useGlobalSearch';
import { AuroraSelect } from '@components/ui/AuroraSelect';
// —— P4-4 拆分：头部工具/纯函数下沉 searchUtils，diff 预览视图为哑组件 ——
import { collectFolders, findFile, getTimeRange, buildExportContent, MAX_VISIBLE_MATCHES, CONTEXT_CHARS, TIME_PRESETS } from './searchUtils';
import type { ReplaceDiffPreview } from './searchUtils';
import { ReplacePreview } from './ReplacePreview';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const { rootFolder, openFile, updateFileContent, getActiveFileId } = useFileManager();
  const { t } = useLanguage();
  const { getAllTags } = useTagIndex();
  const { search, replaceAll, replaceOne, replaceAllInFile } = useGlobalSearch();

  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  /** C1: 布尔查询模式（AND / OR / NOT），与正则模式互斥 */
  const [booleanMode, setBooleanMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 过滤器状态
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timePreset, setTimePreset] = useState('all');

  // 替换撤销
  const [undoSnapshot, setUndoSnapshot] = useState<{ fileId: string; oldContent: string }[] | null>(null);

  // P1.2 任务1: 单条替换内联输入状态
  const [editingMatchKey, setEditingMatchKey] = useState<string | null>(null);
  const [inlineReplacement, setInlineReplacement] = useState('');

  // P1.2 任务3: 全部替换 diff 预览
  const [diffPreview, setDiffPreview] = useState<ReplaceDiffPreview | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const folders = useMemo(() => collectFolders(rootFolder), [rootFolder]);
  const allTags = useMemo(() => getAllTags(), [getAllTags]);

  // 时间预设标签本地化（TIME_PRESETS 的 id 为逻辑键，label 随语言切换）
  const TIME_LABELS: Record<string, string> = {
    all: t.globalSearch.timeAll,
    today: t.globalSearch.timeToday,
    week: t.globalSearch.timeWeek,
    month: t.globalSearch.timeMonth,
    year: t.globalSearch.timeYear,
  };

  const filters: SearchFilters = useMemo(() => {
    const { start, end } = getTimeRange(timePreset);
    return {
      folderIds: folderIds.length > 0 ? folderIds : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      startTime: start || undefined,
      endTime: end || undefined,
    };
  }, [folderIds, selectedTags, timePreset]);

  const results = useMemo(() => {
    if (!query.trim()) return [] as GlobalSearchResult[];
    return search(rootFolder, query, { caseSensitive, regex: useRegex, wholeWord, booleanQuery: booleanMode, filters });
  }, [query, rootFolder, caseSensitive, useRegex, wholeWord, booleanMode, filters, search]);

  const totalMatches = useMemo(() =>
    results.reduce((sum, f) => sum + f.matches.length, 0),
    [results]
  );

  const flatItems = useMemo(() => {
    const items: { fileId: string; match: GlobalSearchMatch; fileName: string; filePath: string }[] = [];
    for (const result of results) {
      for (const match of result.matches) {
        items.push({ fileId: result.fileId, match, fileName: result.fileName, filePath: result.filePath });
      }
    }
    return items;
  }, [results]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setReplacement('');
      setSelectedIndex(0);
      setCaseSensitive(false);
      setRegex(false);
      setWholeWord(false);
      setShowReplace(false);
      setShowFilters(false);
      setFolderIds([]);
      setSelectedTags([]);
      setTimePreset('all');
      setUndoSnapshot(null);
      setEditingMatchKey(null);
      setInlineReplacement('');
      setDiffPreview(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape 关闭：**window 级**监听，不依赖浮层内焦点。
  // 原因（E2E 报告 L-3）：原先只有容器上的 React onKeyDown，而输入框自动聚焦是
  // `setTimeout(..., 50)` 延迟执行的 —— 这 50ms 窗口内按 Escape，事件目标不在浮层内，
  // 组件内 onKeyDown 收不到，Escape 会穿透到编辑器、浮层关不掉。
  // 提升为 window 级后，无论焦点在哪都能关闭（与其它浮层的做法一致）。
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, caseSensitive, useRegex, wholeWord, booleanMode, filters]);

  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((fileId: string) => {
    openFile(fileId);
    onClose();
  }, [openFile, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelect(flatItems[selectedIndex].fileId);
        }
        break;
      // Escape 不在此处理：已提升为 window 级监听（见上方 effect），
      // 以免依赖「事件目标落在浮层内」而在自动聚焦完成前失效。
    }
  }, [flatItems, selectedIndex, handleSelect]);

  // P1.2: 全局替换 —— 先显示 diff 预览，用户确认后再执行
  const handleReplaceAll = useCallback(() => {
    if (!query.trim()) return;
    const modified = replaceAll(rootFolder, query, replacement, { caseSensitive, regex: useRegex, wholeWord, filters });
    if (modified.length === 0) return;

    // 构建预览数据：保存待应用的修改，并计算逐行 diff
    const modifications = modified.map(m => {
      const file = findFile(rootFolder, m.fileId);
      return { fileId: m.fileId, fileName: file?.name ?? '', oldContent: file?.content ?? '', newContent: m.newContent };
    });

    const diffs: { fileName: string; line: number; oldLine: string; newLine: string }[] = [];
    const MAX_DIFF_LINES = 200;
    for (const mod of modifications) {
      if (diffs.length >= MAX_DIFF_LINES) break;
      const oldLines = mod.oldContent.split('\n');
      const newLines = mod.newContent.split('\n');
      const maxLen = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (diffs.length >= MAX_DIFF_LINES) break;
        const ol = oldLines[i] ?? '';
        const nl = newLines[i] ?? '';
        if (ol !== nl) {
          diffs.push({ fileName: mod.fileName, line: i + 1, oldLine: ol, newLine: nl });
        }
      }
    }
    setDiffPreview({ modifications, diffs });
  }, [query, replacement, rootFolder, caseSensitive, useRegex, wholeWord, filters, replaceAll]);

  // P1.2 任务3: 确认全部替换
  const handleConfirmReplace = useCallback(() => {
    if (!diffPreview) return;
    const snapshot = diffPreview.modifications.map(m => ({ fileId: m.fileId, oldContent: m.oldContent }));
    setUndoSnapshot(snapshot);
    for (const m of diffPreview.modifications) {
      updateFileContent(m.fileId, m.newContent);
    }
    setDiffPreview(null);
    setTimeout(() => setUndoSnapshot(null), 5000);
  }, [diffPreview, updateFileContent]);

  // P1.2 任务3: 取消全部替换
  const handleCancelReplace = useCallback(() => {
    setDiffPreview(null);
  }, []);

  // P1.2 任务1: 单条替换
  const handleReplaceOne = useCallback((fileId: string, match: GlobalSearchMatch) => {
    const result = replaceOne(rootFolder, fileId, match, inlineReplacement);
    if (result) {
      const file = findFile(rootFolder, fileId);
      setUndoSnapshot([{ fileId: result.fileId, oldContent: file?.content ?? '' }]);
      updateFileContent(result.fileId, result.newContent);
      setTimeout(() => setUndoSnapshot(null), 5000);
    }
    setEditingMatchKey(null);
    setInlineReplacement('');
  }, [rootFolder, inlineReplacement, replaceOne, updateFileContent]);

  // P1.2 任务2: 仅替换当前活动文件
  const handleReplaceAllInFile = useCallback(() => {
    const activeFileId = getActiveFileId();
    if (!activeFileId || !query.trim()) return;
    const result = replaceAllInFile(rootFolder, activeFileId, query, replacement, { caseSensitive, regex: useRegex, wholeWord });
    if (!result) return;
    const file = findFile(rootFolder, activeFileId);
    setUndoSnapshot([{ fileId: activeFileId, oldContent: file?.content ?? '' }]);
    updateFileContent(result.fileId, result.newContent);
    setTimeout(() => setUndoSnapshot(null), 5000);
  }, [getActiveFileId, query, replacement, rootFolder, caseSensitive, useRegex, wholeWord, replaceAllInFile, updateFileContent]);

  const handleUndo = useCallback(() => {
    if (!undoSnapshot) return;
    for (const s of undoSnapshot) {
      updateFileContent(s.fileId, s.oldContent);
    }
    setUndoSnapshot(null);
  }, [undoSnapshot, updateFileContent]);

  // P1.2: 导出搜索结果（内容构建纯函数见 searchUtils#buildExportContent；此处只负责 Blob 下载）
  const handleExport = useCallback((format: 'md' | 'csv' | 'json') => {
    const content = buildExportContent(format, { query, results, totalMatches }, t.globalSearch);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    void platform.saveBlob(blob, `search-${timestamp}.${format}`).catch(() => {});
  }, [query, results, totalMatches, t]);

  const highlightMatch = (text: string, start: number, end: number) => {
    const before = text.substring(0, start);
    const match = text.substring(start, end);
    const after = text.substring(end);

    let truncatedBefore = before;
    if (before.length > CONTEXT_CHARS) {
      truncatedBefore = '...' + before.substring(before.length - CONTEXT_CHARS);
    }

    let truncatedAfter = after;
    if (after.length > CONTEXT_CHARS) {
      truncatedAfter = after.substring(0, CONTEXT_CHARS) + '...';
    }

    return (
      <>
        <span style={{ opacity: 0.5 }}>{truncatedBefore}</span>
        <span style={{ color: 'var(--link-color)', fontWeight: 600, backgroundColor: 'var(--mc-accent-soft)', borderRadius: '2px', padding: '0 1px' }}>
          {match}
        </span>
        <span style={{ opacity: 0.5 }}>{truncatedAfter}</span>
      </>
    );
  };

  if (!isOpen) return null;

  const toggleBtnBase = {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    lineHeight: 1,
    fontFamily: 'monospace',
  };

  const hasActiveFilters = folderIds.length > 0 || selectedTags.length > 0 || timePreset !== 'all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'fadeIn 0.1s ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{
          maxWidth: '640px',
          maxHeight: '75vh',
          backgroundColor: 'var(--mc-bg-panel)',
          border: '1px solid var(--mc-border-subtle)',
          animation: 'scaleIn 0.12s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center px-3 border-b flex-shrink-0 gap-1" style={{ borderColor: 'var(--mc-border-subtle)' }}>
          <span style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '14px', marginRight: '4px' }}>
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={booleanMode ? t.globalSearch.booleanPlaceholder : t.globalSearch.searchPlaceholder}
            className="flex-1 py-3 bg-transparent outline-none quick-open-input"
            style={{ color: 'var(--mc-text-primary)', fontSize: '14px', border: 'none' }}
          />
          <button
            onClick={() => { if (!booleanMode) setShowReplace(!showReplace); }}
            disabled={booleanMode}
            title={booleanMode ? t.globalSearch.replaceDisabledInBoolean : t.globalSearch.replaceMode}
            style={{
              ...toggleBtnBase,
              border: `1px solid ${showReplace ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
              backgroundColor: showReplace ? 'var(--mc-accent-soft)' : 'transparent',
              color: showReplace ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
              opacity: booleanMode ? 0.3 : (showReplace ? 1 : 0.6),
              cursor: booleanMode ? 'not-allowed' : 'pointer',
            }}
          >⟳</button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            title={t.globalSearch.filter}
            style={{
              ...toggleBtnBase,
              border: `1px solid ${showFilters || hasActiveFilters ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
              backgroundColor: showFilters || hasActiveFilters ? 'var(--mc-accent-soft)' : 'transparent',
              color: showFilters || hasActiveFilters ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
              opacity: showFilters || hasActiveFilters ? 1 : 0.6,
            }}
          >⚙</button>
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            title={caseSensitive ? t.globalSearch.caseSensitiveOn : t.globalSearch.caseSensitiveOff}
            style={{
              ...toggleBtnBase,
              border: `1px solid ${caseSensitive ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
              backgroundColor: caseSensitive ? 'var(--mc-accent-soft)' : 'transparent',
              color: caseSensitive ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
              opacity: caseSensitive ? 1 : 0.6,
            }}
          >Aa</button>
          <button
            onClick={() => setWholeWord(!wholeWord)}
            title={wholeWord ? t.globalSearch.wholeWordOn : t.globalSearch.wholeWordOff}
            style={{
              ...toggleBtnBase,
              border: `1px solid ${wholeWord ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
              backgroundColor: wholeWord ? 'var(--mc-accent-soft)' : 'transparent',
              color: wholeWord ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
              opacity: wholeWord ? 1 : 0.6,
            }}
          >\b</button>
          <button
            onClick={() => {
              const next = !useRegex;
              setRegex(next);
              // 正则与布尔模式互斥
              if (next) setBooleanMode(false);
            }}
            title={useRegex ? t.globalSearch.regexOn : t.globalSearch.regexOff}
            style={{
              ...toggleBtnBase,
              border: `1px solid ${useRegex ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
              backgroundColor: useRegex ? 'var(--mc-accent-soft)' : 'transparent',
              color: useRegex ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
              opacity: useRegex ? 1 : 0.6,
            }}
          >.*</button>
          <button
            onClick={() => {
              const next = !booleanMode;
              setBooleanMode(next);
              // 布尔与正则模式互斥；布尔模式下关闭替换面板（替换仍走字面量查询）
              if (next) { setRegex(false); setShowReplace(false); }
            }}
            title={booleanMode ? t.globalSearch.booleanOn : t.globalSearch.booleanOff}
            style={{
              ...toggleBtnBase,
              border: `1px solid ${booleanMode ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
              backgroundColor: booleanMode ? 'var(--mc-accent-soft)' : 'transparent',
              color: booleanMode ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
              opacity: booleanMode ? 1 : 0.6,
            }}
          >&amp;&amp;</button>
          {query.trim() && (
            <span
              className="px-2 py-0.5 rounded text-xs flex-shrink-0"
              style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)', color: 'var(--mc-text-secondary)', opacity: 0.6, fontSize: '11px' }}
            >
              {totalMatches} {t.globalSearch.matchesCount}
            </span>
          )}
          <span
            className="px-1.5 py-0.5 rounded text-xs ml-1 flex-shrink-0"
            style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)', color: 'var(--mc-text-secondary)', opacity: 0.6, fontSize: '11px', fontFamily: 'monospace' }}
          >
            Esc
          </span>
        </div>

        {/* Replace bar */}
        {showReplace && (
          <div className="flex items-center px-3 py-2 border-b flex-shrink-0 gap-2" style={{ borderColor: 'var(--mc-border-subtle)' }}>
            <span style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '12px' }}>→</span>
            <input
              type="text"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder={t.globalSearch.replacePlaceholder}
              className="flex-1 bg-transparent outline-none"
              style={{ color: 'var(--mc-text-primary)', fontSize: '13px', border: 'none' }}
            />
            <button
              onClick={handleReplaceAll}
              disabled={!query.trim()}
              style={{
                padding: '4px 10px', borderRadius: 4, fontSize: '11px', cursor: query.trim() ? 'pointer' : 'not-allowed',
                border: '1px solid var(--button-primary)',
                backgroundColor: 'var(--button-primary)', color: '#fff',
                opacity: query.trim() ? 1 : 0.4,
              }}
            >{t.globalSearch.replaceAll}</button>
            <button
              onClick={handleReplaceAllInFile}
              disabled={!query.trim() || !getActiveFileId()}
              title={getActiveFileId() ? t.globalSearch.replaceCurrentFileTitle : t.globalSearch.noOpenFile}
              style={{
                padding: '4px 10px', borderRadius: 4, fontSize: '11px',
                cursor: (query.trim() && getActiveFileId()) ? 'pointer' : 'not-allowed',
                border: '1px solid var(--mc-border-subtle)',
                backgroundColor: 'transparent', color: 'var(--mc-text-secondary)',
                opacity: (query.trim() && getActiveFileId()) ? 0.85 : 0.4,
              }}
            >{t.globalSearch.replaceCurrentFile}</button>
            {undoSnapshot && (
              <button
                onClick={handleUndo}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: '11px', cursor: 'pointer',
                  border: '1px solid #e55', backgroundColor: 'transparent', color: '#e55',
                }}
              >{t.globalSearch.undo}</button>
            )}
          </div>
        )}

        {/* Filters bar */}
        {showFilters && (
          <div className="flex flex-col px-3 py-2 border-b flex-shrink-0 gap-2" style={{ borderColor: 'var(--mc-border-subtle)', backgroundColor: 'rgba(128,128,128,0.05)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Path filter */}
              <select
                multiple
                value={folderIds}
                onChange={(e) => setFolderIds(Array.from(e.target.selectedOptions).map(o => o.value))}
                size={1}
                style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--mc-border-subtle)', backgroundColor: 'var(--mc-bg-panel)', color: 'var(--mc-text-primary)', maxWidth: 160 }}
              >
                <option value="">{t.globalSearch.pathAll}</option>
                {folders.map(f => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
              </select>

              {/* Tag filter */}
              <select
                multiple
                value={selectedTags}
                onChange={(e) => setSelectedTags(Array.from(e.target.selectedOptions).map(o => o.value))}
                size={1}
                style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--mc-border-subtle)', backgroundColor: 'var(--mc-bg-panel)', color: 'var(--mc-text-primary)', maxWidth: 140 }}
              >
                <option value="">{t.globalSearch.tagAll}</option>
                {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
              </select>

              {/* Time filter */}
              <AuroraSelect
                value={timePreset}
                onChange={(v) => setTimePreset(v)}
                options={TIME_PRESETS.map(tp => ({ value: tp.id, label: `📅 ${TIME_LABELS[tp.id] ?? tp.label}` }))}
              />

              {hasActiveFilters && (
                <button
                  onClick={() => { setFolderIds([]); setSelectedTags([]); setTimePreset('all') }}
                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--mc-border-subtle)', background: 'transparent', color: 'var(--mc-text-secondary)', cursor: 'pointer' }}
                >{t.globalSearch.clear}</button>
              )}
            </div>
          </div>
        )}

        {/* P1.2 任务3: 替换预览（diff 视图） */}
        {diffPreview && (
          <ReplacePreview
            preview={diffPreview}
            onConfirm={handleConfirmReplace}
            onCancel={handleCancelReplace}
          />
        )}

        {/* Results */}
        {diffPreview ? null : (
        <div
          ref={listRef}
          className="overflow-y-auto py-1 flex-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center" style={{ color: 'var(--mc-text-secondary)', opacity: 0.5, fontSize: '13px' }}>
              {t.globalSearch.noMatchFound}
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-8 text-center" style={{ color: 'var(--mc-text-secondary)', opacity: 0.4, fontSize: '13px' }}>
              {t.globalSearch.searchHint}
            </div>
          )}

          {results.map((result) => (
            <div key={result.fileId}>
              <div
                className="px-3 py-1.5 flex items-center gap-2"
                style={{ borderTop: '1px solid var(--mc-border-subtle)' }}
              >
                <span className="text-xs">📄</span>
                <span style={{ color: 'var(--mc-text-primary)', fontSize: '12px', fontWeight: 600 }}>
                  {result.fileName}
                </span>
                <span style={{ color: 'var(--mc-text-secondary)', opacity: 0.4, fontSize: '11px' }}>
                  {result.filePath}
                </span>
                <span
                  className="ml-auto px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                  style={{ backgroundColor: 'var(--mc-accent-soft)', color: 'var(--link-color)', fontSize: '10px' }}
                >
                  {result.matches.length} {t.globalSearch.matchCount}
                </span>
              </div>

              {result.matches.slice(0, MAX_VISIBLE_MATCHES).map((match) => {
                const flatIdx = flatItems.findIndex(
                  f => f.fileId === result.fileId && f.match.line === match.line && f.match.highlightStart === match.highlightStart
                );

                const matchKey = `${result.fileId}-${match.line}-${match.highlightStart}`;
                const isEditing = editingMatchKey === matchKey;

                return (
                  <div
                    key={matchKey}
                    className="px-3 py-1.5 cursor-pointer mx-1 rounded"
                    style={{
                      backgroundColor: isEditing ? 'var(--mc-accent-soft)' : (flatIdx === selectedIndex ? 'var(--mc-accent-soft)' : 'transparent'),
                      paddingLeft: `${24 + 12}px`,
                    }}
                    onMouseEnter={() => setSelectedIndex(flatIdx)}
                    onClick={() => !isEditing && handleSelect(result.fileId)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="flex-shrink-0 text-xs mt-0.5"
                        style={{ color: 'var(--mc-text-secondary)', opacity: 0.4, fontFamily: 'monospace', minWidth: '24px', textAlign: 'right' }}
                      >
                        {match.line}
                      </span>
                      <span
                        className="text-xs flex-1"
                        style={{ color: 'var(--mc-text-secondary)', lineHeight: '1.5', wordBreak: 'break-all' }}
                      >
                        {highlightMatch(match.text, match.highlightStart, match.highlightEnd)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) {
                            setEditingMatchKey(null);
                          } else {
                            setEditingMatchKey(matchKey);
                            setInlineReplacement(replacement);
                          }
                        }}
                        title={t.globalSearch.replaceThis}
                        style={{
                          ...toggleBtnBase,
                          flexShrink: 0,
                          border: `1px solid ${isEditing ? 'var(--button-primary)' : 'var(--mc-border-subtle)'}`,
                          backgroundColor: isEditing ? 'var(--mc-accent-soft)' : 'transparent',
                          color: isEditing ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
                          opacity: isEditing ? 1 : 0.6,
                        }}
                      >{t.globalSearch.replace}</button>
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={inlineReplacement}
                          onChange={(e) => setInlineReplacement(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleReplaceOne(result.fileId, match);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingMatchKey(null);
                            }
                          }}
                          autoFocus
                          placeholder={t.globalSearch.inputReplaceText}
                          className="flex-1 outline-none"
                          style={{
                            color: 'var(--mc-text-primary)', fontSize: '12px', fontFamily: 'monospace',
                            border: '1px solid var(--button-primary)', borderRadius: 4, padding: '3px 8px',
                            backgroundColor: 'var(--mc-bg-panel)',
                          }}
                        />
                        <button
                          onClick={() => handleReplaceOne(result.fileId, match)}
                          style={{
                            padding: '3px 10px', borderRadius: 4, fontSize: '11px', cursor: 'pointer',
                            border: '1px solid var(--button-primary)',
                            backgroundColor: 'var(--button-primary)', color: '#fff',
                          }}
                        >{t.globalSearch.replace}</button>
                        <button
                          onClick={() => { setEditingMatchKey(null); setInlineReplacement(''); }}
                          style={{
                            padding: '3px 10px', borderRadius: 4, fontSize: '11px', cursor: 'pointer',
                            border: '1px solid var(--mc-border-subtle)',
                            backgroundColor: 'transparent', color: 'var(--mc-text-secondary)',
                          }}
                        >{t.globalSearch.cancel}</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {result.matches.length > MAX_VISIBLE_MATCHES && (
                <div style={{ padding: '2px 24px', fontSize: 11, color: 'var(--mc-text-secondary)', opacity: 0.4 }}>
                  {t.globalSearch.moreMatches.replace('{n}', String(result.matches.length - MAX_VISIBLE_MATCHES))}
                </div>
              )}
            </div>
          ))}
        </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2 border-t text-xs flex-shrink-0"
          style={{ borderColor: 'var(--mc-border-subtle)', color: 'var(--mc-text-secondary)', opacity: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <span>{t.globalSearch.navigate}</span>
            <span>{t.globalSearch.openFile}</span>
            <span>{t.globalSearch.escClose}</span>
          </div>
          <div className="flex items-center gap-2">
            {totalMatches > 0 && (
              <div className="flex items-center gap-1">
                <button onClick={() => handleExport('md')} style={{ border: 'none', background: 'transparent', color: 'var(--mc-text-secondary)', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}>MD</button>
                <button onClick={() => handleExport('csv')} style={{ border: 'none', background: 'transparent', color: 'var(--mc-text-secondary)', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}>CSV</button>
                <button onClick={() => handleExport('json')} style={{ border: 'none', background: 'transparent', color: 'var(--mc-text-secondary)', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}>JSON</button>
                <span style={{ opacity: 0.3 }}>|</span>
              </div>
            )}
            <span>{totalMatches} {t.globalSearch.matchesCount} / {results.length} {t.globalSearch.fileCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;

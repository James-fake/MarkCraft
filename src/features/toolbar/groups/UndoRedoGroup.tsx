import type { Translations } from '@src/types/translations'
import { ToolbarButton } from './shared'
import { getShortcut } from '../ShortcutManager'

function formatShortcut(key: string): string {
  return key
    .replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
}

interface UndoRedoGroupProps {
  t: Translations
  canUndo: boolean
  canRedo: boolean
  onUndo?: () => void
  onRedo?: () => void
}

export default function UndoRedoGroup({ t, canUndo, canRedo, onUndo, onRedo }: UndoRedoGroupProps) {

  return (
    <>
      <ToolbarButton
        onClick={onUndo}
        title={`${t.toolbar.undo} (${formatShortcut(getShortcut('edit.undo'))})`}
        ariaLabel={t.toolbarAria.undo}
        disabled={!canUndo || !onUndo}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={onRedo}
        title={`${t.toolbar.redo} (${formatShortcut(getShortcut('edit.redo'))})`}
        ariaLabel={t.toolbarAria.redo}
        disabled={!canRedo || !onRedo}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
        </svg>
      </ToolbarButton>
    </>
  )
}

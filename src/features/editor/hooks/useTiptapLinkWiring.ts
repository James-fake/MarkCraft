import { useEffect } from 'react'
import type { Editor as TiptapEditorType } from '@tiptap/react'
import { setWikiLinkClickHandler, setBrokenLinkClickHandler } from '../extensions/WikiLink'
import { setBlockReferenceClickHandler } from '../extensions/BlockReference'

/**
 * WikiLink / 块引用的点击导航接线（P5-1 自 TiptapEditor.tsx 的 4 个 effect 拆出，逻辑逐字未动）：
 * 1. Ctrl+Click WikiLink → 反链索引模糊解析并打开目标文件
 * 2. Ctrl+Click 失效链接 → 外部注入的 onBrokenLinkClick
 * 3. Ctrl+Click 块引用 → 经 bridge 解析块来源并打开
 * 4. 反链索引变化 → 全文扫描同步 wikiLink mark 的 broken/fuzzy/backlinkCount 属性
 */
export function useTiptapLinkWiring(
  editor: TiptapEditorType | null,
  linkIndex: ReturnType<typeof import('../../../stores/LinkIndexStore').useLinkIndex>,
  openFile: (fileId: string) => void,
  onBrokenLinkClick?: (target: string, event: MouseEvent) => void,
) {
  // Register WikiLink click handler for Ctrl+Click navigation
  useEffect(() => {
    const handler = (target: string, _event: MouseEvent) => {
      const result = linkIndex.resolveTargetFuzzy(target)
      if (result) {
        openFile(result.fileId)
      }
    }
    setWikiLinkClickHandler(handler)
    return () => setWikiLinkClickHandler(null)
  }, [linkIndex, openFile])

  // Register broken link click handler for Ctrl+Click on broken WikiLinks
  useEffect(() => {
    if (onBrokenLinkClick) {
      setBrokenLinkClickHandler(onBrokenLinkClick)
    } else {
      setBrokenLinkClickHandler(null)
    }
    return () => setBrokenLinkClickHandler(null)
  }, [onBrokenLinkClick])

  // Register block reference click handler: navigate to block source
  useEffect(() => {
    const handler = (blockId: string, _event: MouseEvent) => {
      // Resolve block via bridge and open source file
      import('../../../services/blockReferenceBridge').then(({ resolveBlock, triggerBlockClick }) => {
        const block = resolveBlock(blockId)
        if (block) {
          openFile(block.fileId)
        } else {
          // Fallback: trigger generic click handler
          triggerBlockClick(blockId)
        }
      })
    }
    setBlockReferenceClickHandler(handler)
    return () => setBlockReferenceClickHandler(null)
  }, [openFile])

  // Update WikiLink mark attributes (broken/fuzzy/backlinkCount) when the link index changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const { state, view } = editor
    const { tr } = state
    let modified = false

    state.doc.descendants((node, pos) => {
      const wikiLinkMark = node.marks?.find(m => m.type.name === 'wikiLink')
      if (wikiLinkMark) {
        const target = wikiLinkMark.attrs.target as string
        const result = linkIndex.resolveTargetFuzzy(target)
        const isBroken = !result
        const isFuzzy = result?.fuzzy ?? false
        const backlinkCount = result ? linkIndex.getBacklinks(result.fileId).length : 0

        if (wikiLinkMark.attrs.broken !== isBroken || wikiLinkMark.attrs.fuzzy !== isFuzzy || wikiLinkMark.attrs.backlinkCount !== backlinkCount) {
          const newMark = wikiLinkMark.type.create({
            ...wikiLinkMark.attrs,
            broken: isBroken,
            fuzzy: isFuzzy,
            backlinkCount,
          })
          tr.removeMark(pos, pos + node.nodeSize, wikiLinkMark.type)
          tr.addMark(pos, pos + node.nodeSize, newMark)
          modified = true
        }
      }
    })

    if (modified && !editor.isDestroyed) {
      view.dispatch(tr)
    }
  }, [editor, linkIndex.indexVersion, linkIndex.resolveTargetFuzzy, linkIndex])
}

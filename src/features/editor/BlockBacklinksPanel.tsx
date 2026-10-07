import React, { useState, useMemo } from 'react'
import { useBlockIndex } from '../../stores/BlockIndexStore'

interface BlockBacklinksPanelProps {
  fileId?: string
  onOpenFile?: (fileId: string) => void
}

/** P1.1 块反链面板：显示当前文件中所有块的引用情况 */
const BlockBacklinksPanel: React.FC<BlockBacklinksPanelProps> = ({ fileId, onOpenFile }) => {
  const { blockMap, blockBacklinks, getFileBlockRefs } = useBlockIndex()
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())

  // 当前文件包含的块（按 blockId 过滤）
  const fileBlocks = useMemo(() => {
    if (!fileId) return []
    const blocks: { blockId: string; text: string; lineStart: number }[] = []
    for (const [id, info] of blockMap) {
      if (info.fileId === fileId) {
        blocks.push({ blockId: id, text: info.text, lineStart: info.lineStart })
      }
    }
    return blocks.sort((a, b) => a.lineStart - b.lineStart)
  }, [blockMap, fileId])

  // 当前文件对外引用的块
  const outgoingRefs = useMemo(() => {
    if (!fileId) return []
    return getFileBlockRefs(fileId)
  }, [fileId, getFileBlockRefs])

  const toggleExpand = (blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }

  if (!fileId) {
    return (
      <div style={{ padding: '16px', fontSize: 13, color: 'var(--editor-text)', opacity: 0.5 }}>
        请先打开一个文件
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
      {/* 当前文件的块及其反链 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--editor-text)', marginBottom: 8, opacity: 0.7 }}>
          块反链（{fileBlocks.length} 个块）
        </div>
        {fileBlocks.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--editor-text)', opacity: 0.4, padding: '8px 0' }}>
            当前文件没有标记块 ID。在段落末尾添加 <code style={{ background: 'var(--editor-border)', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>^block-id</code> 即可被引用。
          </div>
        )}
        {fileBlocks.map(block => {
          const backlinks = blockBacklinks.get(block.blockId) ?? []
          const expanded = expandedBlocks.has(block.blockId)
          return (
            <div key={block.blockId} style={{
              border: '1px solid var(--editor-border)',
              borderRadius: 6,
              marginBottom: 8,
              overflow: 'hidden',
            }}>
              <div
                onClick={() => toggleExpand(block.blockId)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: expanded ? 'var(--editor-border)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--button-primary)', fontFamily: 'monospace' }}>
                  ^{block.blockId}
                </span>
                <span style={{ fontSize: 12, color: 'var(--editor-text)', opacity: 0.7, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {block.text.split('\n')[0]}
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 8,
                  backgroundColor: backlinks.length > 0 ? 'var(--mc-accent-soft)' : 'transparent',
                  color: backlinks.length > 0 ? 'var(--button-primary)' : 'var(--editor-text)',
                  opacity: backlinks.length > 0 ? 1 : 0.4,
                }}>
                  {backlinks.length} 反链
                </span>
              </div>
              {expanded && (
                <div style={{ padding: '8px 10px', borderTop: '1px solid var(--editor-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.5, marginBottom: 6 }}>
                    块内容：
                  </div>
                  <pre style={{ fontSize: 11, color: 'var(--editor-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0 0 8px 0', fontFamily: 'inherit' }}>
                    {block.text}
                  </pre>
                  {backlinks.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.5, marginBottom: 6, marginTop: 8 }}>
                        被以下文件引用：
                      </div>
                      {backlinks.map((bl, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 6px', borderRadius: 4, marginBottom: 4,
                          backgroundColor: 'var(--mc-bg-panel)',
                          cursor: 'pointer',
                        }} onClick={() => onOpenFile?.(bl.sourceFileId)}>
                          <span style={{ fontSize: 11 }}>📄</span>
                          <span style={{ fontSize: 11, color: 'var(--editor-text)', flex: 1 }}>
                            {bl.sourceFileName}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--editor-text)', opacity: 0.4 }}>
                            L{bl.line}
                          </span>
                          {bl.alias && (
                            <span style={{ fontSize: 10, color: 'var(--button-primary)' }}>
                              "{bl.alias}"
                            </span>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 当前文件引用的外部块 */}
      {outgoingRefs.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--editor-text)', marginBottom: 8, opacity: 0.7 }}>
            引用的块（{outgoingRefs.length}）
          </div>
          {outgoingRefs.map((ref, idx) => {
            const targetBlock = blockMap.get(ref.targetBlockId)
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 4, marginBottom: 4,
                border: '1px solid var(--editor-border)',
                cursor: targetBlock ? 'pointer' : 'default',
              }} onClick={() => targetBlock && onOpenFile?.(targetBlock.fileId)}>
                <span style={{ fontSize: 11 }}>{ref.type === 'embed' ? '📥' : '🔗'}</span>
                <span style={{ fontSize: 11, color: 'var(--button-primary)', fontFamily: 'monospace' }}>
                  ^{ref.targetBlockId}
                </span>
                {targetBlock ? (
                  <span style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.7, flex: 1 }}>
                    {targetBlock.fileName} · L{targetBlock.lineStart}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#e55', flex: 1 }}>断链</span>
                )}
                {ref.alias && (
                  <span style={{ fontSize: 10, color: 'var(--button-primary)' }}>"{ref.alias}"</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BlockBacklinksPanel

/**
 * 知识库 AI 问答面板
 * 全屏覆盖式对话框，支持基于知识库文件的问答
 */
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { FileNode } from '@src/types/fileManager'
import { useLanguage } from '@stores/LanguageStore'
import { getKbOverlayRoot } from './kbOverlayRoot'
import { askKb } from '../ai/kbChat'
import { KB_COLORS } from '../kbTheme'
import { IconChat, IconClose } from './KbIcons'

interface KbChatPanelProps {
  kbId: string
  files: FileNode[]
  /** dialog（默认）：全屏遮罩弹窗；page（Aurora 使用优化④）：填充 tab 内容区的独立页面，无遮罩/无关闭按钮 */
  variant?: 'dialog' | 'page'
  onClose?: () => void
}

/** 单条聊天消息 */
interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  sources?: { fileId: string; snippet: string }[]
}

/** 递归收集所有文件节点（扁平化），用于构建文件名映射 */
function collectAllFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push(node)
    }
    if (node.children && node.children.length > 0) {
      result.push(...collectAllFiles(node.children))
    }
  }
  return result
}

const KbChatPanel: React.FC<KbChatPanelProps> = ({ kbId, files, variant = 'dialog', onClose }) => {
  const asPage = variant === 'page'
  const { t } = useLanguage()
  const kc = t.kbChat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 文件 ID -> 文件名 映射，用于显示引用来源
  const fileNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of collectAllFiles(files)) {
      map.set(f.id, f.name)
    }
    return map
  }, [files])

  // 知识库 ID 简短展示（避免过长）
  const shortKbId = kbId.length > 12 ? kbId.slice(0, 12) + '...' : kbId

  // 新消息到达时自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ESC 键关闭面板（仅 dialog 模式传入 onClose；page 模式由 tab 导航离开）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  /** 发送问题并获取 AI 回答 */
  const handleSend = async () => {
    const question = input.trim()
    if (!question || loading) return

    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await askKb(question, files, t.kbChat)
      const aiMessage: ChatMessage = {
        role: 'ai',
        content: result.answer,
        sources: result.sources,
      }
      setMessages(prev => [...prev, aiMessage])
    } catch {
      const errorMessage: ChatMessage = {
        role: 'ai',
        content: kc.error,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  /** 输入框按键处理：Enter 发送，Shift+Enter 换行 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── 内联样式 ───

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: KB_COLORS.mask,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  }

  const cardStyle: React.CSSProperties = {
    maxWidth: 700,
    width: '100%',
    height: '80vh',
    maxHeight: '80vh',
    backgroundColor: KB_COLORS.bg,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: `0 20px 60px ${KB_COLORS.shadow}`,
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${KB_COLORS.border}`,
    background: KB_COLORS.bg,
    color: KB_COLORS.textMain,
  }

  const messagesStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    backgroundColor: KB_COLORS.bgCard,
  }

  const inputAreaStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: 16,
    borderTop: `1px solid ${KB_COLORS.border}`,
    backgroundColor: KB_COLORS.bg,
  }

  const userBubbleStyle: React.CSSProperties = {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 14,
    backgroundColor: KB_COLORS.primary,
    color: KB_COLORS.onPrimary,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }

  const aiBubbleStyle: React.CSSProperties = {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 14,
    backgroundColor: KB_COLORS.bgHover,
    color: KB_COLORS.textMain,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }

  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${KB_COLORS.border}`,
    color: KB_COLORS.textSecondary,
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${KB_COLORS.border}`,
    // 使用优化④b：此前未设背景/文字色，浏览器默认白底 + Aurora 全局白字 → 输入内容不可读
    backgroundColor: KB_COLORS.bgCard,
    color: KB_COLORS.textMain,
    resize: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  }

  const sendButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: loading || !input.trim() ? KB_COLORS.textTertiary : KB_COLORS.primary,
    color: KB_COLORS.onPrimary,
    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 500,
  }

  const sourceTagStyle: React.CSSProperties = {
    fontSize: 12,
    color: KB_COLORS.primary,
    backgroundColor: KB_COLORS.primaryLight,
    padding: '2px 8px',
    borderRadius: 6,
    cursor: 'default',
  }

  // page 模式（使用优化④）：填充 tab 内容区，去掉遮罩/阴影/圆角，由 tab 导航离开
  const card = (
    <div
      style={asPage
        ? { ...cardStyle, width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', borderRadius: 0, boxShadow: 'none' }
        : cardStyle}
      onClick={e => e.stopPropagation()}
    >
        {/* 顶部标题栏 */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 34,
                height: 34,
                borderRadius: 10,
                background: KB_COLORS.bgHover,
                color: KB_COLORS.primary,
              }}
            >
              <IconChat />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{kc.title}</div>
              <div style={{ fontSize: 12, color: KB_COLORS.textTertiary }}>
                {kc.meta.replace('{n}', String(fileNameMap.size)).replace('{id}', shortKbId)}
              </div>
            </div>
          </div>
          {!asPage && onClose && (
            <button style={closeButtonStyle} onClick={onClose} aria-label={kc.close}>
              <IconClose size={16} />
            </button>
          )}
        </div>

        {/* 消息列表区域 */}
        <div style={messagesStyle}>
          {messages.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: KB_COLORS.textTertiary,
                fontSize: 14,
                marginTop: 40,
              }}
            >
              {kc.empty}
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={msg.role === 'user' ? userBubbleStyle : aiBubbleStyle}>
                {msg.content}
              </div>
              {/* 引用来源显示为文件名链接 */}
              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    maxWidth: '75%',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, color: KB_COLORS.textSecondary }}>
                    {kc.sources}
                  </span>
                  {msg.sources.map((src, sIdx) => (
                    <span key={sIdx} style={sourceTagStyle} title={src.snippet}>
                      {fileNameMap.get(src.fileId) ?? src.fileId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {/* 加载状态提示 */}
          {loading && (
            <div style={{ ...aiBubbleStyle, color: KB_COLORS.textSecondary }}>
              {kc.thinking}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 底部输入框 + 发送按钮 */}
        <div style={inputAreaStyle}>
          <textarea
            className="kb-chatpanel-input"
            style={inputStyle}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={kc.placeholder}
            rows={2}
            disabled={loading}
          />
          <button
            style={sendButtonStyle}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {kc.send}
          </button>
        </div>
    </div>
  )

  if (asPage) return card
  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      {card}
    </div>,
    getKbOverlayRoot(),
  )
}

export default KbChatPanel

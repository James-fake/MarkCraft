import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@stores/LanguageStore'
import LinkRedirectDialog from '@features/fileManager/LinkRedirectDialog'

interface BrokenLinkMenuProps {
  /** 断链指向的目标名（不含 .md） */
  target: string
  /** 鼠标位置（视口坐标） */
  x: number
  y: number
  onClose: () => void
  /** 「以这个名字新建笔记」——由上层负责真正建文件并打开 */
  onCreate: (target: string) => void
}

/**
 * 断链（红色 WikiLink）点击后的小菜单。
 *
 * ⚠️ 背景（2026-10-11 优化）：此前断链点击**直接打开 `LinkRedirectDialog`** ——
 *    而那是「笔记改名后批量修链接」的工具（从 A 全库替换成 B）。
 *    它既没有「以这个名字新建笔记」，也没有「改指到某个已有笔记」，
 *    与用户此刻的意图（「我想建这篇笔记」）完全不匹配，而这正是双链最核心的用法：
 *    边写边建 —— 随手 `[[新想法]]`，之后再点进去补内容。
 *
 * 现在改为**上下文菜单**：最常用的「新建」排第一且高亮，「重定向」保留为第二项
 * （仍复用原有对话框，但预填了「从」，用户只需选「改成哪篇」）。
 * 通用入口（命令面板 `tools.linkRedirect` / 菜单栏）不受影响。
 */
export function BrokenLinkMenu({ target, x, y, onClose, onCreate }: BrokenLinkMenuProps) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [redirectOpen, setRedirectOpen] = useState(false)

  // 视口边界修正：必须用**实测尺寸**，估算宽度会让面板偏出屏幕
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const M = 8
    let left = x
    let top = y
    if (left + rect.width > window.innerWidth - M) {
      left = Math.max(M, window.innerWidth - M - rect.width)
    }
    if (top + rect.height > window.innerHeight - M) {
      // 放不下就翻到鼠标上方
      top = Math.max(M, y - rect.height)
    }
    setPos({ left, top })
  }, [x, y])

  // 点击外部 / Esc 关闭（捕获阶段，编辑器阻止冒泡也能生效）
  useEffect(() => {
    // 已切到重定向对话框时不监听 —— 否则点对话框会连带关掉整个流程
    if (redirectOpen) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose, redirectOpen])

  const handleCreate = useCallback(() => {
    onCreate(target)
    onClose()
  }, [onCreate, onClose, target])

  if (redirectOpen) {
    return (
      <LinkRedirectDialog
        visible
        initialFrom={target}
        onClose={() => {
          setRedirectOpen(false)
          onClose()
        }}
      />
    )
  }

  return createPortal(
    <div
      ref={ref}
      className="broken-link-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      aria-label={t.brokenLinkMenu.title.replace('{name}', target)}
    >
      <div className="broken-link-menu__title">
        {t.brokenLinkMenu.title.replace('{name}', target)}
      </div>
      <button
        type="button"
        className="broken-link-menu__item broken-link-menu__item--primary"
        onClick={handleCreate}
      >
        {t.brokenLinkMenu.create.replace('{name}', target)}
      </button>
      <button type="button" className="broken-link-menu__item" onClick={() => setRedirectOpen(true)}>
        {t.brokenLinkMenu.redirect}
      </button>
    </div>,
    document.body,
  )
}

export default BrokenLinkMenu

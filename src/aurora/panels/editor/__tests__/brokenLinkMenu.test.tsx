import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import BrokenLinkMenu from '../BrokenLinkMenu'
import type { FileNode } from '@src/types/fileManager'
import { LanguageProvider } from '@stores/LanguageStore'
import { ModalProvider } from '@stores/ModalStore'
import { UndoRedoProvider } from '@stores/UndoRedoStore'
import { SettingsProvider } from '@stores/SettingsStore'
import { FileManagerProvider } from '@stores/FileStore'
import { TagIndexProvider } from '@stores/TagIndexStore'
import { LinkIndexProvider } from '@stores/LinkIndexStore'

/**
 * 回归锁（2026-10-11 用户反馈后优化）：断链（红色 WikiLink）点击后**能不能建这篇笔记**。
 *
 * 原实现：`onBrokenLinkClick` → 直接打开 `LinkRedirectDialog` ——
 * 那是「笔记改名后批量修链接」的工具（从 A 全库替换成 B）：
 *   - 没有「以这个名字新建笔记」
 *   - 也没有「改指到某个已有笔记」
 * 而用户此刻的意图几乎总是「我想建这篇笔记」—— 这正是双链最核心的用法：
 * **边写边建**（随手 `[[新想法]]`，之后再点进去补内容）。
 *
 * 现在改为上下文菜单：「新建」排第一且高亮，「重定向」为第二项并预填「从」。
 * 这里锁住两件事：① 菜单真的能建笔记（行为）；② 接线不得回退（源码级）。
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')

describe('断链菜单 · 行为（真渲染）', () => {
  it('点「新建」必须真的去建这篇笔记（onCreate 收到目标名）', () => {
    const onCreate = vi.fn()
    const onClose = vi.fn()
    render(<BrokenLinkMenu target="新想法" x={100} y={100} onClose={onClose} onCreate={onCreate} />)

    const createBtn = screen.getByRole('button', { name: /新建/ })
    fireEvent.click(createBtn)

    expect(onCreate, '必须触发建笔记').toHaveBeenCalledTimes(1)
    expect(onCreate, '必须传目标名（否则不知道该建哪篇）').toHaveBeenCalledWith('新想法')
    expect(onClose, '建完要关掉菜单').toHaveBeenCalledTimes(1)
  })

  it('「新建」必须排第一且被标记为优先项（用户此刻最想要的动作）', () => {
    render(<BrokenLinkMenu target="X" x={0} y={0} onClose={vi.fn()} onCreate={vi.fn()} />)
    const items = screen.getAllByRole('button')
    expect(items[0].className, '第一项应是高亮的新建').toContain('broken-link-menu__item--primary')
    expect(items[0].textContent, '第一项应含目标名').toContain('X')
  })

  it('「重定向」仍保留（复用原工具）：点击后打开重定向对话框，且不建笔记', () => {
    // 对话框要用 useLinkIndex / useFileManager，故包真实 Provider（不 mock 索引）
    const root: FileNode = {
      id: 'root',
      name: 'root',
      type: 'folder',
      createdAt: 0,
      updatedAt: 0,
      children: [
        { id: 'a', name: 'A.md', content: '正文', type: 'file', createdAt: 0, updatedAt: 0 },
      ],
    }
    const onCreate = vi.fn()
    render(
      <LanguageProvider>
        <ModalProvider>
          <UndoRedoProvider>
            <SettingsProvider>
              <FileManagerProvider>
                <TagIndexProvider rootFolder={root}>
                  <LinkIndexProvider rootFolder={root}>
                    <BrokenLinkMenu target="X" x={0} y={0} onClose={vi.fn()} onCreate={onCreate} />
                  </LinkIndexProvider>
                </TagIndexProvider>
              </FileManagerProvider>
            </SettingsProvider>
          </UndoRedoProvider>
        </ModalProvider>
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /重定向/ }))

    expect(onCreate, '重定向不该触发新建').not.toHaveBeenCalled()
    expect(screen.getByText('链接重定向'), '应打开重定向对话框').toBeTruthy()
  })
})

describe('断链菜单 · 接线（源码级，防悄悄回退）', () => {
  const wikiLink = read('src/features/editor/extensions/WikiLink.ts')
  const panel = read('src/aurora/panels/editor/EditorPanel.tsx')
  const dialog = read('src/features/fileManager/LinkRedirectDialog.tsx')

  it('断链回调必须把 event 传出来 —— 否则菜单拿不到鼠标位置，只能居中弹窗', () => {
    expect(
      wikiLink,
      '回调签名必须带 event: MouseEvent',
    ).toContain('_onBrokenLinkClick: ((target: string, event: MouseEvent) => void) | null')
    expect(wikiLink, '调用处必须真的传 event').toContain('_onBrokenLinkClick(wikiTarget, event)')
    // ⚠️ 只用 toContain 会漏：Ctrl+Click 与普通单击是**两处**调用，只改其中一处仍会通过。
    //    故再断言「不存在不传 event 的调用」—— 直击要害且不依赖具体调用次数。
    expect(
      wikiLink,
      '不得存在不传 event 的调用（否则鼠标位置丢失，菜单只能居中弹）',
    ).not.toMatch(/_onBrokenLinkClick\(wikiTarget\)/)
  })

  it('编辑器点击断链必须开菜单，而不是直连「批量重定向」对话框', () => {
    expect(panel, '必须把断链交给菜单组件').toContain('onBrokenLinkClick={handleBrokenLinkClick}')
    expect(
      panel,
      '不得再出现 onBrokenLinkClick={openLinkRedirect}（那是 2026-10-11 修掉的老行为）',
    ).not.toContain('onBrokenLinkClick={openLinkRedirect}')
    expect(panel, '点击时必须记录鼠标坐标').toContain('setBrokenLink({ target, x: event.clientX')
  })

  it('重定向对话框必须支持预填「从」（用户只需选改成哪篇）', () => {
    expect(dialog).toContain('initialFrom?: string')
    expect(dialog, '预填值要写进 from 字段').toContain('setFromTarget(initialFrom')
  })
})

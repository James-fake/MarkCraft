import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 回归锁（2026-10-11 用户反馈）：块级公式**只有双击**一条隐藏手势能进编辑，
 * 而提示是 `fontSize:10px / opacity:0.4 / pointerEvents:none` 的装饰文字 —— 看不见也点不到。
 *
 * 用户选定「入口可见化 + 降低 LaTeX 门槛」两档，故这里锁住四件事：
 *   ① 有**可点击**的「编辑公式」按钮（双击保留为快捷方式）
 *   ② 编辑态有**实时预览**（写错当场看见）
 *   ③ 有**符号面板 + 模板**（不会 LaTeX 也能拼出公式）
 *   ④ 有**键盘路径**：选中块 Enter 进编辑、Esc 退出
 *
 * 这些都是「界面是否给了用户出路」的产品语义，不是实现细节 —— 后续改样式时最容易悄悄退回。
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8')

const VIEW = 'src/features/editor/extensions/MathBlockView.tsx'
const EXT = 'src/features/editor/extensions/MathBlock.ts'

describe('块级公式 · 编辑入口与易用性（源码级回归锁）', () => {
  const view = read(VIEW)
  const ext = read(EXT)

  it('必须有可点击的「编辑公式」按钮', () => {
    expect(view, '按钮点击必须真的进入编辑态').toContain('onClick={beginEditing}')
    expect(view, '按钮文案走 i18n').toContain('{M.edit}')
  })

  it('不得退回「点不动」的装饰性提示', () => {
    // 旧实现：一段 pointerEvents:'none' 的 10px 暗字，用户看不见也点不到
    expect(
      /pointerEvents:\s*'none'[\s\S]{0,200}双击编辑公式/.test(view),
      '「双击编辑公式」又变回点不动的装饰文字了 —— 那正是本次要修的 bug',
    ).toBe(false)
  })

  it('编辑态必须提供实时预览', () => {
    expect(view, '实时预览容器').toContain('livePreviewRef')
    expect(view, '随输入重渲染').toMatch(/\[editing, editValue/)
  })

  it('必须提供符号面板与模板（降低 LaTeX 门槛）', () => {
    expect(view, '符号面板').toContain('SYMBOL_ITEMS')
    expect(view, '模板').toContain('TEMPLATES')
    // 符号/模板点击要插到光标处，而不是粗暴追加到末尾
    expect(view, '光标处插入').toContain('insertAtCaret')
  })

  it('必须有键盘路径：选中块 Enter 进编辑、Esc 退出', () => {
    expect(ext, 'Enter 快捷键').toMatch(/Enter:\s*\(\{\s*editor\s*\}\)/)
    expect(ext, '用自定义事件把请求转给节点视图').toContain('mathBlock:requestEdit')
    expect(view, '视图订阅该事件').toContain("editor.on('mathBlock:requestEdit'")
    expect(view, 'Esc 退出编辑').toContain("e.key === 'Escape'")
  })

  it('Enter 快捷键必须限定「块被选中」，不能劫持块内换行', () => {
    expect(ext, '需按 NodeSelection 判定').toContain('node?.type?.name === \'mathBlock\'')
  })

  it('i18n 三处同步（zh 文案 / en 文案 / zh 类型声明）', () => {
    const zhCommon = read('src/locales/zh/common.ts')
    const en = read('src/locales/en.ts')
    const zhIndex = read('src/locales/zh/index.ts')
    for (const key of ['edit', 'copy', 'copied', 'remove', 'placeholder', 'editingHint', 'empty', 'previewEmpty']) {
      expect(zhCommon, `zh/common.ts 缺 mathBlock.${key}`).toMatch(new RegExp(`\\b${key}:`))
      expect(en, `en.ts 缺 mathBlock.${key}`).toMatch(new RegExp(`\\b${key}:`))
      expect(zhIndex, `zh/index.ts 缺 mathBlock.${key} 的类型`).toMatch(new RegExp(`\\b${key}: string`))
    }
    expect(zhIndex, 'zh/index.ts 需导出 mathBlock').toContain('mathBlock,')
  })
})

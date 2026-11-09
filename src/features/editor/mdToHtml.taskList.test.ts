import { describe, it, expect } from 'vitest'
import { markdownToHtml, convertTaskListsForTiptap } from './mdToHtml'
import { htmlToMarkdown } from './htmlToMd'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

/**
 * 回归锁（2026-11-03 真实事故）：任务列表 `- [x]` 在所见即所得里从未生效。
 *
 * 旧 convertTaskListsForTiptap 的正则写死 `<input type="checkbox"\s+checked` 的属性顺序，
 * 而 marked 实际输出 `<input checked="" disabled="" type="checkbox">`（checked 在前）→
 * 全部失配，转换从未跑通过；且非贪婪 `[\s\S]*?<\/li>` 会把嵌套列表在内层截断。
 * 现改为 DOM 遍历：属性顺序无关、嵌套天然正确、裸文本包 <p>（TaskItem 内容为 block+）。
 */
const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

describe('任务列表 · mdToHtml → Tiptap 结构', () => {
  it('简单任务列表：ul 获得 data-type=taskList，li 获得 data-type=taskItem 与勾选态', () => {
    const html = markdownToHtml('- [x] 已完成\n- [ ] 未完成', noopImageStore)
    expect(html).toContain('<ul data-type="taskList">')
    expect(html).toContain('<li data-type="taskItem" data-checked="true">')
    expect(html).toContain('<li data-type="taskItem" data-checked="false">')
    // 原始 input 已被消费移除
    expect(html).not.toContain('<input')
  })

  it('裸文本包进 <p>（TaskItem 内容为 block+，裸文本会被 Tiptap 丢弃）', () => {
    const html = markdownToHtml('- [x] 已完成', noopImageStore)
    expect(html).toContain('<li data-type="taskItem" data-checked="true"><p>已完成</p></li>')
  })

  it('嵌套任务列表：内层同样转换，外层文本不被截断', () => {
    const html = markdownToHtml('- [x] 父任务\n  - [ ] 子任务\n  - [x] 孙任务', noopImageStore)
    expect((html.match(/data-type="taskList"/g) || []).length).toBe(2)
    expect(html).toContain('<p>父任务</p>')
    expect(html).toContain('data-checked="false"><p>子任务</p>')
    expect(html).toContain('data-checked="true"><p>孙任务</p>')
  })

  it('勾选态与属性顺序无关（marked 输出 checked 在 type 之前）', () => {
    // 直接喂旧正则失配的原始形态，锁定「不依赖属性顺序」
    const raw = '<ul>\n<li><input checked="" disabled="" type="checkbox"> a</li>\n<li><input disabled="" type="checkbox"> b</li>\n</ul>'
    const html = convertTaskListsForTiptap(raw)
    expect(html).toContain('data-checked="true"')
    expect(html).toContain('data-checked="false"')
  })

  it('混合列表（任务项 + 普通项）→ 按连续段拆分：勾选态零丢失', () => {
    const html = markdownToHtml('- [x] 任务\n- 普通项\n- [ ] 另一任务', noopImageStore)
    // 任务段拆成 taskList，普通段保留原样
    expect((html.match(/data-type="taskList"/g) || []).length).toBe(2)
    expect(html).toContain('data-checked="true"><p>任务</p>')
    expect(html).toContain('data-checked="false"><p>另一任务</p>')
    expect(html).toContain('普通项')
    // 往返后 [x] 不丢（拆分前这里会静默丢失勾选态）；普通项走 turndown 默认 li（三空格缩进）
    const md = htmlToMarkdown(html)
    expect(md).toContain('- [x] 任务')
    expect(md).toContain('- [ ] 另一任务')
    expect(md).toMatch(/-\s+普通项/)
  })
})

describe('任务列表 · 往返（编辑器勾选 → markdown）', () => {
  it('Tiptap 结构回写为 - [x] / - [ ]（htmlToMd 既有规则）', () => {
    const md = htmlToMarkdown(
      '<ul data-type="taskList">' +
        '<li data-type="taskItem" data-checked="true"><p>已完成</p></li>' +
        '<li data-type="taskItem" data-checked="false"><p>未完成</p></li>' +
        '</ul>',
    )
    expect(md).toContain('- [x] 已完成')
    expect(md).toContain('- [ ] 未完成')
  })
})

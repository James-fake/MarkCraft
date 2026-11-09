import { describe, it, expect } from 'vitest'
import { buildWelcomeDoc, welcomeDocFileName } from './welcomeDoc'

/**
 * 种子文档是用户看到的第一篇笔记，写坏了就是首启事故：
 * 语法演示必须真的能被 MarkCraft 自己的管线渲染出来（方言见 @core/markdown/customSyntax）。
 */
describe('首启种子文档', () => {
  it('中英文文件名各自独立', () => {
    expect(welcomeDocFileName('zh')).toBe('欢迎使用 MarkCraft')
    expect(welcomeDocFileName('en')).toBe('Welcome to MarkCraft')
  })

  it('中文版含标题与「下一步」引导（指向博客部署）', () => {
    const doc = buildWelcomeDoc('zh')
    expect(doc.startsWith('# 欢迎使用 MarkCraft')).toBe(true)
    expect(doc).toContain('## 下一步：把这个文件夹变成网站')
    expect(doc).toContain('一键部署')
  })

  it('英文版同样含标题与下一步', () => {
    const doc = buildWelcomeDoc('en')
    expect(doc.startsWith('# Welcome to MarkCraft')).toBe(true)
    expect(doc).toContain('## Next: turn this folder into a website')
  })

  it('演示的语法都是项目真实支持的方言', () => {
    const doc = buildWelcomeDoc('zh')
    expect(doc).toContain('==高亮==')          // 高亮
    expect(doc).toContain('++下划线++')        // 下划线
    expect(doc).toContain('[[另一篇笔记]]')    // 双链
    expect(doc).toContain('#开始')             // 标签
    expect(doc).toContain('> [!tip]')          // callout
    expect(doc).toContain('```javascript')    // 代码块（用规范语言名，短别名 js 在编辑器里会显示 Custom…）
    expect(doc).toContain('$$')                // 块级公式
    expect(doc).toContain('- [x]')             // 任务列表（mdToHtml 修复后编辑器可识别）
    expect(doc).toContain('| 导出格式 |')      // 表格
  })

  it('不使用全角空格（会破坏 markdown 缩进语义）', () => {
    expect(buildWelcomeDoc('zh')).not.toContain('\u3000')
    expect(buildWelcomeDoc('en')).not.toContain('\u3000')
  })

  it('首尾各留一个换行，避免末尾段落粘连', () => {
    for (const lang of ['zh', 'en'] as const) {
      const doc = buildWelcomeDoc(lang)
      expect(doc.endsWith('\n')).toBe(true)
      expect(doc.startsWith('\n')).toBe(false)
    }
  })
})

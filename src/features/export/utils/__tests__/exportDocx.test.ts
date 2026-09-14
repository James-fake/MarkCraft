import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { generateDocxBlob } from '../exportDocx'

/**
 * F3 导出保真：DOCX 样式表测试
 * docx 包产出的 Blob 是 ZIP（OOXML），解压后检查 word/styles.xml 是否包含
 * 品牌化标题样式（Heading1-6）与文档默认样式。
 */
describe('exportDocx（F3 样式表精修）', () => {
  async function extractStylesXml(content: string): Promise<string> {
    const blob = await generateDocxBlob(content)
    const zip = await JSZip.loadAsync(blob)
    const styles = zip.file('word/styles.xml')
    expect(styles).toBeTruthy()
    return await styles!.async('string')
  }

  it('生成合法 DOCX（含 styles.xml 与 document.xml）', async () => {
    const blob = await generateDocxBlob('# 标题\n\n正文')
    expect(blob.size).toBeGreaterThan(0)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('word/document.xml')).toBeTruthy()
    expect(zip.file('word/styles.xml')).toBeTruthy()
  })

  it('styles.xml 包含 Heading1-6 品牌样式（颜色/字号/字体）', async () => {
    const styles = await extractStylesXml('# 标题')
    // docx 库默认样式 id 为 Heading1..Heading6
    for (const level of [1, 2, 3, 4, 5, 6]) {
      expect(styles).toContain(`w:styleId="Heading${level}"`)
    }
    // 标题色（1f4e79 = 深蓝）
    expect(styles).toContain('1f4e79')
    // 中文字体
    expect(styles).toContain('Microsoft YaHei')
  })

  it('styles.xml 包含文档默认样式（字号 22 / 行距 360 / 中文字体）', async () => {
    const styles = await extractStylesXml('正文')
    // docx 库输出 OOXML 的 w:docDefaults（文档默认）
    expect(styles).toContain('w:docDefaults')
    expect(styles).toContain('w:sz w:val="22"')
    expect(styles).toContain('w:line="360"')
    expect(styles).toContain('Microsoft YaHei')
  })

  it('标题内容在 document.xml 中按 heading 渲染', async () => {
    const blob = await generateDocxBlob('# 主标题\n\n## 副标题')
    const zip = await JSZip.loadAsync(blob)
    const doc = await zip.file('word/document.xml')!.async('string')
    expect(doc).toContain('主标题')
    expect(doc).toContain('副标题')
    // heading 段落应引用 Heading1/Heading2 样式
    expect(doc).toContain('Heading1')
    expect(doc).toContain('Heading2')
  })
})

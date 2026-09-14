import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import {
  transformContentForExport,
  collectFiles,
  collectFolders,
  resolveRelativePath,
  buildWorkspaceZip,
} from './backupService'
import type { FileNode } from '../../types/fileManager'

const folder = (id: string, name: string, children: FileNode[]): FileNode => ({
  id,
  name,
  type: 'folder',
  children,
  createdAt: 1,
  updatedAt: 1,
})

const file = (id: string, name: string, content = ''): FileNode => ({
  id,
  name,
  type: 'file',
  content,
  parentId: undefined,
  createdAt: 1,
  updatedAt: 2,
})

describe('transformContentForExport（图片引用改写）', () => {
  it('image: 占位符 → 相对路径 + 收集资产', () => {
    const content = '![图](image:img_1) 正文 ![第二张](image:img_2)'
    const resolve = (id: string) =>
      id === 'img_1' ? 'data:image/png;base64,AAAA' : id === 'img_2' ? 'data:image/jpeg;base64,BBBB' : undefined
    const r = transformContentForExport(content, resolve)
    expect(r.markdown).toContain('![图](assets/img_1.png)')
    expect(r.markdown).toContain('![第二张](assets/img_2.jpg)')
    expect(r.assets).toHaveLength(2)
    expect(r.assets[0]).toEqual({ id: 'img_1', path: 'assets/img_1.png', dataUrl: 'data:image/png;base64,AAAA' })
    expect(r.missing).toEqual([])
  })

  it('缺失图片：保留占位符并记入 missing', () => {
    const r = transformContentForExport('![x](image:lost)', () => undefined)
    expect(r.markdown).toBe('![x](image:lost)')
    expect(r.missing).toEqual(['lost'])
    expect(r.assets).toEqual([])
  })

  it('同 id 重复引用不重复收集资产', () => {
    const content = '![a](image:img_1) 又见 ![a2](image:img_1)'
    const r = transformContentForExport(content, (id) => (id === 'img_1' ? 'data:image/png;base64,AAAA' : undefined))
    expect(r.assets).toHaveLength(1)
    expect(r.markdown.match(/assets\/img_1\.png/g)).toHaveLength(2)
  })

  it('非图片引用原样保留', () => {
    const r = transformContentForExport('![网络图](https://x.com/a.png) 和 [链接](image:不是图片)', () => undefined)
    expect(r.markdown).toContain('![网络图](https://x.com/a.png)')
  })
})

describe('collectFiles / collectFolders / resolveRelativePath', () => {
  const tree = folder('root', '工作区', [
    file('f1', 'a.md', '内容A'),
    folder('d1', '子目录', [
      file('f2', 'b.md', '内容B'),
      file('f3', 'c.md', '内容C'),
    ]),
  ])
  tree.children![1].children![0].parentId = 'd1'
  tree.children![1].children![1].parentId = 'd1'

  it('collectFiles 深度优先收集全部文件', () => {
    expect(collectFiles(tree).map((f) => f.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it('collectFolders 收集全部文件夹', () => {
    expect(collectFolders(tree).map((f) => f.id)).toEqual(['root', 'd1'])
  })

  it('resolveRelativePath 拼接目录链', () => {
    expect(resolveRelativePath(tree, tree.children![1].children![0])).toBe('工作区/子目录/b.md')
    expect(resolveRelativePath(tree, tree.children![0])).toBe('工作区/a.md')
  })
})

describe('buildWorkspaceZip（F1 一键导出集成）', () => {
  it('导出 ZIP：目录结构 / md 内容 / 图片落盘 / README / manifest', async () => {
    // 注入内存图片，用实际返回的 id 构造占位符
    const { storeBase64Image, removeBase64Image } = await import('../shared/storage/imageStore')
    const id = storeBase64Image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')

    const tree = folder('root', '工作区', [
      file('f1', '首页.md', `# 你好\n\n![截图](image:${id})`),
      folder('d1', '笔记', [file('f2', '日记.md', '今天很好。')]),
    ])
    tree.children![1].children![0].parentId = 'd1'

    const blob = await buildWorkspaceZip(tree)
    const zip = await JSZip.loadAsync(blob)

    // 目录与文件
    expect(Object.keys(zip.files).some((p) => p === '工作区/首页.md')).toBe(true)
    expect(Object.keys(zip.files).some((p) => p === '工作区/笔记/日记.md')).toBe(true)
    expect(Object.keys(zip.files).some((p) => p === 'README.md')).toBe(true)
    expect(Object.keys(zip.files).some((p) => p === 'manifest.json')).toBe(true)

    // md 内容：图片引用改写为相对路径
    const home = await zip.file('工作区/首页.md')!.async('string')
    expect(home).toContain('![截图](assets/')
    expect(home).not.toContain(`image:${id}`)

    // 图片落盘且可解出 png 魔数（排除目录条目）
    const assetPath = Object.keys(zip.files).find((p) => p.startsWith('工作区/assets/') && !p.endsWith('/'))
    expect(assetPath).toBeTruthy()
    const asset = await zip.file(assetPath!)!.async('uint8array')
    expect(asset[0]).toBe(0x89)
    expect(asset[1]).toBe(0x50) // PNG

    // manifest 元数据
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    expect(manifest.stats.files).toBe(2)
    expect(manifest.stats.assets).toBe(1)

    // README 统计
    const readme = await zip.file('README.md')!.async('string')
    expect(readme).toContain('文件数：2')
    expect(readme).toContain('图片：1 张')

    // 清理注入的图片
    removeBase64Image(id)
  })

  it('空树导出：仅 README 且提示为空', async () => {
    const blob = await buildWorkspaceZip(null)
    const zip = await JSZip.loadAsync(blob)
    const readme = await zip.file('README.md')!.async('string')
    expect(readme).toContain('工作区为空')
  })
})

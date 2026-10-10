import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  storeBase64Image,
  registerRelativePath,
  resolveImageSrcForDisplay,
  isLoadableImageSrc,
  rehydrateImagesFromContent,
} from './imageStore'

/**
 * 回归锁（2026-10-11 真实事故）：所见即所得里插入图片正常显示，切到源码/预览再切回所见即所得，
 * **图片消失**（但节点还在 —— 调整方框仍在、且极小，因为 img 加载失败是 0×0）。
 *
 * 机制：`<img>` 拿到的是**不可直接加载**的 src。节点里的 src 有两种形态都需要在渲染时解析：
 *   - `image:<id>` 占位符（默认路径）
 *   - `assets/xxx.png` 相对路径（开启「相对路径存储图片」时）
 * 此前的 `ImageView` 直接把 src 塞给 `<img>`，解析不出来就静默空白。
 */
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

describe('resolveImageSrcForDisplay · 图片显示地址解析', () => {
  beforeEach(() => {
    // 每个用例用独立的数据，避免相互干扰（模块级 Map 是单例）
    storeBase64Image(PNG)
    storeBase64Image(JPG)
  })

  it('data: 直接可加载 → 原样返回', () => {
    expect(resolveImageSrcForDisplay(PNG)).toBe(PNG)
    expect(isLoadableImageSrc(PNG)).toBe(true)
  })

  it('http(s): / blob: 原样返回', () => {
    expect(resolveImageSrcForDisplay('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    )
    expect(resolveImageSrcForDisplay('blob:http://localhost/abc')).toBe('blob:http://localhost/abc')
  })

  it('image:<id> 占位符 → 解析成 base64（这是「切回来图消失」的主因）', () => {
    const id = storeBase64Image(PNG)
    const out = resolveImageSrcForDisplay(`image:${id}`)
    expect(out).toBe(PNG)
    expect(isLoadableImageSrc(out), '解析后必须可直接加载').toBe(true)
  })

  it('assets/ 相对路径 → 经 RELATIVE_PATH_MAP 反查后解析成 base64', () => {
    const id = storeBase64Image(JPG)
    const rel = 'assets/image_1700000000000_ab12cd.jpg'
    registerRelativePath(rel, id)
    const out = resolveImageSrcForDisplay(rel)
    expect(out).toBe(JPG)
    expect(isLoadableImageSrc(out), '解析后必须可直接加载').toBe(true)
  })

  it('解析不出来（数据丢失）→ 原样返回且判定为不可加载（由 UI 显示可见占位）', () => {
    const out = resolveImageSrcForDisplay('image:img_不存在')
    expect(out).toBe('image:img_不存在')
    expect(isLoadableImageSrc(out), '应判定为不可加载，好让 UI 提示而不是静默空白').toBe(false)
  })

  it('空 src 不炸', () => {
    expect(resolveImageSrcForDisplay('')).toBe('')
    expect(isLoadableImageSrc('')).toBe(false)
  })
})

/**
 * 回归锁（2026-10-11 真实事故）：图片数据**只活在内存 Map**，唯一持久化方式是「被嵌进 markdown」。
 * 若加载笔记时不做水合，重启后 Map 为空 → 内容里所有 `image:<id>` 都解析不出来
 * （用户看到的就是「图片无法显示（原图数据已丢失）」占位）。
 */
describe('rehydrateImagesFromContent · 内容载入时水合图片数据', () => {
  // 用一张 beforeEach 里没存过的图，才能观察到「新灌入」
  const FRESH = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

  it('从内容里把内嵌 base64 灌回 Map，之后占位符可解析', () => {
    const md = `正文\n\n![图](${FRESH})\n`
    expect(rehydrateImagesFromContent(md), '应新灌入 1 张').toBe(1)

    // 灌进来之后，同一张图生成的占位符就能解析
    const id = storeBase64Image(FRESH) // 幂等：哈希命中同一个 id
    expect(resolveImageSrcForDisplay(`image:${id}`)).toBe(FRESH)
  })

  it('幂等：重复调用不重复计数', () => {
    // 本用例自带一张独立图（模块级 Map 在同一文件内跨用例保留，不能复用上一用例的图）
    const FRESH2 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
    const md = `![图](${FRESH2})`
    expect(rehydrateImagesFromContent(md)).toBe(1)
    expect(rehydrateImagesFromContent(md), '第二次不应再新增').toBe(0)
  })

  it('没有内嵌图片时零开销、不报错', () => {
    expect(rehydrateImagesFromContent('')).toBe(0)
    expect(rehydrateImagesFromContent('普通文本 ![](https://a/b.png)')).toBe(0)
  })
})

/**
 * 接线锁：水合函数本身对了没用 —— 真正的事故是「**没人调用它**」。
 * （前一版修复的教训：`preprocessCustomSyntax` 一直是对的，漏的是预览没调它。）
 */
describe('接线：加载笔记时必须调用水合', () => {
  it('EditorPanel 读取内容的两处（首次挂载 + 切换文件）都要水合', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/aurora/panels/editor/EditorPanel.tsx'),
      'utf-8',
    )
    const calls = src.match(/rehydrateImagesFromContent\(/g) ?? []
    expect(calls.length, '首次挂载与切换文件各需一次水合').toBeGreaterThanOrEqual(2)
  })

  it('插入图片时必须无条件先存进 Map（不能只在相对路径分支里存）', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/editor/hooks/useTiptapImageHandler.ts'),
      'utf-8',
    )
    const idx = src.indexOf('const insertImage')
    // ⚠️ 必须先剥注释：本次的说明注释里就写着 `storeBase64Image`，不剥会自摆乌龙
    const block = src
      .slice(idx, idx + 1200)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    // 在 if (useRelativeImagePath ...) 之前就应有一次 storeBase64Image
    const beforeBranch = block.slice(0, block.indexOf('useRelativeImagePath && src.startsWith'))
    expect(
      beforeBranch.includes('storeBase64Image'),
      '默认分支（useRelativeImagePath=false）不存 Map 会让图片数据在保存时永久丢失',
    ).toBe(true)
  })
})

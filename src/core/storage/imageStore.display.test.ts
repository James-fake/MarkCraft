import { describe, it, expect, beforeEach } from 'vitest'
import {
  storeBase64Image,
  registerRelativePath,
  resolveImageSrcForDisplay,
  isLoadableImageSrc,
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

import { describe, it, expect, vi } from 'vitest'
import { MC_FOCUS_DIM_CLASS, centerRectInContainer, findScrollContainer } from './focusContract'

describe('focusContract 专注/打字机共享契约', () => {
  it('淡化类名常量稳定（两引擎共用）', () => {
    expect(MC_FOCUS_DIM_CLASS).toBe('mc-focus-dimmed')
  })

  describe('centerRectInContainer', () => {
    function makeContainer(opts: { top: number; scrollTop: number; clientHeight: number }) {
      const scrollTo = vi.fn()
      const el = {
        scrollTop: opts.scrollTop,
        clientHeight: opts.clientHeight,
        getBoundingClientRect: () => ({ top: opts.top }) as DOMRect,
        scrollTo,
      } as unknown as HTMLElement
      return { el, scrollTo }
    }

    it('把矩形中心滚动到容器中央', () => {
      const { el, scrollTo } = makeContainer({ top: 100, scrollTop: 200, clientHeight: 400 })
      centerRectInContainer(el, { top: 300, height: 40 })
      // offsetTop=200, target=200+200+20-200=220
      expect(scrollTo).toHaveBeenCalledWith({ top: 220, behavior: 'smooth' })
    })

    it('结果不小于 0（顶部钳制）', () => {
      const { el, scrollTo } = makeContainer({ top: 100, scrollTop: 200, clientHeight: 400 })
      centerRectInContainer(el, { top: 0, height: 40 })
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })
  })

  describe('findScrollContainer', () => {
    it('向上找到 overflowY 为 auto 的祖先', () => {
      const scroller = document.createElement('div')
      scroller.style.overflowY = 'auto'
      const middle = document.createElement('div')
      const leaf = document.createElement('div')
      scroller.appendChild(middle)
      middle.appendChild(leaf)
      document.body.appendChild(scroller)
      expect(findScrollContainer(leaf)).toBe(scroller)
      document.body.removeChild(scroller)
    })

    it('无可滚动祖先时返回 null', () => {
      const a = document.createElement('div')
      const b = document.createElement('div')
      a.appendChild(b)
      document.body.appendChild(a)
      expect(findScrollContainer(b)).toBeNull()
      document.body.removeChild(a)
    })
  })
})

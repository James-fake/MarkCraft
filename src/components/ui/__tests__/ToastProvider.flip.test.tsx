import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import { ToastProvider, useToast, type ToastKind } from '../ToastProvider'

/**
 * ToastProvider 栈重排 FLIP（审计 MO-1）单测
 *
 * jsdom 没有真实布局，getBoundingClientRect 恒为 0，因此这里用「假布局表」注入视口顶坐标，
 * 再驱动两次 show() 制造既有条目位移，断言：
 *  1. 位移条目被补偿 `transform: translateY(dy)` 且 transition 被临时关闭；
 *  2. 未位移条目 / 新增条目不被写 inline transform；
 *  3. 下一帧释放 inline style（交还给 toast.css 的 transform transition）。
 */
let show: (msg: string, kind?: ToastKind) => void = () => {}

function Probe() {
  show = useToast().show
  return null
}

/** 假布局：data-toast-id → 视口顶坐标 */
const layout = new Map<string, number>()

function stubRects() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const id = (this as HTMLElement).dataset?.toastId
    const top = id ? (layout.get(id) ?? 0) : 0
    return {
      top,
      bottom: top,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  })
}

const toastNodes = () => Array.from(document.querySelectorAll<HTMLElement>('.aurora-toast'))

describe('ToastProvider · 栈重排 FLIP（MO-1）', () => {
  afterEach(() => {
    cleanup()
    layout.clear()
    vi.restoreAllMocks()
  })

  it('既有条目位移时补偿 transform，并在下一帧释放', async () => {
    const spy = stubRects()
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )

    // 第一条：容器底边锚定，t1 顶坐标 100
    layout.set('1', 100)
    await act(async () => {
      show('第一条')
    })
    expect(toastNodes()).toHaveLength(1)
    expect(toastNodes()[0].style.transform).toBe('')

    // 第二条入栈：容器长高、底边不动 → t1 被顶上移 40px
    layout.set('1', 60)
    layout.set('2', 100)
    await act(async () => {
      show('第二条')
    })
    const [t1, t2] = toastNodes()
    expect(toastNodes()).toHaveLength(2)
    // 位移条目补偿到原位（旧 100 - 新 60 = +40）
    expect(t1.style.transform).toBe('translateY(40px)')
    expect(t1.style.transition).toBe('none')
    // 新增条目无历史坐标 → 不补偿（其入场由 animation 负责）
    expect(t2.style.transform).toBe('')

    // 下一帧释放 → 由 toast.css 的 transform transition 接管收敛到 0
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    expect(t1.style.transform).toBe('')
    expect(t1.style.transition).toBe('')
    spy.mockRestore()
  })

  it('条目未位移时不写 inline transform（避免无谓图层）', async () => {
    stubRects()
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )

    layout.set('1', 100)
    await act(async () => {
      show('第一条')
    })
    // 第二条追加在下方，t1 位置不变
    layout.set('1', 100)
    layout.set('2', 144)
    await act(async () => {
      show('第二条')
    })
    expect(toastNodes()[0].style.transform).toBe('')
  })

  it('出场中的条目跳过补偿（自有反向 transition）', async () => {
    stubRects()
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )

    layout.set('1', 100)
    await act(async () => {
      show('待出场')
    })
    // 手动置出场态后触发一次位移
    const node = toastNodes()[0]
    node.dataset.exiting = 'true'
    layout.set('1', 60)
    layout.set('2', 100)
    await act(async () => {
      show('第二条')
    })
    expect(toastNodes()[0].style.transform).toBe('')
  })
})

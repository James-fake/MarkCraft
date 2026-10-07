import { useState, useLayoutEffect } from 'react'

const DROPDOWN_GAP = 4
const DROPDOWN_EST_WIDTH = 180
const DROPDOWN_EST_HEIGHT = 300
/** 面板与视口边缘的最小留白（夹取时用）。 */
const VIEWPORT_MARGIN = 8

/**
 * 水平对齐方式：
 * - `left`（默认，历史行为）：面板**左边缘**对齐锚点左边缘，越界时退化为右对齐。
 * - `center`：面板**水平居中于锚点**（即「挂在按钮正下方」），越界时夹进视口。
 */
export type DropdownAlign = 'left' | 'center'

export interface DropdownPositionOptions {
  /** 水平对齐方式，默认 `left`。 */
  align?: DropdownAlign
  /**
   * 面板自身 ref。
   *
   * 🚨 居中定位**必须**传它：估算宽度 `DROPDOWN_EST_WIDTH`（180）≠ 调色板实际宽度
   * （8 列 × 20px + 7 间隙 × 7px + 内边距 16px = **225px**）⇒ 拿估算值居中会**整体左偏 ~22px**。
   * 传了就按实测尺寸定位，垂直方向的翻转判断也一并变准。
   */
  panelRef?: React.RefObject<HTMLElement | null>
  /** 与锚点的垂直间距，默认 4。 */
  gap?: number
}

/**
 * 计算 `position: fixed` 下拉面板相对锚点按钮的位置。
 *
 * 用 `useLayoutEffect`（而非 `useEffect`）：面板与锚点都在同一次 commit 里就位，
 * 布局副作用在**浏览器绘制之前**同步跑完并回写 state，因此居中结果不会先闪一下旧位置。
 */
export default function useDropdownPosition(
  open: boolean,
  btnRef: React.RefObject<HTMLElement | null>,
  options: DropdownPositionOptions = {},
) {
  const { align = 'left', panelRef, gap = DROPDOWN_GAP } = options
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()

    // 面板尺寸优先用**实测**；未给 ref 时退回估算值（= 历史行为，逐像素不变）。
    // ⚠️ 实测取 `getBoundingClientRect()`（分数）而非 `offsetWidth`（**取整**）：
    // 面板真实宽 226.33、`offsetWidth` 会报 226 ⇒ 居中时留下 0.17px 的固定残差；
    // rect 同时还能正确反映 CSS transform 缩放。两者都取不到才退估算值。
    const panel = panelRef?.current ?? null
    const panelRect = panel?.getBoundingClientRect()
    const width = panelRect?.width || panel?.offsetWidth || DROPDOWN_EST_WIDTH
    const height = panelRect?.height || panel?.offsetHeight || DROPDOWN_EST_HEIGHT

    const vw = window.innerWidth
    const vh = window.innerHeight

    // 垂直：默认贴在锚点下方；下方放不下则翻到上方
    let top = rect.bottom + gap
    if (top + height > vh) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - height - gap)
    }

    // 水平
    let left: number
    if (align === 'center') {
      left = rect.left + rect.width / 2 - width / 2
      const maxLeft = Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN)
      left = Math.min(Math.max(VIEWPORT_MARGIN, left), maxLeft)
    } else {
      left = rect.left
      if (left + width > vw) {
        left = Math.max(VIEWPORT_MARGIN, rect.right - width)
      }
    }

    // 🚨 值相等就**回写同一个对象**让 React 跳过重渲染。
    // 必要性：本 effect 的依赖里有 `btnRef`/`panelRef` 两个 ref 对象，若调用方传的是
    // **每次渲染都新建的内联 ref**（`{ current: el }`），依赖每轮都变 ⇒ effect 每轮重跑 ⇒
    // 无护栏时 `setPos(新对象)` 又触发渲染 ⇒ **自激成死循环**（React 报
    // 「Maximum update depth exceeded」，实测踩到）。值比较把这条链路掐断。
    setPos((prev) => (prev.top === top && prev.left === left ? prev : { top, left }))
  }, [open, btnRef, panelRef, align, gap])

  return pos
}

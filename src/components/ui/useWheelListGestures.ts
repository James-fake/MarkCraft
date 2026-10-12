import { useEffect, type RefObject } from 'react'

/**
 * 给苹果风格滚轮鼓的滚动容器（.aurora-wheel__list）补上两件事：
 *
 *  1. **鼠标滚轮精准步进** —— 每个滚轮 notch 只移动 1 个选项（ITEM_H），
 *     不再一次跳 2~3 个、漏掉中间项。
 *     原先完全依赖容器原生滚动，浏览器默认滚动量 ≈ 2~3 项高度，导致跳项 / 漏项、
 *     部分想要的设置项选不到。
 *
 *  2. **鼠标按住拖拽滚动** —— 兑现 CSS 里 `cursor: grab` 的承诺：按住上下拖动即跟手滚动，
 *     松手吸附到最近项。此前组件没有任何指针拖拽处理，按住拖动不会滚动 div，
 *     只会把光标拖出浮层（触发 onMouseLeave 收起），体验上像「切走了设置页」。
 *
 * 两个手势都 stopPropagation，避免冒泡到任何祖先页面级滑动手势（如设置顶栏分类切换）；
 * 拖拽期间关掉 scroll-snap 让跟手 1:1，松手恢复 mandatory 吸附。
 *
 * 注意：滚轮必须用 **原生非 passive** 监听器（`cont.addEventListener('wheel', …, { passive: false })`），
 * 因为 React 合成的 onWheel 在根节点以 passive 绑定，里面 preventDefault 不生效。
 */
export function useWheelListGestures(listRef: RefObject<HTMLDivElement | null>, itemH: number) {
  useEffect(() => {
    const cont = listRef.current
    if (!cont) return

    /* ----------------------------------------------------------------
     * 滚轮：每个 notch 精确 1 项
     * ---------------------------------------------------------------- */
    const onWheel = (e: WheelEvent) => {
      // 只接管垂直意图；横向（触控板双指横滑）放行，避免吃掉页面横滚
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      e.preventDefault()
      e.stopPropagation()
      const dir = Math.sign(e.deltaY)
      if (dir === 0) return
      // 直接按「一个选项高度」移动：既跳过多项问题，又天然落在 scroll-snap 对齐点，
      // 不会和 mandatory 吸附打架。滚动变化经由既有 scroll 监听器驱动曲率与选值回传。
      cont.scrollTop += dir * itemH
    }
    cont.addEventListener('wheel', onWheel, { passive: false })

    /* ----------------------------------------------------------------
     * 拖拽：按住跟手滚动
     * ---------------------------------------------------------------- */
    let dragging = false
    let startY = 0
    let startScroll = 0

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return // 只处理主键
      dragging = true
      startY = e.clientY
      startScroll = cont.scrollTop
      // 关掉吸附让跟手 1:1（松手再恢复）
      cont.style.scrollSnapType = 'none'
      try {
        cont.setPointerCapture(e.pointerId)
      } catch {
        /* 某些环境不支持捕获，忽略即可 */
      }
      e.preventDefault()
      e.stopPropagation()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dy = e.clientY - startY
      // 向上拖（dy<0）→ 内容向上走 → scrollTop 增大；向下拖反之
      cont.scrollTop = startScroll - dy
      e.stopPropagation()
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      // 吸附到最近项（已是 snap 对齐点，mandatory 不会再次跳动）
      const sel = Math.round(cont.scrollTop / itemH)
      cont.scrollTop = sel * itemH
      cont.style.scrollSnapType = '' // 恢复 stylesheet 的 mandatory 吸附
      try {
        cont.releasePointerCapture(e.pointerId)
      } catch {
        /* 忽略 */
      }
      e.stopPropagation()
    }

    cont.addEventListener('pointerdown', onPointerDown)
    cont.addEventListener('pointermove', onPointerMove)
    cont.addEventListener('pointerup', endDrag)
    cont.addEventListener('pointercancel', endDrag)

    return () => {
      cont.removeEventListener('wheel', onWheel)
      cont.removeEventListener('pointerdown', onPointerDown)
      cont.removeEventListener('pointermove', onPointerMove)
      cont.removeEventListener('pointerup', endDrag)
      cont.removeEventListener('pointercancel', endDrag)
    }
  }, [listRef, itemH])
}

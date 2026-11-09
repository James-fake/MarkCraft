import type { MutableRefObject } from 'react'

/**
 * WYSIWYG 序列化调度器（阶段 2）。
 *
 * 连续输入时只在最后一次停顿后做一次「getHTML → htmlToMarkdown」；任何需要立即拿到
 * markdown 的时机（切文件/失焦/保存/撤销/模式切换/关窗口）走 flush。
 *
 * 抽成纯模块的原因：**「不丢字」必须能被单测锁住**。调度策略与 React/Tiptap 解耦后，
 * 防抖合并、flush 幂等、dispose 取消都能在 fake timers 下逐一验证。
 */
export interface SerializeSchedulerDeps {
  delayMs: number
  /** 是否有尚未序列化的编辑（由编辑器 onUpdate 置位） */
  isDirty: () => boolean
  /** 真正执行序列化与副作用 */
  serialize: (reason: string) => void
  /** 外部共享的 timer 引用：useTiptapContentSync 切文件时会直接 clearTimeout 它 */
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
}

export interface SerializeScheduler {
  /** onUpdate 调用：重置防抖，只保留最后一次 */
  schedule(): void
  /** 需要立即拿到内容时调用：取消挂起 +（有脏数据时）立刻序列化 */
  flush(reason: string): void
  /** 卸载：取消挂起，不序列化 */
  dispose(): void
  hasPending(): boolean
}

export function createSerializeScheduler(deps: SerializeSchedulerDeps): SerializeScheduler {
  const { delayMs, isDirty, serialize, timerRef } = deps
  const clear = (): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  return {
    schedule() {
      clear()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (isDirty()) serialize('debounce')
      }, delayMs)
    },
    flush(reason: string) {
      clear()
      // 无脏数据时跳过：切模式/预览等外部 flush 不应白白跑一次全量序列化
      if (isDirty()) serialize(reason)
    },
    dispose() {
      clear()
    },
    hasPending() {
      return timerRef.current !== null
    },
  }
}

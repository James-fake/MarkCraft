import { useSyncExternalStore } from 'react'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'

/**
 * 引擎响应式读取：订阅 CanvasEngine store（document/session scope）。
 * selector 必须返回**稳定引用**（原始值/拼接串），避免 useSyncExternalStore 死循环。
 * engine 为 null（引擎未就绪）时返回 undefined，调用方需兜底（?? 默认值）。
 */
export function useEngineSnapshot<T>(
  engine: CanvasEngine | null,
  selector: (e: CanvasEngine) => T,
  scope: 'document' | 'session' = 'session',
): T | undefined {
  return useSyncExternalStore(
    (cb) => {
      if (!engine) return () => {}
      return engine.store.listen(cb, { scope })
    },
    () => (engine ? selector(engine) : undefined),
    () => (engine ? selector(engine) : undefined),
  )
}

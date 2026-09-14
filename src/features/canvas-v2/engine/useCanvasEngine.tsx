/**
 * useCanvasEngine — 在 React 树中共享 CanvasEngine 实例。
 * 现有面板大多通过 props 接收 editor；overlay 卡片等直接用此 hook 取引擎。
 */
import { createContext, useContext } from 'react'
import type { CanvasEngine } from './CanvasEngine'

export const CanvasEngineContext = createContext<CanvasEngine | null>(null)

export function useCanvasEngine(): CanvasEngine {
  const engine = useContext(CanvasEngineContext)
  if (!engine) {
    throw new Error('useCanvasEngine 必须在 <CanvasEngineContext.Provider> 内使用')
  }
  return engine
}

export function useOptionalCanvasEngine(): CanvasEngine | null {
  return useContext(CanvasEngineContext)
}

/**
 * smokeTest — Excalidraw 混合引擎冒烟测试隔离页面
 *
 * 直接挂载 <ExcalidrawCanvas>，在 onReady 中程序化创建/移动/选中/撤销/重做卡片，
 * 并将操作日志与任何 window error 输出到屏幕左下角，便于无头浏览器读取验证。
 */
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ExcalidrawCanvas } from './ExcalidrawCanvas'
import type { CanvasEngine } from './CanvasEngine'

function Smoke() {
  const [log, setLog] = useState<string[]>([])
  const push = (s: string) => setLog((l) => [...l, s])

  useEffect(() => {
    const onErr = (e: ErrorEvent) => push('WINDOW ERROR: ' + (e.message || e.error))
    const onRej = (e: PromiseRejectionEvent) => push('UNHANDLED REJECTION: ' + (e.reason?.message ?? String(e.reason)))
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => {
      window.removeEventListener('error', onErr)
      window.removeEventListener('unhandledrejection', onRej)
    }
  }, [])

  const onReady = (eng: CanvasEngine) => {
    try {
      push('engine ready')
      const id = eng.createShape({
        type: 'note-card',
        x: 120,
        y: 120,
        props: { w: 260, h: 200, text: '# Hello\n\nThis is a **test** card with `code`.', color: '#3b82f6' },
      })
      push('created note-card id=' + id)
      push('shapes after create=' + eng.getCurrentPageShapes().length)
      push('elements in scene=' + (eng.excalidrawAPI ? 'attached' : 'no-api'))

      // 移动
      eng.updateShape({ id, x: 240, y: 260 })
      const moved = eng.getShape(id)
      push('after move x=' + (moved ? moved.x : 'null') + ' y=' + (moved ? moved.y : 'null'))

      // 选中
      eng.setSelectedShapes([id])
      push('selected=' + eng.getSelectedShapeIds().join(','))

      // 撤销 / 重做
      eng.undo()
      push('after undo x=' + (eng.getShape(id)?.x ?? 'null'))
      eng.redo()
      push('after redo x=' + (eng.getShape(id)?.x ?? 'null'))

      // 序列化往返
      const snap = eng.serialize()
      push('serialize.version=' + snap.version + ' shapes=' + snap.shapes.length)

      // 第二个卡片 + 连线（箭头）
      const id2 = eng.createShape({
        type: 'note-card',
        x: 520,
        y: 120,
        props: { w: 260, h: 200, text: 'Second card', color: '#22c55e' },
      })
      push('created second id=' + id2)
      push('FINAL shapes=' + eng.getCurrentPageShapes().length)
      push('DONE-OK')
    } catch (err: unknown) {
      push('EXCEPTION: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ExcalidrawCanvas onReady={onReady} isReadonly={false} theme="light" />
      <div
        style={{
          position: 'fixed',
          left: 8,
          bottom: 8,
          right: 8,
          maxHeight: 240,
          overflow: 'auto',
          background: 'rgba(0,0,0,0.82)',
          color: '#0f0',
          font: '12px/1.5 monospace',
          padding: 10,
          zIndex: 9999,
          whiteSpace: 'pre-wrap',
        }}
      >
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Smoke />)

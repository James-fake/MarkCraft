import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RealProviders } from '../providers/RealProviders'
import { useAppGlobalEffects } from '@features/appRuntime/useAppGlobalEffects'
import { startAutoBackupScheduler } from '@services/backupService'

/**
 * P0 回归锁（2026-09-27）：应用级副作用必须**常驻壳层**，不得随视图切换停摆。
 *
 * 报障原型：useAppLogic（S1–S7 全家桶）只被 EditorPanel 挂载，而 AuroraShell.renderView
 * 是 switch/case ⇒ 切到白板/图谱/知识库时 EditorPanel 卸载，S5 MOC 自动更新、
 * S7 定时备份调度、S6b beforeunload 守卫全部停摆。本文件锁住「挂载点应为壳」这一结论。
 */
vi.mock('@services/backupService', () => ({
  startAutoBackupScheduler: vi.fn(() => 4242 as unknown as ReturnType<typeof setInterval>),
}))

/** 模拟 AuroraShell：自身常驻（挂载应用级 hook），按视图条件渲染「编辑器面板」 */
function ShellHost({ initialEditor = true }: { initialEditor?: boolean }) {
  const [editorMounted, setEditorMounted] = useState(initialEditor)
  useAppGlobalEffects()
  return (
    <div>
      <button onClick={() => setEditorMounted((v) => !v)}>切换视图</button>
      {editorMounted ? <div data-testid="editor-panel">编辑器面板</div> : <div data-testid="canvas-panel">白板面板</div>}
    </div>
  )
}

function renderShell(initialEditor = true) {
  return render(
    <RealProviders>
      <ShellHost initialEditor={initialEditor} />
    </RealProviders>,
  )
}

describe('useAppGlobalEffects · 应用级副作用常驻（P0）', () => {
  beforeEach(() => {
    vi.mocked(startAutoBackupScheduler).mockClear()
  })

  it('🚨 非编辑器视图（编辑器面板根本没挂载）也启动备份调度器', () => {
    renderShell(false)
    expect(screen.getByTestId('canvas-panel')).toBeTruthy()
    expect(startAutoBackupScheduler).toHaveBeenCalledTimes(1)
  })

  it('🚨 视图切换（编辑器面板卸载 → 白板）后调度器既不清理、也不重复启动', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    renderShell(true)
    expect(screen.getByTestId('editor-panel')).toBeTruthy()
    expect(startAutoBackupScheduler).toHaveBeenCalledTimes(1)

    // 切到白板视图：编辑器面板卸载（这正是旧架构下 S5/S7 停摆的触发点）
    act(() => {
      fireEvent.click(screen.getByText('切换视图'))
    })
    expect(screen.getByTestId('canvas-panel')).toBeTruthy()
    expect(clearSpy).not.toHaveBeenCalled()
    expect(startAutoBackupScheduler).toHaveBeenCalledTimes(1)

    // 切回编辑器：依然只启动过一次（不双跑）
    act(() => {
      fireEvent.click(screen.getByText('切换视图'))
    })
    expect(screen.getByTestId('editor-panel')).toBeTruthy()
    expect(startAutoBackupScheduler).toHaveBeenCalledTimes(1)
    clearSpy.mockRestore()
  })
})

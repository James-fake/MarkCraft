/**
 * 平台抽象层 · 浏览器实现契约测试。
 *
 * 为什么值得单独测：`browserPlatform` 是**基准行为定义** —— P2 接入 Electron 时，
 * `electronPlatform` 必须与它语义对齐（同样的「取消返回 null」「非取消错误上抛」
 * 「目录写入支持嵌套相对路径」）。这里钉住的每条，都是将来 Electron 实现的对标点。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { browserPlatform } from './browser'

/** jsdom 的 Blob 未实现 `text()`，用 FileReader 读取（跨环境稳定） */
function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

/** 假 file handle：记录写入内容 */
function makeFileHandle(name = 'note.md') {
  const written: Blob[] = []
  const handle = {
    name,
    createWritable: vi.fn(async () => ({
      write: vi.fn(async (b: Blob) => {
        written.push(b)
      }),
      close: vi.fn(async () => {}),
    })),
  }
  return { handle, written }
}

/**
 * 假 directory handle：模拟真实层级 —— 每次 getDirectoryHandle 返回下一层节点，
 * 从而能验证「嵌套相对路径是否被逐级建目录」以及最终落盘路径。
 */
function makeDirHandle(rootName = 'vault') {
  const createdDirs: string[] = []
  const writtenFiles: Array<{ path: string[]; text: string }> = []

  function node(path: string[]): FileSystemDirectoryHandle {
    return {
      name: path.length ? path[path.length - 1] : rootName,
      async getDirectoryHandle(n: string) {
        createdDirs.push(n)
        return node([...path, n])
      },
      async getFileHandle(n: string) {
        return {
          name: n,
          async createWritable() {
            return {
              async write(b: Blob) {
                writtenFiles.push({ path: [...path, n], text: await readBlobText(b) })
              },
              async close() {
                /* 桩：无缓冲，无需 flush */
              },
            }
          },
        }
      },
    } as unknown as FileSystemDirectoryHandle
  }

  return { handle: node([]), createdDirs, writtenFiles }
}

describe('browserPlatform', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('能力探测', () => {
    it('环境无 File System Access API 时两种能力均为 false', () => {
      expect(browserPlatform.canPickFiles()).toBe(false)
      expect(browserPlatform.canPickDirectory()).toBe(false)
    })

    it('文件能力与目录能力各自独立（不混用，混用会误报）', () => {
      vi.stubGlobal('showSaveFilePicker', vi.fn())
      expect(browserPlatform.canPickFiles()).toBe(true)
      expect(browserPlatform.canPickDirectory()).toBe(false)

      vi.stubGlobal('showDirectoryPicker', vi.fn())
      expect(browserPlatform.canPickDirectory()).toBe(true)
    })
  })

  describe('pickSaveFile', () => {
    it('能力不可用时返回 null，不抛错', async () => {
      expect(await browserPlatform.pickSaveFile({ suggestedName: 'a.md' })).toBeNull()
    })

    it('用户取消（AbortError）视为「没选」→ null', async () => {
      const abort = Object.assign(new Error('user cancelled'), { name: 'AbortError' })
      vi.stubGlobal(
        'showSaveFilePicker',
        vi.fn(async () => {
          throw abort
        }),
      )
      expect(await browserPlatform.pickSaveFile({ suggestedName: 'a.md' })).toBeNull()
    })

    it('非取消错误向上抛（不静默吞掉真实故障）', async () => {
      vi.stubGlobal(
        'showSaveFilePicker',
        vi.fn(async () => {
          throw new Error('disk on fire')
        }),
      )
      await expect(browserPlatform.pickSaveFile({ suggestedName: 'a.md' })).rejects.toThrow('disk on fire')
    })

    it('成功时返回 SaveTarget，且 write 真正落到该文件', async () => {
      const { handle, written } = makeFileHandle('out.md')
      vi.stubGlobal('showSaveFilePicker', vi.fn(async () => handle))

      const target = await browserPlatform.pickSaveFile({ suggestedName: 'out.md' })
      expect(target).not.toBeNull()
      expect(target!.name).toBe('out.md')
      expect(target!.kind).toBe('file')

      await target!.write(new Blob(['hello']))
      expect(written).toHaveLength(1)
      expect(await readBlobText(written[0])).toBe('hello')
    })
  })

  describe('pickSaveDirectory', () => {
    it('能力不可用时返回 null', async () => {
      expect(await browserPlatform.pickSaveDirectory()).toBeNull()
    })

    it('write 支持嵌套相对路径（逐级创建中间目录）', async () => {
      const { handle, createdDirs, writtenFiles } = makeDirHandle()
      vi.stubGlobal('showDirectoryPicker', vi.fn(async () => handle))

      const dir = await browserPlatform.pickSaveDirectory()
      expect(dir!.kind).toBe('directory')

      await dir!.write(new Blob(['<html></html>']), 'posts/x/index.html')
      expect(createdDirs).toEqual(['posts', 'x'])
      expect(writtenFiles).toEqual([{ path: ['posts', 'x', 'index.html'], text: '<html></html>' }])
    })

    it('未提供文件名时抛错（目录目标必须给名字）', async () => {
      const { handle } = makeDirHandle()
      vi.stubGlobal('showDirectoryPicker', vi.fn(async () => handle))
      const dir = await browserPlatform.pickSaveDirectory()
      await expect(dir!.write(new Blob(['x']))).rejects.toThrow('必须提供文件名')
    })
  })

  describe('saveBlob', () => {
    it('经 <a download> 触发下载，并延迟回收 blob URL', async () => {
      vi.useFakeTimers()
      const createObjectURL = vi.fn(() => 'blob:mock')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      // 保留原实现（真实 append），否则随后的 removeChild 会因节点不在树中而抛错
      const appendSpy = vi.spyOn(document.body, 'appendChild')

      const blob = new Blob(['hi'], { type: 'text/plain' })
      await browserPlatform.saveBlob(blob, 'a.md')

      expect(createObjectURL).toHaveBeenCalledWith(blob)
      expect(click).toHaveBeenCalledTimes(1)
      const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
      expect(anchor.download).toBe('a.md')
      expect(anchor.href).toContain('blob:mock')

      // 延迟回收：立刻不回收（给下载管理器读取时间），1s 后才回收
      expect(revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })
  })

  describe('窗口控制（浏览器为诚实降级，不伪造能力）', () => {
    it('minimize 降级为失焦（保持迁移前行为）', () => {
      const blur = vi.spyOn(window, 'blur').mockImplementation(() => {})
      browserPlatform.window.minimize()
      expect(blur).toHaveBeenCalledTimes(1)
    })

    it('toggleMaximize 在「进入全屏 / 退出全屏」间切换', async () => {
      let fullscreenEl: Element | null = null
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => fullscreenEl,
      })
      const requestFullscreen = vi.fn(async () => {
        fullscreenEl = document.documentElement
      })
      const exitFullscreen = vi.fn(async () => {
        fullscreenEl = null
      })
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        configurable: true,
        value: requestFullscreen,
      })
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })

      browserPlatform.window.toggleMaximize()
      expect(requestFullscreen).toHaveBeenCalled()

      fullscreenEl = document.documentElement
      browserPlatform.window.toggleMaximize()
      expect(exitFullscreen).toHaveBeenCalled()
    })

    it('isMaximized 反映当前全屏态', () => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null })
      expect(browserPlatform.window.isMaximized()).toBe(false)

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      })
      expect(browserPlatform.window.isMaximized()).toBe(true)
    })

    it('close 是 no-op（网页无法关闭自身窗口）', () => {
      expect(() => browserPlatform.window.close()).not.toThrow()
    })
  })

  describe('revealInFolder', () => {
    it('浏览器无此能力 → 恒为 false（调用方据此决定是否提示）', async () => {
      expect(await browserPlatform.revealInFolder('/tmp/note.md')).toBe(false)
    })
  })

  it('kind 标识为 browser（供运行时分派与断言）', () => {
    expect(browserPlatform.kind).toBe('browser')
  })
})

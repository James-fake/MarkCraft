import { SUPPORTED_ACCEPT } from './importFile'

/**
 * 在用户手势的同步调用栈内**直接**调起系统文件选择框（不经过任何中间弹窗）。
 *
 * 设计依据：
 * - 遵循 macOS HIG「不为简单操作弹 sheet」，以及 Open = Cmd/Ctrl+O 的直达惯例；
 * - ⚠️ `input.click()` 必须由用户手势同步触发，故本函数须在点击/按键处理器中**同步**调用，
 *   不可放进 await / setTimeout 之后，否则会被浏览器拦截。
 *
 * @param onPick 选中文件后的回调（可 async，内部自行处理错误）
 */
export function openFilePicker(onPick: (file: File) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = SUPPORTED_ACCEPT
  input.style.display = 'none'

  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    input.remove()
  }
  // 兜底：不支持 `cancel` 事件的环境（Chrome <113 / Firefox <91 / Safari <16.4），系统文件框
  // 关闭会让窗口重新获得焦点 —— 借此清理，避免隐藏 input 永久残留 <body>（审查 L2-2026-10-07）。
  // 选中文件时 change 先触发 cleanup（幂等），此处再触发为 no-op；{ once: true } 自动摘除监听。
  const onWindowFocus = () => { setTimeout(cleanup, 0) }

  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) onPick(file)
    cleanup()
  })
  input.addEventListener('cancel', cleanup)
  window.addEventListener('focus', onWindowFocus, { once: true })

  document.body.appendChild(input)
  input.click()
}

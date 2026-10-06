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
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) onPick(file)
    input.remove()
  })
  // 用户取消选择时清理（现代浏览器支持 cancel 事件）
  input.addEventListener('cancel', () => input.remove())
  document.body.appendChild(input)
  input.click()
}

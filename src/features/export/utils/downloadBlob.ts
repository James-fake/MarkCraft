import { platform } from '@platform'

/**
 * 保存二进制产物（导出 / 下载）。
 *
 * 统一走平台抽象层：浏览器 = 触发下载（原行为）；桌面 = 原生保存对话框 + 写文件。
 *
 * 独立成 leaf 模块，以打破 `exportUtils ↔ exportImage` 的 barrel 循环依赖
 * （`exportImage` 曾直接从 `exportUtils` 取 `downloadBlob`，而 `exportUtils`
 * 又 re-export `exportImage`，形成运行时环形引用）。`exportUtils` 继续 re-export
 * 本函数以保持对外 API 不变。
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  void platform.saveBlob(blob, fileName)
}

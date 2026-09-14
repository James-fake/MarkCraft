/**
 * 知识库全屏覆盖层（搜索/问答/导出）的统一挂载点。
 *
 * 这些面板使用 `position: fixed; inset: 0`，但它们原本被渲染在
 * `.kb-content-inner` 内部。`.kb-content-inner` 带有 `animation: kbTabIn ... both`，
 * 动画结束后会冻结一个 identity transform，从而成为 fixed 定位的 containing block，
 * 导致 `inset: 0` 相对一个 `max-width: 1080px; margin: 0 auto`（零高度）的盒子解析，
 * 面板被压成高度 0 → 看起来“空白”。
 *
 * 解决：把覆盖层 portal 到 `.kb-shell` 内部的 `#kb-overlay-root`。
 * `.kb-shell` 本身是 `position: fixed; inset: 0`（满屏），所以它作为 containing block
 * 时 `inset: 0` 仍解析为整屏；同时它定义了 `--kb-*` 主题 token，导出菜单的玻璃样式得以保留。
 */
export function getKbOverlayRoot(): HTMLElement {
  if (typeof document === 'undefined') return null as unknown as HTMLElement
  return document.getElementById('kb-overlay-root') || document.body
}

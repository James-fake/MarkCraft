/**
 * 块引用桥接：连接 React Context（BlockIndexStore）与非 Context 组件（Preview）。
 * Preview 无法直接访问 BlockIndexStore，通过此全局回调注册表转发点击与解析请求。
 */

export type BlockResolver = (blockId: string) => {
  fileId: string
  fileName: string
  text: string
  lineStart: number
  lineEnd: number
} | null

export type BlockClickHandler = (blockId: string) => void

let currentResolver: BlockResolver | null = null
let currentClickHandler: BlockClickHandler | null = null

export function setBlockResolver(resolver: BlockResolver | null) {
  currentResolver = resolver
}

export function setBlockClickHandler(handler: BlockClickHandler | null) {
  currentClickHandler = handler
}

export function resolveBlock(blockId: string) {
  return currentResolver ? currentResolver(blockId) : null
}

export function triggerBlockClick(blockId: string) {
  if (currentClickHandler) currentClickHandler(blockId)
}

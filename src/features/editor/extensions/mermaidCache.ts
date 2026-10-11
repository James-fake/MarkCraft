// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：Mermaid SVG 渲染缓存，唯一消费者是同目录的 MermaidBlockView。
// 未下沉 L0：它静态依赖 mermaid（重库），底座层应保持零领域/重依赖。
// 同目录已有 CodeHighlightConfig.ts 这类「视图配套文件」先例。
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { simpleHash } from '@utils/hash'

const svgCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

export const getCachedSvg = (code: string): string | undefined => {
  return svgCache.get(simpleHash(code));
};

export const setCachedSvg = (code: string, svg: string): void => {
  if (svgCache.size >= MAX_CACHE_SIZE) {
    // 清除最早的一半缓存，而非全部清空，减少重新渲染闪烁
    const keys = Array.from(svgCache.keys());
    const half = Math.floor(keys.length / 2);
    for (let i = 0; i < half; i++) {
      svgCache.delete(keys[i]);
    }
  }
  svgCache.set(simpleHash(code), svg);
};

export const clearCache = (): void => {
  svgCache.clear();
};

// Shared mermaid initialization — supports theme switching
let lastInitializedTheme: string | null = null;

export function initMermaid(theme: string): void {
  const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
  if (lastInitializedTheme === mermaidTheme) return;
  lastInitializedTheme = mermaidTheme;
  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: 'strict',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true },
    mindmap: { padding: 16, useMaxWidth: true },
  });
}

// 预热：模块加载时立即以默认主题初始化 mermaid，避免首次渲染延迟
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true },
    mindmap: { padding: 16, useMaxWidth: true },
  });
  lastInitializedTheme = 'default';
} catch {}


// ── 共享渲染辅助（编辑器节点视图 与 预览窗格 共用，避免两条管线各写一套） ──

let domRenderIdCounter = 0

/** mermaid 在 strict 模式下已禁用内嵌 HTML/事件处理器，这里再对 SVG 兜底净化一次 */
export function sanitizeMermaidSvg(svg: string): string {
  try {
    return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
  } catch {
    return svg
  }
}

// 编解码协议已下沉 @core/markdown/diagramCodec（产出端与消费端共用同一份，避免漂移）。
// 此处 import 供本文件使用，并 re-export 保持既有导入路径不变。
import { decodeDiagramCode, encodeDiagramCode } from '@core/markdown/diagramCodec'

export { decodeDiagramCode, encodeDiagramCode }

/**
 * 把容器里**尚未渲染**的 `.mermaid-diagram[data-code]` 渲染成 SVG。
 *
 * ⚠️ 真实事故（2026-10-11 用户报障）：思维导图在所见即所得/源码模式正常，**预览窗格一直转圈**。
 *    根因：预览管线（`useMarkdownRenderer`）只把代码块换成
 *    `<div class="mermaid-diagram mermaid-loading" data-code="...">` 占位，
 *    而全仓**唯一的渲染器是 Tiptap 的 MermaidBlockView（节点视图）** —— 预览没有 Tiptap，
 *    于是没有任何组件认领这个占位 → loading 永远不消失。
 *    `Preview.tsx` 里那句「保留 data-rendered=true 的图表」的注释说明**设计上本来就该有**这个渲染器。
 *
 * 渲染完置 `data-rendered="true"`：预览的 morphdom 更新据此保留已渲染的 SVG（不再退回 loading）。
 * mindmap 走的是 mermaid 内置的 mindmap 语法（`isMindmapCode` 判定代码以 `mindmap` 开头），
 * 故这里用 mermaid 本身渲染即可，无需引入画布组件。
 */
export async function renderMermaidInDom(
  container: HTMLElement,
  theme: string,
  labels: { syntaxError: string; renderError: string },
): Promise<void> {
  const nodes = container.querySelectorAll<HTMLElement>('.mermaid-diagram[data-code]')
  if (!nodes.length) return
  initMermaid(theme)

  for (const el of Array.from(nodes)) {
    if (el.dataset.rendered === 'true') continue
    const code = decodeDiagramCode(el.dataset.code || '')
    if (!code.trim()) continue

    const cached = getCachedSvg(code)
    if (cached) {
      el.innerHTML = sanitizeMermaidSvg(cached)
      el.dataset.rendered = 'true'
      continue
    }

    const id = `mermaid-preview-${++domRenderIdCounter}`
    try {
      await mermaid.parse(code)
    } catch {
      clearMermaidParseError()
      el.innerHTML = `<div style="padding:0.75rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.375rem;font-size:0.8rem;"><strong>${labels.syntaxError}</strong></div>`
      el.dataset.rendered = 'true'
      continue
    }

    try {
      const { svg } = await mermaid.render(id, code)
      const safe = sanitizeMermaidSvg(svg)
      el.innerHTML = safe
      setCachedSvg(code, safe)
      el.dataset.rendered = 'true'
    } catch {
      clearMermaidParseError()
      el.innerHTML = `<div style="padding:0.75rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.375rem;font-size:0.8rem;"><strong>${labels.renderError}</strong></div>`
      el.dataset.rendered = 'true'
    }
  }
}

/** mermaid 解析失败后会把错误挂到全局 parseError 上，不清掉会污染下一次渲染 */
function clearMermaidParseError(): void {
  try {
    const m = mermaid as unknown as { parseError?: unknown }
    m.parseError = undefined
  } catch {
    /* 忽略 */
  }
}

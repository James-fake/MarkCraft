import mermaid from 'mermaid'
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
    securityLevel: 'loose',
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
    securityLevel: 'loose',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true },
    mindmap: { padding: 16, useMaxWidth: true },
  });
  lastInitializedTheme = 'default';
} catch {}

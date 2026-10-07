import katex from 'katex';
import { logger } from '@utils/logger';

/** KaTeX trust 回调收到的上下文（protocol 形如 'http' | 'https' | 'mailto' | '_relative' | '_unknown'） */
interface KatexTrustContext {
  command?: string;
  url?: string;
  protocol?: string;
}

interface MathRenderOptions {
  throwOnError?: boolean;
  strict?: boolean | 'ignore' | 'warn' | 'error';
  trust?: boolean | ((context: KatexTrustContext) => boolean);
}

interface MathErrorLog {
  formula: string;
  displayMode: boolean;
  error: string;
  timestamp: number;
}

export interface MathRenderConfig {
  enableFormulaNumbering?: boolean;
  maxChunkSize?: number;
  debounceMs?: number;
}

const DEFAULT_CONFIG: MathRenderConfig = {
  enableFormulaNumbering: false,
  maxChunkSize: 50000,
  debounceMs: 300,
};

let currentConfig: MathRenderConfig = { ...DEFAULT_CONFIG };

/**
 * 安全：KaTeX `trust` 不设 `true`（那会放行 \href{javascript:…}、\includegraphics 远程图等）。
 * 仅放行 http/https/mailto 与相对路径；其余（javascript:/data:/vbscript:/file: 等）一律拒绝。
 * 该输出会直接进入预览 DOM（且不再二次净化），必须在此拦截。
 */
const ALLOWED_PROTOCOLS = new Set(['http', 'https', 'mailto', '_relative']);

const DEFAULT_OPTIONS: MathRenderOptions = {
  throwOnError: false,
  strict: 'ignore',
  trust: (context: KatexTrustContext) => {
    const protocol = (context.protocol || '').toLowerCase();
    return ALLOWED_PROTOCOLS.has(protocol);
  },
};

const errorLogs: MathErrorLog[] = [];
const MAX_ERROR_LOGS = 100;

const renderCache = new Map<string, string>();
const MAX_CACHE_SIZE = 300;

const CODE_BLOCK_REGEX = /<pre[^>]*>[\s\S]*?<\/pre>/gi;
const INLINE_CODE_REGEX = /<code[^>]*>[\s\S]*?<\/code>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

const ESCAPED_DOLLAR = '\x00ESCAPED_DOLLAR\x00';

function logError(formula: string, displayMode: boolean, error: string): void {
  errorLogs.push({
    formula,
    displayMode,
    error,
    timestamp: Date.now(),
  });
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs.shift();
  }
  logger.warn(`KaTeX Formula render error: ${error}`, { formula, displayMode });
}

export function getMathErrorLogs(): MathErrorLog[] {
  return [...errorLogs];
}

export function clearMathErrorLogs(): void {
  errorLogs.length = 0;
}

export function configureMathRender(config: Partial<MathRenderConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

export function getMathConfig(): MathRenderConfig {
  return { ...currentConfig };
}

function getCacheKey(formula: string, displayMode: boolean): string {
  return `${displayMode ? 'D' : 'I'}:${formula}`;
}

function protectCodeBlocks(html: string): { html: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let counter = 0;

  const protectedHtml = html.replace(CODE_BLOCK_REGEX, (match) => {
    const key = `\x00CODEBLOCK_${counter++}\x00`;
    placeholders.set(key, match);
    return key;
  });

  const finalHtml = protectedHtml.replace(INLINE_CODE_REGEX, (match) => {
    const key = `\x00INLINECODE_${counter++}\x00`;
    placeholders.set(key, match);
    return key;
  });

  return { html: finalHtml, placeholders };
}

function restorePlaceholders(html: string, placeholders: Map<string, string>): string {
  let result = html;
  placeholders.forEach((original, key) => {
    result = result.replace(key, original);
  });
  return result;
}

function protectEscapedDollars(text: string): string {
  return text.replace(/\\(\$\$?)/g, (_, dollarSeq) => {
    return dollarSeq.length === 2
      ? ESCAPED_DOLLAR + ESCAPED_DOLLAR
      : ESCAPED_DOLLAR;
  });
}

function restoreEscapedDollars(text: string): string {
  return text.split(ESCAPED_DOLLAR).join('$');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtmlTags(text: string): string {
  return text.replace(HTML_TAG_REGEX, '');
}

let formulaCounter = 0;

function resetFormulaCounter(): void {
  formulaCounter = 0;
}

function renderFormula(formula: string, displayMode: boolean): string {
  const trimmedFormula = formula.trim();
  if (!trimmedFormula) return displayMode ? '$$' : '$';

  const cacheKey = getCacheKey(trimmedFormula, displayMode);

  const cached = renderCache.get(cacheKey);
  if (cached) {
    if (displayMode && currentConfig.enableFormulaNumbering) {
      formulaCounter++;
      return cached.replace(
        'class="katex-display-wrapper"',
        `class="katex-display-wrapper" data-formula-number="${formulaCounter}"`
      );
    }
    return cached;
  }

  try {
    const rendered = katex.renderToString(trimmedFormula, {
      ...DEFAULT_OPTIONS,
      displayMode,
      output: 'html',
    });

    let result: string;
    if (displayMode) {
      result = `<span class="katex-display-wrapper" title="${escapeHtml(trimmedFormula)}">${rendered}</span>`;
    } else {
      result = `<span class="katex-inline-wrapper" title="${escapeHtml(trimmedFormula)}">${rendered}</span>`;
    }

    if (renderCache.size >= MAX_CACHE_SIZE) {
      const firstKey = renderCache.keys().next().value;
      if (firstKey !== undefined) renderCache.delete(firstKey);
    }
    renderCache.set(cacheKey, result);

    if (displayMode && currentConfig.enableFormulaNumbering) {
      formulaCounter++;
      return result.replace(
        'class="katex-display-wrapper"',
        `class="katex-display-wrapper" data-formula-number="${formulaCounter}"`
      );
    }

    return result;
  } catch (error: unknown) {
    const err = error as { message?: string };
    const errorMsg = err.message || 'Unknown error';
    const escapedFormula = escapeHtml(trimmedFormula);
    const escapedError = escapeHtml(stripHtmlTags(errorMsg));

    logError(trimmedFormula, displayMode, escapedError);

    if (displayMode) {
      return `<span class="katex-error-wrapper katex-error-display">
        <span class="katex-error-formula">${escapedFormula}</span>
        <span class="katex-error-message">${escapedError}</span>
      </span>`;
    }
    return `<span class="katex-error-wrapper katex-error-inline" title="${escapedFormula}">
      <span class="katex-error-formula">${escapedFormula}</span>
    </span>`;
  }
}

function findAndRenderFormulas(text: string): string {
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    if (text[i] === '$') {
      if (i + 1 < len && text[i + 1] === '$') {
        const start = i;
        i += 2;
        let depth = 1;
        const formulaStart = i;

        while (i < len && depth > 0) {
          if (text[i] === '$' && i + 1 < len && text[i + 1] === '$') {
            depth--;
            if (depth === 0) break;
            i += 2;
          } else {
            i++;
          }
        }

        if (depth === 0) {
          const formula = text.substring(formulaStart, i);
          result += renderFormula(formula, true);
          i += 2;
        } else {
          result += text.substring(start, i);
        }
      } else {
        const start = i;
        i++;
        const formulaStart = i;

        while (i < len) {
          if (text[i] === '$') {
            break;
          }
          if (text[i] === '\n') {
            break;
          }
          i++;
        }

        if (i < len && text[i] === '$' && i > formulaStart) {
          const formula = text.substring(formulaStart, i);
          if (formula.trim().length > 0) {
            result += renderFormula(formula, false);
          } else {
            result += '$$';
          }
          i++;
        } else {
          result += text.substring(start, i);
        }
      }
    } else {
      result += text[i];
      i++;
    }
  }

  return result;
}

function renderMathChunk(text: string): string {
  const escaped = protectEscapedDollars(text);
  const processed = findAndRenderFormulas(escaped);
  return restoreEscapedDollars(processed);
}

export function renderMathInHtml(html: string): string {
  if (!html || !html.includes('$')) return html;

  resetFormulaCounter();

  const { html: protectedHtml, placeholders } = protectCodeBlocks(html);

  let result: string;

  if (protectedHtml.length > (currentConfig.maxChunkSize || 50000)) {
    result = renderMathChunked(protectedHtml);
  } else {
    result = renderMathChunk(protectedHtml);
  }

  result = restorePlaceholders(result, placeholders);

  return result;
}

function renderMathChunked(html: string): string {
  const chunkSize = currentConfig.maxChunkSize || 50000;
  const chunks: string[] = [];
  let start = 0;

  while (start < html.length) {
    let end = Math.min(start + chunkSize, html.length);

    if (end < html.length) {
      let searchPos = end;
      while (searchPos > start) {
        if (html[searchPos] === '>') {
          end = searchPos + 1;
          break;
        }
        searchPos--;
      }
      if (searchPos === start) {
        end = Math.min(start + chunkSize, html.length);
      }
    }

    chunks.push(html.substring(start, end));
    start = end;
  }

  return chunks.map(chunk => renderMathChunk(chunk)).join('');
}

export function renderMathInHtmlAsync(html: string): Promise<string> {
  return new Promise((resolve) => {
    if (!html || !html.includes('$')) {
      resolve(html);
      return;
    }

    resetFormulaCounter();

    const { html: protectedHtml, placeholders } = protectCodeBlocks(html);

    if (typeof requestIdleCallback === 'undefined' || protectedHtml.length <= (currentConfig.maxChunkSize || 50000)) {
      const result = renderMathChunk(protectedHtml);
      resolve(restorePlaceholders(result, placeholders));
      return;
    }

    const chunks = splitIntoChunks(protectedHtml, currentConfig.maxChunkSize || 50000);
    const renderedChunks: string[] = [];
    let chunkIndex = 0;

    function processNextChunk(deadline?: IdleDeadline) {
      while (chunkIndex < chunks.length) {
        if (deadline && deadline.timeRemaining() < 5) {
          requestIdleCallback(processNextChunk);
          return;
        }

        renderedChunks.push(renderMathChunk(chunks[chunkIndex]));
        chunkIndex++;
      }

      if (chunkIndex >= chunks.length) {
        const finalResult = restorePlaceholders(renderedChunks.join(''), placeholders);
        resolve(finalResult);
      }
    }

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(processNextChunk);
    } else {
      processNextChunk();
    }
  });
}

function splitIntoChunks(html: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < html.length) {
    let end = Math.min(start + chunkSize, html.length);

    if (end < html.length) {
      let searchPos = end;
      while (searchPos > start) {
        if (html[searchPos] === '>') {
          end = searchPos + 1;
          break;
        }
        searchPos--;
      }
      if (searchPos === start) {
        end = Math.min(start + chunkSize, html.length);
      }
    }

    chunks.push(html.substring(start, end));
    start = end;
  }

  return chunks;
}

export function clearRenderCache(): void {
  renderCache.clear();
}

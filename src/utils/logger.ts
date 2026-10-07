/**
 * Unified logger utility for MarkCraft
 * V4-L6: Centralizes error/warning logging for production control
 */
/* eslint-disable no-console -- 日志模块本体：logger 即 console 的统一封装 */

const isDev = import.meta.env.DEV

export const logger = {
  error(...args: unknown[]): void {
    if (isDev) console.error('[MarkCraft]', ...args)
  },

  warn(...args: unknown[]): void {
    if (isDev) console.warn('[MarkCraft]', ...args)
  },

  info(...args: unknown[]): void {
    if (isDev) console.info('[MarkCraft]', ...args)
  },
}

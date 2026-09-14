/**
 * Type declarations for Electron API exposed via preload script
 * Only available when running in Electron desktop environment
 */
interface ElectronPandocAPI {
  convert(content: string, fromFormat: string, toFormat: string): Promise<{
    error?: string
    buffer?: ArrayBuffer
  }>
}

interface ElectronAPI {
  pandoc: ElectronPandocAPI
}

interface Window {
  electronAPI?: ElectronAPI
}

export interface ImageHostConfig {
  type: 'none' | 'picgo' | 'custom'
  picgoServerUrl: string
  customApiUrl: string
  customApiHeaders: Record<string, string>
  customResponseUrlPath: string
  autoUpload: boolean
}

const CONFIG_KEY = 'markcraft_image_host_config'

export const DEFAULT_CONFIG: ImageHostConfig = {
  type: 'picgo',
  picgoServerUrl: 'http://127.0.0.1:36677',
  customApiUrl: '',
  customApiHeaders: {},
  customResponseUrlPath: 'data.url',
  autoUpload: false,
}

export function getImageHostConfig(): ImageHostConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveImageHostConfig(config: Partial<ImageHostConfig>): void {
  const current = getImageHostConfig()
  const updated = { ...current, ...config }
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated))
  } catch {}
}

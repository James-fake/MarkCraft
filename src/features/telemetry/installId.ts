/**
 * 匿名安装 ID —— 本地生成一次并持久化，用于去重同一安装实例。
 * 它不是设备指纹，也不含任何个人信息；仅当授权后才会随事件上报。
 */

const INSTALL_ID_KEY = 'markcraft_telemetry_install_id'

export function getInstallId(): string {
  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY)
    if (existing) return existing
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(INSTALL_ID_KEY, generated)
    return generated
  } catch {
    // localStorage 不可用（极端隐私模式）时退化为易变 ID，不影响主流程
    return 'unknown'
  }
}

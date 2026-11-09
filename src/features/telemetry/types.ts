/**
 * MarkCraft 匿名使用统计 —— 事件「槽位」定义。
 *
 * 设计原则（见 docs/PRIVACY_POLICY_zh.md）：
 * - 所有字段均为匿名 / 聚合，**绝不**包含笔记正文、文件名、路径或个人身份信息。
 * - 采集默认关闭（opt-in），且必须配置上报端点后才会上报；否则 track() 是无操作。
 * - 崩溃只上报错误「类名」（截断），不上报堆栈中的任何内容。
 */

export type TelemetryConsent = 'unset' | 'granted' | 'denied'

export type TelemetryPlatform = 'win' | 'mac' | 'linux' | 'unknown'

export type TelemetryEventType =
  | 'app_launch' // 应用启动（≈安装后首次运行的时间点）
  | 'app_close' // 应用关闭
  | 'feature_dwell' // 在某功能面板停留的时长
  | 'feature_use' // 某功能被使用（计数）
  | 'heartbeat' // 每日心跳 / last-seen（用于推断流失）
  | 'crash' // 未捕获异常（仅类名）

export interface TelemetryEvent {
  type: TelemetryEventType
  /** 匿名随机安装 ID（本地生成，与任何个人信息无关） */
  installId: string
  /** 事件时间戳（epoch ms） */
  ts: number
  /** 应用版本（来自 package.json），用于区分数据归属 */
  appVersion: string
  /** 操作系统 */
  platform: TelemetryPlatform
  /** 界面语言（'zh' | 'en'） */
  locale: string
  /** feature_dwell / feature_use 的功能键，如 'editor.wysiwyg' / 'graph' / 'blog' */
  feature?: string
  /** feature_dwell 的停留毫秒数 */
  durationMs?: number
  /** feature_use 的计数 */
  count?: number
  /** crash 的错误类名（截断），绝不携带消息 / 堆栈内容 */
  detail?: string
}

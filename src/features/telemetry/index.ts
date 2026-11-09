/**
 * 匿名使用统计模块（opt-in，默认关闭）。
 *
 * 对外只暴露「采集钩子」与「配置入口」；一切上报都受 `configureTelemetry` 注入的
 * 授权判定与端点约束 —— 默认零网络、零数据外发。详见 docs/PRIVACY_POLICY_zh.md。
 */
export * from './types'
export { configureTelemetry, isTelemetryEnabled, flushNow, type TelemetryConfig } from './client'
export {
  trackAppLaunch,
  trackAppClose,
  trackFeatureUse,
  trackFeatureDwell,
  trackCrash,
  startHeartbeat,
  useFeatureDwell,
  installErrorHandlers,
} from './events'
export { getInstallId } from './installId'
export { APP_VERSION, TELEMETRY_ENDPOINT, detectPlatform } from './config'

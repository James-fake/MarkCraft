import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/**
 * components/ui 文案字典（UI 基元自持）
 *
 * 分层约束：`components/ui` 属 L2 基础层，**禁止** import `stores` / `locales`
 * （见《MarkCraft_解耦实施方案_2026-09-17.md》§2.2 允许依赖矩阵：
 *  `components/ui` 一行只有 types / utils / core 三列为 ✅）。
 * 因此基元文案不直接取自语言包，而是：
 *   1. 本文件定义类型 + 中文默认值（零上层依赖）；
 *   2. 由装配层 `aurora/providers/RealProviders` 按当前语言注入 —— 与既有的
 *      `ModalProvider createFileTitle` 注入范式完全一致。
 * 未注入时（例如单测直接挂载基元、或旧路径未接 Provider）回落中文默认值。
 *
 * 新增文案时的约定：占位符统一用 `{name}` 形式，由消费方 `.replace()` 填充。
 */
export interface UiLabels {
  /** Modal 右上角关闭按钮 aria-label */
  close: string
  /** Toast 容器 region aria-label */
  notify: string
  /** ConfirmProvider 取消按钮（调用方未传 cancelText 时） */
  cancel: string
  /** ConfirmProvider 确认按钮（调用方未传 confirmText 时） */
  confirm: string
  /** AuroraSelect 无值时的占位文案 */
  selectPlaceholder: string
  /** AuroraSelect 未显式传 ariaLabel 时的兜底 */
  wheelSelect: string
  /** ScrollNumberInput 触发器 aria-label */
  numberWheel: string
  /** 日期为空时的展示文案 */
  unset: string
  /** 日期展示模板，占位符 {y} / {m} / {d} */
  dateYmd: string
  /** DateWheelInput 触发器 aria-label */
  birthdaySelect: string
  /** DateWheelPicker 三列 aria-label */
  wheelYear: string
  wheelMonth: string
  wheelDay: string
  /** ErrorBoundary 导出日志文件头 */
  errReportTitle: string
  errModule: string
  errTime: string
  errMessage: string
  errStack: string
  errComponentStack: string
  /** ErrorBoundary 面板（errorTitle 未传时的兜底，占位符 {name}） */
  errTitle: string
  /** ErrorBoundary 重试按钮（retryText 未传时的兜底） */
  retry: string
  /** ErrorBoundary 说明文案 */
  errDesc: string
  exportLog: string
  techDetails: string
}

/** 中文默认值：与 `locales/zh` 的 `uiLabels` 段保持同值（此处为自持兜底，非单源） */
// eslint-disable-next-line react-refresh/only-export-components -- 默认值常量与 Provider 同文件聚合，属 UI 基元惯用形态（同 Icon.tsx 注册表）
export const DEFAULT_UI_LABELS: UiLabels = {
  close: '关闭',
  notify: '通知',
  cancel: '取消',
  confirm: '确定',
  selectPlaceholder: '请选择',
  wheelSelect: '滚轮选择',
  numberWheel: '数字滚轮选择',
  unset: '未设置',
  dateYmd: '{y} 年 {m} 月 {d} 日',
  birthdaySelect: '选择生日',
  wheelYear: '年',
  wheelMonth: '月',
  wheelDay: '日',
  errReportTitle: 'MarkCraft 错误报告',
  errModule: '模块：{name}',
  errTime: '时间：{t}',
  errMessage: '错误信息：{msg}',
  errStack: '错误堆栈：',
  errComponentStack: '组件堆栈：',
  errTitle: '{name} 运行出错',
  retry: '重试',
  errDesc: '该模块出现异常，但不会影响其它功能。你可以重试恢复，或导出错误日志反馈给开发者。',
  exportLog: '导出日志',
  techDetails: '技术详情',
}

// eslint-disable-next-line react-refresh/only-export-components -- context 与 Provider/hook 强耦合，拆文件只会制造三处循环引用
export const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS)

export function UiLabelsProvider({ value, children }: { value: UiLabels; children: ReactNode }) {
  return <UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>
}

/** 读取当前 UI 基元文案；未注入 Provider 时返回中文默认值 */
// eslint-disable-next-line react-refresh/only-export-components -- Provider 与配套 hook 强耦合，同文件为 React 惯用形态（同 ConfirmProvider）
export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext)
}

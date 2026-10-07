// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：跨层共享的 lint 问题类型（aurora / editor / lint 共 13 处消费）。
// 归 L0 src/utils 而非 src/types：本仓 src/types 无路径别名，13 处引用若走相对路径
// 需逐处计算深度（Phase 3 已因相对深度算错触发一次 TS2307）；置于 src/utils 后
// 统一用 @utils/lintTypes，零深度风险。
/**
 * Lint 问题类型定义
 *
 * 此类型被 editor、lint 等多个模块共享，
 * 提取到 shared 层以消除 editor → lint 的类型耦合。
 */
export interface LintIssue {
  line: number;
  startCol: number;
  endCol: number;
  severity: 'error' | 'warning';
  issueType: string;
  message: string;
  suggestion: string;
}

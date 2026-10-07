// L1 core/constants —— PlantUML 领域常量（无 UI / 无状态）。
//
// Phase 2（2026-09-17）自 features/shared/utils/plantumlConstants.ts **原样下沉**
// （仅改文件名，内容未作任何改写）。下沉同时强化了原设计意图：
// 该文件刻意与 plantumlEncoder（依赖 pako）分离，以免默认端点被连带打包 ——
// 迁入 core/constants 后与 shared/utils 目录彻底脱钩，隔离更彻底。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2.5。
/**
 * PlantUML 相关常量。
 *
 * 单独成文件是为了让 SettingsStore 等「应用外壳」模块可以引用默认端点，
 * 而不必连带把 pako（编码实现的依赖）打进主 chunk。
 */

/** 默认公共渲染端点（SVG 输出）。留空表示禁用远程渲染。 */
export const DEFAULT_PLANTUML_ENDPOINT = 'https://www.plantuml.com/plantuml/svg'

/** 预览层 PlantUML 容器的类名 */
export const PLANTUML_DIAGRAM_CLASS = 'plantuml-diagram'

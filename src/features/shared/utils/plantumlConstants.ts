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

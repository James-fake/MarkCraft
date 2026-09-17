// MarkCraft 架构 · L1 core/constants —— 领域常量（无 UI、无状态）
//
// 承接自 features/shared/utils 下沉的常量（Phase 2）：
//   DEFAULT_PLANTUML_ENDPOINT 等  → @core/constants/plantuml
//
// 为什么存在：常量被 stores/SettingsStore 消费，而它原先寄居在业务模块
// features/shared 内 → 迫使状态层反向引用业务层 → 成环。
//
// 约定：按子路径消费（@core/constants），core 不提供根 barrel。见
// 《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2.5。

export {}

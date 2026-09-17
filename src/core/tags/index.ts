// MarkCraft 架构 · L1 core/tags —— 标签抽取基础能力（无 UI、无状态）
//
// 承接自 features/tags 下沉的纯能力（Phase 2）：
//   extractTags / buildTagTree / TagNode  → @core/tags/tagExtractor
//
// 为什么存在：stores/TagIndexStore 需要标签抽取，而它原先寄居在业务模块
// features/tags 内 → 迫使状态层反向引用业务层 → 成环。
//
// 约定：按子路径消费（@core/tags），core 不提供根 barrel。见
// 《MarkCraft_解耦实施方案_2026-09-17.md》。

export {}

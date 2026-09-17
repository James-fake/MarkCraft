// MarkCraft 架构 · L1 core/data —— 种子数据（无 UI、无状态）
//
// 承接自 features/fileManager 下沉的默认文档内容（Phase 2）：
//   knowledgeLinkGuideContent（中文） → @core/data/defaultDocs/zh
//   knowledgeLinkGuideContent（英文） → @core/data/defaultDocs/en
//
// 为什么存在：种子数据被 stores/FileStore 与 services/fileService 共同消费，
// 原先寄居在业务模块内 → 迫使下层反向引用上层 → 成环。
//
// ⚠️ 这两个文件体量较大（合计约 4859 行），迁移时**只移动不重排内容**，
// 避免产生无意义 diff（见方案 §5.1 R2）。
//
// 约定：按子路径消费（@core/data），core 不提供根 barrel。见
// 《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2.3。

export {}

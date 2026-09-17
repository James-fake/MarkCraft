// MarkCraft 架构 · L1 core/files —— 文件树基础能力（无 UI、无状态）
//
// 承接自 features/fileManager 下沉的纯能力（Phase 2）：
//   collectAllFiles / createInitialFileTree  → @core/files/fileTree
//   addRecentFile / removeRecentFile         → @core/files/recentFiles
//
// 为什么存在：这些能力被 stores(7 文件) 与 services(2 文件) 共同消费，
// 原先寄居在业务模块 features/fileManager 内 → 迫使下层反向引用上层 → 成环。
// 下沉到 L1 后，依赖方向恢复单向。
//
// 约定：core 不提供根 barrel（不建 src/core/index.ts）—— 桶会让整个子图被任何
// 消费者连带挂进模块图（dev 无 tree-shaking），故一律按子路径消费：
//   @core/files  @core/tags  @core/storage  @core/constants  @core/data
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》。

export {}

// MarkCraft 架构 · L1 core/storage —— 持久化基础设施（IndexedDB / Dexie 封装）
//
// 承接自 stores/storage 下沉的基础设施（Phase 1）：
//   db / NoteVersionRecord 等表定义        → @core/storage/db
//   saveLargeData / loadLargeData          → @core/storage/migrate
//   migrateToIndexedDB                     → @core/storage/migrate
//
// 为什么存在：Dexie/IndexedDB 封装是「基础设施」却被放在状态层 stores 下，
// 导致领域操作层 services 反向引用 stores（环 #2 的真因）。下沉到 L1 使
// services → core 单向，同时 stores → core 也合法。
//
// 约定：按子路径消费（@core/storage），core 不提供根 barrel。见
// 《MarkCraft_解耦实施方案_2026-09-17.md》Phase 1。

export {}

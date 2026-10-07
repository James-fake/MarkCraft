'use strict';

// Phase 0 解耦守卫 —— 领域操作层 src/services 禁止引用状态层 src/stores。
// 实际作用域由 .eslintrc.guard.cjs 的 overrides.files 限定为 src/services/**。
//
// 动机（环 #2 的真因）：被引用的 3 处全部只指向 stores/storage/ ——
// 即「Dexie/IndexedDB 持久化基础设施」被错误地寄居在状态层下，
// 于是 services 不得不反向引用 stores。这是基础设施层级错位，不是真实业务依赖。
//
// 目标状态：stores/storage → @core/storage 下沉后，services → @core 单向合法，
// 本规则由 warn 升为 error（Phase 1.4）。
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 1。
//
// ⚠️ stores ↔ services 的反方向（stores → services）是**允许**的：
// 那 4 处是领域操作函数（fileService 文件树 CRUD / blockReference /
// undoRedoManager），方向自然，本守卫不涉及。

const { createForbiddenImportRule } = require('./_forbidden-import.cjs');

module.exports = createForbiddenImportRule({
  description: '禁止领域操作层 src/services 引用状态层 src/stores',
  message:
    '禁止引用状态层 src/stores（来源 "{{name}}"）。持久化基础设施应位于 @core/storage，' +
    '而不是寄居在 stores 下（详见 MarkCraft_解耦实施方案_2026-09-17.md Phase 1）。',
  forbidden: [{ alias: /^@stores(\/|$)/, dir: 'src/stores' }],
});

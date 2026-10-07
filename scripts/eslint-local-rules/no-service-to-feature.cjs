'use strict';

// Phase 0 解耦守卫 —— 领域操作层 src/services 禁止引用业务层 src/features。
// 实际作用域由 .eslintrc.guard.cjs 的 overrides.files 限定为 src/services/**。
//
// 动机：services 是「领域操作 / 横切服务」层，却在 backupService / fileService
// 里反向引用 features/fileManager 的 collectAllFiles / createInitialFileTree /
// defaultDocsZh·En，与 stores 形成同一条环链
// （stores → services → features/fileManager → stores）。
//
// 目标状态：这些能力下沉到 @core 后，services 对 features 的依赖 = 0。
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2。

const { createForbiddenImportRule } = require('./_forbidden-import.cjs');

module.exports = createForbiddenImportRule({
  description: '禁止领域操作层 src/services 引用业务层 src/features',
  message:
    '禁止引用业务层 src/features（来源 "{{name}}"）。services 只允许依赖 L0–L2 ' +
    '（types / utils / core / components-ui / locales）与 stores；' +
    '若所需能力位于 features 内，应先下沉到 @core（详见 MarkCraft_解耦实施方案_2026-09-17.md Phase 2）。',
  forbidden: [{ alias: /^@features(\/|$)/, dir: 'src/features' }],
});

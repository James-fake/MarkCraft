'use strict';

// Phase 0 解耦守卫 —— 状态层 src/stores 禁止引用业务层 src/features。
// 实际作用域由 .eslintrc.guard.cjs 的 overrides.files 限定为 src/stores/**。
//
// 动机：stores 是全仓入度最高的地基（入度 102），却被寄居在 features 里的
// 「业务工具」反向牵引（collectAllFiles / createInitialFileTree /
// recentFilesManager / defaultDocsZh·En / tagExtractor / plantumlConstants），
// 由此形成 stores ⇄ features/shared 等模块级环（Phase 2 归零并升 error；
// Phase 4 进一步解散 features/shared 目录本身，该环的残余形态一并消失）。
//
// 目标状态：这些能力下沉到 @core 后，stores 对 features 的依赖 = 0。
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2。

const { createForbiddenImportRule } = require('./_forbidden-import.cjs');

module.exports = createForbiddenImportRule({
  description: '禁止状态层 src/stores 引用业务层 src/features',
  message:
    '禁止引用业务层 src/features（来源 "{{name}}"）。状态层只允许依赖 L0–L2 ' +
    '（types / utils / core / components-ui / locales）与 services；' +
    '若所需能力位于 features 内，应先下沉到 @core（详见 MarkCraft_解耦实施方案_2026-09-17.md Phase 2）。',
  forbidden: [{ alias: /^@features(\/|$)/, dir: 'src/features' }],
});

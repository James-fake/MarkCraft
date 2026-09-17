'use strict';

// MarkCraft 本地 ESLint 插件（项目自带，非第三方依赖）。
// 规则定义见 scripts/eslint-local-rules/*，此处聚合导出。
// 用 .cjs 后缀：项目 package.json 含 "type": "module"，避免被当 ESM。
module.exports = {
  rules: {
    'no-aurora-ui-import': require('../eslint-local-rules/no-aurora-ui-import.cjs'),

    // Phase 0（2026-09-17）新增 3 条解耦守卫 —— 先以 warn 落地，各阶段清零后逐条升 error。
    // 判定逻辑共用 scripts/eslint-local-rules/_forbidden-import.cjs（工厂），
    // 覆盖 import / import type / 动态 import() / require() / export ... from 五种形态。
    // 见《MarkCraft_解耦实施方案_2026-09-17.md》§7。
    'no-store-to-feature': require('../eslint-local-rules/no-store-to-feature.cjs'),
    'no-service-to-feature': require('../eslint-local-rules/no-service-to-feature.cjs'),
    'no-service-to-store': require('../eslint-local-rules/no-service-to-store.cjs'),

    // Phase 3（2026-09-18）新增：aurora 子模块禁止反向引用装配层 src/aurora/app。
    // 与前 3 条不同，本条**落地即 error** —— 因为它是在存量清零（环 #7 #8 消失）**之后**
    // 才建闸口，不存在「被存量卡死」的问题，故无需 warn 过渡期。
    // 它同时覆盖测试文件（无例外），依赖 src/aurora/providers 承接原寄居 app/ 的测试夹具。
    // 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 3.4。
    'no-reverse-to-aurora-app': require('../eslint-local-rules/no-reverse-to-aurora-app.cjs'),
  },
};

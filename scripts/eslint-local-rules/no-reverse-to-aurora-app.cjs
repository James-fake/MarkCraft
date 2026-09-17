'use strict';

// Phase 3 解耦守卫 —— 禁止 aurora 内**反向引用装配层** src/aurora/app。
//
// 作用域由 .eslintrc.guard.cjs 限定为 src/aurora/**（含测试文件），
// 并通过本规则内的 exempt 豁免 src/aurora/app 自身与入口 aurora-main.tsx。
//
// 语义（单向，这是与方案原文「禁止互相 import」的关键校正）：
//   ✅ 允许   src/aurora/app/**  → src/aurora/{panels,components,...}
//             —— 装配层的正当职责：AuroraShell 负责组装并渲染各面板。
//   ❌ 禁止   任意 aurora 子模块 → src/aurora/app/**
//             —— 一旦 panels/components 反向引用 app，即成环：
//                aurora/app > aurora/panels > aurora/app              （环 #7）
//                aurora/app > aurora/panels > aurora/components > aurora/app（环 #8）
//
// 若「被判为需要引用的东西」确实被多处共用，处理方式不是加例外，而是**下沉**：
//   - 纯共享上下文 / 单例 → src/aurora/navigation/**（如 navReturn）
//   - 通用外壳件与外壳上下文 → src/aurora/components/shell/**（如 UserAccountNav）
//   - 运行时 Provider 地基 → src/aurora/providers/**（如 RealProviders）
// 三者均位于 app 之下，故 app 与 panels/components 都能引用，不再成环。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 3。

const { createForbiddenImportRule } = require('./_forbidden-import.cjs');

module.exports = createForbiddenImportRule({
  description: '禁止 aurora 子模块反向引用装配层 src/aurora/app',
  message:
    '禁止反向引用 aurora 装配层（来源 "{{name}}"）。aurora/app 是装配层（AuroraShell 组装并渲染各面板），' +
    '只允许它向下引用 panels/components/providers；反向引用会形成模块级环 ' +
    'aurora/app > aurora/panels > aurora/app。若该能力确需共用，应下沉到 ' +
    'aurora/navigation（共享上下文/单例）、aurora/components/shell（通用外壳件）或 ' +
    'aurora/providers（运行时 Provider 地基），详见 MarkCraft_解耦实施方案_2026-09-17.md Phase 3。',
  forbidden: [
    // aurora 无路径别名，故 alias 恒不匹配；相对路径判定负责全部工作。
    { alias: /^$/, dir: 'src/aurora/app' },
  ],
  exempt: [
    'src/aurora/app', // 装配层自身内部互引（如 AuroraShell 引 ./commandAdapter）属正常
    'src/aurora/aurora-main.tsx', // 应用入口：其唯一职责就是挂载 AuroraShell
  ],
});

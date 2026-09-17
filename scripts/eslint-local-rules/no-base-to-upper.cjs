'use strict';

// Phase 4 解耦守卫 —— 禁止**底座层**（L0 src/utils、L1 src/core）向上依赖应用层。
// 实际作用域由 .eslintrc.guard.cjs 的 overrides.files 限定为 src/utils/** 与 src/core/**。
//
// 为什么需要它：Phase 1/2/4 把「被多层共用的能力」依次下沉到 @core 与 @utils ——
// 但下沉本身会**制造新的诱惑**：底座一旦需要状态或业务语义，最省事的做法就是
// 直接 import @stores / @features，于是「底座 → 上层」的边静默出现，模块级环随之复现
// （这正是 features/shared 当初的成因：它自称共享层，却引用了 @stores/LanguageStore）。
// 本条把「底座只向下」从口头约定升级为阻断级。
//
// 落地时存量违规 = 0（实测 src/utils / src/core 两层向上依赖均为 0），
// 故无需 warn 过渡期，直接 error —— 与 no-reverse-to-aurora-app 同理。
//
// 若底座层确实需要上层能力，正确做法不是加例外，而是**反向安置**：
//   · 需要读 store / 状态   → 该逻辑本就不属于底座，应留在 stores 或 features 内；
//   · 需要业务语义常量     → 常量下沉到 @core/constants（Phase 2 已有 plantuml 先例）；
//   · 需要 UI 基元或文案   → 该文件不属于底座，应落到 src/components/ui 或消费方 feature。
//
// 本轮**未**纳入的两处（均为实测为 0，但存在技术障碍，留待单独决策）：
//   · src/components/ui/** —— 其禁止项若含 src/components，会误伤 ui 内部相对互引
//     （./Input 解析到 src/components/ui/Input，被判为落在 src/components 下），需独立规则；
//   · src/types/** —— src/types/translations.ts 存在预存的 types → locales 边（L0→L2）。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 4。

const { createForbiddenImportRule } = require('./_forbidden-import.cjs');

module.exports = createForbiddenImportRule({
  description: '禁止底座层（src/utils、src/core）向上依赖应用层',
  message:
    '禁止底座层引用上层模块（来源 "{{name}}"）。src/utils（L0）与 src/core（L1）只允许向下依赖 ' +
    '（L0 仅 types；L1 可 types / utils / core 内部）以及第三方包。若底座确需上层能力，' +
    '正确的是反向安置：状态相关逻辑留在 stores/features，常量下沉 @core/constants，' +
    'UI 相关文件落到 components/ui 或消费方 feature。详见 ' +
    'MarkCraft_解耦实施方案_2026-09-17.md Phase 4。',
  forbidden: [
    { alias: /^@components(\/|$)/, dir: 'src/components' },
    { alias: /^@hooks(\/|$)/, dir: 'src/hooks' },
    { alias: /^@locales(\/|$)/, dir: 'src/locales' },
    { alias: /^@stores(\/|$)/, dir: 'src/stores' },
    { alias: /^@services(\/|$)/, dir: 'src/services' },
    { alias: /^@features(\/|$)/, dir: 'src/features' },
    { alias: /^@aurora(\/|$)/, dir: 'src/aurora' },
    { alias: /^@app(\/|$)/, dir: 'src/app' },
  ],
});

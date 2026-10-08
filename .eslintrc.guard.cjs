// 反向依赖守卫专用配置（供 lint-staged 在 pre-commit 调用）。
//
// 设计要点：
// 1. 故意【不 extends】任何预设（eslint:recommended / @typescript-eslint/recommended /
//    react-hooks 等），因此完全不触碰项目既有的 ~200 条 lint 债 —— 提交不会被旧债卡死。
// 2. 仅加载 @typescript-eslint/parser + 本地插件 local，并只对结构性层级启用 local/* 守卫：
//    底座层（utils / core）、逻辑/状态/基础设施层（features / stores / services）、
//    aurora 子模块。
// 3. lint-staged 以 `eslint --no-eslintrc -c .eslintrc.guard.cjs` 调用，只认本文件，
//    不会加载根目录 .eslintrc.cjs，从而保证「只拦守卫、不碰债」。
//
// 详见《解耦整合实施计划.md》Batch D 与《MarkCraft_解耦实施方案_2026-09-17.md》§7。
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  // 'local' = 项目自带插件 scripts/eslint-plugin-local（file: devDependency，非第三方依赖）
  //
  // 'react-hooks' 是【只加载、不启用任何规则】的必要修复（Phase 0 发现）：
  // 源码中已存在 `// eslint-disable-next-line react-hooks/exhaustive-deps` 指令，
  // 而 ESLint 对「指令引用了未加载插件的规则」会直接报 error
  // （Definition for rule 'react-hooks/exhaustive-deps' was not found）。
  // HEAD 版配置实测复现 7 处此类**假错误** —— 意味着只要提交触碰那 7 个文件的对应行，
  // pre-commit 就会被与架构毫无关系的原因卡死。
  // 仅加载插件即可让指令可解析；因不启用任何 react-hooks 规则，不会新增 lint 债诊断
  // （仍然完全不触碰项目既有的 ~200 条债）。
  //
  // 'react-refresh' 同理（2026-10-08 收尾审查发现）：src/features/**/*.tsx 里有 8 个文件
  // 带 `// eslint-disable-next-line react-refresh/only-export-components` 指令，未加载插件时
  // 会报 **26 处**「Definition for rule ... was not found」假错误 —— 一旦提交触碰这些 .tsx
  // 文件，pre-commit 同样会被架构无关的原因卡死。仅加载、不启用任何 react-refresh 规则。
  //
  // '@typescript-eslint' 同理（同次审查发现）：已加载 @typescript-eslint/parser，但**未加载
  // 插件本体**，故 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 指令同样报
  // 「rule not found」假错误（**15 处**）。仅加载、不启用任何 @typescript-eslint 规则。
  //
  // 至此 features/stores/services 里出现的**全部** disable 指令规则名（@typescript-eslint/
  // no-explicit-any、no-control-regex[核心规则]、react-hooks/exhaustive-deps、
  // react-refresh/only-export-components）都可解析，pre-commit 不会再被架构无关原因卡死。
  plugins: ['local', 'react-hooks', 'react-refresh', '@typescript-eslint'],
  ignorePatterns: ['dist', 'node_modules'],
  overrides: [
    {
      // 作用域与根配置 Batch D override 完全一致：仅逻辑/状态/基础设施层。
      files: [
        'src/features/**/*.{ts,tsx}',
        'src/stores/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
      ],
      rules: {
        'local/no-aurora-ui-import': 'error',
      },
    },

    // ── Phase 0（2026-09-17）解耦守卫：先以 warn 落地，各阶段清零后逐条升 error ──
    // 遵守「先建闸口、再清存量」：若一上来就 error，会让 Phase 1/2 的迁移提交被
    // 尚未清理的存量卡死。每条规则的升级时机写在对应 Phase 的「收紧守卫」步骤里。
    {
      // stores 层禁止引用 features —— **Phase 2 已升为 error**（2026-09-17）
      // 依据：6 个「业务工具」文件（fileManagerUtils / recentFilesManager / defaultDocsZh·En /
      // tagExtractor / plantumlConstants）下沉 @core 后，基线 9 处违规归零，
      // 环 #4 #5 与环 #3 的直接形态随之消失（7 → 5 环）。
      // 故此处由 warn 收紧为阻断级：后续任何「业务能力寄居 features 反向牵引状态层」会被直接拦下。
      files: ['src/stores/**/*.{ts,tsx}'],
      rules: {
        'local/no-store-to-feature': 'error',
      },
    },
    {
      // services 层禁止引用 features —— **Phase 2 已升为 error**（2026-09-17）
      // 依据：backupService / fileService 的 4 处违规随同批下沉归零（services 出边仅剩 types/core/utils）。
      files: ['src/services/**/*.{ts,tsx}'],
      rules: {
        'local/no-service-to-feature': 'error',
      },
    },
    {
      // services 层禁止引用 stores —— **Phase 1 已升为 error**（2026-09-17）
      // 依据：stores/storage（Dexie/IndexedDB 持久化基建）下沉 @core/storage 后，
      // 存量 3 处违规归零，环 #2「stores > services > stores」消失。
      // 故此处由 warn 收紧为阻断级：后续任何「基建寄居回 stores」都会被直接拦下。
      files: ['src/services/**/*.{ts,tsx}'],
      rules: {
        'local/no-service-to-store': 'error',
      },
    },
    // ── Phase 3（2026-09-18）新增：aurora 内部反向依赖守卫 ──
    {
      // aurora 子模块禁止反向引用装配层 src/aurora/app —— **落地即 error**（存量已清零，无需 warn 过渡）
      // 依据：navReturn → aurora/navigation、UserAccountNav → aurora/components/shell、
      // RealProviders → aurora/providers 三处归位后，panels → app 与 components → app
      // 的边（含 12 处测试边）全部归零，环 #7 #8 消失（5 → 3 环）。
      // 单向语义：app → panels/components 是装配层的正当职责，不拦；只拦反向。
      // 作用域用全量 src/aurora/** 而**不列举子目录** —— 列举会让「新增子模块」成为新盲区；
      // 自身豁免（app 目录 + 入口 aurora-main.tsx）写在规则内 exempt，见 no-reverse-to-aurora-app.cjs。
      files: ['src/aurora/**/*.{ts,tsx}'],
      rules: {
        'local/no-reverse-to-aurora-app': 'error',
      },
    },
    // ── Phase 4（2026-09-18）新增：底座层禁止向上依赖 ──
    {
      // src/utils（L0）与 src/core（L1）不得 import 任何上层 —— **落地即 error**（实测存量违规 = 0）
      // 依据：Phase 4 把 features/shared 的 6 个共享工具下沉 src/utils、imageStore 基建
      // 下沉 src/core/storage 后，底座两层的向上依赖实测全部归零。
      // 它锁住的正是 features/shared 的成因：自称「共享层」却引用 @stores/LanguageStore；
      // 故一旦底座需要状态或业务语义，本条会直接拦下，逼出「反向安置」这个正确解法。
      // 未纳入 src/components/ui 与 src/types 的原因写在规则文件头部（各有技术障碍）。
      files: ['src/utils/**/*.{ts,tsx}', 'src/core/**/*.{ts,tsx}'],
      rules: {
        'local/no-base-to-upper': 'error',
      },
    },
  ],
}

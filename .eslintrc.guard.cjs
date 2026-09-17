// 反向依赖守卫专用配置（供 lint-staged 在 pre-commit 调用）。
//
// 设计要点：
// 1. 故意【不 extends】任何预设（eslint:recommended / @typescript-eslint/recommended /
//    react-hooks 等），因此完全不触碰项目既有的 ~200 条 lint 债 —— 提交不会被旧债卡死。
// 2. 仅加载 @typescript-eslint/parser + 本地插件 local，并只对逻辑/状态/基础设施层
//    （features / stores / services）启用 local/no-aurora-ui-import 这一条反向依赖守卫。
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
  plugins: ['local', 'react-hooks'],
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
  ],
}

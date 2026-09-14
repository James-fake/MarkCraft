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
// 详见《解耦整合实施计划.md》Batch D。
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  // 'local' = 项目自带插件 scripts/eslint-plugin-local（file: devDependency，非第三方依赖）
  plugins: ['local'],
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
  ],
}

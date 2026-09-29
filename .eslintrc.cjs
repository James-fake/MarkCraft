module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  // 'local' = 项目自带插件 scripts/eslint-plugin-local（file: devDependency，非第三方依赖）
  plugins: ['react-refresh', 'local'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-interface': 'off',
    // 箭头函数空实现是 React 占位回调的惯用法（() => {}），不构成问题；
    // 保留对具名函数/方法空实现的检查（那些往往是「忘写实现」的真信号）
    '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],
    // 空 catch 多为「有意忽略」的惯用法（catch { /* noop */ }），保留对真空块的检查
    'no-empty': ['warn', { allowEmptyCatch: true }],
    // warn/error 是桌面应用的合法诊断输出；log 才是调试残留
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-constant-condition': 'warn',
  },

  // Batch D — 反向依赖守卫（详见解耦整合实施计划.md）
  // 逻辑/状态/基础设施层禁止引用 UI 外壳层 src/aurora，确保后期整体换界面时
  // 新 UI 仅面向 @features / @stores / @components/ui 等地基入口消费，不会牵一发动全身。
  overrides: [
    {
      // 仅对逻辑/状态/基础设施层生效：禁止引用 UI 外壳层 src/aurora。
      // 守卫规则见 scripts/eslint-local-rules/no-aurora-ui-import.cjs（同时覆盖
      // @aurora 别名与解析后落入 src/aurora 的相对路径两种反向耦合形式）。
      files: [
        'src/features/**/*.{ts,tsx}',
        'src/stores/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
      ],
      rules: {
        'local/no-aurora-ui-import': 'error',
      },
    },
    {
      // stores/*.tsx：useXxxStore hook 与 Context Provider 同文件是该层的固有形态
      //（hook 与 Provider 互为表里），拆文件只服务 dev HMR 粒度，桌面应用价值低 → 豁免。
      files: ['src/stores/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      // 测试文件的诊断输出（console.log 打印排查明细）合法
      files: ['src/**/__tests__/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}

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
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    'no-empty': 'warn',
    'no-console': 'warn',
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
  ],
}

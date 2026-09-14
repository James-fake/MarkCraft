'use strict';

// MarkCraft 本地 ESLint 插件（项目自带，非第三方依赖）。
// 规则定义见 scripts/eslint-local-rules/*，此处聚合导出。
// 用 .cjs 后缀：项目 package.json 含 "type": "module"，避免被当 ESM。
module.exports = {
  rules: {
    'no-aurora-ui-import': require('../eslint-local-rules/no-aurora-ui-import.cjs'),
  },
};

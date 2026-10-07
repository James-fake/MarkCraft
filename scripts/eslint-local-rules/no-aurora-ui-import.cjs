'use strict';

// Batch D — 反向依赖守卫（详见解耦整合实施计划.md）
// 禁止逻辑/状态/基础设施层（src/features | src/stores | src/services）引用
// UI 外壳层 src/aurora，确保后期整体换界面时新 UI 只消费 @features / @stores /
// @components/ui 等地基入口，不会牵一发动全身。
//
// 覆盖两种反向耦合形式：
//   1) 别名      import x from '@aurora/...'
//   2) 相对路径  import x from '../../aurora/...'（解析后落入 src/aurora）
//
// 相对路径采用「解析到真实绝对路径后判断是否落入 src/aurora」的精确判定，
// 避免对普通 aurora 命名的相对目录产生误报。
//
// 注：本文件用 .cjs 后缀，因项目 package.json 含 "type": "module"，
// 避免被当作 ESM 导致 require 不可用。

const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止逻辑/状态/基础设施层引用 UI 外壳层 src/aurora',
      recommended: false,
    },
    schema: [],
    messages: {
      restricted:
        '禁止引用 UI 外壳层 src/aurora（来源 "{{name}}"）。换界面守卫：新界面应只消费 @features / @stores / @components/ui 等地基入口（详见解耦整合实施计划.md Batch D）。',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const AURORA_ALIAS = /^@aurora(\/|$)/;

    function resolvesToSrcAurora(specifier) {
      // 1) 别名形式
      if (AURORA_ALIAS.test(specifier)) return true;

      // 2) 相对路径：解析到真实绝对路径后判断是否落入 src/aurora
      if (specifier.startsWith('.')) {
        try {
          const abs = path.resolve(path.dirname(filename), specifier);
          const norm = abs.split(path.sep).join('/');
          return norm.includes('/src/aurora/') || norm.endsWith('/src/aurora');
        } catch {
          return false;
        }
      }
      return false;
    }

    function check(node, source) {
      if (typeof source !== 'string') return;
      if (resolvesToSrcAurora(source)) {
        context.report({ node, messageId: 'restricted', data: { name: source } });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source && node.source.value);
      },
      ImportExpression(node) {
        const src = node.source;
        if (src && src.type === 'Literal') check(node, src.value);
      },
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee &&
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          check(node, node.arguments[0].value);
        }
      },
    };
  },
};

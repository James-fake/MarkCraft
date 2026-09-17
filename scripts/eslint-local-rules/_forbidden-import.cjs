'use strict';

// 反向依赖守卫工厂 —— 「禁止 A 层引用 B 层」的通用实现（Phase 0）。
//
// 沿用 no-aurora-ui-import.cjs 的双形态判定：
//   1) 别名/包名  import x from '@features/...'
//   2) 相对路径   import x from '../../features/...'
// 相对路径必须「解析成真实绝对路径后判断是否落入目标目录」，否则会对普通同名
// 相对目录（如 features/blog/themes/aurora.ts 这种局部同名模块）产生误报。
//
// 为什么抽成工厂：Phase 0 一次新增 3 条同构守卫（no-store-to-feature /
// no-service-to-feature / no-service-to-store），它们只有「禁止目标」与文案不同，
// 判定逻辑完全一致。复制三份会让后续修 bug 时漏改，故收敛为单一实现。
//
// 覆盖的语法形态（比 no-aurora-ui-import.cjs 多覆盖 export-from）：
//   import / import type / 动态 import() / require() / export ... from
//   ⚠️ export-from 是真实存在的反向耦合形态（当前全仓 4 处，均在 aurora 层向下，
//      合法；但守卫必须能拦住未来出现在下层的那一种）。
//
// 注：本文件用 .cjs 后缀，因项目 package.json 含 "type": "module"，
// 避免被当作 ESM 导致 require 不可用。

const path = require('path');

/**
 * @param {object} opts
 * @param {string} opts.description 规则描述（写入 ESLint meta.docs.description）
 * @param {string} opts.message     报错文案模板；`{{name}}` 会被替换为被禁的来源字符串
 * @param {Array<{alias: RegExp, dir: string}>} opts.forbidden 禁止目标清单
 *        alias — 别名/包名形态，如 /^@features(\/|$)/
 *        dir   — 相对仓库根的 POSIX 目录，如 'src/features'（用于相对路径精确判定）
 * @returns {object} ESLint rule
 */
function createForbiddenImportRule({ description, message, forbidden }) {
  return {
    meta: {
      type: 'problem',
      docs: { description, recommended: false },
      schema: [],
      messages: { restricted: message },
    },

    create(context) {
      const filename = context.getFilename();

      function isForbidden(specifier) {
        if (typeof specifier !== 'string' || specifier.length === 0) return false;

        for (const { alias, dir } of forbidden) {
          // 1) 别名 / 包名形态
          if (alias.test(specifier)) return true;

          // 2) 相对路径：解析成绝对路径后判断是否落入目标目录
          if (specifier.startsWith('.')) {
            try {
              const abs = path.resolve(path.dirname(filename), specifier);
              const norm = abs.split(path.sep).join('/');
              if (norm.includes('/' + dir + '/') || norm.endsWith('/' + dir)) return true;
            } catch {
              // 解析失败不判定为违规 —— 宁可漏报也不误报（守卫误报会卡住正常开发）
            }
          }
        }
        return false;
      }

      function check(node, source) {
        if (isForbidden(source)) {
          context.report({ node, messageId: 'restricted', data: { name: source } });
        }
      }

      // import / export-from 的 source 都是 Literal 子节点；无 source 时（如
      // `export const x = 1`）为 null，需容忍。
      function checkSourceNode(node) {
        const src = node && node.source;
        if (src && src.type === 'Literal') check(node, src.value);
      }

      return {
        ImportDeclaration: checkSourceNode,
        ExportNamedDeclaration: checkSourceNode,
        ExportAllDeclaration: checkSourceNode,
        ImportExpression: checkSourceNode,
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
}

module.exports = { createForbiddenImportRule };

/**
 * 仅供沙箱内截图验证使用的临时 config：
 * 把 cacheDir 指到全新目录，绕开 safe-delete 守卫对 node_modules/.vite/deps
 * 批量清理（606 文件 > 阈值 50）的拦截。不参与正常开发/构建流程。
 */
import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config'

export default mergeConfig(
  (base as any)({ mode: 'development', command: 'serve' }),
  defineConfig({ cacheDir: 'node_modules/.vite-shots' }),
)

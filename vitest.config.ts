import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Batch B 解耦整合：路径别名，与 tsconfig.json paths 保持一致
const SRC = resolve(process.cwd(), 'src')
const alias = {
  '@features': resolve(SRC, 'features'),
  '@stores': resolve(SRC, 'stores'),
  '@aurora': resolve(SRC, 'aurora'),
  '@components': resolve(SRC, 'components'),
  '@services': resolve(SRC, 'services'),
  '@utils': resolve(SRC, 'utils'),
  '@hooks': resolve(SRC, 'hooks'),
  '@app': resolve(SRC, 'app'),
  '@locales': resolve(SRC, 'locales'),
  '@styles': resolve(SRC, 'styles'),
  '@workers': resolve(SRC, 'workers'),
  '@src': SRC,
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**', 'src/utils/**', 'src/features/**', 'src/stores/**', 'src/services/**', 'src/hooks/**']
    }
  }
})

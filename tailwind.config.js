/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // P1#6 显式补齐 Tailwind 断点体系（叠加默认断点，新增 xs / 3xl）
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      // 阶段 11 · C3：打通 Tailwind 与既有 CSS 变量 token 系统，
      // 使 bg-editor-bg / text-app-text / border-editor-border 等工具类
      // 直接消费设计变量，减少组件内联魔法色值。
      colors: {
        'app-bg': 'var(--app-bg)',
        'app-text': 'var(--app-text)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-text': 'var(--sidebar-text)',
        'toolbar-bg': 'var(--toolbar-bg)',
        'editor-bg': 'var(--editor-bg)',
        'editor-text': 'var(--editor-text)',
        'editor-border': 'var(--editor-border)',
        'preview-bg': 'var(--preview-bg)',
        'preview-border': 'var(--preview-border)',
        'tab-active-text': 'var(--tab-active-text)',
        'button-primary': 'var(--button-primary)',
        'button-primary-hover': 'var(--button-primary-hover)',
        'button-success': 'var(--button-success)',
        'link': 'var(--link-color)',
        'code-block-bg': 'var(--code-block-bg)',
        'code-block-text': 'var(--code-block-text)',
        'table-border': 'var(--table-border)',
        'blockquote-border': 'var(--blockquote-border)',
      },
      // 阶段 11 · C4：把全局间距 / 圆角 token 暴露为 Tailwind 工具类
      // （p-mc-2 / gap-mc-3 / rounded-mc-sm 等）。
      spacing: {
        'mc-1': 'var(--mc-space-1)',
        'mc-2': 'var(--mc-space-2)',
        'mc-3': 'var(--mc-space-3)',
        'mc-4': 'var(--mc-space-4)',
        'mc-5': 'var(--mc-space-5)',
        'mc-6': 'var(--mc-space-6)',
        'mc-8': 'var(--mc-space-8)',
      },
      borderRadius: {
        'mc-sm': 'var(--mc-radius-sm)',
        'mc-md': 'var(--mc-radius-md)',
        'mc-lg': 'var(--mc-radius-lg)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

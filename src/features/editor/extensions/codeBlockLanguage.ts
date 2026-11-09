/**
 * 代码块语言的下拉选项表 + 短别名归一化。
 *
 * 抽成纯模块的原因：别名表和选项表**必须同处一地** —— 别名映射的目标值若不在
 * 选项表里，映射就是无效的（CodeBlockView 按 value 查 label）。放同一文件里，
 * 守卫测试可以直接互相对照，防增删漂移。
 *
 * ⚠️ 归一化只用于**显示**：不写回 node.attrs.language，保存回 markdown 仍是用户写的
 * ```js。只有用户在下拉里主动选择时才写规范名（那是明确的规范化动作）。
 *
 * 背景（2026-11-03）：```js / ```ts / ```py 这类短别名在高亮里一直是好的
 * （lowlight 认识别名），但下拉查不到 value → 显示 "Custom..."。
 */

export const LANGUAGES = [
  { value: '', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'r', label: 'R' },
  { value: 'matlab', label: 'MATLAB' },
  { value: 'scala', label: 'Scala' },
  { value: 'lua', label: 'Lua' },
  { value: 'perl', label: 'Perl' },
  { value: 'vue', label: 'Vue' },
  { value: 'jsx', label: 'React (JSX)' },
  { value: '__custom__', label: 'Custom...' },
]

export const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  kt: 'kotlin',
  rb: 'ruby',
  golang: 'go',
  'c++': 'cpp',
  cs: 'csharp',
  tex: 'latex',
  ps1: 'powershell',
  docker: 'dockerfile',
}

/** 归一化语言标识：别名 → 规范值；大小写不敏感；未知值原样返回（保留 Custom 语义） */
export function normalizeCodeLanguage(lang: string): string {
  if (!lang) return lang
  return LANGUAGE_ALIASES[lang.toLowerCase()] ?? lang
}

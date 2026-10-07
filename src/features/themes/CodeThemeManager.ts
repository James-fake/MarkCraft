import { EditorView } from '@codemirror/view'

export interface CodeThemeOption {
  id: string
  name: string
  theme: ReturnType<typeof EditorView.theme>
}

const defaultLightTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
  },
  '.cm-content': {
    caretColor: 'var(--editor-text)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--editor-text)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.4) !important',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
    borderRight: '1px solid var(--editor-border)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    outline: '1px solid rgba(0, 0, 0, 0.2)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 200, 0, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 200, 0, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--mc-bg-panel)',
    color: 'var(--editor-text)',
    borderBottom: '1px solid var(--editor-border)',
  },
  '.cm-panels input, .cm-panels button': {
    color: 'var(--editor-text)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--mc-bg-panel)',
    color: 'var(--editor-text)',
    border: '1px solid var(--editor-border)',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: 'var(--editor-text)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: 'var(--editor-text)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(239,68,68,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(239,68,68,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(245,158,11,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(245,158,11,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--mc-bg-panel)',
    color: 'var(--editor-text)',
    border: '1px solid var(--editor-border)',
  },
  // 代码块语法高亮颜色
  '.tok-keyword': { color: '#d73a49' },
  '.tok-operator': { color: '#d73a49' },
  '.tok-string': { color: '#032f62' },
  '.tok-number': { color: '#005cc5' },
  '.tok-comment': { color: '#6a737d', fontStyle: 'italic' },
  '.tok-variableName': { color: '#e36209' },
  '.tok-typeName': { color: '#6f42c1' },
  '.tok-propertyName': { color: '#005cc5' },
  '.tok-bool': { color: '#005cc5' },
  '.tok-null': { color: '#005cc5' },
  '.tok-meta': { color: '#005cc5' },
  '.tok-heading': { color: '#005cc5', fontWeight: 'bold' },
  '.tok-emphasis': { fontStyle: 'italic' },
  '.tok-strong': { fontWeight: 'bold' },
  '.tok-strikethrough': { textDecoration: 'line-through' },
  '.tok-link': { color: '#032f62', textDecoration: 'underline' },
  '.tok-url': { color: '#032f62' },
  '.tok-labelName': { color: '#005cc5' },
  '.tok-processingInstruction': { color: '#d73a49' },
}, { dark: false })

const monokaiTheme = EditorView.theme({
  '&': {
    backgroundColor: '#272822',
    color: '#f8f8f2',
  },
  '.cm-content': {
    caretColor: '#f8f8f2',
  },
  '.cm-cursor': {
    borderLeftColor: '#f8f8f0',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(73, 72, 62, 0.6) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(73, 72, 62, 0.8) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#272822',
    color: '#90908a',
    borderRight: '1px solid #3e3d32',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    outline: '1px solid rgba(255, 255, 255, 0.3)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 200, 0, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 200, 0, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: '#1e1f1c',
    color: '#f8f8f2',
    borderBottom: '1px solid #3e3d32',
  },
  '.cm-panels input, .cm-panels button': {
    color: '#f8f8f2',
  },
  '.cm-tooltip': {
    backgroundColor: '#1e1f1c',
    color: '#f8f8f2',
    border: '1px solid #3e3d32',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: '#f8f8f2',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(102, 217, 239, 0.15)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(249,38,114,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(249,38,114,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(230,219,116,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(230,219,116,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#1e1f1c',
    color: '#f8f8f2',
    border: '1px solid #3e3d32',
  },
  '.tok-keyword': { color: '#f92672' },
  '.tok-operator': { color: '#f92672' },
  '.tok-string': { color: '#e6db74' },
  '.tok-number': { color: '#ae81ff' },
  '.tok-comment': { color: '#75715e', fontStyle: 'italic' },
  '.tok-variableName': { color: '#fd971f' },
  '.tok-typeName': { color: '#66d9ef', fontStyle: 'italic' },
  '.tok-propertyName': { color: '#a6e22e' },
  '.tok-bool': { color: '#ae81ff' },
  '.tok-null': { color: '#ae81ff' },
  '.tok-meta': { color: '#f92672' },
  '.tok-heading': { color: '#a6e22e', fontWeight: 'bold' },
  '.tok-emphasis': { color: '#f8f8f2', fontStyle: 'italic' },
  '.tok-strong': { color: '#f8f8f2', fontWeight: 'bold' },
  '.tok-strikethrough': { color: '#75715e', textDecoration: 'line-through' },
  '.tok-link': { color: '#66d9ef', textDecoration: 'underline' },
  '.tok-url': { color: '#e6db74' },
  '.tok-labelName': { color: '#a6e22e' },
  '.tok-processingInstruction': { color: '#f92672' },
}, { dark: true })

const draculaTheme = EditorView.theme({
  '&': {
    backgroundColor: '#282a36',
    color: '#f8f8f2',
  },
  '.cm-content': {
    caretColor: '#f8f8f2',
  },
  '.cm-cursor': {
    borderLeftColor: '#f8f8f2',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(68, 71, 90, 0.6) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(68, 71, 90, 0.8) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#282a36',
    color: '#6272a4',
    borderRight: '1px solid #44475a',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(80, 250, 123, 0.2)',
    outline: '1px solid rgba(80, 250, 123, 0.4)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 200, 0, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 200, 0, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    borderBottom: '1px solid #44475a',
  },
  '.cm-panels input, .cm-panels button': {
    color: '#f8f8f2',
  },
  '.cm-tooltip': {
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    border: '1px solid #44475a',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: '#f8f8f2',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(98, 114, 164, 0.3)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(255,85,85,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(255,85,85,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(241,250,140,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(241,250,140,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    border: '1px solid #44475a',
  },
  '.tok-keyword': { color: '#ff79c6' },
  '.tok-operator': { color: '#ff79c6' },
  '.tok-string': { color: '#f1fa8c' },
  '.tok-number': { color: '#bd93f9' },
  '.tok-comment': { color: '#6272a4', fontStyle: 'italic' },
  '.tok-variableName': { color: '#f8f8f2' },
  '.tok-typeName': { color: '#8be9fd', fontStyle: 'italic' },
  '.tok-propertyName': { color: '#50fa7b' },
  '.tok-bool': { color: '#bd93f9' },
  '.tok-null': { color: '#bd93f9' },
  '.tok-meta': { color: '#ff79c6' },
  '.tok-heading': { color: '#bd93f9', fontWeight: 'bold' },
  '.tok-emphasis': { color: '#f8f8f2', fontStyle: 'italic' },
  '.tok-strong': { color: '#f8f8f2', fontWeight: 'bold' },
  '.tok-strikethrough': { color: '#6272a4', textDecoration: 'line-through' },
  '.tok-link': { color: '#8be9fd', textDecoration: 'underline' },
  '.tok-url': { color: '#f1fa8c' },
  '.tok-labelName': { color: '#50fa7b' },
  '.tok-processingInstruction': { color: '#ff79c6' },
}, { dark: true })

const oneDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#282c34',
    color: '#abb2bf',
  },
  '.cm-content': {
    caretColor: '#528bff',
  },
  '.cm-cursor': {
    borderLeftColor: '#528bff',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(62, 68, 81, 0.6) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(62, 68, 81, 0.8) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#282c34',
    color: '#636d83',
    borderRight: '1px solid #3e4451',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(82, 139, 255, 0.2)',
    outline: '1px solid rgba(82, 139, 255, 0.4)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 200, 0, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 200, 0, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: '#21252b',
    color: '#abb2bf',
    borderBottom: '1px solid #3e4451',
  },
  '.cm-panels input, .cm-panels button': {
    color: '#abb2bf',
  },
  '.cm-tooltip': {
    backgroundColor: '#21252b',
    color: '#abb2bf',
    border: '1px solid #3e4451',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: '#abb2bf',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(82, 139, 255, 0.2)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(226,95,126,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(226,95,126,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(209,154,102,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(209,154,102,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#21252b',
    color: '#abb2bf',
    border: '1px solid #3e4451',
  },
  '.tok-keyword': { color: '#c678dd' },
  '.tok-operator': { color: '#56b6c2' },
  '.tok-string': { color: '#98c379' },
  '.tok-number': { color: '#d19a66' },
  '.tok-comment': { color: '#5c6370', fontStyle: 'italic' },
  '.tok-variableName': { color: '#e06c75' },
  '.tok-typeName': { color: '#e5c07b' },
  '.tok-propertyName': { color: '#e06c75' },
  '.tok-bool': { color: '#d19a66' },
  '.tok-null': { color: '#d19a66' },
  '.tok-meta': { color: '#c678dd' },
  '.tok-heading': { color: '#e06c75', fontWeight: 'bold' },
  '.tok-emphasis': { color: '#abb2bf', fontStyle: 'italic' },
  '.tok-strong': { color: '#abb2bf', fontWeight: 'bold' },
  '.tok-strikethrough': { color: '#5c6370', textDecoration: 'line-through' },
  '.tok-link': { color: '#61afef', textDecoration: 'underline' },
  '.tok-url': { color: '#98c379' },
  '.tok-labelName': { color: '#e5c07b' },
  '.tok-processingInstruction': { color: '#c678dd' },
}, { dark: true })

const githubDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
  },
  '.cm-content': {
    caretColor: '#58a6ff',
  },
  '.cm-cursor': {
    borderLeftColor: '#58a6ff',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(56, 139, 253, 0.3) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(56, 139, 253, 0.4) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#0d1117',
    color: '#8b949e',
    borderRight: '1px solid #21262d',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(56, 139, 253, 0.08)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(110, 118, 129, 0.1)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(56, 139, 253, 0.2)',
    outline: '1px solid rgba(56, 139, 253, 0.4)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(210, 153, 34, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(210, 153, 34, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: '#161b22',
    color: '#c9d1d9',
    borderBottom: '1px solid #21262d',
  },
  '.cm-panels input, .cm-panels button': {
    color: '#c9d1d9',
  },
  '.cm-tooltip': {
    backgroundColor: '#161b22',
    color: '#c9d1d9',
    border: '1px solid #21262d',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: '#c9d1d9',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(56, 139, 253, 0.2)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(248,81,73,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(248,81,73,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(210,153,34,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(210,153,34,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#161b22',
    color: '#c9d1d9',
    border: '1px solid #21262d',
  },
  '.tok-keyword': { color: '#ff7b72' },
  '.tok-operator': { color: '#79c0ff' },
  '.tok-string': { color: '#a5d6ff' },
  '.tok-number': { color: '#79c0ff' },
  '.tok-comment': { color: '#8b949e', fontStyle: 'italic' },
  '.tok-variableName': { color: '#ffa657' },
  '.tok-typeName': { color: '#ff7b72' },
  '.tok-propertyName': { color: '#79c0ff' },
  '.tok-bool': { color: '#79c0ff' },
  '.tok-null': { color: '#79c0ff' },
  '.tok-meta': { color: '#ff7b72' },
  '.tok-heading': { color: '#d2a8ff', fontWeight: 'bold' },
  '.tok-emphasis': { color: '#c9d1d9', fontStyle: 'italic' },
  '.tok-strong': { color: '#c9d1d9', fontWeight: 'bold' },
  '.tok-strikethrough': { color: '#8b949e', textDecoration: 'line-through' },
  '.tok-link': { color: '#58a6ff', textDecoration: 'underline' },
  '.tok-url': { color: '#a5d6ff' },
  '.tok-labelName': { color: '#7ee787' },
  '.tok-processingInstruction': { color: '#ff7b72' },
}, { dark: true })

const solarizedTheme = EditorView.theme({
  '&': {
    backgroundColor: '#002b36',
    color: '#839496',
  },
  '.cm-content': {
    caretColor: '#839496',
  },
  '.cm-cursor': {
    borderLeftColor: '#839496',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(7, 54, 66, 0.8) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(7, 54, 66, 0.9) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#002b36',
    color: '#586e75',
    borderRight: '1px solid #073642',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(7, 54, 66, 0.5)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(7, 54, 66, 0.3)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(42, 161, 152, 0.2)',
    outline: '1px solid rgba(42, 161, 152, 0.4)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(181, 137, 0, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(181, 137, 0, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: '#073642',
    color: '#839496',
    borderBottom: '1px solid #073642',
  },
  '.cm-panels input, .cm-panels button': {
    color: '#839496',
  },
  '.cm-tooltip': {
    backgroundColor: '#073642',
    color: '#839496',
    border: '1px solid #073642',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: '#839496',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(42, 161, 152, 0.2)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(220,50,47,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(220,50,47,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(181,137,0,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(181,137,0,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#073642',
    color: '#839496',
    border: '1px solid #073642',
  },
  '.tok-keyword': { color: '#859900' },
  '.tok-operator': { color: '#859900' },
  '.tok-string': { color: '#2aa198' },
  '.tok-number': { color: '#d33682' },
  '.tok-comment': { color: '#586e75', fontStyle: 'italic' },
  '.tok-variableName': { color: '#b58900' },
  '.tok-typeName': { color: '#b58900' },
  '.tok-propertyName': { color: '#268bd2' },
  '.tok-bool': { color: '#d33682' },
  '.tok-null': { color: '#d33682' },
  '.tok-meta': { color: '#859900' },
  '.tok-heading': { color: '#268bd2', fontWeight: 'bold' },
  '.tok-emphasis': { color: '#839496', fontStyle: 'italic' },
  '.tok-strong': { color: '#839496', fontWeight: 'bold' },
  '.tok-strikethrough': { color: '#586e75', textDecoration: 'line-through' },
  '.tok-link': { color: '#268bd2', textDecoration: 'underline' },
  '.tok-url': { color: '#2aa198' },
  '.tok-labelName': { color: '#268bd2' },
  '.tok-processingInstruction': { color: '#859900' },
}, { dark: true })

export const CODE_THEMES: CodeThemeOption[] = [
  { id: 'default', name: 'Default (Light)', theme: defaultLightTheme },
  { id: 'monokai', name: 'Monokai', theme: monokaiTheme },
  { id: 'dracula', name: 'Dracula', theme: draculaTheme },
  { id: 'one-dark', name: 'One Dark', theme: oneDarkTheme },
  { id: 'github-dark', name: 'GitHub Dark', theme: githubDarkTheme },
  { id: 'solarized', name: 'Solarized', theme: solarizedTheme },
]

export function getCodeTheme(id: string): CodeThemeOption {
  return CODE_THEMES.find(t => t.id === id) || CODE_THEMES[0]
}

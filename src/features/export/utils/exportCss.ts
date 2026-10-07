export const EXPORT_CSS = `
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --preview-bg: #ffffff;
  --preview-text: #0f172a;
  --preview-border: #e2e8f0;
  --link-color: #2563eb;
  --code-bg: #f1f5f9;
  --blockquote-bg: #f8fafc;
  --blockquote-border: #3b82f6;
  --table-border: #e2e8f0;
  --table-header-bg: #f8fafc;
  --button-primary: #3b82f6;
}

[data-theme="dark"] {
  --preview-bg: #0f172a;
  --preview-text: #e2e8f0;
  --preview-border: #334155;
  --link-color: #60a5fa;
  --code-bg: #1e293b;
  --blockquote-bg: #1e293b;
  --blockquote-border: #3b82f6;
  --table-border: #334155;
  --table-header-bg: #1e293b;
  --button-primary: #3b82f6;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--preview-bg);
  color: var(--preview-text);
  line-height: 1.8;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  overflow: auto;
  min-height: auto;
}

/* Headings */
h1 {
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--preview-border);
}

h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--preview-border);
}

h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

h4, h5, h6 {
  font-size: 1em;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

/* Paragraph */
p {
  margin-bottom: 1rem;
}

/* Lists */
ul {
  list-style-type: disc;
  padding-left: 2rem;
  margin-bottom: 1rem;
}

ol {
  list-style-type: decimal;
  padding-left: 2rem;
  margin-bottom: 1rem;
}

li {
  margin-bottom: 0.25rem;
}

ol ol {
  list-style-type: lower-alpha;
}

ol ol ol {
  list-style-type: lower-roman;
}

ul ul {
  list-style-type: circle;
}

ul ul ul {
  list-style-type: square;
}

/* Task list */
input[type="checkbox"] {
  appearance: auto;
  -webkit-appearance: auto;
  width: auto;
  height: auto;
  margin-right: 0.4rem;
  vertical-align: middle;
  cursor: default;
  accent-color: var(--button-primary);
}

/* Blockquote */
blockquote {
  border-left: 4px solid var(--blockquote-border);
  padding: 0.5rem 1rem;
  margin-left: 0;
  margin-bottom: 1rem;
  color: var(--preview-text);
  background-color: var(--blockquote-bg);
  border-radius: 0 0.25rem 0.25rem 0;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* Inline code */
code:not(pre code) {
  background-color: var(--code-bg);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.875em;
}

/* Code blocks */
pre {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  background-color: #0d1117;
  padding: 1rem;
}

[data-theme="light"] pre {
  background-color: #f6f8fa;
}

pre code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.875em;
  color: #c9d1d9;
  background: none;
  padding: 0;
}

[data-theme="light"] pre code {
  color: #24292e;
}

/* Links */
a {
  color: var(--link-color);
  text-decoration: underline;
}

/* Horizontal rule */
hr {
  border: none;
  border-top: 1px solid var(--preview-border);
  margin: 2rem 0;
}

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  display: block;
  overflow-x: auto;
}

th, td {
  border: 1px solid var(--table-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

th {
  background-color: var(--table-header-bg);
  font-weight: 600;
}

/* Image */
img {
  max-width: 100%;
  border-radius: 0.5rem;
}

/* Footnotes */
[data-footnote-ref] {
  color: var(--link-color);
  text-decoration: none;
  font-size: 0.75em;
  vertical-align: super;
  line-height: 0;
  margin: 0 0.1em;
  padding: 0 0.2em;
  border-radius: 2px;
  cursor: pointer;
}

[data-footnote-ref]::before {
  content: '[';
}

[data-footnote-ref]::after {
  content: ']';
}

section.footnotes {
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--preview-border);
  font-size: 0.85em;
  color: var(--preview-text);
  opacity: 0.85;
}

section.footnotes .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  word-wrap: normal;
  border: 0;
}

section.footnotes ol {
  padding-left: 1.5rem;
  list-style-type: decimal;
  margin: 0;
}

section.footnotes li {
  margin-bottom: 0.4rem;
  padding-left: 0.25rem;
  line-height: 1.6;
}

section.footnotes li > p {
  margin-bottom: 0.25rem;
}

section.footnotes li > p:last-child {
  margin-bottom: 0;
}

[data-footnote-backref] {
  color: var(--link-color);
  text-decoration: none;
  font-size: 0.8em;
  margin-left: 0.3em;
  opacity: 0.5;
}

section.footnotes code {
  background-color: var(--code-bg);
  padding: 0.1rem 0.2rem;
  border-radius: 0.2rem;
  font-size: 0.9em;
}

section.footnotes blockquote {
  border-left: 3px solid var(--blockquote-border);
  padding: 0.25rem 0.75rem;
  margin: 0.4rem 0;
  background-color: var(--blockquote-bg);
  border-radius: 0 0.2rem 0.2rem 0;
}

/* Syntax highlighting — dark (default) */
.hljs {
  color: #c9d1d9;
}

.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_ {
  color: #ff7b72;
}

.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_ {
  color: #d2a8ff;
}

.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-variable,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id {
  color: #79c0ff;
}

.hljs-regexp,
.hljs-string,
.hljs-meta .hljs-string {
  color: #a5d6ff;
}

.hljs-built_in,
.hljs-symbol {
  color: #ffa657;
}

.hljs-comment,
.hljs-code,
.hljs-formula {
  color: #8b949e;
}

.hljs-name,
.hljs-quote,
.hljs-selector-tag,
.hljs-selector-pseudo {
  color: #7ee787;
}

.hljs-subst {
  color: #c9d1d9;
}

.hljs-section {
  color: #1f6feb;
  font-weight: bold;
}

.hljs-bullet {
  color: #f2cc60;
}

.hljs-emphasis {
  color: #c9d1d9;
  font-style: italic;
}

.hljs-strong {
  color: #c9d1d9;
  font-weight: bold;
}

.hljs-addition {
  color: #aff5b4;
  background-color: #033a16;
}

.hljs-deletion {
  color: #ffdcd7;
  background-color: #67060c;
}

/* Syntax highlighting — light overrides */
[data-theme="light"] .hljs-doctag,
[data-theme="light"] .hljs-keyword,
[data-theme="light"] .hljs-meta .hljs-keyword,
[data-theme="light"] .hljs-template-tag,
[data-theme="light"] .hljs-template-variable,
[data-theme="light"] .hljs-type,
[data-theme="light"] .hljs-variable.language_ {
  color: #d73a49;
}

[data-theme="light"] .hljs-title,
[data-theme="light"] .hljs-title.class_,
[data-theme="light"] .hljs-title.class_.inherited__,
[data-theme="light"] .hljs-title.function_ {
  color: #6f42c1;
}

[data-theme="light"] .hljs-attr,
[data-theme="light"] .hljs-attribute,
[data-theme="light"] .hljs-literal,
[data-theme="light"] .hljs-meta,
[data-theme="light"] .hljs-number,
[data-theme="light"] .hljs-operator,
[data-theme="light"] .hljs-variable,
[data-theme="light"] .hljs-selector-attr,
[data-theme="light"] .hljs-selector-class,
[data-theme="light"] .hljs-selector-id {
  color: #005cc5;
}

[data-theme="light"] .hljs-regexp,
[data-theme="light"] .hljs-string,
[data-theme="light"] .hljs-meta .hljs-string {
  color: #032f62;
}

[data-theme="light"] .hljs-built_in,
[data-theme="light"] .hljs-symbol {
  color: #e36209;
}

[data-theme="light"] .hljs-comment,
[data-theme="light"] .hljs-code,
[data-theme="light"] .hljs-formula {
  color: #6a737d;
}

[data-theme="light"] .hljs-name,
[data-theme="light"] .hljs-quote,
[data-theme="light"] .hljs-selector-tag,
[data-theme="light"] .hljs-selector-pseudo {
  color: #22863a;
}

[data-theme="light"] .hljs-subst {
  color: #24292e;
}

[data-theme="light"] .hljs-section {
  color: #005cc5;
  font-weight: bold;
}

[data-theme="light"] .hljs-bullet {
  color: #e36209;
}

[data-theme="light"] .hljs-emphasis {
  color: #24292e;
  font-style: italic;
}

[data-theme="light"] .hljs-strong {
  color: #24292e;
  font-weight: bold;
}

[data-theme="light"] .hljs-addition {
  color: #22863a;
  background-color: #f0fff4;
}

[data-theme="light"] .hljs-deletion {
  color: #b31d28;
  background-color: #ffeef0;
}

[data-theme="light"] .hljs-char.escape_,
[data-theme="light"] .hljs-link,
[data-theme="light"] .hljs-params,
[data-theme="light"] .hljs-property,
[data-theme="light"] .hljs-punctuation,
[data-theme="light"] .hljs-tag {
  color: #24292e;
}

/* Mermaid diagrams */
.mermaid-diagram {
  padding: 1rem;
  margin: 1rem 0;
  background-color: var(--code-bg);
  border-radius: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: auto;
  min-height: 100px;
  border: 1px solid var(--preview-border);
}

.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}

/* Page break — prevent elements from being split across pages */
p, blockquote, pre, table, img, ul, ol, h1, h2, h3, h4, h5, h6, .mermaid-diagram {
  break-inside: avoid;
  page-break-inside: avoid;
}

h1, h2, h3, h4, h5, h6 {
  break-after: avoid;
  page-break-after: avoid;
}

/* Export template structure (F2): header / toc / content / footer */
.export-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--preview-border);
}

.export-header-custom {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.export-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  font-size: 0.85rem;
  opacity: 0.7;
}

.export-toc {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  border: 1px solid var(--preview-border);
  border-radius: 0.5rem;
  background-color: var(--blockquote-bg);
  break-after: avoid;
  page-break-after: avoid;
}

.export-toc-title {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.export-toc-list {
  list-style: none;
  padding-left: 0;
}

.export-toc-item {
  line-height: 1.8;
}

.export-toc-item a {
  color: var(--link-color);
  text-decoration: none;
}

.export-toc-item a:hover {
  text-decoration: underline;
}

.export-toc-level-1 { padding-left: 0; }
.export-toc-level-2 { padding-left: 1rem; }
.export-toc-level-3 { padding-left: 2rem; }
.export-toc-level-4 { padding-left: 3rem; }
.export-toc-level-5 { padding-left: 4rem; }
.export-toc-level-6 { padding-left: 5rem; }

.export-content {
  margin-top: 1rem;
}

.export-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--preview-border);
  font-size: 0.85rem;
  opacity: 0.7;
  text-align: center;
}

/* Print-friendly */
@media print {
  body {
    padding: 0;
    max-width: none;
  }
}
`;

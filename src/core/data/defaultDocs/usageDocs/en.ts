/**
 * MarkCraft 使用文档 · 知识库内置篇章（en）
 *
 * ⚠️ 本文件由 scripts/gen-usage-docs.cjs 生成，请勿手工编辑。
 *    源：src/core/data/defaultDocs/en.ts 的《用户手册》，按章节边界机械拆分；
 *    正文除「标题层级上提一级」与续篇补合成 H1 外未作任何改写。
 *    改内容 → 先改源手册，再执行 `node scripts/gen-usage-docs.cjs` 重新生成。
 */
export interface UsageDocPage {
  /** 稳定标识（跨语言一致，供幂等补齐使用） */
  slug: string
  /** 笔记文件名（含 .md） */
  fileName: string
  /** Markdown 正文 */
  content: string
}

import { markdownTutorialContent, knowledgeLinkGuideContent } from '../en'

/** 知识库与文件夹显示名 */
export const USAGE_DOC_FOLDER = "MarkCraft User Guide"

/** 知识库描述 */
export const USAGE_DOC_DESCRIPTION = "Complete usage guide for MarkCraft (built-in, feel free to edit or delete)"

/** 由《用户手册》拆分而来的篇章（按阅读顺序） */
export const USAGE_DOC_PAGES: UsageDocPage[] = [
  {
    slug: "index",
    fileName: "00 Getting Started.md",
    content: `# MarkCraft User Guide

Welcome to MarkCraft! 🎉 This comprehensive manual covers all editor features to help you get started quickly and use the editor efficiently.

## How to use this guide

- Return here anytime via **Knowledge Base → MarkCraft User Guide**
- Every note is a plain Markdown file — edit, rename or delete freely
- The **Notes** tab lists every page; the **Search** tab searches across them
- Lost the entry point? **Settings → About → Documentation**

## All pages

| Page | What it covers |
| --- | --- |
| [[01 Interface Layout]] | Sidebar, top bar, status bar and each region |
| [[02 Editor Modes]] | Source mode / WYSIWYG / split layout |
| [[03 File Management]] | File tree, tabs, autosave, diary, bookmarks |
| [[04 Editing Basics]] | Undo/redo, find & replace, global search |
| [[05 Basic Formatting]] | Headings, text styles, lists, quotes, code blocks |
| [[06 Advanced Syntax]] | Links, tables, footnotes, math, diagrams, mind maps |
| [[07 Autocomplete and Focus Mode]] | Autocomplete, focus mode, typewriter mode |
| [[08 Advanced Features]] | Live preview, outline, lint, images, themes, front matter |
| [[09 Export and Blog Studio]] | Export formats and Blog Studio |
| [[10 Knowledge Linking]] | Wikilinks, backlinks, tags (quick reference) |
| [[11 Shortcuts]] | Full shortcut list |
| [[12 Command Palette and Settings]] | Command palette and settings categories |
| [[13 Tips and FAQ]] | Troubleshooting and tips |

## Further reading

- [[Markdown Beginner Tutorial]] — Markdown syntax from scratch
- [[Knowledge Linking Guide]] — deep dive into links, tags and your knowledge graph`,
  },
  {
    slug: "ui",
    fileName: "01 Interface Layout.md",
    content: `# 1. Interface Layout

The MarkCraft interface is designed for distraction-free writing while keeping powerful tools at your fingertips.

| Area | Position | Function |
|------|----------|----------|
| File Tree | Left sidebar | Manage folders and documents with drag-and-drop, right-click menu |
| Tab Bar | Top | Switch between open files, close tabs, see modified indicators |
| Editor Area | Center | Markdown source or WYSIWYG editing with live preview options |
| Toolbar | Top of editor | Quick-access buttons for formatting, modes, and common actions |
| Outline Panel | Right side | Document heading structure with click-to-jump navigation |
| Status Bar | Bottom | Word count, character count, line count, reading time, lint status |
| Backlinks Panel | Bottom of sidebar | See which notes link to the current file |

> 💡 Toggle the sidebar with \`Ctrl+\\\` and the outline with \`Ctrl+Shift+O\`.

## 1.1 Showing / Hiding Each Area

| Area | Toggle | Common Actions |
|------|--------|----------------|
| File Tree (left) | Toolbar sidebar button or Ctrl+\\ | Drag to sort, right-click menu, new folder, import |
| Editor (center) | Toolbar editor button | Source / WYSIWYG switch, formatting |
| Preview (right) | Toolbar preview button | Scroll sync, jump to top / bottom |
| Outline (right) | Ctrl+Shift+O | Click to jump, collapse, scroll-linked highlight |
| Backlinks | Sidebar backlinks section | Click an entry to jump to the reference |
| Footnotes | Sidebar footnotes section | Click to jump, hover to preview |

## 1.2 Layout Recipes

- **Deep writing**: hide the sidebar and preview, keep only the editor; add Focus Mode (F8).
- **Proofreading**: editor + preview side by side, change and check in one place.
- **Navigating many notes**: file tree + editor.
- **Long documents**: editor + outline for quick section jumps.

## 1.3 Reading the Status Bar

The status bar shows word count (plain-text / standard), character count, line count, estimated reading time (Chinese ~500 chars/min, English ~200 words/min), and the lint warning count. Click the lint count to jump to the issue.

---`,
  },
  {
    slug: "editor-modes",
    fileName: "02 Editor Modes.md",
    content: `# 2. Editor Modes

MarkCraft features **dual-engine editing** with two distinct modes. Toggle between them using the toolbar buttons.

## 2.1 Source Mode (CodeMirror 6)

Edit Markdown source directly with full syntax highlighting:

- Full control over your Markdown source
- Syntax highlighting for all Markdown elements
- Line numbers and bracket matching
- **Live Preview**: inline rendering for headings, blockquotes, and more
- Code block syntax highlighting with 6 themes

## 2.2 WYSIWYG Mode (Tiptap 3.24)

Rich text real-time rendering — see the final result as you type:

- Edit formatted text directly
- Visual table editor with bubble menu
- Slash commands (type \`/\`) for quick insertion
- Drag-and-drop content manipulation
- Hover previews for links

## 2.3 Dual-Column Layout

The editor supports independent control of source and preview visibility:

| Layout | How to Activate | Use Case |
|--------|-----------------|----------|
| Source only | Close preview | Focus on raw Markdown writing |
| Preview only | Close source | Read-only viewing |
| Side by side | Both visible | Edit and preview simultaneously |

## 2.4 Bidirectional Scroll Sync

- Editor and preview scroll positions stay synchronized
- 8ms throttle for smooth performance
- 50ms sync lock prevents bounce-back effects

> ⚠️ The old split mode has been deprecated. Use the dual-column layout instead.

## 2.5 Choosing a Mode

| You want to... | Recommended |
|----------------|-------------|
| Control raw Markdown precisely, bulk-edit formatting | Source mode |
| Write visually like Word, insert tables / math | WYSIWYG |
| Write and see the rendered result side by side | Source + preview |

- Both modes share the **same Markdown source**, so switching never loses content.
- Turn on Live Preview in Source mode to see inline styles while editing plain text.

## 2.6 Slash Commands in WYSIWYG

Type / at the start of a line to open the insert menu: mermaid, mindmap, math, footnote, table, hr, code. Use arrow keys and Enter to choose, Esc to cancel.

## 2.7 Common Questions

- **Layout looks different after switching?** Rendering differs slightly (tables, deep nesting); trust the source, and preview before exporting.
- **Preview briefly out of sync?** A 50ms lock prevents bounce; it realigns once scrolling stops.

---`,
  },
  {
    slug: "files",
    fileName: "03 File Management.md",
    content: `# 3. File Management

## 3.1 File Tree

- **Tree structure**: Organize files in nested folders
- **Drag and drop**: Move files and folders by dragging
- **Right-click menu**: Rename, delete, copy, and more
- **Folder collapse**: Click the arrow to expand/collapse folders

## 3.2 Multi-Tab Editing

- Open multiple files simultaneously in the tab bar
- Click tabs to switch between files
- Modified files show an indicator
- Close tabs with the × button

## 3.3 Recent Files

Quickly access recently opened files from the menu or command palette.

## 3.4 Quick Open (Ctrl+P)

Press \`Ctrl+P\` for fuzzy file search — type part of a filename to instantly locate and open it.

## 3.5 Auto-Save

- Automatically saves after each edit (500ms debounce)
- Adjustable interval: 5–300 seconds in Settings
- Data stored as JSON files under \`%APPDATA%\\MarkCraft\\storage\\\` (file tree key: \`markcraft-file-manager\`); localStorage keeps only the version tag and crash-recovery copy
- Crash recovery: restore unsaved changes after unexpected closes

## 3.6 File Import

Import documents from multiple formats:

- **Markdown** (.md) — standard import
- **Word** (.docx) — powered by mammoth.js
- **HTML** — convert web pages to Markdown

## 3.7 Daily Note

Click the daily note button to instantly create today's note in the format \`YYYY-MM-DD.md\`.

## 3.8 Bookmarks

- Bookmark files and individual headings
- Organize bookmarks into groups
- Quick access from the sidebar

## 3.9 File Tree Operations

| Action | How |
|--------|-----|
| New note / folder | Toolbar button, right-click menu, or Ctrl+N |
| Rename | Right-click → Rename |
| Delete | Right-click → Delete (removes from disk — be careful) |
| Move | Drag onto the target folder |
| Reorder | Drag to adjust order within a folder |
| Quick locate | Ctrl+P fuzzy search by name |

## 3.10 Import Notes

- **Markdown (.md)**: imported as-is, syntax preserved.
- **Word (.docx)**: converted via mammoth; complex layout (columns, text boxes, WordArt) may be lost — proofread after import.
- **HTML**: converted by structure, inline styles kept where possible.
- Duplicate names get an automatic suffix; existing notes are never overwritten.

## 3.11 Daily Notes & Bookmarks

- **Daily note**: the command palette "Open Daily Note" creates today's YYYY-MM-DD.md; set a daily template to fill in the date automatically.
- **Bookmarks**: bookmark whole files or individual headings; groups help separate "to read", "important", and "project" items.

---`,
  },
  {
    slug: "editing",
    fileName: "04 Editing Basics.md",
    content: `# 4. Text Editing Basics

## 4.1 Undo / Redo

| Action | Shortcut | Description |
|--------|----------|-------------|
| Undo | \`Ctrl+Z\` | Undo the last edit operation |
| Redo | \`Ctrl+Shift+Z\` | Redo an undone operation |

> 💡 The editor supports up to 100 steps of undo/redo history with transactional operations.

## 4.2 Find and Replace

| Action | Shortcut | Description |
|--------|----------|-------------|
| Find | \`Ctrl+F\` | Open the search bar |
| Replace | \`Ctrl+H\` | Open the replace bar with batch support |
| Go to Line | \`Ctrl+G\` | Jump to a specific line number |

## 4.3 Global Search

Press \`Ctrl+Shift+F\` to search across **all files** in your workspace.

## 4.4 Scroll Buttons

One-click buttons to jump to the **top** or **bottom** of both the editor and preview areas.

## 4.5 Find & Replace Details

- **Find (Ctrl+F)**: highlights every match instantly; toggle case-sensitive and whole-word.
- **Replace (Ctrl+H)**: replace one or all; a bulk replace is merged into a single undo step.
- **Go to line (Ctrl+G)**: jump by line number in long documents.

## 4.6 Global Search

Ctrl+Shift+F searches across all files, groups results by file, and jumps to the match on click. It covers both titles and body text.

## 4.7 Undo History

- Up to 100 steps are kept; older entries are dropped.
- Continuous typing and bulk edits merge into one step.
- History is kept per file, so switching back still lets you undo.

---`,
  },
  {
    slug: "format-basic",
    fileName: "05 Basic Formatting.md",
    content: `# 5. Formatting

MarkCraft supports a rich set of Markdown formatting features. Here's a quick reference:

## 5.1 Headings

Use \`#\` symbols or press \`Ctrl+1/2/3\`:

\`\`\`markdown
# Heading 1
# Heading 2
## Heading 3
### Heading 4
#### Heading 5
###### Heading 6
\`\`\`

> 💡 Heading IDs are auto-generated as anchor links for easy navigation.

## 5.2 Text Styles

| Style | Shortcut | Markdown Syntax | Result |
|-------|----------|-----------------|--------|
| Bold | \`Ctrl+B\` | \`**text**\` | **text** |
| Italic | \`Ctrl+I\` | \`*text*\` | *text* |
| Underline | \`Ctrl+U\` | \`<u>text</u>\` | <u>text</u> |
| Strikethrough | \`Ctrl+Shift+X\` | \`~~text~~\` | ~~text~~ |
| Highlight | \`Ctrl+Shift+H\` | \`==text==\` | ==text== |
| Inline Code | \`Ctrl+E\` | \`\\\`code\\\`\` | \`code\` |
| Subscript | \`Ctrl+Shift+,\` | \`~text~\` | H~2~O |
| Superscript | \`Ctrl+.\` | \`^text^\` | x^2^ |

## 5.3 Lists

**Unordered list:**

\`\`\`markdown
- Item one
- Item two
  - Nested item
\`\`\`

**Ordered list:**

\`\`\`markdown
1. First step
2. Second step
3. Third step
\`\`\`

**Task list:**

\`\`\`markdown
- [x] Completed task
- [ ] Pending task
  - [ ] Sub-task
\`\`\`

> 💡 Task lists support nesting. Click the checkbox in preview mode to toggle.

## 5.4 Blockquotes

\`\`\`markdown
> This is a blockquote
> It can span multiple lines
\`\`\`

Shortcut: \`Ctrl+Shift+B\`

## 5.5 Code Blocks

Click the code block button or use \`Ctrl+Alt+C\`:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

**Code Block Features:**
- Syntax highlighting based on highlight.js 11.11 + lowlight 3.3
- Supports dozens of programming languages
- 6 code themes: Default (Light), Monokai, Dracula, One Dark, GitHub Dark, Solarized
- Copy button for one-click copying
- Language label display
- Smart indentation
- Auto-folds when over 10 lines
- Rainbow brackets

## 5.6 Horizontal Rules

\`\`\`markdown
---
\`\`\`

Shortcut: \`Ctrl+Shift+-\``,
  },
  {
    slug: "format-advanced",
    fileName: "06 Advanced Syntax.md",
    content: `# 5. Formatting (cont.)

## 5.7 Links

\`\`\`markdown
[Link text](https://example.com)
\`\`\`

**Link features:**
- Hover preview in WYSIWYG mode
- Link modal for editing
- WikiLink support (see Knowledge Linking System)

## 5.8 Tables

Insert a table with \`Ctrl+Shift+T\` or the toolbar button:

\`\`\`markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Content  | Content  | Content  |
\`\`\`

**Table features:**
- Resizable columns
- Column alignment (left/center/right)
- Visual table editor
- Table bubble menu and context menu
- Tab key navigation between cells

## 5.9 Definition Lists

\`\`\`markdown
Term
: Definition description

Another term
: Another definition
\`\`\`

## 5.10 Footnotes

\`\`\`markdown
Here is some text[^1] with a footnote.

[^1]: This is the footnote content.
\`\`\`

**Footnote features:**
- Footnote sidebar panel
- Hover tooltip preview
- Click to navigate between reference and definition

## 5.11 Math Formulas (KaTeX 0.16.45)

**Inline formula:**

\`\`\`markdown
The formula $E = mc^2$ is famous.
\`\`\`

**Block formula:**

\`\`\`markdown
$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
\`\`\`

**Math features:**
- Inline preview when cursor is inside formula
- Math symbols panel for quick insertion
- Full KaTeX syntax support

## 5.12 Mermaid Diagrams (11.14)

\`\`\`mermaid
flowchart LR
  A[Start] --> B{Is it working?}
  B -->|Yes| C[Great!]
  B -->|No| D[Debug]
  D --> B
\`\`\`

**Supported diagram types:**
- Flowchart, Sequence diagram, Gantt chart
- Class diagram, ER diagram, Pie chart
- State diagram, User journey, C4 model
- Mindmap, and more

> 💡 Mermaid diagrams automatically follow the editor's light/dark theme.

## 5.13 Mind Maps

MarkCraft includes a dedicated mind map module based on Mermaid mindmap syntax.

\`\`\`mermaid
mindmap
  root((Central Topic))
    Subtopic 1
    Subtopic 2
      Sub-subtopic 1
      Sub-subtopic 2
\`\`\`

**Node shapes:**
| Shape | Syntax |
|-------|--------|
| Circle | \`((text))\` |
| Square | \`[text]\` |
| Rounded | \`(text)\` |
| Cloud | \`)text(\` |
| Hexagon | \`{{text}}\` |
| Bang | \`))text((\` |
| Default | plain text |

**Mind map features:**
- Canvas-based rendering
- Context menu for quick operations
- Node editor panel
- Mind map templates in the toolbar

## 5.14 Callouts / Admonitions

11 callout types with the syntax \`> [!type]\`:

\`\`\`markdown
> [!note]
> This is a note callout.

> [!tip]
> This is a tip callout.

> [!warning]
> This is a warning callout.
\`\`\`

**Available types:** note, tip, warning, danger, info, success, question, bug, example, quote, failure

**Collapsible callouts:**
- \`> [!type]+\` — expanded by default, collapsible
- \`> [!type]-\` — collapsed by default

## 5.15 Special Text Features

- **Abbreviations**: \`*[HTML]: HyperText Markup Language\`
- **Comment marks**: hidden comments in the source
- **Image attributes**: \`![alt](src){width="100" align="center"}\`
- **Raw HTML blocks**: embed HTML directly
- **Media embed**: video and iframe support
- **TOC node**: auto-generated table of contents with \`[toc]\`

## 5.16 Nesting & Combinations

- **List inside list**: indent the child by 2 spaces or 1 tab.
- **Code block inside list**: indent the whole block one more level, aligning the fence with the list.
- **List inside quote**: start the line with a quote marker followed by a dash.
- **Line break in a table cell**: use the HTML br tag inside the cell.

## 5.17 Formatting Pitfalls

- **Bold vs italic clash**: three asterisks mean bold + italic; mind the count for just one.
- **No parsing inside code**: asterisks and hashes inside code blocks stay literal.
- **Blank lines matter**: separate paragraphs with a blank line or they may merge.
- **Full-width punctuation** is fine, but add a space next to markers to be safe.

---`,
  },
  {
    slug: "smart",
    fileName: "07 Autocomplete and Focus Mode.md",
    content: `# 6. Autocomplete & Smart Editing

## 6.1 Smart Editing Features

MarkCraft is packed with intelligent editing helpers:

- **Auto-pair brackets**: \`()\`, \`{}\`, \`[]\` auto-close
- **Auto-pair quotes**: \`""\`, \`''\` auto-close
- **Auto-pair Markdown**: \`**\`, \`__\`, \`~~\`, \`==\` auto-close
- **Markdown autocomplete**: heading, list, link completion
- **Code block completion**: auto-close \\\`\\\`\\\` fences
- **Auto-continue**: lists, blockquotes continue on Enter
- **Smart indent/backspace**: intelligent list and code block handling
- **Table Tab navigation**: Tab moves to next cell
- **Table context menu & bubble menu**: visual table operations
- **Visual table editor**: insert tables with a GUI
- **Inline code highlighting**: syntax colors for inline code

## 6.2 Slash Commands (WYSIWYG Mode)

Type \`/\` in WYSIWYG mode for quick insertion:

| Command | Inserts |
|---------|---------|
| \`/mermaid\` | Mermaid diagram code block |
| \`/mindmap\` | Mind map diagram |
| \`/math\` | Block math formula |
| \`/footnote\` | Footnote reference |
| \`/table\` | 3×3 table |
| \`/hr\` | Horizontal rule |
| \`/code\` | Code block |

## 6.3 How Auto-Pairing Behaves

- Typing an opening bracket or quote inserts the closing half and places the cursor inside.
- Typing a paired marker (bold, strikethrough, highlight) auto-closes it; typing it over a selection wraps the selection.
- Typing double brackets opens WikiLink autocomplete (see chapter 11); typing / in WYSIWYG opens Slash commands.

## 6.4 Turning Helpers Off

In Settings → Editor you can independently disable autocomplete, auto-pair brackets, auto-pair quotes, and auto-pair Markdown. Turning one off does not affect the others.

## 6.5 Smart Indent & Backspace

- Enter continues list and quote markers; Enter on an empty item exits the list.
- Tab / Shift+Tab change indentation in lists and code blocks; Tab moves between table cells.
- Backspace at the start of an indented line reduces indentation first.

---

# 7. Focus Mode & Typewriter Mode

## 7.1 Focus Mode (F8)

Toggle with \`F8\` or the toolbar button:

- Hides all panels (sidebar, outline, etc.)
- Editor centered at 800px width (adjustable)
- Current line is highlighted
- Non-current lines are faded out
- Perfect for distraction-free writing

## 7.2 Typewriter Mode (F9)

Toggle with \`F9\` or the toolbar button:

- Cursor line stays vertically centered
- Current line highlighted with a blue bar
- Simulates typewriter scrolling
- Can be combined with Focus Mode

## 7.3 Combining the Modes

| Goal | Suggested combo |
|------|-----------------|
| Draft with maximum focus | Focus + Typewriter + Fullscreen |
| Proofread and polish | Normal layout + preview |
| Present / large screen | Fullscreen + Focus |

> 💡 Focus and Typewriter are session-only toggles; they are not persisted to settings. For a lasting default, enable them in Settings.

---`,
  },
  {
    slug: "advanced",
    fileName: "08 Advanced Features.md",
    content: `# 8. Advanced Features

## 8.1 Live Preview

In Source mode, enjoy inline rendering for many Markdown elements:

- Headings render as styled text
- Blockquotes show as indented quote blocks
- Links appear as clickable blue text
- Images show inline previews
- Code blocks have syntax highlighting

## 8.2 Outline Navigation

- 6-color level system for heading hierarchy
- Level indentation shows structure
- Click a heading to jump to its position
- Scroll sync: current heading highlighted as you scroll
- Expand all / Collapse all buttons
- Shows heading count and max depth
- Toggle with \`Ctrl+Shift+O\`

## 8.3 Lint Checking (7 Rule Types)

Real-time Markdown syntax validation:

| Rule | Checks For |
|------|------------|
| Unclosed code blocks | Fenced code blocks without closing |
| Link format | Malformed link syntax |
| Heading levels | Skipped heading levels |
| List markers | Inconsistent list markers |
| Backtick count | Mismatched backtick pairs |
| Image format | Malformed image syntax |
| Divider mix | Mixed divider styles |

- Wavy underlines mark issues in the editor
- One-click fix for many issues
- Status bar shows error/warning count

## 8.4 Document Statistics

Click the status bar to see detailed stats:

- Word count (plain text / standard calculation)
- Character count
- Line count
- Reading time estimate (Chinese: 500 wpm, English: 200 wpm, weighted average)

## 8.5 Front Matter

YAML front matter with a visual editor panel:

\`\`\`yaml
---
title: My Article
date: 2024-01-15
tags:
  - markdown
  - tutorial
category: Guides
description: A comprehensive guide
author: Your Name
cover: /images/cover.jpg
slug: my-article
draft: false
series: Markdown Series
---
\`\`\`

**Editable fields:** title, date, tags, category, description, author, cover, slug, draft, series

## 8.6 Image Handling

Multiple ways to insert images:

- **Paste** from clipboard (\`Ctrl+V\`)
- **Drag and drop** image files into the editor
- **Upload** via toolbar button

**Image features:**
- Placeholder system (\`image:ID\` replaces Base64 for performance)
- Inline preview in the editor
- Image preview modal (click to enlarge)
- Large image confirmation prompt (over 2MB)
- Image cache management
- Image host configuration (PicGo / custom)
- Relative path handling
- Image optimization tools
- Smart delete: Backspace inside an image marker deletes the whole marker

## 8.7 Emoji Picker

Click the 😊 button on the toolbar to open the emoji picker and insert emojis or special symbols.

## 8.8 Editor Context Menu

Right-click in the editor for a context menu with common formatting actions and editing operations.

## 8.9 Error Boundary

The editor includes error boundaries to prevent crashes from propagating — if something goes wrong, you'll see a friendly error message instead of a blank screen.

## 8.10 Live Preview Trade-offs

- Inline styles for headings, quotes and lists appear right in the source.
- Very large documents may render a bit slower; turn it off temporarily if it stutters.
- Unlike WYSIWYG, you stay in the source editor with full control over the cursor and syntax.

## 8.11 Outline & Footnotes in Sync

- The outline highlights the current heading as you scroll; clicking it jumps back.
- Footnote numbers in the text map one-to-one to the footnotes panel; deleting a reference leaves an orphan footnote flagged in the panel.

## 8.12 Lint Quick Fix

Issues are underlined; click for an explanation and a Fix button. Auto-fixable: unclosed fences, mismatched backticks, mixed dividers. Heading skips and malformed links are flagged but fixed manually.

## 8.13 Image Optimization & Hosting

- **Optimize images**: convert inline Base64 images to local files + placeholders to shrink the document.
- **Placeholders**: the document references image:ID, resolved to the real image at render time.
- **Image host**: choose PicGo or a custom host in Settings; uploads replace links automatically.
- **Relative paths**: store images relative to the Vault for easy migration.

---`,
  },
  {
    slug: "export-blog",
    fileName: "09 Export and Blog Studio.md",
    content: `# 9. Export (12 Formats)

MarkCraft supports exporting to 12 different formats:

| Format | Extension | Notes |
|--------|-----------|-------|
| Markdown | .md | Standard Markdown export |
| HTML | .html | Full HTML page with styles |
| PDF | .pdf | With TOC, page numbers, header/footer options |
| Word | .docx | Microsoft Word document |
| LaTeX | .tex | LaTeX source file |
| EPUB | .epub | E-book format |
| reStructuredText | .rst | reStructuredText format |
| MediaWiki | .wiki | MediaWiki markup |
| OPML | .opml | Outline Processor Markup Language |
| Plain Text | .txt | Unformatted text |
| PNG Image | .png | Screenshot export |
| JPEG Image | .jpg | Screenshot export |

**PDF options:**
- Include table of contents
- Page numbers
- Custom header/footer text

**Image options:**
- 1x / 2x / 3x resolution

**HTML/PDF features:**
- Export style presets
- Custom CSS styles
- File System Access API preferred, Blob download fallback

## 9.1 Which Format to Pick

| Purpose | Format |
|---------|--------|
| Archive / re-edit | Markdown |
| Web page / email | HTML |
| Print / formal doc | PDF (TOC, page numbers, header/footer) |
| Hand to a colleague | Word (.docx) |
| Academic typesetting | LaTeX (.tex) |
| E-book | EPUB |
| Share a long image | PNG / JPEG (1x / 2x / 3x) |

## 9.2 Export Options

- **HTML / PDF**: built-in style presets or custom CSS; PDF supports header, footer, page numbers and TOC.
- **Images**: 1x / 2x / 3x resolution.
- **Save location**: desktop uses a native file dialog; falls back to a browser download.

## 9.3 Pre-Export Checklist

- Confirm tables, math, Mermaid diagrams and images render in preview.
- Check for broken links (red dashed underline) and unclosed code blocks (lint flags them).
- For PDF, set page size and margins first so tables and code are not split.

---

# 10. Blog Studio

MarkCraft's Blog Studio lets you turn your Markdown documents into a beautiful blog with zero coding.

## 10.1 Three-Panel Layout

| Panel | Side | Purpose |
|-------|------|---------|
| Config Panel | Left | Customize blog settings |
| Preview | Center | Real-time blog preview |
| Controls | Right | Device simulation and tools |

**Device simulation:** Desktop 🖥️ / Tablet 📱 / Mobile 📱

**Real-time preview:** iframe sandbox with 500ms debounce

## 10.2 Blog Themes (63 Presets + Custom, 5 Batches)

**Batch 1 — 15 Classic:**
magazine, minimal, classic, ink-wash, terminal, newspaper, glassmorphism, bento, narrative, cyberpunk, aurora, academia, retro, garden, midnight

> \`custom\` is an extra option outside the 63 presets, letting you write your own style.

**Batch 2 — 18 Themes:**
poetry, typewriter, ocean, sunset, editorial, trending, dispatch, carbon, blueprint, hacker, showcase, mosaic, gallery, cinematic, docs, wiki, neon, origami

**Batch 3 — 12 Themes:**
swiss, bauhaus, artdeco, zen, brutalist, vaporwave, pixel, neumorphism, corporate, fashion, forest, notion

**Batch 4 — 10 Themes:**
cafe, travel, music, sketch, cosmos, claymorphism, ice-crystal, rams, luxury, comic

**Batch 5 — 8 Themes:**
steampunk, gothic, noir, recipe, timeline, feed, pastel, newsletter

## 10.3 Theme Categories & Filters

**7 Categories:** All, Personal Blog, Magazine, Portfolio, Tech Blog, Photography, Docs, Creative

**8 Tags:** Minimal, Dark, Retro, Futuristic, Nature, Academic, Typography, Grid

**Feature flags:** featured, isNew, isDarkDefault

## 10.4 Color Schemes

- **12-color wheel**: red, orange-red, orange, orange-yellow, yellow, yellow-green, green, blue-green, blue, blue-violet, violet, red-violet
- **Custom color picker**: choose any color
- **3 color adjustments**:
  - Color Lightness: 0–100
  - Color Saturation: 0–200
  - Color Sharpness: 0–200

## 10.5 Fonts & Layout

**Font families:**
- Serif: Playfair Display
- Sans: Inter
- Mono: JetBrains Mono

**Theme mode:** Light / Dark

**Layout styles:** Magazine / Minimal / Classic

## 10.6 Blog Configuration

**Site info:**
- Site title, description, author
- Language (zh-CN / en)
- Posts per page
- Date format
- Site URL

**File selection:**
- Include / exclude specific documents
- Select all / Deselect all

**Extensions:**
- View count (Busuanzi)
- Applause button
- PWA support

**Reward:**
- Reward title
- WeChat QR code
- Alipay QR code

**About page:**
- Avatar
- Bio
- Skills
- Contact info

**Friend links:**
- Name, URL, avatar, description

**Series:**
- Series name, slug, description, cover

**Comments:**
- giscus, utterances, waline, or none

**Deployment:**
- GitHub Pages, Gitee Pages, Vercel, Cloudflare Pages, Netlify

**Custom CSS:**
- Global custom CSS
- Dark mode specific CSS

**Config import/export:** JSON format

## 10.7 Generated Pages

Home, post, archive (by year), tags, full-text search, RSS, sitemap, 404, about, friend links, series, standalone pages, PWA, share buttons, SEO optimization, TOC (sticky + scroll sync)

## 10.8 Export Methods

- **Single-file HTML**: SPA with hash routing — one file, easy to share
- **Multi-file ZIP**: folder structure, ready for deployment

## 10.9 Recommended Workflow

1. Open Blog Studio from the command palette.
2. Pick a theme, color, font and layout on the left; preview in the center (desktop / tablet / mobile).
3. Select the posts to publish and fill in site info (title, author, language, posts per page).
4. Optionally enable view counts, applause, PWA, comments, rewards, friend links and series.
5. Export on the right: single-file HTML (one-click deploy) or multi-file ZIP (customizable).

## 10.10 Deploying

- **GitHub / Gitee Pages**: push the exported files and enable Pages.
- **Vercel / Netlify / Cloudflare Pages**: connect the repo or drag-and-drop the folder.
- Single-file HTML is simplest: drop it on any static host.

## 10.11 Troubleshooting

- **Preview not refreshing?** It debounces 500ms; wait a moment after a change.
- **Want finer styling?** Use Custom CSS; write a separate set for dark mode.
- **Reuse config?** Export / import the JSON config to move settings between machines.

---`,
  },
  {
    slug: "linking",
    fileName: "10 Knowledge Linking.md",
    content: `# 11. Knowledge Linking System

MarkCraft's knowledge linking system connects your notes into a network. Here's a quick overview — see the **Knowledge Linking Guide** for full details.

## 11.1 WikiLink Bidirectional Links

\`\`\`markdown
Link to [[Another Note]] or [[Another Note|with custom label]]
\`\`\`

- Autocomplete when typing \`[[\`
- Ctrl+Click (Cmd+Click on Mac) to navigate
- Broken links show with red dashed underline

## 11.2 Embeds

\`\`\`markdown
![[Another Note]]
\`\`\`

Embed another note's content directly in the current document.

## 11.3 Backlinks & Unlinked Mentions

- **Backlinks panel**: shows all notes that link to the current file
- **Unlinked mentions**: detects mentions of the filename without \`[[]]\`

## 11.4 Tags

\`\`\`markdown
#tag #parent/child/nested
\`\`\`

- Tag extraction with tree view
- Supports nested tags with \`/\` separator

## 11.5 Graph View

Full-screen canvas visualization of your knowledge network:

- **Global / Local modes**: local uses BFS with depth 1–3
- **Force-directed layout**: nodes arrange organically
- **Interactions**: drag nodes, drag canvas, scroll zoom (0.08x–6x)
- **Double-click** to reset view
- **Click node** to open the file
- **Hover** to highlight connections
- **Node size** scales with link count
- **Color coding**: normal (blue), Hub (purple), center (green), isolated (gray)
- **Edge types**: wikilink (blue), embed (purple with arrow)

> 📖 For a complete guide, open the **Knowledge Linking Guide** from the help menu.

## 11.6 Three Ways to Link

| Syntax | Effect |
|--------|--------|
| Double brackets + target | Link to the target note |
| Double brackets + target + pipe + label | Link with custom display text |
| Exclamation + double brackets + target | Embed the target note's content |

## 11.7 Backlinks & Unlinked Mentions

- **Backlinks**: every note that links to the current one; click to jump.
- **Unlinked mentions**: text mentioning the note without double brackets; convert to a real link in one click.
- Clean up broken links (red dashed) regularly to keep the network healthy.

## 11.8 Tags & Graph

- **Tags**: a leading hash makes a tag; nesting with a slash is supported and shown as a tree.
- **Graph**: global view of the whole vault, local view of N hops around a note; bigger nodes have more links, colors distinguish normal / Hub / center / isolated.

---`,
  },
  {
    slug: "shortcuts",
    fileName: "11 Shortcuts.md",
    content: `# 12. Shortcut List (28 Total)

MarkCraft has 28 shortcuts across 5 categories. Most are customizable in Settings → Shortcuts.

## 12.1 Format (11 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+B\` | Bold | No (internal) |
| \`Ctrl+I\` | Italic | No |
| \`Ctrl+U\` | Underline | No |
| \`Ctrl+Shift+X\` | Strikethrough | No |
| \`Ctrl+Shift+H\` | Highlight | No |
| \`Ctrl+E\` | Inline code | No |
| \`Ctrl+Shift+,\` | Subscript | No |
| \`Ctrl+.\` | Superscript | No |
| \`Ctrl+1/2/3\` | Heading 1/2/3 | No |
| \`Ctrl+Shift+B\` | Blockquote | No |
| \`Ctrl+Alt+C\` | Code block | No |

## 12.2 File (3 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+S\` | Save | Yes |
| \`Ctrl+Shift+S\` | Save As | Yes |
| \`Ctrl+O\` | Open File | Yes |

## 12.3 View (6 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`F8\` | Focus Mode | Yes |
| \`F9\` | Typewriter Mode | Yes |
| \`F11\` | Fullscreen | Yes |
| \`Ctrl+,\` | Settings | Yes |
| \`Ctrl+\\\` | Toggle Sidebar | Yes |
| \`Ctrl+Shift+O\` | Toggle Outline | Yes |

## 12.4 Edit (5 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+F\` | Find | — |
| \`Ctrl+H\` | Replace | — |
| \`Ctrl+Z\` | Undo | — |
| \`Ctrl+Shift+Z\` | Redo | — |
| \`Ctrl+G\` | Go to Line | — |

## 12.5 Insert (3 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+Shift+I\` | Insert Image | — |
| \`Ctrl+Shift+T\` | Insert Table | — |
| \`Ctrl+Shift+-\` | Horizontal Rule | — |

## 12.6 Customization

- **Record your own shortcuts** in Settings → Shortcuts
- **Conflict detection**: warns if a shortcut is already assigned
- **Reset**: reset individual shortcuts or all to defaults
- **Mac**: shows ⌘ symbol instead of Ctrl

## 12.7 Customizing Shortcuts

1. Open Settings → Shortcuts.
2. Find the command and click its record box.
3. Press the new combo; conflicts are detected automatically.
4. Save. Reset individually or reset all to defaults.

## 12.8 Key Conventions

- Mac shows ⌘ / ⌥ / ⇧; Windows / Linux show Ctrl / Alt / Shift.
- Format shortcuts (bold, italic, etc.) are handled internally and usually not customizable.
- File, view and edit shortcuts are mostly customizable.

---`,
  },
  {
    slug: "palette-settings",
    fileName: "12 Command Palette and Settings.md",
    content: `# 13. Command Palette

Open the command palette with \`Ctrl+P\` (Quick Open) or use the dedicated shortcut for quick access to all commands.

**6 Categories:**

| Category | Commands |
|----------|----------|
| **File** | New file, open, save, save as, import, recent files |
| **Edit** | Undo, redo, find, replace, go to line |
| **View** | Focus mode, typewriter mode, fullscreen, toggle sidebar, toggle outline |
| **Navigation** | Quick Open, go to line, global search |
| **Tools** | Blog Studio, outline, table editor, emoji picker |
| **Settings** | Open settings, theme switch, preferences |

## 13.1 Using the Palette

- Open with Ctrl+P or the toolbar button.
- Type a command name (export, outline, theme) for fuzzy matching.
- Arrow keys to select, Enter to run, Esc to close.
- Recent files are also listed; type a filename to jump.

## 13.2 Quick Command Reference

| To... | Search for |
|-------|-----------|
| Switch editor mode | mode / source / wysiwyg |
| Insert a template | template |
| Open canvas / knowledge base / graph | canvas / knowledge / graph |
| Export / Save as | export / save as |
| Open Blog Studio | blog |
| Switch theme | theme / dark / light |

---

# 14. Settings Panel (5 Tabs)

## 14.1 Editor Tab

| Setting | Range | Default |
|---------|-------|---------|
| Auto-save interval | 5–300s | 30s |
| Spell check | on/off | — |
| Smart punctuation | on/off | — |
| Autocomplete | on/off | — |
| Focus mode | on/off | — |
| Typewriter mode | on/off | — |
| Live preview | on/off | — |
| Code block default language | text/language | — |
| Paragraph indent | on/off | — |
| Editor max width | 400–2000px | 800px |
| Tab size | 2/4/8 | 4 |
| Auto-pair brackets | on/off | — |
| Auto-pair quotes | on/off | — |
| Auto-pair Markdown | on/off | — |
| Default sidebar visible | on/off | — |

## 14.2 Appearance Tab

| Setting | Options | Default |
|---------|---------|---------|
| Theme | 5 built-in + custom | Light default |
| Font family | 5 presets | System Default |
| Font size | 10–28px | 15px |
| Line height | 1–3 | 1.7 |
| Code font family | 5 presets | Fira Code |
| Code theme | 6 options | Default (Light) |
| Sidebar width | 160–400px | 240px |

**5 Built-in Editor Themes:** light default, dark default, GitHub, sepia, Nord

**Font presets:**
- UI: System Default, Georgia/Noto Serif, Source Han Sans, Source Han Serif, LXGW WenKai
- Code: Fira Code, JetBrains Mono, Source Code Pro, Cascadia Code, Consolas

## 14.3 Shortcuts Tab

- 28 shortcuts organized in groups
- Click "Record" to capture a new shortcut
- Automatic conflict detection
- Reset individual shortcuts
- Reset all to defaults

## 14.4 Image Tab

| Setting | Options |
|---------|---------|
| Image host type | None / PicGo / Custom |
| Use relative image path | on/off |

## 14.5 Export Tab

| Setting | Description |
|---------|-------------|
| Default export format | Markdown, HTML, PDF, etc. |
| Default export style | Preset styles for HTML/PDF |

## 14.6 When Settings Take Effect

- Appearance items (theme, font size, line height, font) apply instantly, no restart.
- Behavior items (auto-save interval, autocomplete) follow the new rule immediately.
- Settings are stored locally and are not synced across machines; screenshot or note important configs.

## 14.7 Recommended Presets

| Scenario | Settings |
|----------|----------|
| Long writing sessions | Sepia theme + 16–18px + 1.8 line height |
| Code / technical notes | Monospace code font + dark theme |
| Large screen / presenting | Wider editor + fullscreen |

---`,
  },
  {
    slug: "tips-faq",
    fileName: "13 Tips and FAQ.md",
    content: `# 15. FAQ

## Q: Will my edits be lost if I close the browser?

Your notes are stored as real \`.md\` files in the Vault folder you choose. App state (file tree / knowledge base / canvas / version history) is stored as JSON under \`%APPDATA%\\MarkCraft\\storage\\\`, while settings and themes live in localStorage. Auto-save runs every 30 seconds by default (adjustable 5–300s) plus a 500ms debounce while editing, and crash recovery restores unsaved changes after an unexpected close.

## Q: How do I move a file to another folder?

Simply drag the file in the file tree and drop it onto the target folder. You can also reorder files and folders by dragging.

## Q: What's the difference between Source mode and WYSIWYG mode?

**Source mode** (CodeMirror 6) lets you edit raw Markdown with syntax highlighting and live preview. **WYSIWYG mode** (Tiptap) renders formatted text in real time, letting you edit visually. Both modes support all Markdown features — use whichever you prefer!

## Q: Can I customize keyboard shortcuts?

Yes! Go to Settings → Shortcuts tab. There you can record custom shortcuts, see conflicts, and reset to defaults. Format shortcuts (13) are internal and not customizable, but file, view, and other shortcuts can be changed.

## Q: How many blog themes are there?

63 preset themes across 5 batches (plus a \`custom\` option), with category filters and tags to help you find the perfect style. You can also customize colors, fonts, and layout to make it your own.

## Q: How do I create links between notes?

Use WikiLink syntax: \`[[filename]]\`. Just type \`[[\` and autocomplete will help you find the file. See the Knowledge Linking Guide for a complete walkthrough.

## Q: Can I export my blog as a static site?

Yes! Blog Studio supports two export methods: single-file HTML (SPA with hash routing) and multi-file ZIP (folder structure, ready for deployment to GitHub Pages, Vercel, Netlify, etc.).

## Q: What export formats are supported?

12 formats total: Markdown, HTML, PDF, Word, LaTeX, EPUB, reStructuredText, MediaWiki, OPML, Plain Text, PNG, and JPEG.

## Q: How do I use the graph view?

Open the graph view from the sidebar or command palette. You'll see all your notes as nodes connected by links. Drag nodes to rearrange, scroll to zoom, double-click to reset, and click a node to open the file.

## Q: Does MarkCraft support dark mode?

Yes! There are 5 built-in editor themes including dark default and Nord. You can also import custom theme CSS. Code blocks have their own independent theme setting with 6 options.

## Q: How do I add a custom theme?

Go to Settings → Appearance → Theme, and select "Import Theme" to upload a CSS file. The editor parses CSS variables to apply the custom theme.

## Q: How do I migrate my existing notes?

Use the command palette "Migrate Notes (Obsidian / Notion)" to import a zip or folder; it parses and preserves folder structure and links. Check images and wikilinks after migrating.

## Q: Does MarkCraft sync across devices?

MarkCraft is local-first: notes are real .md files in the Vault you choose. Put the Vault in OneDrive / iCloud / Dropbox to sync across devices. App state (file tree, canvas, version history) is stored locally, so copy it too if you need full parity.

## Q: Why does some syntax preview fine but export wrong?

Source, WYSIWYG and the export pipeline handle a few complex cases (nested tables, custom HTML) slightly differently. Trust the preview and spot-check key sections after export.

## Q: How do I stay focused?

Combine: hide the sidebar and preview → Focus Mode (F8) → Typewriter Mode (F9) → Fullscreen (F11). This minimizes distractions.

## Q: Data safety and backup tips?

- Export Markdown backups regularly, or keep the Vault in a synced folder.
- Enable version history for important documents to roll back to any save point.
- Use "Delete" carefully — it removes files from disk.

---

> 📌 Happy writing with MarkCraft! If you have questions or feedback, we'd love to hear from you.`,
  },
]

/** 独立成篇的内置文档（原文直接引用，不做拆分） */
export const USAGE_DOC_KEPT: UsageDocPage[] = [
  { slug: "md-tutorial", fileName: "Markdown Beginner Tutorial.md", content: markdownTutorialContent },
  { slug: "link-guide", fileName: "Knowledge Linking Guide.md", content: knowledgeLinkGuideContent },
]

/** 知识库内的全部笔记（顺序：拆分篇章 → 独立文档） */
export const USAGE_DOC_ALL: UsageDocPage[] = [...USAGE_DOC_PAGES, ...USAGE_DOC_KEPT]

export const userManualContent = `# MarkCraft — User Manual

Welcome to MarkCraft! 🎉 This comprehensive manual covers all editor features to help you get started quickly and use the editor efficiently.

---

## 1. Interface Layout

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

---

## 2. Editor Modes

MarkCraft features **dual-engine editing** with two distinct modes. Toggle between them using the toolbar buttons.

### 2.1 Source Mode (CodeMirror 6)

Edit Markdown source directly with full syntax highlighting:

- Full control over your Markdown source
- Syntax highlighting for all Markdown elements
- Line numbers and bracket matching
- **Live Preview**: inline rendering for headings, blockquotes, and more
- Code block syntax highlighting with 6 themes

### 2.2 WYSIWYG Mode (Tiptap 3.24)

Rich text real-time rendering — see the final result as you type:

- Edit formatted text directly
- Visual table editor with bubble menu
- Slash commands (type \`/\`) for quick insertion
- Drag-and-drop content manipulation
- Hover previews for links

### 2.3 Dual-Column Layout

The editor supports independent control of source and preview visibility:

| Layout | How to Activate | Use Case |
|--------|-----------------|----------|
| Source only | Close preview | Focus on raw Markdown writing |
| Preview only | Close source | Read-only viewing |
| Side by side | Both visible | Edit and preview simultaneously |

### 2.4 Bidirectional Scroll Sync

- Editor and preview scroll positions stay synchronized
- 8ms throttle for smooth performance
- 50ms sync lock prevents bounce-back effects

> ⚠️ The old split mode has been deprecated. Use the dual-column layout instead.

---

## 3. File Management

### 3.1 File Tree

- **Tree structure**: Organize files in nested folders
- **Drag and drop**: Move files and folders by dragging
- **Right-click menu**: Rename, delete, copy, and more
- **Folder collapse**: Click the arrow to expand/collapse folders

### 3.2 Multi-Tab Editing

- Open multiple files simultaneously in the tab bar
- Click tabs to switch between files
- Modified files show an indicator
- Close tabs with the × button

### 3.3 Recent Files

Quickly access recently opened files from the menu or command palette.

### 3.4 Quick Open (Ctrl+P)

Press \`Ctrl+P\` for fuzzy file search — type part of a filename to instantly locate and open it.

### 3.5 Auto-Save

- Automatically saves after each edit (500ms debounce)
- Adjustable interval: 5–300 seconds in Settings
- Data stored in browser localStorage with key \`markdown-editor-data\` (version v5)
- Crash recovery: restore unsaved changes after unexpected closes

### 3.6 File Import

Import documents from multiple formats:

- **Markdown** (.md) — standard import
- **Word** (.docx) — powered by mammoth.js
- **HTML** — convert web pages to Markdown

### 3.7 Daily Note

Click the daily note button to instantly create today's note in the format \`YYYY-MM-DD.md\`.

### 3.8 Bookmarks

- Bookmark files and individual headings
- Organize bookmarks into groups
- Quick access from the sidebar

---

## 4. Text Editing Basics

### 4.1 Undo / Redo

| Action | Shortcut | Description |
|--------|----------|-------------|
| Undo | \`Ctrl+Z\` | Undo the last edit operation |
| Redo | \`Ctrl+Shift+Z\` | Redo an undone operation |

> 💡 The editor supports up to 100 steps of undo/redo history with transactional operations.

### 4.2 Find and Replace

| Action | Shortcut | Description |
|--------|----------|-------------|
| Find | \`Ctrl+F\` | Open the search bar |
| Replace | \`Ctrl+H\` | Open the replace bar with batch support |
| Go to Line | \`Ctrl+G\` | Jump to a specific line number |

### 4.3 Global Search

Press \`Ctrl+Shift+F\` to search across **all files** in your workspace.

### 4.4 Scroll Buttons

One-click buttons to jump to the **top** or **bottom** of both the editor and preview areas.

---

## 5. Formatting

MarkCraft supports a rich set of Markdown formatting features. Here's a quick reference:

### 5.1 Headings

Use \`#\` symbols or press \`Ctrl+1/2/3\`:

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
\`\`\`

> 💡 Heading IDs are auto-generated as anchor links for easy navigation.

### 5.2 Text Styles

| Style | Shortcut | Markdown Syntax | Result |
|-------|----------|-----------------|--------|
| Bold | \`Ctrl+B\` | \`**text**\` | **text** |
| Italic | \`Ctrl+I\` | \`*text*\` | *text* |
| Underline | \`Ctrl+U\` | \`<u>text</u>\` | <u>text</u> |
| Strikethrough | \`Ctrl+Shift+S\` | \`~~text~~\` | ~~text~~ |
| Highlight | \`Ctrl+Shift+H\` | \`==text==\` | ==text== |
| Inline Code | \`Ctrl+E\` | \`\\\`code\\\`\` | \`code\` |
| Subscript | \`Ctrl+,\` | \`~text~\` | H~2~O |
| Superscript | \`Ctrl+.\` | \`^text^\` | x^2^ |

### 5.3 Lists

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

### 5.4 Blockquotes

\`\`\`markdown
> This is a blockquote
> It can span multiple lines
\`\`\`

Shortcut: \`Ctrl+Shift+B\`

### 5.5 Code Blocks

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

### 5.6 Horizontal Rules

\`\`\`markdown
---
\`\`\`

Shortcut: \`Ctrl+Shift+-\`

### 5.7 Links

\`\`\`markdown
[Link text](https://example.com)
\`\`\`

Shortcut: \`Ctrl+K\`

**Link features:**
- Hover preview in WYSIWYG mode
- Link modal for editing
- WikiLink support (see Knowledge Linking System)

### 5.8 Tables

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

### 5.9 Definition Lists

\`\`\`markdown
Term
: Definition description

Another term
: Another definition
\`\`\`

### 5.10 Footnotes

\`\`\`markdown
Here is some text[^1] with a footnote.

[^1]: This is the footnote content.
\`\`\`

**Footnote features:**
- Footnote sidebar panel
- Hover tooltip preview
- Click to navigate between reference and definition

### 5.11 Math Formulas (KaTeX 0.16.45)

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

### 5.12 Mermaid Diagrams (11.14)

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

### 5.13 Mind Maps

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

### 5.14 Callouts / Admonitions

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

### 5.15 Special Text Features

- **Abbreviations**: \`*[HTML]: HyperText Markup Language\`
- **Comment marks**: hidden comments in the source
- **Image attributes**: \`![alt](src){width="100" align="center"}\`
- **Raw HTML blocks**: embed HTML directly
- **Media embed**: video and iframe support
- **TOC node**: auto-generated table of contents with \`[toc]\`

---

## 6. Autocomplete & Smart Editing

### 6.1 Smart Editing Features

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

### 6.2 Slash Commands (WYSIWYG Mode)

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

---

## 7. Focus Mode & Typewriter Mode

### 7.1 Focus Mode (F8)

Toggle with \`F8\` or the toolbar button:

- Hides all panels (sidebar, outline, etc.)
- Editor centered at 800px width (adjustable)
- Current line is highlighted
- Non-current lines are faded out
- Perfect for distraction-free writing

### 7.2 Typewriter Mode (F9)

Toggle with \`F9\` or the toolbar button:

- Cursor line stays vertically centered
- Current line highlighted with a blue bar
- Simulates typewriter scrolling
- Can be combined with Focus Mode

---

## 8. Advanced Features

### 8.1 Live Preview

In Source mode, enjoy inline rendering for many Markdown elements:

- Headings render as styled text
- Blockquotes show as indented quote blocks
- Links appear as clickable blue text
- Images show inline previews
- Code blocks have syntax highlighting

### 8.2 Outline Navigation

- 6-color level system for heading hierarchy
- Level indentation shows structure
- Click a heading to jump to its position
- Scroll sync: current heading highlighted as you scroll
- Expand all / Collapse all buttons
- Shows heading count and max depth
- Toggle with \`Ctrl+Shift+O\`

### 8.3 Lint Checking (7 Rule Types)

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

### 8.4 Document Statistics

Click the status bar to see detailed stats:

- Word count (plain text / standard calculation)
- Character count
- Line count
- Reading time estimate (Chinese: 500 wpm, English: 200 wpm, weighted average)

### 8.5 Front Matter

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

### 8.6 Image Handling

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

### 8.7 Emoji Picker

Click the 😊 button on the toolbar to open the emoji picker and insert emojis or special symbols.

### 8.8 Editor Context Menu

Right-click in the editor for a context menu with common formatting actions and editing operations.

### 8.9 Error Boundary

The editor includes error boundaries to prevent crashes from propagating — if something goes wrong, you'll see a friendly error message instead of a blank screen.

---

## 9. Export (12 Formats)

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

---

## 10. Blog Studio

MarkCraft's Blog Studio lets you turn your Markdown documents into a beautiful blog with zero coding.

### 10.1 Three-Panel Layout

| Panel | Side | Purpose |
|-------|------|---------|
| Config Panel | Left | Customize blog settings |
| Preview | Center | Real-time blog preview |
| Controls | Right | Device simulation and tools |

**Device simulation:** Desktop 🖥️ / Tablet 📱 / Mobile 📱

**Real-time preview:** iframe sandbox with 500ms debounce

### 10.2 Blog Themes (64 Total, 5 Batches)

**Batch 1 — 16 Classic:**
magazine, minimal, classic, ink-wash, terminal, newspaper, glassmorphism, bento, narrative, cyberpunk, aurora, academia, retro, garden, midnight, custom

**Batch 2 — 18 Themes:**
poetry, typewriter, ocean, sunset, editorial, trending, dispatch, carbon, blueprint, hacker, showcase, mosaic, gallery, cinematic, docs, wiki, neon, origami

**Batch 3 — 12 Themes:**
swiss, bauhaus, artdeco, zen, brutalist, vaporwave, pixel, neumorphism, corporate, fashion, forest, notion

**Batch 4 — 10 Themes:**
cafe, travel, music, sketch, cosmos, claymorphism, ice-crystal, rams, luxury, comic

**Batch 5 — 8 Themes:**
steampunk, gothic, noir, recipe, timeline, feed, pastel, newsletter

### 10.3 Theme Categories & Filters

**7 Categories:** All, Personal Blog, Magazine, Portfolio, Tech Blog, Photography, Docs, Creative

**8 Tags:** Minimal, Dark, Retro, Futuristic, Nature, Academic, Typography, Grid

**Feature flags:** featured, isNew, isDarkDefault

### 10.4 Color Schemes

- **12-color wheel**: red, orange-red, orange, orange-yellow, yellow, yellow-green, green, blue-green, blue, blue-violet, violet, red-violet
- **Custom color picker**: choose any color
- **3 color adjustments**:
  - Color Lightness: 0–100
  - Color Saturation: 0–200
  - Color Sharpness: 0–200

### 10.5 Fonts & Layout

**Font families:**
- Serif: Playfair Display
- Sans: Inter
- Mono: JetBrains Mono

**Theme mode:** Light / Dark

**Layout styles:** Magazine / Minimal / Classic

### 10.6 Blog Configuration

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

### 10.7 Generated Pages

Home, post, archive (by year), tags, full-text search, RSS, sitemap, 404, about, friend links, series, standalone pages, PWA, share buttons, SEO optimization, TOC (sticky + scroll sync)

### 10.8 Export Methods

- **Single-file HTML**: SPA with hash routing — one file, easy to share
- **Multi-file ZIP**: folder structure, ready for deployment

---

## 11. Knowledge Linking System

MarkCraft's knowledge linking system connects your notes into a network. Here's a quick overview — see the **Knowledge Linking Guide** for full details.

### 11.1 WikiLink Bidirectional Links

\`\`\`markdown
Link to [[Another Note]] or [[Another Note|with custom label]]
\`\`\`

- Autocomplete when typing \`[[\`
- Ctrl+Click (Cmd+Click on Mac) to navigate
- Broken links show with red dashed underline

### 11.2 Embeds

\`\`\`markdown
![[Another Note]]
\`\`\`

Embed another note's content directly in the current document.

### 11.3 Backlinks & Unlinked Mentions

- **Backlinks panel**: shows all notes that link to the current file
- **Unlinked mentions**: detects mentions of the filename without \`[[]]\`

### 11.4 Tags

\`\`\`markdown
#tag #parent/child/nested
\`\`\`

- Tag extraction with tree view
- Supports nested tags with \`/\` separator

### 11.5 Graph View

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

---

## 12. Shortcut List (28 Total)

MarkCraft has 28 shortcuts across 5 categories. Most are customizable in Settings → Shortcuts.

### 12.1 Format (13 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+B\` | Bold | No (internal) |
| \`Ctrl+I\` | Italic | No |
| \`Ctrl+U\` | Underline | No |
| \`Ctrl+Shift+S\` | Strikethrough | No |
| \`Ctrl+Shift+H\` | Highlight | No |
| \`Ctrl+E\` | Inline code | No |
| \`Ctrl+,\` | Subscript | No |
| \`Ctrl+.\` | Superscript | No |
| \`Ctrl+K\` | Link | No |
| \`Ctrl+1/2/3\` | Heading 1/2/3 | No |
| \`Ctrl+Shift+B\` | Blockquote | No |
| \`Ctrl+Alt+C\` | Code block | No |

### 12.2 File (3 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+S\` | Save | Yes |
| \`Ctrl+Shift+S\` | Save As | Yes |
| \`Ctrl+O\` | Open File | Yes |

### 12.3 View (6 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`F8\` | Focus Mode | Yes |
| \`F9\` | Typewriter Mode | Yes |
| \`F11\` | Fullscreen | Yes |
| \`Ctrl+,\` | Settings | Yes |
| \`Ctrl+\\\` | Toggle Sidebar | Yes |
| \`Ctrl+Shift+O\` | Toggle Outline | Yes |

### 12.4 Edit (5 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+F\` | Find | — |
| \`Ctrl+H\` | Replace | — |
| \`Ctrl+Z\` | Undo | — |
| \`Ctrl+Shift+Z\` | Redo | — |
| \`Ctrl+G\` | Go to Line | — |

### 12.5 Insert (4 Shortcuts)

| Shortcut | Function | Customizable |
|----------|----------|-------------|
| \`Ctrl+K\` | Insert Link | — |
| \`Ctrl+Shift+I\` | Insert Image | — |
| \`Ctrl+Shift+T\` | Insert Table | — |
| \`Ctrl+Shift+-\` | Horizontal Rule | — |

### 12.6 Customization

- **Record your own shortcuts** in Settings → Shortcuts
- **Conflict detection**: warns if a shortcut is already assigned
- **Reset**: reset individual shortcuts or all to defaults
- **Mac**: shows ⌘ symbol instead of Ctrl

---

## 13. Command Palette

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

---

## 14. Settings Panel (5 Tabs)

### 14.1 Editor Tab

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

### 14.2 Appearance Tab

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

### 14.3 Shortcuts Tab

- 28 shortcuts organized in groups
- Click "Record" to capture a new shortcut
- Automatic conflict detection
- Reset individual shortcuts
- Reset all to defaults

### 14.4 Image Tab

| Setting | Options |
|---------|---------|
| Image host type | None / PicGo / Custom |
| Use relative image path | on/off |

### 14.5 Export Tab

| Setting | Description |
|---------|-------------|
| Default export format | Markdown, HTML, PDF, etc. |
| Default export style | Preset styles for HTML/PDF |

---

## 15. FAQ

### Q: Will my edits be lost if I close the browser?

No. MarkCraft automatically saves your content to browser localStorage. Your work is preserved after page refresh or closing and reopening the browser. The auto-save interval is adjustable from 5 to 300 seconds.

### Q: How do I move a file to another folder?

Simply drag the file in the file tree and drop it onto the target folder. You can also reorder files and folders by dragging.

### Q: What's the difference between Source mode and WYSIWYG mode?

**Source mode** (CodeMirror 6) lets you edit raw Markdown with syntax highlighting and live preview. **WYSIWYG mode** (Tiptap) renders formatted text in real time, letting you edit visually. Both modes support all Markdown features — use whichever you prefer!

### Q: Can I customize keyboard shortcuts?

Yes! Go to Settings → Shortcuts tab. There you can record custom shortcuts, see conflicts, and reset to defaults. Format shortcuts (13) are internal and not customizable, but file, view, and other shortcuts can be changed.

### Q: How many blog themes are there?

64 themes across 5 batches, with category filters and tags to help you find the perfect style. You can also customize colors, fonts, and layout to make it your own.

### Q: How do I create links between notes?

Use WikiLink syntax: \`[[filename]]\`. Just type \`[[\` and autocomplete will help you find the file. See the Knowledge Linking Guide for a complete walkthrough.

### Q: Can I export my blog as a static site?

Yes! Blog Studio supports two export methods: single-file HTML (SPA with hash routing) and multi-file ZIP (folder structure, ready for deployment to GitHub Pages, Vercel, Netlify, etc.).

### Q: What export formats are supported?

12 formats total: Markdown, HTML, PDF, Word, LaTeX, EPUB, reStructuredText, MediaWiki, OPML, Plain Text, PNG, and JPEG.

### Q: How do I use the graph view?

Open the graph view from the sidebar or command palette. You'll see all your notes as nodes connected by links. Drag nodes to rearrange, scroll to zoom, double-click to reset, and click a node to open the file.

### Q: Does MarkCraft support dark mode?

Yes! There are 5 built-in editor themes including dark default and Nord. You can also import custom theme CSS. Code blocks have their own independent theme setting with 6 options.

### Q: How do I add a custom theme?

Go to Settings → Appearance → Theme, and select "Import Theme" to upload a CSS file. The editor parses CSS variables to apply the custom theme.

---

> 📌 Happy writing with MarkCraft! If you have questions or feedback, we'd love to hear from you.`;

export const markdownTutorialContent = `# Markdown Beginner Tutorial

Welcome to the world of Markdown! 🎉

Markdown is a **lightweight markup language** that lets you write beautifully formatted documents using simple symbols. This tutorial will guide you from scratch, step by step, through all the Markdown syntax supported by MarkCraft.

> 💡 MarkCraft editor has built-in smart autocomplete — when you type special symbols, it automatically completes the formatting for you, making learning Markdown even easier!

---

## Chapter 1: What is Markdown?

Markdown was created by John Gruber in 2004. Its design philosophy is:

> To make documents easy to read and write, while being convertible to HTML and other formats.

**Why learn Markdown?**

- ✍️ **Easy to learn**: Just remember a few symbols to write beautiful documents
- 📝 **Focus on content**: No need to get distracted by formatting — focus on writing itself
- 🌍 **Widely used**: GitHub, blogs, documentation, notes, and more
- 🔄 **Universal compatibility**: Plain text format that can be opened in any editor
- 🚀 **Fast to write**: Less clicking, more typing — get your ideas down quickly

**About MarkCraft Editor**

MarkCraft is a powerful web-based Markdown editor that supports:

- 🎯 **Multiple editing modes**: Source mode, WYSIWYG mode, Live Preview, and dual-column layout
- 🌈 **Rich extended syntax**: Footnotes, math formulas, Mermaid diagrams, callouts, mind maps, and more
- 💾 **Auto-save**: Your content is automatically saved to local storage
- 📊 **Outline navigation**: Quickly jump to any section via the heading outline
- 🎨 **Multiple themes**: 5 editor themes and 6 code themes to choose from

---

## Chapter 2: Headings (H1-H6)

Add \`#\` at the beginning of a line to create a heading. The number of \`#\` symbols indicates the heading level, from H1 (largest) to H6 (smallest).

\`\`\`markdown
# Heading 1 (Largest)
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6 (Smallest)
\`\`\`

**How it looks:**

# Heading 1 (Largest)
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6 (Smallest)

> 💡 **Best practice**: Use H1 only once per document as the main title. Start body sections with H2 and go down level by level.
>
> 📌 **MarkCraft tip**: Typing \`#\` automatically adds a space after it. You can also use the shortcut \`Ctrl+1\`, \`Ctrl+2\`, \`Ctrl+3\` to quickly set heading levels.

**Alternative syntax** for H1 and H2:

\`\`\`markdown
This is Heading 1
===

This is Heading 2
---
\`\`\`

---

## Chapter 3: Paragraphs & Line Breaks

### 3.1 Paragraphs

In Markdown, **one or more blank lines** separate two paragraphs. Just like in a regular text editor, type your content and leave a blank line between paragraphs.

\`\`\`markdown
This is the first paragraph. It contains several sentences
that flow together naturally.

This is the second paragraph. It is separated from the
first one by a blank line.
\`\`\`

**Result:**

This is the first paragraph. It contains several sentences that flow together naturally.

This is the second paragraph. It is separated from the first one by a blank line.

### 3.2 Line Breaks

To create a line break *within* a paragraph, add **two or more spaces** at the end of a line and press Enter, or use the \`<br>\` HTML tag.

\`\`\`markdown
First line with two trailing spaces  
Second line right below

Using HTML tag:<br>Third line
\`\`\`

**Result:**

First line with two trailing spaces  
Second line right below

Using HTML tag:<br>Third line

> ⚠️ **Common mistake**: Simply pressing Enter once does NOT create a line break — the two lines will be merged into one paragraph. Use two spaces or \`<br>\` for line breaks!

---

## Chapter 4: Text Styles

Markdown supports a variety of text formatting options to make your content more expressive.

### 4.1 Bold

Wrap text with **two asterisks** \`**\` or **two underscores** \`__\`:

\`\`\`markdown
**This text is bold**
__This is also bold__
\`\`\`

**Result:** **This text is bold**

> 📌 **Shortcut**: Select text and press \`Ctrl+B\` to toggle bold formatting.

### 4.2 Italic

Wrap text with **one asterisk** \`*\` or **one underscore** \`_\`:

\`\`\`markdown
*This text is italic*
_This is also italic_
\`\`\`

**Result:** *This text is italic*

> 📌 **Shortcut**: Select text and press \`Ctrl+I\` to toggle italic formatting.

### 4.3 Bold + Italic

Combine both for bold italic text using **three asterisks**:

\`\`\`markdown
***Bold and italic text***
\`\`\`

**Result:** ***Bold and italic text***

### 4.4 Strikethrough

Wrap text with **two tildes** \`~~\`:

\`\`\`markdown
~~This text is strikethrough~~
\`\`\`

**Result:** ~~This text is strikethrough~~

> 📌 **Shortcut**: \`Ctrl+Shift+S\`

### 4.5 Underline

Underline text using the toolbar button in WYSIWYG mode, or use the HTML \`<u>\` tag:

\`\`\`markdown
<u>This text is underlined</u>
\`\`\`

**Result:** <u>This text is underlined</u>

> 📌 **Shortcut**: \`Ctrl+U\`

### 4.6 Highlight

Wrap text with **two equals signs** \`==\` to highlight it:

\`\`\`markdown
==This text is highlighted==
\`\`\`

**Result:** ==This text is highlighted==

> 📌 **Shortcut**: \`Ctrl+Shift+H\`

### 4.7 Inline Code

Wrap code snippets with **backticks** \`\` \` \`\`:

\`\`\`markdown
Use the \`print()\` function to output text.
\`\`\`

**Result:** Use the \`print()\` function to output text.

> 📌 **Shortcut**: \`Ctrl+E\`

### 4.8 Subscript and Superscript

Use \`~\` for subscript and \`^\` for superscript:

\`\`\`markdown
H~2~O is water
E = mc^2^
\`\`\`

**Result:** H~2~O is water, E = mc^2^

> 📌 **Shortcuts**: Subscript \`Ctrl+,\` / Superscript \`Ctrl+.\`

### 4.9 Style Cheat Sheet

| Style | Syntax | Shortcut | Result |
|-------|--------|----------|--------|
| Bold | \`**text**\` | \`Ctrl+B\` | **text** |
| Italic | \`*text*\` | \`Ctrl+I\` | *text* |
| Strikethrough | \`~~text~~\` | \`Ctrl+Shift+S\` | ~~text~~ |
| Underline | \`<u>text</u>\` | \`Ctrl+U\` | <u>text</u> |
| Highlight | \`==text==\` | \`Ctrl+Shift+H\` | ==text== |
| Inline Code | \`\` \`code\` \`\` | \`Ctrl+E\` | \`code\` |
| Subscript | \`H~2~O\` | \`Ctrl+,\` | H~2~O |
| Superscript | \`x^2^\` | \`Ctrl+.\` | x^2^ |

---

## Chapter 5: Lists

Lists help organize information clearly. Markdown supports unordered lists, ordered lists, task lists, and nested lists.

### 5.1 Unordered Lists

Use \`-\`, \`*\`, or \`+\` followed by a space:

\`\`\`markdown
- Apple
- Banana
- Orange

* Red
* Green
* Blue

+ Cat
+ Dog
+ Bird
\`\`\`

**Result:**

- Apple
- Banana
- Orange

### 5.2 Ordered Lists

Use a number followed by a period and a space:

\`\`\`markdown
1. Open MarkCraft editor
2. Create a new document
3. Start writing
4. Save your work
\`\`\`

**Result:**

1. Open MarkCraft editor
2. Create a new document
3. Start writing
4. Save your work

> 💡 The actual numbers don't have to be sequential — Markdown will automatically renumber them. But it's good practice to keep them in order for readability.

### 5.3 Nested Lists

Use indentation (2 or 4 spaces) to create sub-lists:

\`\`\`markdown
- Fruits
  - Apple
    - Red Apple
    - Green Apple
  - Banana
- Vegetables
  - Tomato
  - Cucumber
    - English cucumber
    - Persian cucumber
\`\`\`

**Result:**

- Fruits
  - Apple
    - Red Apple
    - Green Apple
  - Banana
- Vegetables
  - Tomato
  - Cucumber

> 📌 **MarkCraft tip**: Press \`Tab\` to indent a list item, \`Shift+Tab\` to outdent. Pressing Enter automatically continues the list. Press Backspace on an empty list item to remove the list marker.

### 5.4 Task Lists

Use \`[ ]\` for incomplete tasks and \`[x]\` for completed tasks:

\`\`\`markdown
- [x] Learn Markdown basic syntax
- [x] Understand headings and paragraphs
- [ ] Master text styles
- [ ] Learn tables and code blocks
- [ ] Try advanced features
- [ ] Build my own knowledge base
\`\`\`

**Result:**

- [x] Learn Markdown basic syntax
- [x] Understand headings and paragraphs
- [ ] Master text styles
- [ ] Learn tables and code blocks
- [ ] Try advanced features
- [ ] Build my own knowledge base

> 📌 **MarkCraft tip**: Press \`Ctrl+Enter\` to quickly check/uncheck a task list item! You can also click the checkbox directly in WYSIWYG mode.

---

## Chapter 6: Links & Images

### 6.1 Basic Links

Links use the format \`[display text](URL)\`:

\`\`\`markdown
[Visit GitHub](https://github.com)
[MarkCraft Official](https://example.com)
\`\`\`

**Result:** [Visit GitHub](https://github.com)

> 📌 **MarkCraft tip**: Typing \`[\` automatically completes the link syntax. Shortcut: \`Ctrl+K\`.

### 6.2 Links with Titles

Add a title (tooltip) by adding text in quotes after the URL:

\`\`\`markdown
[Google](https://google.com "Go to Google Search")
\`\`\`

Hover over the link to see the title tooltip.

### 6.3 Images

Image syntax is similar to links — just add \`!\` at the beginning:

\`\`\`markdown
![Alt text](image-url.jpg)
\`\`\`

**Example:**

\`\`\`markdown
![Beautiful landscape](https://example.com/landscape.jpg)
\`\`\`

- **Alt text**: Describes the image (displayed when the image fails to load, and used by screen readers)
- **URL**: Can be a web URL or a local file path

> 📌 **MarkCraft tip**: You can insert images in several ways:
> - Click the "Insert Image" button on the toolbar (\`Ctrl+Shift+I\`)
> - Drag and drop image files directly into the editor
> - Paste images from the clipboard (\`Ctrl+V\`)

### 6.4 Image Attributes (MarkCraft Extension)

MarkCraft supports adding attributes to images using \`{...}\` syntax. You can set width, height, alignment, and more:

\`\`\`markdown
![Logo](logo.png){width="200" align="center"}

![Photo](photo.jpg){width="50%" height="auto"}

![Left-aligned](icon.png){align="left"}
\`\`\`

**Supported attributes:**

| Attribute | Example | Description |
|-----------|---------|-------------|
| \`width\` | \`width="200"\` | Set width (pixels or percentage) |
| \`height\` | \`height="150"\` | Set height |
| \`align\` | \`align="center"\` | Alignment: left/center/right |

---

## Chapter 7: Blockquotes

Use \`>\` at the beginning of a line to create a blockquote.

### 7.1 Basic Blockquote

\`\`\`markdown
> This is a blockquote.
> It can span multiple lines.
>
> It can even contain paragraphs.
\`\`\`

**Result:**

> This is a blockquote.
> It can span multiple lines.
>
> It can even contain paragraphs.

### 7.2 Nested Blockquotes

Add more \`>\` symbols for nested levels:

\`\`\`markdown
> First level quote
> > Second level (nested)
> > > Third level (deeply nested)
\`\`\`

**Result:**

> First level quote
> > Second level (nested)
> > > Third level (deeply nested)

### 7.3 Blockquotes with Other Elements

Blockquotes can contain other Markdown elements:

\`\`\`markdown
> **Important Notice**
> 
> - Item one
> - Item two
> - Item three
> 
> \`Code inside a quote\`
\`\`\`

> 📌 **MarkCraft tip**: Pressing Enter at the end of a blockquote line automatically continues the \`>\` marker. Shortcut: \`Ctrl+Shift+B\`.

---

## Chapter 8: Code Blocks

Code is an essential part of technical writing. Markdown supports both inline code and fenced code blocks.

### 8.1 Inline Code

We already learned this in Chapter 4 — wrap with single backticks:

\`\`\`markdown
Run \`npm install\` to install dependencies.
\`\`\`

### 8.2 Fenced Code Blocks

Use **three backticks** \`\`\` \`\`\` \`\`\` to create a code block. Add a language identifier for syntax highlighting:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}

greet("World");
\`\`\`

> 📌 **MarkCraft tip**: Type three backticks and the closing fence is auto-completed. Shortcut: \`Ctrl+Alt+C\`.

### 8.3 Syntax Highlighting

MarkCraft uses highlight.js for syntax highlighting, supporting dozens of languages. Here are some common ones:

\`\`\`python
def fibonacci(n):
    """Calculate Fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>
\`\`\`

\`\`\`css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
\`\`\`

**Common language identifiers:**

| Language | Identifier |
|----------|------------|
| JavaScript | \`javascript\` / \`js\` |
| TypeScript | \`typescript\` / \`ts\` |
| Python | \`python\` / \`py\` |
| HTML | \`html\` |
| CSS | \`css\` |
| Java | \`java\` |
| C++ | \`cpp\` |
| Go | \`go\` |
| Rust | \`rust\` |
| SQL | \`sql\` |
| Shell/Bash | \`bash\` / \`shell\` |
| JSON | \`json\` |
| YAML | \`yaml\` / \`yml\` |
| Markdown | \`markdown\` / \`md\` |

> 🎨 **MarkCraft has 6 code themes**: Default, Monokai, Dracula, One Dark, GitHub Dark, and Solarized. Switch them in settings!

---

## Chapter 9: Tables

Tables help organize data in rows and columns. Use \`|\` to separate columns and \`-\` to separate the header from the body.

### 9.1 Basic Table

\`\`\`markdown
| Name  | Age | City     |
|-------|-----|----------|
| Alice | 25  | New York |
| Bob   | 22  | London   |
| Carol | 28  | Paris    |
\`\`\`

**Result:**

| Name  | Age | City     |
|-------|-----|----------|
| Alice | 25  | New York |
| Bob   | 22  | London   |
| Carol | 28  | Paris    |

### 9.2 Column Alignment

Use colons \`:\` to control column alignment:

- \`:---\` — Left aligned
- \`:---:\` — Center aligned
- \`---:\` — Right aligned

\`\`\`markdown
| Left Aligned | Centered | Right Aligned |
|:-------------|:--------:|--------------:|
| Content A    |   Item 1 |        Price1 |
| Content B    |   Item 2 |        Price2 |
| Content C    |   Item 3 |        Price3 |
\`\`\`

**Result:**

| Left Aligned | Centered | Right Aligned |
|:-------------|:--------:|--------------:|
| Content A    |   Item 1 |        Price1 |
| Content B    |   Item 2 |        Price2 |
| Content C    |   Item 3 |        Price3 |

### 9.3 Tables with Formatting

You can use other Markdown syntax inside table cells:

\`\`\`markdown
| Feature | Syntax | Result |
|---------|--------|--------|
| Bold | \`**text**\` | **text** |
| Italic | \`*text*\` | *text* |
| Code | \`\` \`code\` \`\` | \`code\` |
| Link | \`[text](url)\` | [text](url) |
\`\`\`

> 📌 **MarkCraft tip**:
> - Press Enter at the end of a table row to auto-complete the next row
> - Use the visual table editor to insert tables with custom rows and columns
> - Shortcut: \`Ctrl+Shift+T\`
> - Drag column borders to resize columns in WYSIWYG mode

---

## Chapter 10: Horizontal Rules

Use three or more \`-\`, \`*\`, or \`_\` on a line by themselves to create a horizontal rule (divider):

\`\`\`markdown
---

***

___
\`\`\`

**Result:**

---

> 💡 Horizontal rules are great for separating major sections in a long document.
>
> 📌 **Shortcut**: \`Ctrl+Shift+-\`

---

## Chapter 11: Footnotes

Footnotes let you add supplementary notes without interrupting the reading flow. Readers can click the footnote marker to jump to the note at the bottom.

### 11.1 Basic Footnotes

Use \`[^id]\` in the text as a reference marker, then define the footnote content at the bottom with \`[^id]: content\`:

\`\`\`markdown
Markdown was created by John Gruber[^1] in 2004.
It has since become one of the most popular markup languages[^2] in the world.

[^1]: John Gruber is an American writer, developer, and blogger.
[^2]: A markup language is a system for annotating documents in a way that is syntactically distinguishable from the text.
\`\`\`

**How it works:**

- \`[^1]\` in the body becomes a clickable superscript link like [^1]
- Footnote definitions are automatically rendered at the bottom of the document
- Clicking the marker jumps to the definition; clicking the return arrow jumps back

### 11.2 Multiple References

You can reference the same footnote multiple times:

\`\`\`markdown
First mention[^note] and second mention[^note] of the same note.

[^note]: This is a reusable footnote.
\`\`\`

### 11.3 Footnotes with Multiple Paragraphs

Indent the content for multi-paragraph footnotes:

\`\`\`markdown
Here is some text[^longnote].

[^longnote]:
    First paragraph of the footnote.

    Second paragraph of the footnote.

    - Even lists work inside footnotes
    - Another list item
\`\`\`

> 📌 **MarkCraft tip**:
> - Shortcut: \`Ctrl+Shift+N\` to insert a footnote
> - The footnote panel in the bottom-right corner lists all footnotes
> - Hover over a footnote marker to see a tooltip preview
> - Click to navigate between references and definitions

---

## Chapter 12: Math Formulas

MarkCraft supports LaTeX-style math formulas using KaTeX, perfect for academic and technical writing.

### 12.1 Inline Math

Wrap formulas with a single dollar sign \`$\` for inline math:

\`\`\`markdown
The famous mass-energy equivalence is $E = mc^2$.
The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$.
\`\`\`

**Result:** The famous mass-energy equivalence is $E = mc^2$.

> 📌 **Shortcut**: \`Ctrl+M\` for inline math

### 12.2 Block Math

Wrap with double dollar signs \`$$\` for display/block math:

\`\`\`markdown
The Gaussian integral:

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

Euler's identity:

$$
e^{i\\pi} + 1 = 0
$$
\`\`\`

**Result:**

The Gaussian integral:

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

> 📌 **Shortcut**: \`Ctrl+Shift+M\` for block math

### 12.3 Common Math Syntax

| Description | Syntax | Example |
|-------------|--------|---------|
| Superscript | \`^\` | \`x^2\` → x² |
| Subscript | \`_\` | \`x_i\` → xᵢ |
| Fraction | \`\\frac{a}{b}\` | a/b |
| Square root | \`\\sqrt{x}\` | √x |
| Sum | \`\\sum\` | Σ |
| Integral | \`\\int\` | ∫ |
| Infinity | \`\\infty\` | ∞ |
| Pi | \`\\pi\` | π |
| ± | \`\\pm\` | ± |
| ≤ / ≥ | \`\\le\` / \`\\ge\` | ≤ / ≥ |
| ≠ | \`\\neq\` | ≠ |
| → | \`\\rightarrow\` | → |
| Greek letters | \`\\alpha\`, \`\\beta\`, etc. | α, β, γ, δ |

### 12.4 More Examples

\`\`\`markdown
**Summation:**
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

**Matrix:**
$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
$$

**Cases / Piecewise function:**
$$
f(x) = 
\\begin{cases}
x^2 & \\text{if } x \\geq 0 \\\\
-x & \\text{if } x < 0
\\end{cases}
$$
\`\`\`

---

## Chapter 13: Mindmaps & Diagrams (Mermaid)

MarkCraft integrates Mermaid — a powerful diagramming tool that lets you create diagrams using text and code.

### 13.1 What is Mermaid?

Mermaid lets you define diagrams with simple text syntax, and it renders them as beautiful SVG diagrams. No more dragging shapes around — just type the diagram structure!

### 13.2 Flowchart

Use \`flowchart\` or \`graph\` to create flowcharts:

\`\`\`mermaid
flowchart LR
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

**Direction options:**
- \`TB\` / \`TD\` — Top to bottom
- \`BT\` — Bottom to top
- \`LR\` — Left to right
- \`RL\` — Right to left

**Node shapes:**

\`\`\`mermaid
flowchart LR
    A[Rectangle] --> B(Rounded)
    B --> C{Decision}
    C --> D[(Database)]
    D --> E((Circle))
    E --> F>Flag]
\`\`\`

### 13.3 Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server
    
    User->>Browser: Click button
    Browser->>Server: Send request
    Server-->>Browser: Return data
    Browser-->>User: Display result
\`\`\`

### 13.4 Mind Map

Mermaid has a built-in mindmap syntax:

\`\`\`mermaid
mindmap
  root((MarkCraft))
    Editing Modes
      Source Mode
      WYSIWYG Mode
      Live Preview
      Dual Column
    Syntax Support
      Standard Markdown
      Footnotes
      Math Formulas
      Mermaid Diagrams
      Callouts
    Export Formats
      Markdown
      HTML
      PDF
      Word
      PNG
\`\`\`

> 📌 MarkCraft also has a **dedicated mindmap module** with 7 node shapes and rich customization options!

### 13.5 Other Diagram Types

Mermaid supports many more diagram types:

| Diagram Type | Description |
|--------------|-------------|
| \`gantt\` | Gantt chart for project timelines |
| \`classDiagram\` | UML class diagrams |
| \`erDiagram\` | Entity-relationship diagrams |
| \`pie\` | Pie charts |
| \`stateDiagram-v2\` | State diagrams |
| \`journey\` | User journey diagrams |
| \`C4Context\` / \`C4Container\` | C4 architecture diagrams |

> 📌 **MarkCraft tip**: Type \`/mermaid\` in WYSIWYG mode to quickly insert a Mermaid diagram. You can also use the toolbar button.

---

## Chapter 14: Callout / Admonition

Callouts (also called admonitions) are a MarkCraft extension that lets you highlight important information with styled boxes. They're perfect for notes, warnings, tips, and more.

### 14.1 Basic Syntax

Callouts use the blockquote syntax with a special type marker:

\`\`\`markdown
> [!note]
> This is a note callout. It provides additional information.
\`\`\`

**Result:**

> [!note]
> This is a note callout. It provides additional information.

### 14.2 Custom Title

You can customize the callout title:

\`\`\`markdown
> [!tip] Pro Tip
> Use keyboard shortcuts to speed up your workflow!
\`\`\`

### 14.3 All 11 Callout Types

| Type | Syntax | Purpose |
|------|--------|---------|
| Note | \`> [!note]\` | General information |
| Tip | \`> [!tip]\` | Helpful tips and suggestions |
| Info | \`> [!info]\` | Informational messages |
| Success | \`> [!success]\` | Success/confirmation messages |
| Question | \`> [!question]\` | Questions or FAQs |
| Warning | \`> [!warning]\` | Warnings and cautions |
| Danger | \`> [!danger]\` | Danger/error messages |
| Failure | \`> [!failure]\` | Failure messages |
| Bug | \`> [!bug]\` | Bug reports or known issues |
| Example | \`> [!example]\` | Examples and samples |
| Quote | \`> [!quote]\` | Quotations |

Let's see each one:

\`\`\`markdown
> [!note]
> This is a note.

> [!tip]
> This is a helpful tip.

> [!info]
> This is for your information.

> [!success]
> Operation completed successfully!

> [!question]
> How do I get started?

> [!warning]
> Be careful with this operation.

> [!danger]
> This could cause data loss!

> [!failure]
> The operation failed.

> [!bug]
> There's a known issue with this feature.

> [!example]
> Here's an example of how it works.

> [!quote]
> "The best way to predict the future is to invent it."
\`\`\`

### 14.4 Collapsible Callouts

Add \`+\` for open-by-default or \`-\` for closed-by-default collapsible callouts:

\`\`\`markdown
> [!faq]- Click to expand
> This content is hidden by default.
> It appears when you click the header.

> [!details]+ Expanded by default
> This content is visible by default.
> Click the header to collapse it.
\`\`\`

**Result:**

> [!faq]- Click to expand
> This content is hidden by default.
> It appears when you click the header.

> 💡 Collapsible callouts are great for FAQs, detailed explanations, or content that not everyone needs to see.

---

## Chapter 15: Definition Lists & Other Extensions

### 15.1 Definition Lists

Definition lists are perfect for glossaries and term-definition pairs:

\`\`\`markdown
Markdown
: A lightweight markup language for formatting text.

HTML
: HyperText Markup Language, the standard language for creating web pages.

CSS
: Cascading Style Sheets, used for styling web pages.
: Can also be used to describe the visual presentation of a document.
\`\`\`

**Result:**

Markdown
: A lightweight markup language for formatting text.

HTML
: HyperText Markup Language, the standard language for creating web pages.

CSS
: Cascading Style Sheets, used for styling web pages.
: Can also be used to describe the visual presentation of a document.

> 💡 One term can have multiple definitions, and each definition starts with \`:\`.

### 15.2 Abbreviations

Define abbreviations and they'll automatically get tooltips when you hover over them:

\`\`\`markdown
MarkCraft is a powerful MD editor with many features.
It supports HTML, CSS, and JS out of the box.

*[MD]: Markdown
*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets
*[JS]: JavaScript
\`\`\`

**Result:** Hover over "MD", "HTML", "CSS", or "JS" to see the full term as a tooltip.

### 15.3 Table of Contents (TOC)

MarkCraft can automatically generate a table of contents from your document headings:

\`\`\`markdown
[TOC]
\`\`\`

Just put \`[TOC]\` where you want the table of contents to appear, and MarkCraft will generate it automatically based on all the headings in your document.

> 💡 The TOC automatically updates when you add, remove, or rename headings.
>
> 📌 You can also use the **Outline panel** on the right side for quick navigation between sections.

### 15.4 Heading IDs (Auto Anchors)

MarkCraft automatically generates IDs for headings, so you can link directly to specific sections:

\`\`\`markdown
## My Section Title

[Jump to My Section Title](#my-section-title)
\`\`\`

The ID is generated by converting the heading text to lowercase and replacing spaces with hyphens.

---

## Chapter 16: Escape Characters

What if you want to display Markdown special characters *as themselves* instead of having them formatted? Use the backslash \`\\\` escape character!

### 16.1 Basic Escaping

Put a backslash before a special character to "escape" it:

\`\`\`markdown
\\*This text is NOT italic\\*
\\# This is NOT a heading
\\~\\~Not strikethrough\\~\\~
\\==Not highlighted\\==
\\[\\[Not a WikiLink\\]\\]
\`\`\`

**Result:**

\\*This text is NOT italic\\*
\\# This is NOT a heading
\\~\\~Not strikethrough\\~\\~
\\==Not highlighted\\==

### 16.2 Characters That Need Escaping

Here are the characters you can escape with a backslash:

| Character | Name |
|-----------|------|
| \`\\\` | Backslash itself |
| \`\` \` \`\` | Backtick |
| \`*\` | Asterisk |
| \`_\` | Underscore |
| \`{\` \`}\` | Curly braces |
| \`[\` \`]\` | Square brackets |
| \`(\` \`)\` | Parentheses |
| \`#\` | Hash / pound |
| \`+\` | Plus sign |
| \`-\` | Hyphen / minus |
| \`.\` | Period / dot |
| \`!\` | Exclamation mark |
| \`|\` | Pipe |

### 16.3 Escaping Backticks

To show a literal backtick in inline code, use more backticks around it:

\`\`\`markdown
\`\`Use \`backticks\` for code\`\`
\`\`\`

**Result:** \`\`Use \`backticks\` for code\`\`

---

## Chapter 17: Practical Tips & MarkCraft Features

### 17.1 MarkCraft Editing Modes

MarkCraft offers **4 editing modes** to suit different preferences:

| Mode | Description | Best For |
|------|-------------|----------|
| **Source Mode** | Edit raw Markdown with syntax highlighting | Power users, precise control |
| **WYSIWYG Mode** | What You See Is What You Get — rich text editing | Beginners, visual writers |
| **Live Preview** | Split view with source on left, preview on right | Learning Markdown |
| **Dual Column** | Full source + full preview side by side | Writing with preview |

> 💡 Try different modes and find what works best for you! You can switch anytime from the toolbar.

### 17.2 Slash Commands (WYSIWYG Mode)

In WYSIWYG mode, type \`/\` at the beginning of a line to see a menu of quick insert options:

| Command | What it does |
|---------|--------------|
| \`/table\` | Insert a table |
| \`/code\` | Insert a code block |
| \`/math\` | Insert a block math formula |
| \`/mermaid\` | Insert a Mermaid diagram |
| \`/mindmap\` | Insert a mind map |
| \`/footnote\` | Insert a footnote |
| \`/hr\` | Insert a horizontal rule |

### 17.3 Keyboard Shortcuts Cheat Sheet

**Text Formatting:**

| Shortcut | Action |
|----------|--------|
| \`Ctrl+B\` | Bold |
| \`Ctrl+I\` | Italic |
| \`Ctrl+U\` | Underline |
| \`Ctrl+Shift+S\` | Strikethrough |
| \`Ctrl+Shift+H\` | Highlight |
| \`Ctrl+E\` | Inline code |
| \`Ctrl+,\` | Subscript |
| \`Ctrl+.\` | Superscript |
| \`Ctrl+K\` | Insert link |
| \`Ctrl+1\` / \`2\` / \`3\` | Heading level 1/2/3 |

**Blocks & Elements:**

| Shortcut | Action |
|----------|--------|
| \`Ctrl+Shift+B\` | Blockquote |
| \`Ctrl+Alt+C\` | Code block |
| \`Ctrl+Shift+I\` | Insert image |
| \`Ctrl+Shift+T\` | Insert table |
| \`Ctrl+Shift+-\` | Horizontal rule |
| \`Ctrl+Shift+M\` | Block math |
| \`Ctrl+M\` | Inline math |
| \`Ctrl+Shift+N\` | Insert footnote |
| \`Ctrl+Enter\` | Toggle task list item |

### 17.4 Writing Tips

- 📌 **Write first, format later**: Focus on getting your ideas down, then polish formatting
- 📌 **Use heading levels wisely**: Maintain a logical H1 → H2 → H3 structure
- 📌 **Preview often**: Switch to preview mode to check how your document looks
- 📌 **Use code blocks, not screenshots**: Code blocks are copyable and searchable
- 📌 **Keep tables simple**: Too many columns hurt readability
- 📌 **Use callouts strategically**: Don't overdo it — reserve them for important info
- 📌 **Leverage the outline**: Use the outline panel to navigate long documents
- 📌 **Auto-save is your friend**: MarkCraft auto-saves, but you can still export backups

### 17.5 FAQ

**Q: Will my content be lost if I close the browser?**

A: No! MarkCraft automatically saves everything to your browser's local storage. Your content will still be there when you reopen.

**Q: Can I export my document to other formats?**

A: Yes! MarkCraft supports 12 export formats: Markdown (.md), HTML (.html), PDF (.pdf), Word (.docx), LaTeX (.tex), EPUB (.epub), reStructuredText (.rst), MediaWiki (.wiki), OPML (.opml), Plain Text (.txt), PNG (.png), and JPEG (.jpg).

**Q: How do I switch themes?**

A: MarkCraft has 5 editor themes (light, dark, github, sepia, nord) and 6 code themes (Default, Monokai, Dracula, One Dark, GitHub Dark, Solarized). You can switch themes from the settings menu.

**Q: What is Front Matter?**

A: Front Matter is YAML metadata at the top of your document (between \`---\` lines). You can add title, tags, date, and other metadata. Click the "Article Metadata" button to edit it visually.

**Q: What is knowledge linking?**

A: MarkCraft has a built-in knowledge linking system with WikiLinks (\`[[filename]]\`), tags (\`#tag\`), backlinks, and a graph view. Check out the "Knowledge Linking Guide" to learn more!

---

## Congratulations! 🎉

You've completed the Markdown Beginner Tutorial! You now know all the Markdown syntax and MarkCraft features needed to write beautiful, well-structured documents.

**What you've learned:**

✅ Headings (H1-H6) and document structure
✅ Paragraphs, line breaks, and text formatting
✅ Lists: unordered, ordered, nested, and task lists
✅ Links and images (with image attributes!)
✅ Blockquotes and nested blockquotes
✅ Code blocks with syntax highlighting
✅ Tables with alignment
✅ Footnotes and math formulas
✅ Mermaid diagrams and mind maps
✅ Callouts (all 11 types!)
✅ Definition lists, abbreviations, and TOC
✅ Escape characters and best practices

**Practice ideas:**

1. 📝 Write a personal introduction using headings, lists, and bold text
2. 📊 Create a project plan with task lists and tables
3. 📚 Write a study note with footnotes and callouts
4. 🧮 Add math formulas to a technical document
5. 🗺️ Create a mind map to organize your ideas
6. 🔗 Try knowledge linking with WikiLinks and build your own knowledge graph

> 💡 **Remember**: The best way to learn is by doing. Don't worry about memorizing everything — keep this tutorial open as a reference, and with practice, it will become second nature!

Happy writing with MarkCraft! ✍️✨`;

export const knowledgeLinkGuideContent = `# Knowledge Linking Guide

Welcome to MarkCraft's knowledge linking system! 🌐 This guide will help you transform your scattered notes into an interconnected knowledge network using bidirectional links, tags, backlinks, and graph visualization.

---

## 1. What is Knowledge Linking?

### The Problem with Traditional Folders

Traditional folder-based file organization has a fundamental limitation: **a file can only live in one folder at a time**. But real knowledge doesn't work that way �?a single note might relate to multiple topics simultaneously.

For example:
- A note about "React Hooks" belongs to both "React" and "JavaScript"
- A recipe note could be filed under "Desserts" and "Quick Meals"
- A book summary might connect to "Psychology" and "Self-Help"

### The Knowledge Network Approach

Knowledge linking replaces hierarchical folders with a **network of connections**:

- 🔗 **Bidirectional links**: Link from Note A to Note B, and Note B automatically shows a backlink to Note A
- 🏷�?**Tags**: Add flexible categories to any note �?a note can have unlimited tags
- 🕸�?**Graph view**: Visualize how all your notes connect to each other
- 🔍 **Backlinks**: Discover which notes reference the current note
- 📎 **Embeds**: Display one note's content directly inside another

> 💡 **Why bidirectional links matter**: In a traditional folder system, you can only see "children" of a folder. With bidirectional links, you can see both outgoing AND incoming connections �?revealing relationships you never noticed before.

---

## 2. WikiLink Bidirectional Links

WikiLinks are the foundation of knowledge linking in MarkCraft. They let you create connections between notes using simple double-bracket syntax.

### 2.1 Basic Syntax: \`[[target]]\`

Use double brackets to create a link to another note by its filename (without the \`.md\` extension):

\`\`\`markdown
Today I learned about [[JavaScript Basics]] and [[CSS Layout]] techniques.
\`\`\`

**How it works:**
- The link target is the filename **without** the \`.md\` extension
- Links are clickable and navigate to the target file
- The link text defaults to the filename

### 2.2 Custom Label: \`[[target|label]]\`

Use the pipe \`|\` syntax to customize the display text of the link:

\`\`\`markdown
I'm studying [[JavaScript Basics|the fundamentals of JS]] and making great progress.
\`\`\`

This displays as "the fundamentals of JS" in the text, but clicking navigates to the "JavaScript Basics" note.

### 2.3 Full Path Links

For files in subfolders or when filenames aren't unique, use the full path:

\`\`\`markdown
Check out [[projects/2024/Annual Report]] for details.
\`\`\`

### 2.4 Navigation

To follow a link:
- **Ctrl+Click** (Windows/Linux) or **Cmd+Click** (Mac) on the link text
- The target file opens in a new tab

### 2.5 Broken Link Detection

If a link target doesn't exist, the link appears with a **red dashed underline** (CSS class: \`wiki-link--broken\`). This is normal and even intentional �?many knowledge management workflows use a "link first, create later" approach.

\`\`\`markdown
I need to write a note about [[Future Topic]] later.
\`\`\`

> 💡 Broken links aren't errors �?they're placeholders! They help you map out your knowledge structure before filling in all the details.

---

## 3. Link Autocomplete

MarkCraft makes it easy to create links with intelligent autocomplete.

### 3.1 How It Works

When you type \`[[\` in the editor, a popup automatically appears showing all available files in your workspace.

**Autocomplete workflow:**

1. Type \`[[\` �?the file list popup appears
2. Continue typing keywords �?the list filters in real-time
3. Use \`↑\` and \`↓\` arrow keys to navigate the list
4. Press \`Enter\` to select and insert the link
5. Press \`Escape\` to cancel

### 3.2 Tips for Efficient Linking

- **Fuzzy matching**: You don't need to type the full filename �?partial matches work too
- **Quick filtering**: Type a few distinctive letters to narrow down results
- **Works anywhere**: Autocomplete works in both the editor and while creating new links

> 🚀 **Pro tip**: Use autocomplete as a quick file browser �?type \`[[\` and scan your file list without ever leaving the keyboard.

---

## 4. Link Hover Preview

Hovering over a WikiLink gives you a quick preview of the target file's content.

### 4.1 Using Hover Preview

1. Move your mouse cursor over any WikiLink
2. After a short delay, a preview card appears
3. The preview shows:
   - Target file name and path
   - First few lines of the file content
4. Move your mouse away to dismiss the preview

### 4.2 When to Use Hover Preview

- **Quick reference**: Remember what a linked note is about without leaving your current context
- **Verify links**: Confirm you're linking to the right file
- **Context switching**: Reduce the mental load of jumping between notes

---

## 5. Backlinks Panel

Backlinks are one of the most powerful features of knowledge management. They show you **which other notes link to the current note**.

### 5.1 What Are Backlinks?

When Note A links to Note B with \`[[Note B]]\`, we say:
- Note A has an **outgoing link** to Note B
- Note B has an **incoming link** (backlink) from Note A

Backlinks let you discover connections in reverse �?answering the question: "Which other notes reference this one?"

### 5.2 The Backlinks Panel

The Backlinks Panel is located at the bottom of the sidebar. It shows:

**📌 Backlinks Section**
- Lists all files that explicitly link to the current file using \`[[...]]\` syntax
- Each entry shows the source file name and a snippet of the context around the link
- Click any entry to jump to the source file at the exact line where the link appears
- Collapse/expand individual entries for cleaner viewing
- Shows the total count of backlinks

**🔍 Unlinked Mentions Section**
- Auto-detects mentions of the current file's name in other files that are NOT wrapped in \`[[]]\`
- Shows context snippets so you can see how the name is used
- Click to navigate to the mention location
- Helps you discover potential connections that haven't been formalized as links yet

> 💡 **Why unlinked mentions matter**: Your knowledge base has hidden connections waiting to be discovered. A note might reference a concept by name without creating a formal link �?unlinked mentions help you find and strengthen these connections.

---

## 6. Embed Content

Sometimes you want to display another note's content directly within your current note, not just link to it. That's where embeds come in.

### 6.1 Basic Syntax: \`![[target]]\`

Add \`!\` before a WikiLink to embed the target file's content:

\`\`\`markdown
# Project Overview

Here are the detailed requirements:

![[Project Requirements]]

## Next Steps

Based on the requirements above, we need to...
\`\`\`

### 6.2 How Embeds Appear

- The embedded content is displayed inline within the current note
- Readers can see the full content without navigating away
- Embeds are read-only �?to edit the content, open the source file

### 6.3 Embeds in Graph View

In the knowledge graph, embedded links are shown as **purple arrowed edges**, distinguishing them from regular WikiLink edges (which are blue). This helps you visualize the difference between "referencing" and "containing" relationships.

---

## 7. Tag System

Tags provide a flexible way to categorize and organize your notes. Unlike folders, a single note can have unlimited tags.

### 7.1 Basic Tag Syntax: \`#tag\`

Add tags anywhere in your note content using the \`#\` symbol:

\`\`\`markdown
# My Article

This article is about web development.

#javascript #react #tutorial
\`\`\`

**Tag rules:**
- Tags start with \`#\` followed by letters, numbers, or hyphens
- Tags can be placed anywhere in the document
- A note can have as many tags as you want

### 7.2 Nested Tags: \`#parent/child\`

Create hierarchical tag structures using the \`/\` separator:

\`\`\`markdown
#programming/javascript
#programming/python
#design/ui
#design/ux
\`\`\`

Nested tags appear in a tree structure in the Tag Panel, making it easy to browse categories at different levels.

### 7.3 The Tag Panel

The Tag Panel provides a complete overview of all tags in your workspace:

**Features:**
- 🌳 **Tree structure**: Tags are displayed hierarchically, with nested tags under their parents
- 📁 **Collapse/expand**: Click the arrow next to a parent tag to show/hide its children
- 📊 **File counts**: Each tag shows how many files use it (parent tags include counts from all nested tags)
- 🔍 **Filter by tag**: Click any tag to filter the file list and show only files with that tag

> 🏷�?**Tags vs Links**: Use tags for categorization (grouping notes by topic), and use links for relationships (connecting notes that reference each other). They work great together!

---

## 8. Graph View

The Graph View visualizes your entire knowledge base as an interactive force-directed graph, helping you see patterns and connections that are hard to spot in a file list.

### 8.1 Opening the Graph View

- Click the graph view button in the sidebar
- Or use the keyboard shortcut

### 8.2 Two View Modes

**🌍 Global Mode**
- Shows ALL files and their connections
- Best for getting an overview of your entire knowledge base
- Great for discovering clusters of related notes

**🎯 Local Mode**
- Centers on the currently open file
- Shows only neighboring files connected via links
- Adjustable depth: 1, 2, or 3 levels away from the center
- Perfect for deep-diving into a specific topic area

### 8.3 Graph Interactions

| Action | How to Do It |
|--------|--------------|
| Pan the canvas | Click and drag on empty space |
| Zoom in/out | Scroll with mouse wheel (0.08x to 6x range) |
| Drag a node | Click and drag any node (pins it in position) |
| Open a file | Click on a node |
| Highlight connections | Hover over a node �?connected nodes and edges stay bright, others fade |
| Reset view | Double-click on empty canvas |

### 8.4 Node Color Legend

Nodes use color coding to convey information at a glance:

| Color | Meaning | Description |
|-------|---------|-------------|
| 🔵 Blue | Normal node | A standard note with connections |
| 🟣 Purple | Hub node | A highly-connected note that many other notes link to |
| 🟢 Green | Center node | The currently focused file (in local mode) |
| �?Gray | Isolated node | A note with no links to other notes |

**Node size**: Larger nodes have more connections �?they're more "important" in the network.

**Glow effect**: Hovering over a node adds a glow effect for enhanced visibility.

### 8.5 Edge Types

Edges (lines between nodes) come in two types:

- 🔵 **Blue edges**: Regular WikiLink connections (\`[[target]]\`)
- 🟣 **Purple arrowed edges**: Embed connections (\`![[target]]\`) �?the arrow shows the direction of embedding

### 8.6 Additional Features

- **Search filter**: Type in the search box to filter nodes by name �?only matching nodes and their connections are shown
- **Performance warning**: If your graph exceeds 300 nodes, it's automatically truncated with a warning message
- **Zoom controls**: Use the zoom in, zoom out, and reset buttons in the corner
- **Theme-aware**: The graph adapts to dark/light theme settings

---

## 9. Full-Text Search

Find what you need quickly with MarkCraft's powerful search capabilities.

### 9.1 Global Search: \`Ctrl+Shift+F\`

Search across ALL files in your workspace:

1. Press \`Ctrl+Shift+F\` to open the global search panel
2. Type your search query
3. Results are grouped by file
4. Click any result to jump to the matching line

**Use cases:**
- Find every mention of a specific concept
- Locate files containing certain keywords
- Discover forgotten notes

### 9.2 Current File Find/Replace

For searching within the currently open file:

| Action | Shortcut | Description |
|--------|----------|-------------|
| Find | \`Ctrl+F\` | Search for text in the current file |
| Find & Replace | \`Ctrl+H\` | Search and replace text in the current file |

> 💡 **Search + Links**: Use global search to find mentions of a topic, then convert them to WikiLinks to strengthen your knowledge network.

---

## 10. Hands-on Practice 🎯

Let's put everything together with practical exercises. Create these files and follow along!

### Exercise 1: Build a Link Network

Create three files that reference each other to form a small knowledge network:

**File: \`Programming Languages.md\`**

\`\`\`markdown
# Programming Languages

Here are some popular programming languages I'm learning.

## Languages

- [[Python]] �?great for data science and scripting
- [[JavaScript]] �?the language of the web

See also: [[Web Development]]
\`\`\`

**File: \`Python.md\`**

\`\`\`markdown
# Python

Python is a versatile programming language.

## Related

- Related to: [[Programming Languages]]
- Often used with: [[JavaScript]] for full-stack development

#python #programming
\`\`\`

**File: \`JavaScript.md\`**

\`\`\`markdown
# JavaScript

JavaScript powers the interactive web.

## Related

- Part of: [[Programming Languages]]
- Pairs well with: [[Python]] for backend work

#javascript #programming #web
\`\`\`

**Try it:**
1. Create all three files
2. Ctrl+Click on links to navigate between them
3. Notice how broken links (to Web Development) appear with red dashes

### Exercise 2: Explore Backlinks

1. Open \`Programming Languages.md\`
2. Look at the backlinks panel in the sidebar
3. You should see both Python.md and JavaScript.md listed as backlinks
4. Click on a backlink to jump to the source file at the exact line
5. Try adding a link to \`Programming Languages\` in another file and watch the backlinks update in real time

### Exercise 3: Navigate the Graph View

1. Open \`Programming Languages.md\`
2. Open the Graph View
3. Try global mode to see all your files
4. Switch to local mode and adjust the depth slider
5. Hover over nodes to see connections highlighted
6. Click a node to open that file
7. Drag nodes around and watch the force-directed physics
8. Zoom with your mouse wheel and double-click to reset

### Exercise 4: Embed Content

Create a new file \`Weekly Summary.md\`:

\`\`\`markdown
# Weekly Summary

## What I Learned This Week

![[Programming Languages]]

## Next Week's Goals

- Dive deeper into advanced JavaScript
- Learn about Python data analysis

![[JavaScript]]
\`\`\`

**Try it:**
1. Observe how embedded content appears inline
2. Compare the appearance of embedded content vs regular links
3. Check the graph view �?embedded links show as purple arrowed edges

### Exercise 5: Discover Unlinked Mentions

1. Add this line to any file (without using double brackets):
   \`\`\`markdown
   Programming Languages is a great overview document.
   \`\`\`
2. Open \`Programming Languages.md\`
3. Look in the backlinks panel under "Unlinked Mentions"
4. You should see the file you just edited
5. Click the mention to navigate to it
6. Convert the mention to a proper WikiLink by adding \`[[\` and \`]]\`
7. Watch it move from "Unlinked Mentions" to "Backlinks"

### Exercise 6: Organize with Tags

Add tags to several files and explore the Tag Panel:

1. In \`Python.md\`, add \`#python #programming #beginner\`
2. In \`JavaScript.md\`, add \`#javascript #programming #web\`
3. In \`Programming Languages.md\`, add \`#programming #overview\`
4. Open the Tag Panel
5. Expand/collapse tag categories
6. Click on \`#programming\` to see all three files
7. Click on \`#python\` to see only the Python file
8. Notice how file counts show cumulative numbers for nested tags

> 🎉 **Congratulations!** You've now experienced all the core features of MarkCraft's knowledge linking system. Keep adding notes and links �?your knowledge network will grow richer every day!

---

## 11. Feature Reference Table

| Feature | Syntax / Shortcut | Description |
|---------|-------------------|-------------|
| Basic WikiLink | \`[[target]]\` | Create a link to another file |
| Labeled WikiLink | \`[[target|label]]\` | Link with custom display text |
| Full path link | \`[[path/to/file]]\` | Link using full file path |
| Embed content | \`![[target]]\` | Embed another file's content inline |
| Link autocomplete | Type \`[[\` | Popup file list for quick linking |
| Navigate link | \`Ctrl+Click\` / \`Cmd+Click\` | Jump to link target |
| Hover preview | Hover over link | Show target file preview |
| Broken link indicator | Red dashed underline | Target file doesn't exist |
| Backlinks panel | Sidebar bottom | See which files link to current file |
| Unlinked mentions | Sidebar bottom | Find informal mentions of filename |
| Tag | \`#tagname\` | Add category tags to notes |
| Nested tags | \`#parent/child\` | Hierarchical tag structure |
| Tag panel | Sidebar | Browse all tags in tree view |
| Graph view | Sidebar button | Visual knowledge network |
| Global graph | Toggle button | Show all files and connections |
| Local graph | Toggle button | Center on current file, adjustable depth |
| Global search | \`Ctrl+Shift+F\` | Search across all files |
| Find in file | \`Ctrl+F\` | Search current file |
| Find & Replace | \`Ctrl+H\` | Search and replace in current file |

---

## 12. FAQ

### Q: Do I need to create the target file before linking to it?

**No!** One of the strengths of knowledge management is the "link first, create later" workflow. Broken links (shown with red dashed underlines) are perfectly normal and expected. Create links to ideas you want to explore later, then fill them in as you go.

### Q: Can a note link to itself?

Technically yes, but it's not very useful. The backlinks panel would show the self-reference, and the graph would show a self-loop edge.

### Q: What happens if I rename a file that other files link to?

Links use the filename as the target. If you rename a file, existing links pointing to the old name will become broken links (red dashed). You'll need to update the links in referring files manually.

### Q: How many tags can a file have?

There's no limit! Add as many tags as make sense for your organization system. Tags are most useful when you use them consistently.

### Q: What's the difference between tags and folders?

- **Folders**: Hierarchical, one file per folder, good for broad organization
- **Tags**: Flat (or nested with /), multiple tags per file, good for flexible categorization
- **Links**: Connect specific notes together, show relationships between ideas

They work best in combination!

### Q: How many nodes can the graph view handle?

The graph supports up to 300 nodes. If you have more than 300 files, only the first 300 are displayed with a warning message. For large knowledge bases, use the local graph view to focus on specific areas.

### Q: Are backlinks updated in real time?

Yes! The LinkIndexStore continuously monitors all files. When you add or remove a link, the backlinks panel updates immediately �?no refresh needed.

### Q: Can I edit embedded content directly?

Embedded content is displayed as a read-only preview. To make changes, open the source file directly by Ctrl+Clicking the embed or finding the file in the file list.

### Q: What's the best way to get started with knowledge linking?

**Start small!** Don't try to organize everything at once. Begin with:
1. Create your first few notes
2. Add 2-3 links between them
3. Check the backlinks panel to see connections form
4. Try the graph view for a visual perspective
5. Gradually add more notes and links over time

The value of a knowledge network grows exponentially �?every new link adds more value than the last!

---

> 🌐 **Remember**: Knowledge linking isn't about perfect organization �?it's about building connections. Every link you create makes your knowledge base a little smarter. Happy linking!`;

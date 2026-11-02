# MarkCraft

> A local-first Markdown knowledge base — turn isolated notes into a connected network, use the whiteboard as your thinking canvas, and publish it all with a one-click blog.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tiptap](https://img.shields.io/badge/Tiptap-3.24-0DBDE7)
![Excalidraw](https://img.shields.io/badge/Excalidraw-0.17-6965F6)
![License](https://img.shields.io/badge/License-MIT-success)

## ✨ Highlights

- **Markdown-first editor** — Tiptap 3 (WYSIWYG) + CodeMirror 6 (source mode). WYSIWYG works via an HTML↔Markdown round-trip; **Markdown is the single source of truth**
- **Knowledge links** — WikiLink, backlinks, unlinked mentions, block references `((id))`, nested tags (`#parent/child`)
- **Knowledge graph** — **4 layouts** (force / concentric / tree / grid) rendered as SVG 2D, with degree stats, BFS neighbor expansion and snapshot export
- **Canvas v2 whiteboard** — Excalidraw rendering + self-built `CanvasEngine` compatibility layer + HTML card overlays (**8 card types**), plus mind-map / kanban / timeline views
- **Knowledge base** — multi-KB management, **7 tabs**, 4-dimension health score, **local statistical retrieval** (keyword-overlap Q&A + frequency-based excerpting; **not AI**), MOC generation
- **Blog studio** — **63 preset themes**, **12 export formats**, real deploy adapters (GitHub / Gitee / Vercel / Cloudflare / Netlify) plus format-only publishers (WeChat / Substack / MDX / Hugo / Astro)
- **Import fidelity** — `.md / .txt / .docx / .html` import, unified to high-quality GFM Markdown (GFM tables enabled)
- **Local-first** — no backend required; settings in localStorage, file tree / knowledge base / whiteboard / version history as JSON under the app data dir (`%APPDATA%/MarkCraft/storage/`)
- **i18n** — full Chinese and English UI

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Editor | Tiptap 3 (WYSIWYG) + CodeMirror 6 (source) |
| Whiteboard | Excalidraw (+ self-built `CanvasEngine` adapter) |
| Storage | localStorage (settings) + JSON files on disk (`core/storage`) |
| Markdown | marked 14 + DOMPurify + morphdom |
| Math / Charts | KaTeX + Mermaid |
| Retrieval | Local hash-bag vector engine (384-dim, no IDF). **No AI / no LLM**: the OpenAI-compatible `RemoteEngine` exists in code but is never instantiated (no settings, no UI) |
| Testing | Vitest + Testing Library |

## 🚀 Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check + production build
npm run test:run     # run the full test suite once
npm run lint         # ESLint
```

## 📦 Project Structure

```
src/
├── core/         # data layer (file tree, disk storage backend, tags)
├── services/     # shared services (file ops, HTML sanitize, backup)
├── stores/       # global state (React Context + Hooks)
├── features/     # domain modules (editor / import / export / blog / canvas / KB / …)
├── components/   # shared UI primitives
├── aurora/       # application shell & panel layer (the real entry point)
└── hooks/ locales/ styles/ types/ utils/
```

> Dependency direction is one-way: `core` → `services` / `stores` → `features` → `aurora`.
> It is enforced by a local ESLint rule (`local/no-aurora-ui-import`) at pre-commit time.

## 🧪 Testing

179 test files / 1700+ cases, all passing.

```bash
npm run test:run
```

## ⚠️ Known Limitations

- **There is no AI / LLM feature.** KB "Q&A" and "similar search" are **local statistical retrieval** — keyword-overlap paragraph selection plus frequency-based sentence excerpting (`TfidfEngine`). They reflect keyword distribution, not semantics. The OpenAI-compatible `RemoteEngine` is **dead code**: `getAiService()` never passes settings and `setAiService()` is never called, and there is no configuration UI.
- The knowledge graph is **SVG 2D with 4 layouts**; earlier design docs mentioning a 3D sphere, PageRank/betweenness centrality or community clustering were **never implemented**.
- PDF export relies on `html2pdf.js`; complex layouts may paginate imperfectly.

## 📖 Documentation

The full documentation — feature details, usage guide, API reference, configuration — is written in Chinese:

**[README.md](./README.md)**

## 📄 License

MIT

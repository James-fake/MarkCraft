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
- **Desktop-only** — Electron 44 is the sole product form (no web/PWA build). Business code talks to disk through the `@platform` IPC layer; Vault roots are explicitly registered
- **Security hardening (2026-11)** — filesystem path allowlist + atomic writes, SSRF guard (protocol allowlist, private-range & DNS-rebinding checks, per-hop redirect validation), navigation/webview defenses, iframe sandbox without `allow-same-origin`, export URL allowlist
- **Input performance (2026-11)** — WYSIWYG serialization is debounced (150ms) with 8 explicit flush points, lint runs once per pause instead of twice per keystroke, and math-block extraction is O(n) instead of O(k²·n)
- **i18n** — full Chinese and English UI

## 📥 Download

> Windows x64 installers are published as **GitHub Release assets in this repository** — no split volumes, no separate download repo.

| Edition | File | Size | Notes |
| --- | --- | --- | --- |
| **Installer (recommended)** | [`MarkCraft-Setup-x64.exe`](https://github.com/James-fake/MarkCraft/releases/latest/download/MarkCraft-Setup-x64.exe) | 201.2 MB | NSIS installer, choose install directory, Start Menu / desktop shortcuts |
| **Portable** | [`MarkCraft-Portable-x64.exe`](https://github.com/James-fake/MarkCraft/releases/latest/download/MarkCraft-Portable-x64.exe) | 200.9 MB | No installation, double-click to run, USB-friendly |

Both editions are functionally identical. **Asset names are fixed and contain no version number** — the website and scripts use `releases/latest/download/` permalinks; new releases only replace the asset contents, never rename them.

> 🔗 [All releases & changelog](https://github.com/James-fake/MarkCraft/releases) · [`SHA256SUMS.txt`](https://github.com/James-fake/MarkCraft/releases/latest/download/SHA256SUMS.txt)
>
> ⚠️ Installers are **not code-signed**. Windows SmartScreen may warn about an "unknown publisher" on first run. Verify the SHA-256 hash, then choose **More info → Run anyway**.

| File | SHA-256 (v1.0.0) |
| --- | --- |
| `MarkCraft-Setup-x64.exe` | `8080b7c1d04291fa66d09b6bd8b24477133e8d8383abae35fd17afd514046449` |
| `MarkCraft-Portable-x64.exe` | `e1d13c825a42b61f6d989208102907cc661a4741cf01fd402660ef08389ab357` |

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop runtime | **Electron 44** (ESM main + CJS preload, `contextIsolation`, `nodeIntegration: false`) |
| UI | React 18 + TypeScript 5 |
| Build | Vite 5 (renderer) + esbuild (main/preload) + electron-builder (NSIS / Portable) |
| Editor | Tiptap 3 (WYSIWYG) + CodeMirror 6 (source) |
| Whiteboard | Excalidraw (+ self-built `CanvasEngine` adapter) |
| Storage | localStorage (settings) + JSON files on disk (`core/storage`) |
| Markdown | marked 14 + DOMPurify + morphdom |
| Math / Charts | KaTeX + Mermaid |
| Retrieval | Local hash-bag vector engine (384-dim, no IDF). **No AI / no LLM**: the OpenAI-compatible `RemoteEngine` exists in code but is never instantiated (no settings, no UI) |
| Testing | Vitest 2.1.9 + Testing Library (jsdom, Node 22) |

## 🚀 Quick Start

Requires **Node.js 22 LTS** (CI uses Node 22), npm ≥ 9, Git ≥ 2.

```bash
git clone https://github.com/James-fake/MarkCraft.git
cd MarkCraft
npm install
npm run electron:dev    # compiles main/preload, starts Vite, opens the Electron window
```

> `npm run dev` alone only serves the renderer in a browser; desktop capabilities (real disk Vault,
> `mc:fs:*` IPC, Pandoc sidecar) are unavailable there. It is **not** a usable product form.

Other scripts:

```bash
npm run build            # type-check + production build
npm run electron:dist:win # Windows x64 NSIS + Portable installers
npm run test:run         # run the full test suite once
npm run lint             # ESLint (--max-warnings 0)
npm run typecheck:electron / typecheck:e2e   # main-process / E2E type checks
npm run e2e              # Playwright against a real Electron window
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

**212 test files** (`src/**/*.test.ts(x)`), all passing; roughly 2400 cases and growing — run `npm run test:run` for the exact count (kept out of the docs deliberately to avoid number drift). CI hard gates: `tsc --noEmit` + `typecheck:electron` + `typecheck:e2e` + `vitest run` + `lint --max-warnings 0`.

```bash
npm run test:run
```

Regression locks worth knowing: `netGuard.test.ts` (SSRF & redirects), `serializeScheduler.test.ts` (debounce + flush must never drop input), `fileStoreShared.session.test.ts` (Vault session restore / unsaved-edit merge), `stressAndPerf.test.ts` (per-keystroke cost profile).

## ⚠️ Known Limitations

- **There is no AI / LLM feature.** KB "Q&A" and "similar search" are **local statistical retrieval** — keyword-overlap paragraph selection plus frequency-based sentence excerpting (`TfidfEngine`). They reflect keyword distribution, not semantics. The OpenAI-compatible `RemoteEngine` is **dead code**: `getAiService()` never passes settings and `setAiService()` is never called, and there is no configuration UI.
- The knowledge graph is **SVG 2D with 4 layouts**; earlier design docs mentioning a 3D sphere, PageRank/betweenness centrality or community clustering were **never implemented**.
- PDF export relies on `html2pdf.js`; complex layouts may paginate imperfectly.
- Builds produce `resources/app.asar` by default (**the published v1.0.0 installer uses this form**). Defender real-time scanning may lock the freshly written asar and make electron-builder's cleanup fail with `EBUSY`; the workaround is to build into a **fresh empty output directory** each time. `asar=false` (an `app/` directory) is only a last resort.
- Only **Windows x64** installers are published; macOS / Linux must be built from source.
- Large graphs (>500 nodes) can be slow on low-end hardware; no LOD / viewport culling / spatial index yet.

## 📖 Documentation

The full documentation — feature details, usage guide, API reference, configuration, and the 2026-11 quality/performance record — is written in Chinese:

**[README.md](./README.md)** · **[TiptapEditor performance plan](./docs/TiptapEditor-Perf-Plan.md)**

## 📄 License

MIT

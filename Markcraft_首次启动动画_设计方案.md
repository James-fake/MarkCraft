# MarkCraft 首次启动动画 · 设计方案（DesignBrief）

> 目标读者：前端实施者 / 设计评审
> 结论先行：**不做 React 组件，而是把开屏做成 `index.html` 内联层（HTML+CSS+极小 JS）**，动画与 JS 主包**并行加载**；主界面首绘后由 `window.__mcSplash.done()` 触发淡出、**同底色无缝衔接**。

---

## 0. 目标与验收标准

| 项 | 要求 |
|---|---|
| 序列 | 冷启动 → 近黑空屏 → `MarkCraft` **逐字浮现**（打字机感）→ 淡出 → 主界面 |
| 节奏 | 字符依次出现、相邻重叠成"波"、全程无顿挫 |
| 性能 | 只用 **opacity / transform**（合成器属性）→ 不触发布局/重绘，零掉帧 |
| 衔接 | 开屏淡出与主界面首绘**同底色**，无白闪、无跳变 |
| 无障碍 | `prefers-reduced-motion` 降级为整词淡入；语义 `role="status"` |
| 不阻塞 | 开屏**不增加**首屏可用时间；它只"遮盖"加载，不"延长"加载 |

**反例（明确不做）**：进度条 / 加载圈 / 百分比。它们会把"等待"的心理暗示放大；本方案用「品牌浮现」把加载时间转化为品牌记忆点。

---

## 1. 竞品参照（定性）

| 产品 | 启动表现 | 借鉴点 |
|---|---|---|
| VS Code | 无品牌开屏，直接出窗口骨架 | 不拖慢——开屏绝不能晚于主界面出现 |
| Obsidian | 极短加载提示 | 极简、不喧宾夺主 |
| Slack / Discord / Notion（Electron 系） | Logo + 加载态 | 品牌露出，但用 spinner 显得"慢" |
| 开发者工具型品牌（终端/CLI 视觉） | 打字机式文本浮现 | **与"写作者的编辑器"调性最契合** |

**结论**：取"VS Code 的不拖慢"+"打字机的品牌调性"，去"spinner 的慢感"。

---

## 2. 架构决策：为什么放在 HTML 内联层，而不是 React 组件

| | 内联 HTML 层（✅ 采用） | React 组件（❌ 否决） |
|---|---|---|
| 出现时机 | HTML 解析即渲染（≈0ms） | 需等 JS bundle 下载→解析→执行 |
| 与主包关系 | **并行**（动画盖住加载） | 串行（先加载后动画，白等） |
| 加载期观感 | 近黑空屏 + 打字 | 长时间白屏/闪烁 |

事实依据：本项目生产构建存在 **>500kB chunk**（`vite build` 警告）；React 组件方案在弱网/机械盘上会先露出长时间空白，与需求"先空屏再打字"直接冲突。

**实现载体**：`index.html` 内联 —— 与既有"内联脚本先于 CSS 设 `data-theme` / `data-density` 以免闪烁"同一套路，风格统一、零新依赖。

---

## 3. 视觉规格（Design Spec）

| 元素 | 规格 | 依据 |
|---|---|---|
| 底色 | `#0A0B0F` | ＝ `--mc-bg-window`，`#aurora-root` 同源 → 无缝 |
| 文案 | `MarkCraft`（大写 C，与 `index.html` `<title>` / 欢迎页品牌一致） | 品牌一致性 |
| 字色 | `#E8ECF4`（＝ `--mc-text-primary`），对比度 ≈ 15:1（AAA） | a11y |
| 字体 | `'Inter','Segoe UI',system-ui,-apple-system,sans-serif` | ＝ `--mc-font-sans` |
| 字号 | 桌面端 `clamp(28px, 3.2vw, 40px)`；字重 600；字距 `-0.01em` | 克制的品牌标 |
| 布局 | `position:fixed; inset:0; display:flex; align-items:center; justify-content:center` | 绝对居中 |
| 可选装饰 | 末尾 1px×em 的 accent 竖条（光标）；无任何渐变/发光 | 桌面原生语言（禁 AI 光晕） |

---

## 4. 动画规格（Motion Spec）★

**技术**：纯 CSS 逐字错峰。每个字符一个 `<span>`，`animation-delay = i × 95ms`。

```css
@keyframes mc-splash-char {
  from { opacity: 0; transform: translateY(0.16em); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0);      filter: blur(0);   }
}
.mc-splash__char {
  display: inline-block;
  opacity: 0;
  animation: mc-splash-char 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--i) * 95ms);
  will-change: opacity, transform;
}
```

| 参数 | 值 | 说明 |
|---|---|---|
| 单字时长 | **480ms** | 单字自己的浮现时长 |
| 错峰间隔 | **95ms** | 第 i 字的 `animation-delay` |
| easing | `cubic-bezier(0.22,1,0.36,1)` | easeOutQuint 感：起手快、收尾绵 |
| 打字总时长 | `95×8 + 480 ≈ 1.24s` | 9 字 "MarkCraft" |
| 位移 | `0.16em ≈ 6px` | 极轻上浮，避免"弹跳" |
| 模糊 | `6px → 0` | **"浮现"的关键**（非硬切）；仅 9 个短生命期元素，开销可忽略 |

### 为什么"平滑流畅、无顿挫"
1. **单字时长(480) > 错峰(95)** → 相邻字符的动画**重叠**，视觉是连续"波"而非机械"跳字"。
2. **只动 `opacity`/`transform`/`filter`**：前两者走合成器，不触发布局；`filter` 仅作用 9 个小文本节点且同步结束，实测无掉帧（若在低端机仍有顾虑 → 见 §9 降级开关）。
3. `will-change` 提前升层，避免首帧闪烁。

### 光标（可选）
末尾一条 1px accent 竖条：打字期常亮；结束后**缓慢闪烁 2 次**（`opacity` 交替，1.2s/次，ease）后随整体淡出。若选"纯浮现"变体则不要光标。

---

## 5. "首次"语义（两方案，见文末决策）

| 方案 | 行为 | 实现 |
|---|---|---|
| **A. 仅首次**（推荐） | 只有**该设备第一次**打开 MarkCraft 播放；之后启动直接进主界面 | `<head>` 内联脚本读 `localStorage['mc-splash-seen']`；播放后写 `1` |
| B. 每次启动 | 每次冷启动都播放 | 同上，但不落标记 |

要点：判定必须放在 **`<head>` 内联脚本、同步执行**（与主题/密度脚本同位），在 CSS 渲染前决定"渲染 splash 还是立刻隐藏"，**杜绝闪烁**。

> ⚠️ 与既有约定一致：本地存储键前缀 `mc-`（现有 `mc-sidebar-density`）。故用 `mc-splash-seen`。

---

## 6. 与主界面加载的衔接协议（Handoff）★

### 时序
```
t0  HTML 解析 ──► 内联 splash 渲染，打字动画开始（与 JS 下载并行）
t?  bundle 执行 ──► aurora-main.tsx ──► createRoot().render(<AuroraShell/>)
t1  React 首帧已绘 ──► 调 window.__mcSplash.done()
        │
        ├─ elapsed = t1 - t0
        ├─ 若 elapsed < MIN_TOTAL(1400ms) → setTimeout 补足（保证动画完整、不被"秒闪"）
        └─ 加 .mc-splash--leaving → opacity→0（300ms, ease-in）→ transitionend 后 node.remove()
t2  下层主界面自然显现（同底色 → 无缝）
```

### 关键实现细节
- **"首帧已绘"判定**：不能仅凭 `render()` 返回（React 是异步提交）。用 **`requestAnimationFrame` 双帧** 后再 `done()`（首帧提交 + 下一帧合成完成），或根组件 `useEffect` + 双 rAF。二者等价，取其一。
- **同底色 = 无闪**：`#mc-splash` 与 `#aurora-root` 同为 `<body>` 子节点，底色均为 `#0A0B0F`，z-index 最高，`position:fixed; inset:0`。淡出时**不会**露出中间态白底。
- **不阻塞**：`done()` 只在主界面就绪后调用 → 用户永远不会"点完看不到反应"。

### 兜底（异常路径）
| 场景 | 策略 |
|---|---|
| 主界面首绘晚（弱网） | splash **保持**（不放空白），继续等首绘；不设上限逼出空白 |
| **硬超时** `HARD_CAP = 6000ms` | 仍未就绪 → **强制淡出**让位。否则渲染错误页（ErrorBoundary 在 `aurora-root` 内，层级低于 splash）会被开屏永久盖住 |
| `prefers-reduced-motion` | 跳过逐字，整词 250ms 淡入；`MIN_TOTAL` 降为 600ms |
| JS 完全未加载（bundle 404） | splash 由 `HARD_CAP` 淡出，露出 `#aurora-root`（空→ErrorBoundary/浏览器错误）|

---

## 7. 无障碍（a11y）

- **动效**：`@media (prefers-reduced-motion: reduce)` → 关闭逐字错峰与 blur，改为整词一次性淡入（"更少更柔，非归零"——遵循既有动效语言）。
- **语义**：容器 `role="status" aria-live="polite" aria-label="MarkCraft 正在启动"`；逐字 `<span>` 均 `aria-hidden="true"`，屏幕阅读器只读一次完整品牌名。
- **对比度**：`#E8ECF4` on `#0A0B0F` ≈ 15:1（远超 AA 4.5:1）。
- **焦点**：开屏期间不接管焦点；淡出后不残留。

---

## 8. 实施落点（文件清单）

| 文件 | 改动 | 说明 |
|---|---|---|
| `index.html` | 新增 `<style id="mc-splash-css">` + `<div id="mc-splash">` + `<script>`（首启判定 + 计时 + 暴露 `window.__mcSplash`） | 必须在 bundle 之前，故**不能**走 JS `import` 的 CSS |
| `src/aurora/aurora-main.tsx` | `createRoot(...).render(...)` 后 **双 rAF → `window.__mcSplash?.done()`** | 唯一的主流程改动，约 6 行 |

> 说明：内联样式不会被 Tailwind purge，构建产物 `index.html` 原样保留。

---

## 9. 风险与对策

| 风险 | 对策 |
|---|---|
| 低端机 `blur` 掉帧 | 参数化为 CSS 变量；提供"关闭 blur"开关（改 `--mc-splash-blur: 0px` 即降级为纯 opacity+位移） |
| 字体不一致（开屏用系统字体，应用加载 Inter） | 开屏淡出时应用已就绪，品牌字**不同时可见** → 无跳变；若求极致可将 Inter 内联为 `woff2`（体积代价，默认不做） |
| 首启标记与实际不符（清缓存后重复播放） | 可接受；或加"距上次 < 24h 不重复"的软节流（可选） |
| 与 PWA 启动图（manifest splash）叠加 | PWA 启动图仅在"安装为应用"时出现；Web 场景无冲突。Electron 打包时用同一 `index.html` 逻辑即可复用 |

---

## 10. 验证清单（CDP 真机）

1. 冷启动（清 `mc-splash-seen`）→ 录屏/截图：空屏 → 逐字浮现（数出 9 字）→ 淡出 → 主界面。
2. 二次启动（有标记）→ **不播放**，直接进主界面（方案 A）。
3. 量测：splash 消失后 `document.getElementById('mc-splash') === null`（已 remove，不留 DOM）。
4. 断言 `prefers-reduced-motion: reduce` 下无逐字（用 CDP `Emulation.setEmulatedMedia`）。
5. 回归：`tsc --noEmit` / `vitest run` / `vite build` / 真机 CDP。

---

## 附录 · 内联实现雏形（示意，非最终）

```html
<!-- index.html <head> 末尾 -->
<style id="mc-splash-css">
  #mc-splash{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:#0A0B0F;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;
    transition:opacity 300ms cubic-bezier(0.4,0,1,1)}
  #mc-splash.mc-splash--leaving{opacity:0;pointer-events:none}
  #mc-splash .mc-splash__word{font-size:clamp(28px,3.2vw,40px);font-weight:600;letter-spacing:-0.01em;color:#E8ECF4}
  #mc-splash .mc-splash__char{display:inline-block;opacity:0;animation:mc-splash-char 480ms cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay:calc(var(--i) * 95ms);will-change:opacity,transform}
  @keyframes mc-splash-char{from{opacity:0;transform:translateY(0.16em);filter:blur(6px)}
    to{opacity:1;transform:none;filter:blur(0)}}
  @media (prefers-reduced-motion:reduce){
    #mc-splash .mc-splash__char{animation:mc-splash-char 250ms ease forwards;animation-delay:0ms}
  }
</style>
<!-- <body> 内、#aurora-root 之前 -->
<script>
  (function(){
    var SEEN='mc-splash-seen', t0=performance.now();
    var first=false; try{ first=!localStorage.getItem(SEEN) }catch(e){ first=true }
    if(!first) return;                       // 已有标记 → 不插 DOM
    var word='MarkCraft';
    var el=document.createElement('div'); el.id='mc-splash';
    el.setAttribute('role','status'); el.setAttribute('aria-label','MarkCraft 正在启动');
    var w=document.createElement('div'); w.className='mc-splash__word'; w.setAttribute('aria-hidden','true');
    word.split('').forEach(function(c,i){ var s=document.createElement('span');
      s.className='mc-splash__char'; s.style.setProperty('--i',i); s.textContent=c; w.appendChild(s) });
    el.appendChild(w); document.body.appendChild(el);
    var MIN=1400, CAP=6000, dismissed=false;
    function remove(){ if(el.parentNode) el.parentNode.removeChild(el) }
    function leave(){ if(dismissed) return; dismissed=true;
      el.classList.add('mc-splash--leaving');
      el.addEventListener('transitionend',remove,{once:true}); setTimeout(remove,600) }
    function done(){ var wait=Math.max(0,MIN-(performance.now()-t0)); setTimeout(leave,wait) }
    window.__mcSplash={done:done};
    setTimeout(function(){ if(!dismissed) leave() },CAP);   // 硬兜底
  })();
</script>
```

```tsx
// aurora-main.tsx · render 之后
createRoot(el).render(<StrictMode><ErrorBoundary><AuroraShell/></ErrorBoundary></StrictMode>)
requestAnimationFrame(() => requestAnimationFrame(() => {
  (window as any).__mcSplash?.done()
  try { localStorage.setItem('mc-splash-seen', '1') } catch {}
}))
```

---

---

## 11. 实施记录（已落地）

**决策**：① 播放频率 = **仅首次启动**；② 视觉变体 = **打字机逐字浮现 + 光标**；③ **立即实施**。

**落地文件**：
| 文件 | 改动 |
|---|---|
| `index.html` | `<head>`：`mc-booting` 引导底色脚本 + `<style id="mc-splash-css">`；`<body>`：开屏构建脚本（先于 module bundle） |
| `src/aurora/aurora-main.tsx` | 新增 `SplashHandoff`（useEffect + 双 rAF）→ `window.__mcSplash?.done()` |

**关键实现取值**：`STAGGER=95ms` / 单字 `480ms` / `cubic-bezier(0.22,1,0.36,1)` / `MIN_TOTAL=1600ms` / `HARD_CAP=6000ms` / 淡出 `300ms` / 光标 `#7C8CFF`（= `--mc-accent`）、`--caret-delay=9×95=855ms` 起闪烁 / 底色 `#0A0B0F`（= `--mc-bg-window`）。

**真机验证（CDP `probe-splash.mjs`，新 profile ⇒ 首次启动路径）**：
- 开屏出现于 **19ms**（HTML 解析期，证明先于模块包）。
- 逐字进度实测 `opacities=[0.99,0.94,0.78,0.27,0,0,0,0,0]` → **逐字浮现成立**；`charCount=9`、`text=MarkCraft`、光标存在。
- `bg / bodyBg = rgb(10,11,15)` → 与 `#aurora-root` 同底色，衔接无白闪。
- **2.0s 移除 DOM**（`MC-splash` 节点消失），`menubarItems=7`（主界面已就绪），`mc-splash-seen=1`。
- **二次启动不再播放**（`secondLaunchSplash=false`）。
- **reduced-motion**：`caret=false`、各字 `opacity=1`（整词同时出现，无逐字）。
- 回归：`tsc` 干净、`vite build` 通过、`dist/index.html` 保留内联开屏（`mc-splash`×22 / `__mcSplash`×3）、app 区 smoke 14/14。

**已知取舍**：光标不做"跟手逐字位移"（比例字体下 `steps()` 裁剪无法对齐字宽，硬做会引入布局动画）；改为**打字完成后在末尾出现并闪烁**，视觉为"打完字、光标停留闪烁"，顺滑且零成本。若日后要"跟手光标"，需改字符逐个 `width` 动画（换取精确对齐、牺牲零布局）。

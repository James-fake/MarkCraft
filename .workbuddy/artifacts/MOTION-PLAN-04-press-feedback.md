# PLAN 04 — 按压反馈横向一致性（:active scale）

> **状态：✅ 已完成（2026-09-14）**
> 落地 commit：见 git log「PLAN-04」；契约测试 `src/aurora/styles/pressFeedback.test.ts`（14 例）；
> CDP 真机 19/19 全绿（五个变体 + blog 按钮按下实测 `matrix(0.97,0,0,0.97,0,0)`，按住 460ms 保持，松手回 `none`）。
> 全量回归 **882 passed / 3 failed / 2 skipped**（基线 3 项不变）。

- **严重度**：MEDIUM（物理性/反馈）
- **基线 commit**：`075821f`
- **预估改动**：2-3 个文件（`components.css` 为主）
- **依赖**：无（可与 PLAN 01 并行）
- **风险**：低（新增属性，不改既有视觉）

### 落地实况（与计划的差异）

| 项 | 计划 | 实况 |
|---|---|---|
| `.aurora-btn` 基类 transition | 可能需补 `transform` | **已含** `transform var(--mc-dur-fast) var(--mc-ease-spring)` —— 无需改 |
| `.aurora-blog-btn` 基类 | 未提 | **已含**同样 transform 过渡 —— 无需改 |
| disabled 排除方式 | `:not(:disabled)` 备选 | `.aurora-btn:disabled` 已有 `pointer-events: none` → 天然屏蔽，**未加** `:not()` |
| 实际文件 | 2-3 个 | 2 个：`components.css`（5 变体）+ `panels/blog.css`（1 变体） |

> 说明：计划里预估用 `var(--mc-ease-out)`，实况基类已用 **`--mc-ease-spring`**（更弹）。
> 遵循「不改既有风格、只补缺失属性」原则，**未改动**过渡曲线 —— spring 曲线对按压回弹更贴合 Apple 手感。

---

## 1. 背景（执行者须知）

AUDIT.md §3 要求：

> **Press feedback**: `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`. Keep it subtle (0.95–0.98).

Apple *Designing Fluid Interfaces* §1 进一步要求：

> **Respond on pointer-down, not on release.** Highlight a button the instant it's pressed.

### 现状盘点（审计实测）
- 全仓 `:hover` **228 处** vs `:active` **44 处** —— 覆盖不均。
- **已有的正确实现（作为范本）**：
  ```css
  /* src/aurora/styles/panels/kb.css:136 —— 这就是本计划的目标写法 */
  .aurora-kb-btn:active { transform: scale(0.97); }
  ```
  其 transition 已含 `transform var(--mc-dur-fast) var(--mc-ease-out)`，`--mc-dur-fast = 180ms`（略高于推荐的 160ms，可接受）。
- **缺陷（缺 press scale）**：主按钮族 `components.css`
  ```css
  /* L88 现状：只变背景色，无 scale —— 按下「手感」偏软 */
  .aurora-btn--primary:active {
    background: var(--mc-accent-pressed);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  ```
  同类还有 `--secondary`(L106) / `--ghost`(L123) / `--danger`(L142) / `--danger-solid`(L159)。

---

## 2. 精确改动

### 2.1 先确认基类是否已有 transition
```bash
sed -n '1,60p' src/aurora/styles/components.css
grep -n "aurora-btn\b" src/aurora/styles/components.css | head -20
```
需确认 `.aurora-btn` 基类是否已有 `transition: transform ...`。
**若没有 → 必须在基类补上**（否则 `:active` 的 scale 会「闪跳」而非平滑）：

```css
.aurora-btn {
  /* ...其它属性... */
  /* 按压反馈过渡（audit 2026-09-14 #4）：
     只动 transform，160ms 强减速；与 --mc-dur-fast(180ms) 同档，不引入新 token */
  transition:
    background var(--mc-dur-fast) var(--mc-ease-out),
    border-color var(--mc-dur-fast) var(--mc-ease-out),
    color var(--mc-dur-fast) var(--mc-ease-out),
    box-shadow var(--mc-dur-fast) var(--mc-ease-out),
    transform var(--mc-dur-fast) var(--mc-ease-out);
}
```
> 若基类**已有** transition，则把 `transform var(--mc-dur-fast) var(--mc-ease-out)` **追加**到既有列表末尾即可（保持属性顺序与现有风格一致）。

### 2.2 为五个变体补 `transform: scale(0.97)`

```css
.aurora-btn--primary:active {
  background: var(--mc-accent-pressed);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  transform: scale(0.97);        /* ← 新增（audit #4） */
}

.aurora-btn--secondary:active {
  /* 保留既有值 */
  transform: scale(0.97);        /* ← 新增 */
}

.aurora-btn--ghost:active {
  /* 保留既有值 */
  transform: scale(0.97);        /* ← 新增 */
}

.aurora-btn--danger:active {
  /* 保留既有值 */
  transform: scale(0.97);        /* ← 新增 */
}

.aurora-btn--danger-solid:active {
  /* 保留既有值 */
  transform: scale(0.97);        /* ← 新增 */
}
```

> ⚠️ **不要**写 `transition: ... transform ...` 到 `:active` 里——transition 必须在**基类**上，
> 写在 `:active` 会导致松开时的回弹无过渡（瞬间跳回）。

### 2.3 disabled 态必须排除
```bash
grep -n "aurora-btn.*disabled\|:disabled" src/aurora/styles/components.css | head
```
若基类已有 `:disabled { pointer-events: none }` 则**天然安全**（不会触发 `:active`）。
若**没有**，请把 `:active` 选择器改为 `:active:not(:disabled)`（参考既有范例 `blog.css:959` 的
`.aurora-blog-generate:active:not(.is-loading)`）。

### 2.4 可选：统一到更小的值？
AUDIT 建议范围 0.95–0.98，项目既有范例是 **0.97**。**保持 0.97 与 `kb.css` 一致**——
一致性优先于微调，不要为不同按钮引入不同缩放值。

---

## 3. 验证

### 3.1 静态 + 单测
```bash
node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
node node_modules/vitest/vitest.mjs run src/aurora
```

### 3.2 真机 feel-check（必做）
1. dev server 5174
2. 逐个按下：主按钮、次按钮、幽灵按钮、危险按钮
3. **预期**：按下瞬间**立即**微缩（不等松开），松开平滑回弹
4. **手指按住不放** → 应保持缩小态（验证是 pointer-down 而非 click）
5. 慢放录屏确认 160–180ms 无跳变
6. 复核 `kb-btn` 手感**一致**（改前它已有 scale，改后应无差异）

### 3.3 全量回归
```bash
node node_modules/vitest/vitest.mjs run
```
**通过标准**：`848 passed / 3 failed / 2 skipped`，失败项名称不变。

---

## 4. 硬性范围边界

- ✅ 允许改：`src/aurora/styles/components.css`（`.aurora-btn` 基类 + 5 个变体）
- ⚠️ 可选：若 `blog.css` 的 `.aurora-blog-btn--primary:active`（L447）也缺 scale，可一并对齐——
  但**先确认它是否与 `kb-btn` 同族**；不确定则**只改 components.css**，不要扩大范围
- ❌ 禁止改：按钮的尺寸、颜色、圆角、阴影既有值
- ❌ 禁止为 `:hover` 加 `scale`（hover 位移在触屏上是反模式，见 PLAN 01）
- ❌ 禁止引入新 token 或新依赖

---

## 5. 完成定义（DoD）

- [x] `.aurora-btn` 基类 transition 含 `transform`
- [x] 5 个变体 `:active` 均有 `transform: scale(0.97)`
- [x] disabled 态不触发缩放（`pointer-events: none` 天然屏蔽，CDP A7 实测 `none`）
- [x] 按住不放保持缩小态（CDP A4 按住 460ms 实测仍为 `matrix(0.97,...)`，截图 `press-feedback-pressed.png`）
- [x] 全量回归无新增失败（882 passed / 3 failed / 2 skipped）
- [x] 契约测试 `pressFeedback.test.ts` 14 例
- [x] 记忆追加一条

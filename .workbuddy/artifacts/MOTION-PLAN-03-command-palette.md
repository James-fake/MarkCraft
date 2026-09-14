# PLAN 03 — 命令面板去动画（100+/天 交互）

> **状态：✅ 已完成（2026-09-14）**
> - 落盘：`command-palette.css` 两处 `animation` 与两个 `@keyframes` 已删除
> - 契约测试：`src/aurora/styles/commandPaletteNoAnim.test.ts`（11 例全绿）
> - CDP 真机：`.workbuddy/artifacts/cdp-verify-command-noanim.mjs` **11/11 通过**
>   （overlay/panel `animationName=none`、`getAnimations()` 为空、0ms 与 250ms 快照一致、重开仍零动画）
> - 全量回归：906 passed / 3 failed（均为预存）/ 2 skipped
> - 截图：`.workbuddy/artifacts/command-noanim-verified.png`

- **严重度**：MEDIUM（目的/频率）
- **基线 commit**：`075821f`
- **预估改动**：1 个文件（`command-palette.css`）
- **依赖**：无
- **风险**：低（纯删除动画，无逻辑变更）
- **性质**：**理念性删除**——「最强的修复往往是删掉动画」（AUDIT.md §1）

---

## 1. 背景（执行者须知）

`⌘K` 命令面板（command palette）是**键盘发起的高频交互**，用户一天触发几十到上百次。

AUDIT.md §1 的频率表把这类归为**最高频档（100+/天）**，决策是：

> **100+ times/day (keyboard shortcuts, command palette toggle) → No animation. Ever.**
>
> "The strongest fix is often **delete the animation**."

业界标杆：**Raycast 的命令面板开合零动画**——这是被 Emil 明确点名的正解。

**为什么动画在这里有害**：
1. 键盘用户的手速远快于动画——200ms 入场意味着**每次调用都被延迟感知**，产生「卡顿/迟钝」错觉；
2. 面板是「瞬态工具」而非「空间内容」，用户不需要理解它「从哪来」；
3. 300ms 的位移在每天 100 次 = 每天浪费 30 秒的感知延迟。

**当前实况**（`src/aurora/styles/command-palette.css`）：
```css
/* L16 — overlay */
.aurora-command-overlay { animation: aurora-command-overlay-in 180ms ease-out; }
@keyframes aurora-command-overlay-in { from { opacity: 0; } to { opacity: 1; } }

/* L31 — panel */
.aurora-command {
  animation: aurora-command-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes aurora-command-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

---

## 2. 精确改动

### 文件：`src/aurora/styles/command-palette.css`

**改动 1 — overlay：移除动画（L15-21 区）**

```css
/* 原 */
.aurora-command-overlay {
  /* ...其它属性... */
  animation: aurora-command-overlay-in 180ms ease-out;
}
@keyframes aurora-command-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 改后 */
.aurora-command-overlay {
  /* ...其它属性保持不变... */
  /* 命令面板 = 键盘发起 100+/天 高频交互（audit 2026-09-14 #3）：
     按 AUDIT §1「100+/天 永不动画」，overlay 立即出现，不做淡入。
     scrim 本身已是半透明遮罩，瞬时出现无感知跳跃。 */
}
@keyframes aurora-command-overlay-in { from { opacity: 0 } to { opacity: 1 } }
/* ↑ 若确认无其它消费者，直接删除该 @keyframes；删前先 grep 复核： */
/*   grep -rn "aurora-command-overlay-in" src */
```

**改动 2 — panel：移除入场动画（L31 区）**

```css
/* 原 */
.aurora-command {
  animation: aurora-command-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
  /* ...其它属性... */
}
@keyframes aurora-command-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 改后 */
.aurora-command {
  /* 无入场动画（audit 2026-09-14 #3）。面板随按键瞬时呈现，
     与 Raycast 一致——键盘交互不应有可感知的等待。 */
  /* ...其它属性原样保留... */
}
/* @keyframes aurora-command-in 一并删除（删前 grep 复核消费者） */
```

### ⚠️ 关键：**保留**退场处理与焦点行为
- 若 TSX 里有「关闭后再卸载」的 `EXIT_MS` 逻辑配套，**本计划不动它**——去动画后关闭变即时，
  请检查该延时是否仍需保留（若存在，可选择性把 `EXIT_MS` 设为 0，但**属可选优化，非本计划必做**）。
- 输入框自动聚焦、Esc 关闭、方向键导航**一律不动**（那是功能，不是动效）。
- **reduced-motion 块**（L231）现为 `.aurora-command-overlay, .aurora-command { animation: none }`。
  去动画后该块对这两条选择器已无意义，但**保留无害**（防御性）；若清理，确保不误删同块其它选择器。

### 复核命令（改动前必跑）
```bash
grep -rn "aurora-command-in\|aurora-command-overlay-in" src
grep -rn "animation" src/aurora/styles/command-palette.css
```

---

## 3. 验证

### 3.1 静态 + 单测
```bash
node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
node node_modules/vitest/vitest.mjs run src/aurora
```

### 3.2 真机 feel-check（本计划的**核心**验证）
1. dev server 5174，打开编辑器
2. 按 `⌘K` / `Ctrl+K` 反复开合 **10 次**
3. **预期（改后）**：面板**瞬时**出现与消失，无位移、无缩放、无淡入
4. **对比感受**：这是主观但决定性的判断——应感觉「更利落、无延迟」
5. 录屏慢放（0.25×）确认无任何过渡残留
6. 复核：搜索输入、方向键选择、Enter 执行、Esc 关闭**全部正常**

### 3.3 全量回归
```bash
node node_modules/vitest/vitest.mjs run
```
**通过标准**：`848 passed / 3 failed / 2 skipped`，失败项名称不变。

### 3.4 决策回退点
若用户看完后**主观上更想要一点出现感**，可回退为**极弱版本**（这是备选，非默认）：
```css
/* 备选（仅在用户要求时）：120ms 纯 opacity，无位移无缩放 */
.aurora-command { animation: aurora-command-in 120ms linear; }
@keyframes aurora-command-in { from { opacity: 0 } to { opacity: 1 } }
```
但**默认交付是零动画**——先按 AUDIT 规范做，把选择权留给用户。

---

## 4. 硬性范围边界

- ✅ 允许改：`src/aurora/styles/command-palette.css`
- ❌ 禁止改：命令面板的 TSX 逻辑（焦点、键盘、搜索、过滤）、reduced-motion 块内其它选择器
- ❌ 禁止顺手给别的组件加减动画

---

## 5. 完成定义（DoD）

- [x] `aurora-command-in` 与 `aurora-command-overlay-in` 动画移除（关键帧亦删）
- [x] 无残留消费者引用（grep 干净；仅历史设计文档 `src/aurora/docs/design/` 有记录，非代码）
- [x] ⌘K 开合瞬时，慢放无过渡（CDP 断言 + 截图佐证）
- [x] 面板全部功能正常（输入/导航/执行/Esc；CDP A9 覆盖 Esc 关闭与重开）
- [x] 全量回归无新增失败（906/3/2，3 项为预存失败）
- [x] 记忆追加一条（含「100+/天 键盘交互去动画 = 正解」的决策依据）

---

## 6. 执行记录（2026-09-14）

**实际落盘**（`src/aurora/styles/command-palette.css`）：
1. `.aurora-command-overlay` 删除 `animation: aurora-command-overlay-in 180ms ease-out;` → 替换为决策注释
2. 删除 `@keyframes aurora-command-overlay-in`
3. `.aurora-command` 删除 `animation: aurora-command-in 200ms cubic-bezier(0.16, 1, 0.3, 1);` → 替换为决策注释
4. 删除 `@keyframes aurora-command-in`
5. reduced-motion 块**保留**，补注释说明「防御性保留」——面板已无入场动画，本块对这两个选择器无实际作用，但防未来加回动画时漏掉可达性处理

**新增契约测试** `src/aurora/styles/commandPaletteNoAnim.test.ts`（11 例）：

> 关键技巧：断言「无某声明」时**必须在剥离注释的文本上判断**——
> `css.replace(/\/\*[\s\S]*?\*\//g, '')`。否则注释里「原为 200ms」这类说明文字会造成假失败（PLAN-02 已踩过此坑）。
> 「全仓无残留消费者」断言须排除 `docs/design`、`.test.ts*`、以及测试自身文件。

**CDP 验证要点**：
- ⌘K 由 `Input.dispatchKeyEvent`（modifiers:4 = Meta）真事件派发
- A8「时间切片一致性」= 打开后立即采样 vs 250ms 后采样，两者**逐字段完全相等**，证明无渐进到位过程
- ⚠️ B1 曾误判：`max-height:70vh` 的 computed 值是**已解析像素**（70% × 视口高），非字面 `'70vh'`。
  断言须接受「≈ 视口高 × 0.7」，不能字面比较。修正后 11/11。

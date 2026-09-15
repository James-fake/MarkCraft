# DESIGNBRIEF · 知识库详细界面顶部间距重设计（01）

- 日期：2026-09-15
- 触发：用户截图报障「将知识库详细界面，重新设计，现在界面左上角的文字太贴近上方」
- 范围：`src/aurora/panels/kb/KbPanel.tsx` + `src/aurora/styles/panels/kb.css`
- 取证方式：Edge CDP @9446，1245×626 @DPR2，几何直读（非目测）

---

## 1. 事实先行：先把「左上角的文字」定位到具体元素

用户截图经过与真机并排比对后确认：**截图裁掉了 TitleBar(42px) 与左侧栏(60px)**，
画面顶部露出的就是 `.aurora-kb-subbar`。因此用户口中的「左上角的文字」有两个候选，
两边都做了几何测量：

| 候选 | 元素 | 修复前实测 | 判定 |
|---|---|---|---|
| A | `.aurora-kb-subbar__name`（知识库名「888」） | 距栏顶 **13px**（栏高 46px） | 偏紧：返回按钮 28px 在栏内上下仅 9px |
| B | 依赖 Tab 引导标题「依赖分析 · …」 | 距 subbar 下沿 **4px** | **缺陷**：几乎贴住栏下沿 |

**B 是硬缺陷。** 根因：

```
.aurora-kb-notes        { padding: 2px 6px 8px; }   ← 顶内边距只有 2px
.aurora-kb-notes__head  { padding: 12px 6px 10px; } ← 笔记 Tab 自带，2 + 12 = 14px 才完整
```

2px 是**为「自带 `__head` 的笔记 Tab」设计的**。依赖 Tab 复用了同一个容器，
但**没有 head** —— 它把 `.aurora-kb-card__title` + 内联 `style={{marginBottom:12}}`
直接塞进容器，于是标题顶在容器上沿，**只距 subbar 下沿 4px**。

---

## 2. 全 Tab 顶部间距审计（修复前 → 修复后）

用 `Range.getClientRects()` 测**文字实际绘制框**（不是元素边框盒 —— 否则元素自身的
padding-top 会被算进 top，出现「加了 padding 却仍显示贴顶」的假阴性）。

| Tab | 首行文字 | 修复前 | 修复后 | 状态 |
|---|---|---|---|---|
| 概览 | 笔记文件（KPI 卡标题） | 28px | 28px | 正常 |
| 笔记 | 库内笔记 | 20px | 20px | 正常 |
| 搜索 | 文本 | 24px | 24px | 正常 |
| 问答 | 知识库问答 | 16px | 16px | 正常 |
| **依赖** | **依赖分析 · 选择文件…** | **4px** | **16px** | **已修复** |
| MOC | MOC 目录索引 | 18px | 18px | 正常 |
| 导出 | 导出知识库 | 61px | 61px | 正常 |

修复后全部 Tab 收敛到 **16–28px** 同一节奏，无贴顶项。

---

## 3. 改动内容

### 3.1 依赖 Tab 引导标题：独立承载自己的留白

`kb.css`（新增）—— 消除内联样式，间距归 CSS 单源：

```css
.aurora-kb-notes__lead {
  padding: 12px 6px 0;          /* 容器 2px + 本类 12px = 14px，与笔记 Tab 头部同节奏 */
  margin-bottom: 10px;
  font-size: var(--mc-font-base);
  font-weight: 600;
  color: var(--mc-text-primary);
  letter-spacing: 0.01em;
}
```

`KbPanel.tsx` —— 依赖 Tab 标题由 `aurora-kb-card__title` + 内联 margin
改为 `aurora-kb-notes__lead`。

### 3.2 subbar：给左侧标题组补呼吸

| 属性 | 修复前 | 修复后 | 理由 |
|---|---|---|---|
| `height` | 46px | **52px** | 知识库名距栏顶 13 → 16px |
| `padding` | `0 12px` | `0 14px` | 与 4px 栅格倍数一致 |
| `gap`（栏内三组） | 12px | 14px | 同上 |
| `__left` gap | 8px | 10px | 返回按钮与库名不再挤 |
| `__title` gap | 8px | 10px | 库名与健康度徽章不再挤 |

52px 仍属紧凑桌面密度（VS Code 顶栏 35px + 标签栏 35px 相若）。
该栏承载「返回 + 库名 + 徽章 + 7 个功能 Tab + 3 个操作按钮」，信息量远超普通工具栏，
略高于其他面板的 46px 是合理的；**是否回填到博客/白板等其他面板待用户决定**。

---

## 4. 验证

- **真机 CDP@9446**：注入 override CSS 精确还原旧值拍 before、移除后拍 after，
  状态完全一致可比（源文件零改动）。

| 指标 | 修复前 | 修复后 |
|---|---|---|
| subbar 高度 | 46px | **52px** |
| 知识库名距栏顶 | 13px | **16px** |
| 依赖标题距栏下沿 | 4px | **16px** |

- **契约测试**：`src/aurora/panels/kb/kbTopSpacing.test.ts`（8 例，全绿），
  锁死 `__lead` 的存在性 / 三值 padding ≥12px / section header 视觉 /
  subbar ≥52px / 栅格 14px / 组内 gap ≥10px，并顺带复核笔记 Tab 头部契约不回退。
- **全量**：1170 passed / 3 failed / 2 skipped，`tsc --noEmit` 干净。
  3 项失败为既有预存（`commandWiring` / `KbPanel.smoke` 的 `getByText('编辑')` 多元素 /
  `blogCssRefs` 汉化），与本次改动无关。

---

## 5. 遗留 / 后续可选

1. **其他面板是否同步 52px**：博客 `__subbar`、白板 `ctop` 仍为 46/42px。
2. **3 项预存测试失败**：每次跑全量都标红，尚未排查（与需求 N、本需求均无关）。
3. 若用户所指的「左上角文字」其实另有所指（非本文件定位的元素），
   本 Brief 的审计表可直接作为定位基线复用。

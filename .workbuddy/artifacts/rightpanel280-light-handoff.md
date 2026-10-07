# RightPanel280 · 亮色稿 Handoff 标注规范

> **文件来源**: Ardot `713799812498058`「MarkCraft · RightPanel280 内容组件稿」
> **状态**: 亮色三态（Expanded / Peek / Collapsed）已构建并截图复验通过
> **设计系统**: CalmPremium Light Token Set
> **交付日期**: 2026-08-12

---

## 一、组件概览

| 属性 | 值 |
|------|-----|
| 组件名 | RightPanel280 |
| 定位 | 编辑器右侧渐进披露侧栏 |
| 三态宽度 | Expanded **280px** / Peek **120px** / Collapsed **16px** |
| 默认态 | Expanded |
| 方向 | 从右边缘向左展开，固定于编辑器窗口右侧 |

### 渐进披露行为

```
Collapsed(16) ──hover/点击──▶ Peek(120) ──点击──▶ Expanded(280)
     ▲                                              │
     └──────────────── click elsewhere ◄────────────┘
```

- **Collapsed → Peek**: hover 或点击触发手柄区域
- **Peek → Expanded**: 点击内容区或显式展开按钮
- **Expanded → Collapsed**: 点击收起按钮、快捷键、或点击外部空白区

---

## 二、亮色 Token 映射表

### 2.1 表面与边框

| CSS 变量 | Hex | RGB Float | 用途 |
|----------|-----|-----------|------|
| `--mc-bg-panel` | `#FFFFFF` | `{r:1,g:1,b:1}` | 面板主背景 |
| `--mc-surface` | `#F3F4F6` | `{r:0.953,g:0.957,b:0.965}` | 次级表面（标题栏/工具条） |
| `--mc-border-subtle` | `#E5E7EC` | `{r:0.898,g:0.906,b:0.925}` | 面板外边框 / 分隔线 |
| `--mc-border-strong` | `#D1D5DB` | `{r:0.820,g:0.839,b:0.859}` | 强分隔线（如 section 间） |

### 2.2 文字层级

| CSS 变量 | Hex | RGB Float | 对比度 (vs #FFF) | 用途 |
|----------|-----|-----------|-------------------|------|
| `--mc-text-primary` | `#18191C` | `{r:0.094,g:0.098,b:0.110}` | **16.3:1** ✅ WCAG AAA | 标题 / 选中项 / 重要文字 |
| `--mc-text-secondary` | `#6B7280` | `{r:0.420,g:0.447,b:0.502}` | **4.6:1** ✅ WCAG AA | 正文 / 列表项 / 描述 |
| `--mc-text-tertiary` | `#9CA3AF` | `{r:0.612,g:0.639,b:0.686}` | **2.9:1** ⚠️ 仅大字可用 | 占位符 / 禁用提示 / 元信息 |

> **注意**: `--mc-text-tertiary` 在白底上对比度仅 2.9:1，**禁止用于正文**（需 ≥4.5:1）。仅允许用于 ≥18px 的辅助标签或配合图标使用。

### 2.3 语义色

| CSS 变量 | Hex | RGB Float | 用途 |
|----------|-----|-----------|------|
| `--mc-accent` | `#5B7CFA` | `{r:0.357,g:0.486,b:0.980}` | 主操作 / 选中态 / 链接 / 强调 |
| `--mc-accent-soft` | `rgba(91,124,250,0.10)` | opacity **0.10** | 选中行背景 / tag 底色 / hover 提示 |

> **暗 vs 亮 accent-soft 差异**: 暗色用 opacity **0.16**；亮色用 **0.10**（更浅，避免在白底上过重）。

---

## 三、尺寸与间距规范

### 3.1 外部尺寸

| 属性 | Expanded | Peek | Collapsed |
|------|----------|------|-----------|
| 宽度 | **280px** | **120px** | **16px** |
| 高度 | `fill_container`（填满编辑器内容区） | 同左 | 同左 |
| 圆角 | 左上/左下 **8px**（贴右侧无圆角） | 同左 | **8px** 全角 |
| 边框 | 左 1px `--mc-border-subtle` | 同左 | 无（纯色块） |
| 阴影 | `-2px 0 8px rgba(0,0,0,0.06)` | 无 | 无 |

### 3.2 内部间距（Expanded 态）

```
┌──────────────────────────────┐ ← padding-top: 16px
│  大纲 / 反链 / 标签    [−]   │ ← header h: 40, gap: 12
│──────────────────────────────│ ← divider (1px border)
│                              │
│  padding-left: 16px          │
│  padding-right: 16px         │
│                              │
│  § 1. 章节一          14px   │ ← item h: 32, gap: 4
│  § 2. 章节二                 │
│  § 2.1 子章节                │
│                              │
│  ── 反链 ──                  │ ← section header
│  ↗ 笔记A                     │ ← link item
│  ↗ 笔记B                     │
│                              │
│  ── 标签 ──                  │
│  [设计]  [笔记]              │ ← chip: h22 r11, gap: 8
│                              │
│  padding-bottom: 16px        │
└──────────────────────────────┘
```

**间距 token 映射**:

| 区域 | 值 | Token 引用 |
|------|-----|-----------|
| 面板内边距（上下左右） | **16px** | `--mc-space-md` |
| Section 间垂直间距 | **20px** | `--mc-space-lg` |
| Section Header 与内容间距 | **12px** | `--mc-space-sm` |
| 列表项高度 | **32px** | 自定义 |
| 列表项间距 | **4px** | `--mc-space-xs` |
| Tag Chip 间距 | **8px** | `--mc-space-sm` |
| Header 高度 | **40px** | 自定义 |
| 图标尺寸 | **16px** | `--mc-icon-size` |

---

## 四、字体规范

| 元素 | 字号 | 字重 | 行高 | 字族 | 颜色变量 |
|------|------|------|------|------|---------|
| Panel Header（大纲/反链/标签） | **11px** | **600** (Semi Bold) | 1.4 | Inter | `--mc-text-primary` |
| Outline H1（一级标题） | **13px** | **600** | 1.4 | Inter | `--mc-text-primary` |
| Outline H2/H3（二级/三级） | **12px** | **400** | 1.5 | Inter | `--mc-text-secondary` |
| Backlink 条目 | **12px** | **400** | 1.5 | Inter | `--mc-text-secondary` |
| Tag Chip 文字 | **10px** | **500** (Medium) | 1.2 | Inter | `--mc-accent` |
| 收起/展开图标 | **14px** | — | — | Icon (SVG) | `--mc-text-tertiary` / `--mc-accent`(active) |

---

## 五、子组件详细规格

### 5.1 大纲列表 (Outline)

```
结构: <ul> → <li>
每项:
  ├─ 缩进指示器: 2px × (level) 左缩进
  ├─ 折叠箭头: ▸ / ▾ (14px SVG icon), color --mc-text-tertiary
  ├─ 文本: level-dependent font size/weight (见上方表格)
  └─ hover: background --mc-accent-soft (opacity 0.10), radius 6px
```

**层级规则**:
- H1: 缩进 0, 字号 13px SemiBold
- H2: 缩进 16px, 字号 12px Regular
- H3: 缩进 32px, 字号 11px Regular (color tertiary)
- 最大支持 6 级，H4+ 缩进继续递增 16px/级

### 5.2 反链面板 (Backlinks)

```
Header: "反链 (N)" — N 为引用数, 11px SemiBold, color primary
列表: 每项一行
  ├─ 链接图标 ↗ (14px), color accent
  ├─ 笔记标题 (12px), color secondary, max-width 超出省略…
  └─ hover: title 变 primary + 下划线
空态: "暂无反向链接" 12px tertiary, 居中, padding-y 24px
```

### 5.3 标签 Chips (Tags)

```
容器: flex-wrap, gap: 8px
Chip 单个:
  ├── 尺寸: height 22px, padding-x 10px
  ├── 圆角: 11px (全圆角 pill)
  ├── 背景: --mc-accent-soft (opacity 0.10)
  ├── 边框: 1px solid --mc-accent (opacity 0.30)
  ├── 文字: 10px Medium, color --mc-accent
  └── hover: background opacity 升至 0.16, border opacity 0.60
  └── 可删除: × 图标 10px, margin-left 4px, hover 显现
```

### 5.4 收起手柄 (Collapse Handle)

```
位置: 面板左边缘, width 16px (Collapsed 时为全宽)
视觉:
  - Expanded: 左边缘竖线 2px accent + 小三角 ◂ (指向左)
  - Peek: 显示简化图标/首字
  - Collapsed: 三个小点 ⋮ 或竖排图标, 居中
交互:
  - hover: 手柄背景 accent-soft
  - tooltip: "收起侧栏" / "展开侧栏"
```

---

## 六、状态矩阵

### 6.1 三态切换

| 当前态 | 触发动作 | 目标态 | 动画时长 |
|--------|---------|--------|---------|
| Expanded | 点击 − 按钮 / ESC | Collapsed | 200ms ease-out |
| Expanded | hover 左边缘 (300ms) | Peek | 150ms ease |
| Peek | click 内容区 | Expanded | 200ms ease-out |
| Peek | mouse leave (500ms) | Collapsed | 200ms ease-in |
| Collapsed | hover / click 手柄 | Peek / Expanded | 150ms ease |

### 6.2 交互态（Expanded 内元素）

| 元素 | Default | Hover | Active/Focus | Disabled |
|------|---------|-------|-------------|----------|
| 列表项文字 | secondary | **primary** + accent-soft bg | 同 hover + outline 2px accent | tertiary, opacity 0.5 |
| Chip | accent text + accent-soft bg | bg opacity ↑ 0.16 | 同 hover | opacity 0.4 |
| 折叠箭头 | tertiary | **primary** | — | — |
| Header − 按钮 | tertiary | primary | — | — |

---

## 七、响应式与边界条件

| 条件 | 行为 |
|------|------|
| 窗口宽 ≤ 900px | 自动 Collapsed；进入移动端抽屉模式（非本组件职责） |
| 面板内内容溢出 | 内部 scroll (overflow-y: auto)，scrollbar 使用 `--mc-scrollbar-*` token |
| 零大纲/零反链/零标签 | 显示对应 EmptyState（tertiary 文字 + 插图） |
| 高 DPI (2x/3x) | 所有 px 值按 devicePixelRatio 缩放；border-radius 和 font-size 不变 |

---

## 八、CSS / Tailwind 实现要点

```css
/* 亮色面板根 */
.right-panel {
  width: 280px;
  background-color: var(--mc-bg-panel);        /* #FFFFFF */
  border-left: 1px solid var(--mc-border-subtle); /* #E5E7EC */
  border-radius: 8px 0 0 8px;
  display: flex;
  flex-direction: column;
  transition: width 200ms ease-out;
}

/* 亮色特有：阴影仅在亮色需要（暗色靠自然融合） */
.right-panel--light {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.06);
}

/* accent-soft 亮色更浅 */
.tag-chip {
  background-color: rgba(91, 124, 250, 0.10);  /* 亮色 opacity 0.10 */
  border: 1px solid rgba(91, 124, 250, 0.30);
}
/* 暗色同组件: rgba(91, 124, 250, 0.16) */

/* Peek 态 */
.right-panel--peek { width: 120px; }
/* Collapsed 态 */
.right-panel--collapsed { width: 16px; }
```

```tsx
// Tailwind utility 映射（亮色）
<div className="w-[280px] bg-white border-l border-[#E5E7EC] rounded-l-lg">
  {/* Header */}
  <div className="h-10 px-4 flex items-center justify-between">
    <span className="text-[11px] font-semibold text-[#18191C]">
      大纲 / 反链 / 标签
    </span>
    <button className="text-[#9CA3AF] hover:text-[#18191C]">−</button>
  </div>

  {/* Tags */}
  <div className="flex flex-wrap gap-2 px-4 pb-4">
    {tags.map(t => (
      <span key={t} className="h-[22px] px-2.5 rounded-full text-[10px]
        font-medium bg-[rgba(91,124,250,0.10)] text-[#5B7CFA]
        border border-[rgba(91,124,250,0.30)]">
        {t}
      </span>
    ))}
  </div>
</div>
```

---

## 九、画布节点对照表

| Ardot 节点 ID | 名称 | 主题 | 状态 |
|--------------|------|------|------|
| `3:1` | Expanded | Dark | ✅ 已验证 |
| `3:63` | Peek | Dark | ✅ 已验证 |
| `3:79` | Collapsed | Dark | ✅ 已验证 |
| `3:84` | Expanded-Light | **Light** | ✅ 已验证 |
| `3:146` | Peek-Light | **Light** | ✅ 已验证 |
| `3:162` | Collapsed-Light | **Light** | ✅ 已验证 |

---

*文档由 UI Designer 产出，供开发团队还原实现。如有尺寸/颜色疑问，以 Ardot 画布节点为准。*

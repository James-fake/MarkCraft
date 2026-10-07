# ⌘K 命令面板 · 接线规范（Handoff Spec）

> **UI Designer 交付 · 设计侧接线规范 v1.0**
> 本文档是 #81「接线 ⌘K 与集成到 App」的设计侧交付物，描述 runtime 接线点与集成契约。
> **不包含实现代码**——由开发团队基于本规范在 `src/` 中落地。

---

## 1. 触发入口

| 入口 | 快捷键 | 行为 |
|------|--------|------|
| 全局唤起 | `⌘K` (Mac) / `Ctrl+K` (Win) | 打开命令面板浮层，聚焦搜索框 |
| 关闭 | `Esc` | 关闭面板，恢复焦点到之前活动元素 |

**实现位置**：`useKeyboardShortcuts.ts` 或等效 keymap 模块。新增 `⌘K` 分支 → dispatch `OPEN_CMDK_PALETTE` action。

## 2. 面板组件契约

### 2.1 组件接口

```typescript
// 设计稿画布: 713806770627345
interface CmdkPaletteProps {
  open: boolean;           // 受控显隐
  onClose: () => void;     // Esc / 点击 backdrop 时回调
  onSelect?: (item: CommandItem) => void; // 选中条目时回调
}
```

### 2.2 层级与定位

- **z-index**: 必须高于所有内容面板（建议 `z-index: 1000`）
- **定位**: viewport 居中偏上（设计稿坐标 x:120 y:88 in 800×640 canvas）
- **尺寸**: 宽度 `560px`（max-width），高度自适应最大 `520px`
- **backdrop**: 半透明遮罩 `rgba(14,15,23,0.55)` 覆盖全视口

### 2.3 Token 映射

| 设计元素 | CSS 变量 | 值 |
|----------|---------|-----|
| 面板背景 | `--mc-bg-elevated` | `#1A1C24` |
| 面板边框 | `--mc-border-subtle` | `#292E30` |
| 搜索图标 | `--mc-text-secondary` | `#8A8F9C` |
| 占位文字 | `--mc-text-secondary` | `#8A8F9C` |
| ESC badge 边框 | `--mc-border-subtle` | `#292E30` |
| ESC 文字 | `--mc-text-tertiary` | `#5A5F6B` |
| 分类标题 | `--mc-text-tertiary` | `#5A5F6B` |
| 命令行文字(默认) | `--mc-text-primary` | `#E6E8EF` |
| 命令行提示文字 | `--mc-text-secondary` | `#8A8F9C` |
| 选中行背景 | `--mc-accent-soft` | `rgba(91,124,250,0.16)` |
| 选中行文字/图标 | `--mc-accent` | `#5B7CFA` |
| 圆角 | `--mc-radius-lg` | `12px` |

## 3. 命令清单（设计稿完整条目）

### 3.1 最近使用区（动态）

展示最近打开/编辑的笔记（最多 4 条）。每行格式：
```
[图标] 笔记标题                    [类型标签]
```
- 图标：`✎`（笔记）/ 其他按类型区分
- 类型标签：`笔记` / `白板` / `图谱` 等

### 3.2 全量命令清单（静态）

| # | 图标 | 命令名 | 快捷键 | 分类 |
|---|------|--------|--------|------|
| 1 | ＋ | 新建笔记 | `⌘N` | 文件 |
| 2 | ▤ | 打开编辑器 | `⌘1` | 导航 |
| 3 | ◫ | 打开白板 | `⌘2` | 导航 |
| 4 | ⬡ | 打开知识图谱 | `⌘3` | 导航 |
| 5 | ✶ | 打开博客工作室 | `⌘4` | 导航 |
| 6 | ▦ | 打开仪表盘 | `⌘5` | 导航 |
| 7 | ◐ | 切换主题（暗/亮） | — | 视图 |
| 8 | ⚙ | 打开设置 | `⌘,` | 设置 |

> 注：图标列使用 unicode 占位符；代码侧替换为 `Icon.tsx(name)` 矢量图标。

### 3.3 键盘导航

| 按键 | 行为 |
|------|------|
| `↑` / `↓` | 在列表中移动高亮行 |
| `Enter` | 执行当前高亮命令 |
| `Esc` | 关闭面板 |
| 字符输入 | 过滤命令列表（模糊匹配） |

## 4. App.tsx 集成要点

### 4.1 组件树位置

```
<App>
  <TitleBar editorMode={viewState.mode} />
  <Spine56 currentMode={viewState.mode} onModeChange={...} />
  <MainContent>
    {/* 现有编辑器/白板/图谱内容 */}
  </MainContent>
  <RightPanel280 state={rightPanelState} />
  <Dock44 />
  <CmdkPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />  ← 新增
</App>
```

### 4.2 状态管理

```typescript
// 新增状态（建议提升至 App 级或 context）
const [cmdkOpen, setCmdkOpen] = useState(false);

// 全局快捷键监听
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdkOpen(prev => !prev); // toggle
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### 4.3 与现有模块的去重

| 现有功能 | 处理方式 |
|----------|----------|
| 全局搜索 (`useGlobalSearch`) | ⌘K 搜索框输入时复用同一搜索逻辑；选中搜索结果行时跳转 |
| 浮层反链面板 (`BlockBacklinksPanel`) | 不冲突：反链是右栏常驻内容；⌘K 是临时模态 |
| TitleBar 的 editorMode | ⌘K 中「切换模式」命令调用同一 `setViewMode()` |

## 5. Tailwind token 补充

在 `tailwind.config.js` 的 `theme.extend` 中确认以下已接入（DESIGN.md §12）：

```js
colors: {
  'mc-accent': 'var(--mc-accent)',
  'mc-bg-app': 'var(--mc-bg-app)',
  'mc-bg-panel': 'var(--mc-bg-panel)',
  'mc-bg-elevated': 'var(--mc-bg-elevated)',
  'mc-border-subtle': 'var(--mc-border-subtle)',
  'mc-text-primary': 'var(--mc-text-primary)',
  'mc-text-secondary': 'var(--mc-text-secondary)',
  'mc-text-tertiary': 'var(--mc-text-tertiary)',
},
```

如尚未添加，需在本次接线中一并补入。

## 6. 无障碍要求

- `role="dialog"` + `aria-modal="true"` + `aria-label="命令面板"`
- 首次打开时自动 focus 搜索输入框
- 关闭时恢复焦点到触发前的元素（focus trap）
- 列表项使用 `role="option"` + `aria-selected`
- 底部键盘提示对屏幕阅读器可见（`aria-live="polite"`）

## 7. 设计稿对照

| 元素 | 画布节点 ID | 文件 URL |
|------|-----------|----------|
| ⌘K 命令面板完整稿 | `3:2` | `https://ardot.tencent.com/file/713806770627345` |
| 交互态规范（按钮/输入框/标签） | `3:55` | 同上 |
| 编辑器视图（含 Spine/Dock/RightPanel） | `3:1` | `https://ardot.tencent.com/file/713811592011949` |
| RightPanel280 三态×双主题 | `3:1` / `3:84` | `https://ardot.tencent.com/file/713799812498058` |

---

**UI Designer** · ⌘K 接线规范 v1.0
**状态**：设计侧交付完成，待开发团队实施

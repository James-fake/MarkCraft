# 日记功能优化实施概览（2026-08-29）

> 依据：`Markcraft-日记功能优化实施计划方案-2026-08-29.md`
> 范围铁律：仅改 `src/aurora/panels/diary/*` + `diary.css`；真实 `src/features/diary/**` 未触碰；缺失派生函数加至 `diaryData.ts`（D4 单一数据源）。

## 已落地（13 项 / 14，3.12 保存态按方案 MVP 乐观保持）

### Phase 1 · 导航/回顾能力（P1 ×5）
| 项 | 落点 | 行为 |
|---|---|---|
| 1.5 年份硬范围 | `DiaryPanel.tsx:195` | 年份滚轮固定 `1970~今年`，可为任意历史年份写日记 |
| 1.3 随机回顾 | `DiaryPanel.tsx` 日期导航 footer | 🎲 按钮随机跳任一篇历史日记，无数据禁用 |
| 1.4 那年今日弹层 | `DiaryPanel.tsx` + `diary.css` | 「查看全部 N 条」→ 弹层列出 `onThisDayList` 全部同日日记，点选直达 |
| 1.1 整月日历总览 | **`DiaryCalendar.tsx`（新）** | 月历网格（周一起始）、有日记小圆点、上/下月切换、roving tabindex 键盘导航（方向键/Enter/Esc）；📅 按钮打开 |
| 1.2 情绪筛选 | `DiaryPanel.tsx` + `diary.css` | 情绪图例可点击切换 `is-active`；热力图非匹配日 dim；右侧摘要「筛选·类别·共 N 天」+ 清除 |

### Phase 2 · 降级修复（P2 ×4）
| 项 | 落点 | 行为 |
|---|---|---|
| 2.3 KPI 补 2 项 | `DiaryPanel.tsx` KPI 条 | 新增「总日记 · 篇」「最长连续 · 天」（`computeLongestStreak` 派生） |
| 2.7 每日一问随机+记忆 | `DiaryPanel.tsx` + `diaryData.ts` | `pickPromptIdx` 排除上一条随机；`loadPromptIdx/savePromptIdx`（localStorage）跨会话记忆 |
| 2.1 标签跳转 | `DiaryPanel.tsx` + `diaryData.ts` | 标签条 `is-clickable` → `focusTagAurora` 定位最近含该标签日记 |
| 2.9 复盘归类 | `DiaryPanel.tsx` | `ensureReviewFolder` 找/建「日记/复盘」子目录，复盘文件落该目录（不再污染根目录） |

### Phase 3 · 打磨（P3 ×4/5）
- 3.11 范围标注：情绪分布标题加「· 本周/本月/本年」
- 3.10 热力图溢出：`.dv-col-center{overflow:auto}` + `.dv-heatmap{overflow-x:auto}`
- 3.13 状态栏冗余：移除与 KPI 重复的「X 天连续」
- 3.14 键盘导航：随 1.1 实现（月历可访问性）
- 3.12 保存态：按方案 MVP 保持乐观计时（非阻断）

## 关键工程决策
- **派生函数统一下沉 `diaryData.ts`**（D4）：`entriesByMoodCat` / `focusTagAurora` / `pickPromptIdx`+记忆 / `computeLongestStreak`，全部 `import` 真实 `DiaryView`/`diaryDateUtils`/`diaryMoods`，不平行重定义、不改真实文件。
- **三栏布局不变**：筛选/标签跳转以「热力图高亮+计数+直达」实现，未引入独立列表面板。
- **图标修正**：`Icon.flame` 在 `src/aurora/icons` 无导出，连续类图标改用已存在的 `Icon.chart`（KPI 第6项）。

## 验证
- `tsc --noEmit`：**0 错误**
- `vitest run DiaryPanel.smoke`：**5/5 通过**（新增「优化功能 UI 落点」用例覆盖浏览全部/范围标注/图例/KPI 新指标/随机回顾禁用；Dexie IndexedDB 缺失警告良性）

## 需手动确认（dev server 5174）
月历点选、情绪筛选高亮、随机回顾、那年今日多条、历史年份可达、标签跳转、每日一问随机且跨会话记忆、KPI 新指标、复盘落「日记/复盘」目录。

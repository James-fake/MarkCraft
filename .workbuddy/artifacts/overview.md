# MarkCraft 全盘架构分析（2026-08-27）

## 结论摘要
对 MarkCraft 全仓库（826 个 TS/TSX，21.6 万行）完成整合/解耦/审查前置扫描，报告见项目根目录 `Markcraft-全盘架构分析-2026-08-27.md`。

## 四大核心发现
1. **三入口并存**：index.html→Aurora（生产已接管）、showcase.html（演示）、main.tsx→LegacyApp（**死代码**，挂载点已不存在）
2. **Aurora 平行实现残留**：mock.ts 死代码可删；5 个孤儿 chrome 组件（EditorFormatToolbar/FloatingToolbar/SlashCommandPopup/GoToLineDialog/editorInspector）零引用；日记/KB/词数统计函数级重复
3. **3 对循环依赖**（均围绕 editor 枢纽）：editor↔toolbar、editor↔knowledgeBase、editor↔preview
4. **工程地基缺失**：无 git 仓库（最高优先级）；27 个 dist-* 备份 + 83 个杂散文件；测试不参与 tsc；coverage 仅覆盖 components/utils

## 关键数据
- 25 个 features 子系统；shared 被 9 子系统 67 次引用（最大枢纽）
- 巨型文件：blog/themes/newThemes.ts **22,751 行**、CanvasView.tsx 2,502、EditorLayout.tsx 1,063
- 质量：0 TODO、206 处 any、34 空 catch、92 个测试文件

## 建议执行顺序
P0 建仓+清理+删死代码 → P1 删孤儿组件+函数去重 → P1 破 3 环+shared 拆分 → P2 拆大文件+测试加固

---

# MarkCraft 整合实施方案（2026-08-27 晚）

方案文档：项目根目录 `Markcraft-整合实施方案-2026-08-27.md`。

## 阶段划分（5 个 Phase / 19 个任务 / 约 30 批次提交）
- **P0 地基**：git 建仓 + .gitignore（当前无）+ 固化验证基线（82 文件 757 测试）+ dist-*/杂散文件归档
- **P1 死代码**：删 main.tsx + LegacyApp.tsx + aurora/mock.ts + vite 临时产物
- **P2 平行整合**：删 5 个孤儿 chrome 组件（795 行）、countWords/getKbGradient/日记工具去重、命令面板收敛为 Aurora UI（features 原生 CommandPalette 仅被 LegacyApp 引用，可退役）、Toast/Confirm 统一
- **P3 破环**：EmojiPicker 下沉 shared（editor↔toolbar）、EditorLayout kb 状态改注入（editor↔kb）、scrollPositionManager 下沉 services（preview→editor）、ShortcutManager 下沉（toolbar→settings×5）、shared 分 utils/ui/storage 子目录
- **P4 质量**：newThemes.ts(22.7K 行)拆分、CanvasView/EditorLayout/Sidebar 拆分、tsconfig.test.json 纳测试入 tsc、coverage 扩大、any 减半、eslint 清零

## 核心机制
- 每批一个 git commit（可单批 revert）；每批出口 = tsc + vitest(757) + build 三件套
- 破坏性批次追加 CDP 冒烟（#view=editor/canvas/blog + Ctrl+K）
- 删除/迁移前 grep 证明零引用；归档不删除（archive/2026-08-27-before-refactor/）

---

# ✅ 实施完成（2026-08-27 23:00）

**11 个提交 / P0-P4 全部落地 / 零回归**（详见方案文档「实施记录」节）

| 验证 | 结果 |
|---|---|
| tsc | 0 错误 |
| vitest | 786 passed（3 预存 jsdom 失败同基线） |
| build | 成功 1m32s |
| dev | HTTP 200，Aurora 入口正常 |

**核心成果**：git 建仓；删死代码（main/LegacyApp/mock/5 孤儿组件/features CommandPalette）；3 对循环依赖全部破除（EmojiPicker/HighlightMark/scrollPositionManager/ShortcutManager 下沉，useKbStore/kbStore/kbTypes 归位 stores）；shared 分 utils/ui/storage；函数级去重（countWords/getKbGradient/日记工具）。

**遗留（按「不报错」底线暂缓）**：51 处测试类型债（tsconfig.test.json 已就位）、大文件拆分、any/eslint 清零。

# 21 · 白板对话框与功能菜单规范

> 对应 `panels/canvas/CanvasContextMenu.tsx`、`CanvasListMenu.tsx`、`ShareDialog.tsx`（命令面板见 `07`）。

## 1. 右键菜单（CanvasContextMenu）

Portal 到 body，`position:fixed`，子菜单边界翻转。两套菜单：

- **元素菜单**：剪切/复制/粘贴/删除 ─ 复制样式/粘贴样式 ─ 排列▸(置顶/上移/下移/置底) / 组合 / 取消组合 ─ 锁定/解锁 ─ 对齐▸(左/水平居中/右/顶/垂直居中/底) ─ 添加到收藏 ─ 重命名/存为模板
- **空白菜单**：粘贴/全选 ─ 插入▸(便签/矩形/圆形/文本/图片) ─ 背景设置.../网格显示 ─ 适应视图/缩放到100% ─ 导出▸(图片/PDF/SVG) ─ 演示模式/分享画布

> ⚠️ **绝大多数动作为 `toast` 桩**（复制/剪切/粘贴/样式/组合/全部对齐/层级/重命名/存为模板/全选/背景/网格/适应/100%/导出/演示/分享）。`addFavorite` 无论选中均提示"已添加到收藏"但不改 `favorites`；`lock/unlock` 均调 `toggleLock`（语义翻转）。
> ⚠️ 图标：`alignRight` 在 `icons.tsx` 不存在 → 右对齐误用 `alignCenterV`；"置底"用 `chevronDown` 与"上移一层" `chevronsUp` 不对称（应为 `chevronsDown`）；`diamond` 映射到 `target`。

## 2. 画布列表菜单（CanvasListMenu）

Modal：标题「我的画布」(`Icon.layout`) + 「新建画布」+ close；搜索框；4 项列表（渐变封面、名称 +「当前」标签、更新时间、`trash` 删除）；空态「没有匹配的画布」。

> **命名 / 重命名（2026-09-02 补）**：「新建画布」不再以默认名直接创建——点击后展开内联名称输入框（默认「未命名画布」，聚焦全选，Enter 确认 / Esc 取消），确认后把名称传给 `createCanvas(name)`；列表项操作区新增「重命名」(`Icon.edit`) 按钮，点击后名称就地变输入框，Enter/失焦提交，空名视为取消，调用 `renameCanvas(id, name)`。弹窗 overlay 改用 `.aurora-canvaslist__overlay` 垂直水平居中。

## 3. 分享对话框（ShareDialog）

3 Tab（默认 `link`）：
- **链接分享**：公开开关（默认 off）+ 只读链接 + 复制（1.5s 反馈）+ 硬编码"链接 7 天后过期" + 权限 Segment（可查看/可评论/可编辑）+ 过期时间 select + 密码保护开关 + 双密码输入。
- **协作成员**：邀请输入 + 按钮 + 3 名硬编码成员（头像/邮箱/角色/more）。
- **导出**：4 格式卡（PNG/PDF/SVG/.markcraft）；PNG/PDF 显示质量 1x/2x/3x（默认 2）+ 导出按钮。

> 上述所有提交/导出/邀请均为演示桩，不触发真实 IO。

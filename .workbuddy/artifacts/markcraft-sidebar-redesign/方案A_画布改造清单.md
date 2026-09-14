# 方案 A「图谱脊柱 Graph-Spine」画布改造清单（可执行）

> **设计者**：UI Designer ｜ **日期**：2026-08-10 ｜ **母板**：`713037613352052`「MarkCraft 桌面壳界面稿」
> **状态**：⏸ 待 Ardot MCP 工具恢复后执行。本清单为**执行蓝图**——工具一连通即可照 `batch_edit` 段落逐批跑。
> **前提**：当前会话 `mcp__ardot__*` 工具不可用，故本文件不含任何已落库改动，仅描述目标 ops。

---

## 0. 设计语言纪律（沿用 Calm Premium）

- 字体：标题 Inter SemiBold，正文 Inter Regular；大标题字距 `-2%`（已全局落地）。
- 图标：1.5px 线性描边 SVG，语义色（accent `#5B7CFA` / text-primary `#E6E8EF` / text-secondary `#8A8F9C`）。
- 令牌（Dark 值）：bg-canvas `#0E0F17` / bg-panel `#14161F` / bg-elevated `#1A1C24` / border-subtle `#292E30` / text-primary `#E6E8EF` / text-secondary `#8A8F9C` / accent `#5B7CFA`。
- 半径：面板 12px、卡片 8px、胶囊 999px（全圆）。

---

## 1. 新增 CalmPremium 变量（执行时 `apply_variables` / 变量集补充）

| 变量名 | 值（Dark） | 用途 |
|---|---|---|
| `spine-width` | `56` | 书脊宽 |
| `dock-height` | `44` | 底栏高 |
| `rightpanel-width` | `280` | 右栏宽 |
| `spine-bg` | `#14161F` | 书脊底（= bg-panel） |
| `spine-active-bar` | `#5B7CFA` | 激活态左 2px 指示条 |
| `dock-bg` | `#1A1C24` | 底栏底（= bg-elevated） |
| `rightpanel-bg` | `#14161F` | 右栏底 |

> Light 模式值由 `apply_variables` 切换时一并给出（bg-canvas→`#F7F8FA` 等，沿用既有映射）。

---

## 2. 每屏通用改造模板（4 个新 chrome 组件）

> 以下组件对 **全部 6 屏** 复用，仅 `parent` 与 `x/y` 随屏根坐标变化。
> 坐标约定：屏根尺寸约 `1440 × 902`（标题栏 36 + 主体 866）。屏根 ID：`5:215`(知识库) / `5:51`(仪表盘) / `5:180`(白板) / `5:1`(图谱) / `5:97`(日记) / `5:256`(博客)。

### 2.1 书脊 Spine（替换原 240px 左栏，宽 56）
```
I(<SCREEN_ROOT>, {type:"frame", name:"书脊", x:0, y:36, width:56, height:866,
   fills:[{type:"SOLID", color:{r:0x14,g:0x16,b:0x1F}}], cornerRadius:0})
```
书脊内子节点（相对书脊坐标）：
- 品牌 mark（书本 SVG，accent）`x:18,y:14,w:20,h:20`
- 编辑图标（铅笔，text-primary）`x:18,y:60,w:20,h:20`
- 白板图标（画布，text-primary）`x:18,y:96,w:20,h:20`
- 图谱图标（节点连线，accent + 左 2px accent 条）`x:18,y:132,w:20,h:20`
- 激活指示条（仅图谱态显示，`x:0,y:132,w:2,h:20` fill accent）

SVG 片段（1.5px 描边）：
- 书本：`M5 4H14V16H5V4Z` + `M5 4H9V16` 分册线，stroke accent
- 铅笔：`M4 16L5 13L13 5L15 7L7 15L4 16Z` stroke text-primary
- 画布：`M4 6H16V14H4Z` + `M4 10H16` stroke text-primary
- 图谱：`circle cx6 cy6 r2` + `circle cx14 cy14 r2` + `path M7.5 7.5L12.5 12.5` stroke accent

### 2.2 顶栏胶囊 Top Capsule（插入原标题栏中心）
```
I(<TITLEBAR>, {type:"frame", name:"模式胶囊", x:<centerX-180>, y:8, width:360, height:24,
   fills:[{type:"SOLID", color:{r:0x1A,g:0x1C,b:0x24}}], cornerRadius:999})
```
5 段文本（Inter 12px Medium，当前段 accent 文字）：编辑 · 白板 · 图谱 · 博客 · 仪表盘。
右端保留：`⌘K` 触发（胶囊右或标题栏右侧）+ 主题/密度图标。

### 2.3 右栏情境面板 Right Context Panel（右缘，≤280，默认折叠）
```
I(<SCREEN_ROOT>, {type:"frame", name:"右栏", x:1160, y:36, width:280, height:866,
   fills:[{type:"SOLID", color:{r:0x14,g:0x16,b:0x1F}}], cornerRadius:0})
```
三段（标题 13px SemiBold text-primary + 占位行 text-secondary 11px）：
- 反向链接 Backlinks（选中笔记才填充，默认空状态"暂无反向链接"）
- 大纲 Outline（提取标题层级）
- 文件树 File Tree（原左栏文件夹树迁移至此，可折叠）

### 2.4 底栏 Dock（居中，~240×44）
```
I(<SCREEN_ROOT>, {type:"frame", name:"底栏dock", x:600, y:850, width:240, height:44,
   fills:[{type:"SOLID", color:{r:0x1A,g:0x1C,b:0x24}}], cornerRadius:999})
```
3 枚图标（20×20，居中分布）：今日(日历) · ⌘K 搜索(放大镜) · 设置(齿轮)，均 text-primary。

---

## 3. 知识库屏 5:215（已知完整 ID，可直接执行）

**已知结构**：标题栏 `5:216` / 左栏 `5:222`(240×866) / 内容 `5:226`(1200×866) → 文件夹树 `5:227` / KbDashboard `5:232`。

**执行批次**（每批 ≤25 op）：

```
# 批次 1：拆左栏 + 内容左移 + 书脊
D(5:222)                                    # 删除 240px 旧左栏（含 5:227 文件夹树与空状态插画）
M(5:226, {x:56, width:1104})                # 内容左移并让出右侧 280 给右栏
I(5:215, {type:"frame", name:"书脊", x:0, y:36, width:56, height:866,
   fills:[{type:"SOLID", color:{r:0x14,g:0x16,b:0x1F}}]})
I(5:215, {type:"frame", name:"书脊-品牌", x:18, y:14, width:20, height:20,
   svg:"<svg ...><path d='M5 4H14V16H5V4Z' stroke='#5B7CFA' stroke-width='1.5'/><path d='M5 4H9V16' stroke='#5B7CFA' stroke-width='1.5'/></svg>"})
I(5:215, {type:"frame", name:"书脊-编辑", x:18, y:60, width:20, height:20,
   svg:"<svg ...><path d='M4 16L5 13L13 5L15 7L7 15L4 16Z' stroke='#E6E8EF' stroke-width='1.5' stroke-linejoin='round'/><path d='M12 6L14 8' stroke='#E6E8EF' stroke-width='1.5'/></svg>"})
I(5:215, {type:"frame", name:"书脊-白板", x:18, y:96, width:20, height:20,
   svg:"<svg ...><rect x='4' y='6' width='12' height='8' rx='1.5' stroke='#E6E8EF' stroke-width='1.5'/><path d='M4 10H16' stroke='#E6E8EF' stroke-width='1.5'/></svg>"})
I(5:215, {type:"frame", name:"书脊-图谱", x:18, y:132, width:20, height:20,
   svg:"<svg ...><circle cx='6' cy='6' r='2' stroke='#5B7CFA' stroke-width='1.5'/><circle cx='14' cy='14' r='2' stroke='#5B7CFA' stroke-width='1.5'/><path d='M7.5 7.5L12.5 12.5' stroke='#5B7CFA' stroke-width='1.5'/></svg>"})
I(5:215, {type:"frame", name:"书脊-激活条", x:0, y:132, width:2, height:20,
   fills:[{type:"SOLID", color:{r:0x5B,g:0x7C,b:0xFA}}]})

# 批次 2：右栏情境面板（迁移文件夹树语义）
I(5:215, {type:"frame", name:"右栏", x:1160, y:36, width:280, height:866,
   fills:[{type:"SOLID", color:{r:0x14,g:0x16,b:0x1F}}]})
I(5:215, {type:"text", name:"右栏-反向链接标题", x:1180, y:52, width:240, content:"反向链接", fontSize:13, fontWeight:"600", fill:"$:CalmPremium:text-primary", fontName:{family:"Inter", style:"SemiBold"}})
I(5:215, {type:"text", name:"右栏-反向链接空态", x:1180, y:76, width:240, content:"选中笔记后显示", fontSize:11, fontWeight:"400", fill:"$:CalmPremium:text-secondary", fontName:{family:"Inter", style:"Regular"}})
I(5:215, {type:"text", name:"右栏-大纲标题", x:1180, y:120, width:240, content:"大纲", fontSize:13, fontWeight:"600", fill:"$:CalmPremium:text-primary", fontName:{family:"Inter", style:"SemiBold"}})
I(5:215, {type:"text", name:"右栏-文件树标题", x:1180, y:300, width:240, content:"文件", fontSize:13, fontWeight:"600", fill:"$:CalmPremium:text-primary", fontName:{family:"Inter", style:"SemiBold"}})
I(5:215, {type:"text", name:"右栏-文件树占位", x:1180, y:324, width:240, content:"· 默认笔记本", fontSize:11, fontWeight:"400", fill:"$:CalmPremium:text-secondary", fontName:{family:"Inter", style:"Regular"}})

# 批次 3：底栏 dock + 顶栏胶囊
I(5:215, {type:"frame", name:"底栏dock", x:600, y:850, width:240, height:44,
   fills:[{type:"SOLID", color:{r:0x1A,g:0x1C,b:0x24}}], cornerRadius:999})
I(5:215, {type:"frame", name:"dock-今日", x:636, y:860, width:20, height:20,
   svg:"<svg ...><rect x='4' y='5' width='12' height='11' rx='1.5' stroke='#E6E8EF' stroke-width='1.5'/><path d='M4 9H16M9 5V16' stroke='#E6E8EF' stroke-width='1.5'/></svg>"})
I(5:215, {type:"frame", name:"dock-搜索", x:720, y:860, width:20, height:20,
   svg:"<svg ...><circle cx='9' cy='9' r='4.5' stroke='#E6E8EF' stroke-width='1.5'/><path d='M12.5 12.5L15 15' stroke='#E6E8EF' stroke-width='1.5' stroke-linecap='round'/></svg>"})
I(5:215, {type:"frame", name:"dock-设置", x:804, y:860, width:20, height:20,
   svg:"<svg ...><circle cx='10' cy='10' r='2.5' stroke='#E6E8EF' stroke-width='1.5'/><path d='M10 4V6M10 14V16M4 10H6M14 10H16M6 6L7.5 7.5M13 13L14.5 14.5M14 6L12.5 7.5M7.5 12.5L6 14' stroke='#E6E8EF' stroke-width='1.5' stroke-linecap='round'/></svg>"})
# 顶栏胶囊插入 5:216 中心（执行时读 5:216 取 x 中心）
I(5:216, {type:"frame", name:"模式胶囊", x:<read 5:216 centerX - 180>, y:8, width:360, height:24,
   fills:[{type:"SOLID", color:{r:0x1A,g:0x1C,b:0x24}}], cornerRadius:999})
```

---

## 4. 其余 5 屏（模板化，执行前需 `batch_read` 取各屏侧栏/标题栏/内容节点 ID）

| 屏 | 根 ID | 需读取确认的子节点 | 改造动作 |
|---|---|---|---|
| 仪表盘 | `5:51` | 标题栏、`42:1` 内左栏 | 同 §2 模板；右栏放"本周成长/快捷" |
| 白板 | `5:180` | 标题栏、`52:1` 工具栏所在左栏 | 书脊替换左栏；右栏放"选中元素属性" |
| 图谱 | `5:1` | 标题栏、`49:2` 洞察栏 | **升格为首页**：图谱占主区，右栏=洞察(49:2 迁入)，书脊图谱态激活 |
| 日记 | `5:97` | 标题栏、`46:1` 内左栏 | 同模板；右栏放"日记索引/日历" |
| 博客 | `5:256` | 标题栏、`54:1` 内左栏 | 同模板；右栏放"文章列表/发布状态" |

> 执行顺序建议：知识库(完整ID) → 图谱(首页升格) → 白板/仪表盘/日记/博客(模板)。
> 每个屏执行前先 `batch_read({parentId:<ROOT>, readDepth:3})` 确认标题栏/左栏/内容三件套的真实 ID，再套 §2 模板的 x/y。

---

## 5. 诚实边界（与既有精修一致）

- 书脊/胶囊/dock/右栏为**静态结构**，不承载 hover 高亮、点击切换、右栏渐进披露动画——这些属实现层（React）。画布只定规范与位置。
- SVG 图标写死语义色，不随主题切换（与全局线描图标一致）。
- 右栏"选中才浮现"的交互动效无法在画布表达，仅以"默认折叠+空态文案"示意。

---

## 6. 执行后 QA 清单

- [ ] 6 屏书脊宽度一致（56px）、激活指示条位置正确
- [ ] 顶栏胶囊 5 段文本居中、当前段 accent
- [ ] 右栏宽度 280、与内容区间无重叠（内容右缘 = 1160）
- [ ] 底栏 dock 居中（x≈600）、三图标等距
- [ ] 图谱屏 5:1 主区为图谱、右栏=洞察、书脊图谱态激活（首页语义）
- [ ] 各屏 `capture_screenshot` 截图，用户面板预览无溢出/错位
- [ ] CalmPremium 变量集新增 `spine-*`/`dock-*`/`rightpanel-*` 并 Light 模式同步

---

*UI Designer ｜ 本清单为方案 A 的执行蓝图，实际画布改动待 Ardot MCP 工具恢复后由 `batch_edit` 落地。*

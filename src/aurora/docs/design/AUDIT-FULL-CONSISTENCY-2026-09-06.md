# Markcraft · 全站穷尽式一致性审计（界面内容 + 设计样式）

- 日期：2026-09-06（第二轮，接续 R1–R6 与顶栏 tab 统一之后的全量复查）
- 范围：`src/aurora/panels/*`、`src/aurora/components/*`、`src/components/ui/*`、`src/aurora/styles/**/*.css` + `tokens.css`；features 层仅核对其被真实界面消费的 UI 面
- 方法：三分域并行穷扫（样式体系 / 内容文案 / 控件范式）→ 高危项逐一 grep 交叉抽查核验
- 判定符号：✅ 干净 ｜ ⚠️ 局部走样 ｜ ❌ 全局分裂

---

## 一、全站统一结论矩阵

| 维度 | 状态 | 一句话结论 |
|---|---|---|
| Token 色板（--mc-*） | ⚠️ | 禁粉/紫零残留；但 welcome 底色、editor 徽标、insight info 卡等少量近似值未走 token |
| 字号体系 | ✅ | 全站 token 化（仅 kb.css:389 一处 3.4px 标签例外） |
| 字重 | ✅ | 全站 400/500/600/700 档内，零越界 |
| 圆角体系 | ⚠️ | diary 大量字面 8px/12px；svg 端帽 2px 等微值未 token |
| 阴影 | ⚠️ | 多数走 --mc-shadow-*，但 blog/shell/canvas/editor 散落裸 box-shadow 数处 |
| 间距 | ⚠️ | 已知 G 遗留（10/14/18px 高频）未收敛，本轮新增少量 20/22px 面 |
| 动效 | ❌ | **29 处裸 120ms**（token 档 100/180/280/420 无 120）+ 小数秒裸值 + ease-out/linear 直写 |
| 主按钮范式 | ❌ | `.aurora-btn--primary`(实底 accent) vs `kb-btn--primary`(135° 渐变) vs EditorLayout 旧 vh-btn(缺省蓝 #3b82f6) |
| 危险按钮 | ❌ | 4 种形态：danger 实底 / kb ghost-soft / canvas csp 10% 淡彩 / features 红描边 |
| 分段控件 | ⚠️ | 顶栏 4 处已统一；其余子控件仍 4 种激活态（实底反白/下划线/旧淡彩/新凸起） |
| 弹窗 Modal | ⚠️ | 共享 Modal 已规范；diary dv-confirm、canvas share 为裸壳；宽度档位未全落地 |
| 输入框/列表密度 | ⚠️ | 输入框 26–36px 谱、icon 按钮 24–32px 谱、列表行 28–38px 谱，多离群 |
| 内容术语 | ❌ | 品牌名、白板/画布、版本号写法分裂（详见 P0-4） |
| 文案卫生 | ⚠️ | 添加/新建、清除/清空、省略号半角全角等偶发不一 |
| z-index / 死代码 | ⚠️ | 9999/9998/9000/2000 碰撞组；.aurora-segmented 等无消费死 CSS |

---

## 二、P0 —— 全局可见、需优先收口

### P0-1 主按钮体系分裂（真实 UI 三套并存）
| 体系 | 样式 | 位置 |
|---|---|---|
| 共享 Button | 实底 `--mc-accent`（权威） | `components.css:78` `.aurora-btn--primary` |
| KB 系（自造 20+ 处） | `linear-gradient(135deg, accent-hover→accent-pressed)` sheen 渐变 | `kb.css:465`；KbPanel.tsx:270/669/743/800、KbManagePanel 全量 |
| EditorLayout 系（真实编辑器模态） | `vh-btn-primary` 旧参数 + 缺省蓝 `#3b82f6`（是否命中 accent 取决于是否落在 `.aurora-editor` 的 `--button-primary` 桥接作用域内，editor.css:24；弹层经 portal 出作用域即回退蓝色） | `features/editor/versionHistory.css:199`；EditorPanel.tsx:874 真实挂载 |

**建议**：KB 面板改直接消费共享 `Button`（或让 `.aurora-kb-btn` 继承 `.aurora-btn` 基础参数，仅留宽高变体）；versionHistory.css 删除自造按钮体系改为 `.aurora-btn`。

### P0-2 危险操作按钮 4 形态
- 实底 danger：`components.css:128`、`editor.css:1004`（hover 误用 `--mc-danger-text`）、diary `dv-btn--danger`
- KB ghost-soft：`kb.css:135-136`
- canvas 淡彩 10%：`canvas.css:2089`
- features 红描边：`versionHistory.css:205` `#ef4444`
同一「删除」在知识库、白板、编辑器里长得完全不同。**建议**：统一「确认删除类=软危险（danger 描边/淡彩）+ 高危操作（清空回收站/删除库）才用实底」并在共享层定义唯一两档。

### P0-3 动效时长脱离 token 体系
29 处裸 `120ms`（components 3 处、canvas ≥5 处、shell/settings/editor/ui 等）+ 小数秒裸值（editor.css:847 0.24s / editor.css:1410 0.18s / diary.css:307 0.2s）。token 档位为 micro 100 / fast 180 / base 280 / slow 420，**无 120**——快速反馈类应归并 micro(100ms) 或 fast(180ms)。上轮 R6 只清了 `transition:all`，漏掉裸时长。**建议**：批量替换为 `var(--mc-dur-micro/fast)` + `var(--mc-ease-out)`。

### P0-4 内容术语/品牌分裂
| 项 | 冲突 | 位置 |
|---|---|---|
| 品牌名 | `Markcraft`(14 处，壳层/设置/状态栏) vs `MarkCraft`(欢迎页 179/188、Blog 默认站点描述 156；欢迎页自身 264 行又写 Markcraft，同屏矛盾) | TitleBar.tsx:27、PageFrame.tsx:100、WelcomePanel.tsx:179/188/264、BlogPanel.tsx:156、AboutSection.tsx:35 |
| 白板 vs 画布 | 导航/欢迎 tile/部分 toast「白板」(59) vs 面板 tab/列表/面包屑「画布」(116)；KbPanel 关联区同区块横跳（137 关联画布/876 关联白板/883 专属画布/889 未命名白板） | Sidebar、WelcomePanel.tsx:101、CanvasListMenu/CanvasInspectorPanel、KbPanel.tsx |
| 版本号 | `Aurora v2.0`（状态栏 2 处）vs `版本 2.0.0 (Aurora)` vs `v2.0.0 — Aurora` vs `Markcraft v2.0.0 · Aurora`（欢迎 264）四写法 | SettingsPanel.tsx:123、WelcomePanel.tsx:170/264、AboutSection.tsx:36/52 |

**建议**：品牌名/版本号改 4–6 处即可闭合（低风险）；「白板/画布」主术语需用户拍板（面板内以画布为主流，但用户口播常称白板）——建议以「画布」为产品名、「白板」不进入界面术语。

---

## 三、P1 —— 局部可见、分批修复

| 编号 | 问题 | 位置 |
|---|---|---|
| P1-1 | 顶栏之外的子控件分段 4 种激活态（实底反白 blog-seg / 下划线 rightbar-tab、csp-tab / 旧淡彩 dv-format、graph-seg、canvaslist-tab、cip-seg-btn / 新凸起 kb-modal-tab） | blog.css:585、editor.css:1240、canvas.css:2041/2259/2409、diary.css:470、graph.css:289、kb.css:635 |
| P1-2 | 次级/ghost/icon-only 尺寸谱：26/28/30/32/36 混用，gap/padding 各异（26×26 blog.css:731、canvas.css:2107；28 graph 653/kb 124；30 csp footer 2085、filetree confirm 998；32 canvas 1666；36 share 2311） | 见各 file:line |
| P1-3 | 输入框高度谱 26/28/30/32/36，部分无 accent 聚焦环 | canvas.css:2272/2280/2231/2311、editor.css:966 |
| P1-4 | Modal 裸壳未走 .aurora-modal：diary dv-confirm/dv-mood-picker（文字 ×、裸 footer）、canvas share 弹层无 40px 头部；宽度档位不落地（CanvasListMenu.tsx:154 内联 440） | diary.css:505/527、canvas.css:2231+ |
| P1-5 | 文案：Blog「添加笔记」(842/949) vs 全站「新建笔记」；「清除」(Inspector 699/934、Sidebar 530、Graph 1039) vs「清空」(CanvasListMenu 139/302、CanvasDock 374/463)；placeholder 半角 `...` vs 全角 `…` | 见 file:line |
| P1-6 | 圆角字面量：diary.css 8px×5、12px×1（应 md/lg token） | diary.css:86/210/370/400/438/492 |
| P1-7 | 裸 box-shadow：blog.css:154、shell.css:874/986、canvas.css:102/107/2448/2581、editor.css:1085/1090 | — |
| P1-8 | 语义色局部漂移：editor insight info 卡用 `rgba(128,128,128,.03)` 而非 info 语义（warn 卡却用了 warning 彩底，同卡组不一致）；editor.css:589 徽标 `#34d399` 未走 --mc-success | editor.css:719/589 |
| P1-9 | welcome 底色近似硬编码 `#1a1e27`/`#1c2029`（≈hover/elevated 差 1–4 通道） | welcome.css:129/201 |

---

## 四、P2 —— 代码卫生与去重（用户不可见或低频）

| 编号 | 问题 | 位置 |
|---|---|---|
| P2-1 | `.aurora-segmented` 全套（含 thumb 渐变硬编码 `#FFFFFF→#E8ECF4`、`#8B9BFF→#6B7CE6`）全仓零 TSX 消费 → 死代码，删除或启用 | components.css:290-311 |
| P2-2 | features 平行按钮体系：SaveAsModal(save-as-btn)、KbDashboard(kb-btn)、Preview(code-copy-btn) 等，多属 KbManager 独立测试链 / 未挂真实入口 → 死 UI | features/export、features/knowledgeBase |
| P2-3 | z-index 碰撞组：9999×3（toast/shell/canvas）、9998×3、9000×2、2000×2 | toast.css:14、shell.css:853/965、canvas.css:2568/2574/2206/2268、components.css:664、ui.css:74 |
| P2-4 | 非 --mc- 自定义属性桥接重复声明（--kb-*、--editor-*、--wh-item、--aurora-editor-formatbar-h） | kb.css:159-188、editor.css:1027/2562-2593、diary.css:93-100、components.css:788 |
| P2-5 | 命令面板/右键菜单/浮层多实现去重（承接 Phase 3/4 遗留） | canvas cmdk vs app 级、多套 ContextMenu/Popover |
| P2-6 | 文案卫生：placeholder 风格（冒号示例 vs 纯名词）、空态个别仅陈述无 CTA、中英括号空格 | 见子清单 |

---

## 五、遗留排期建议（承接上轮）

| 批次 | 内容 | 工作量估计 |
|---|---|---|
| R-术语 | P0-4：品牌/版本号收敛（~8 处文案）+ 白板/画布主术语拍板后全局替换 | 小 |
| R-按钮 | P0-1/2：KB 切共享 Button、danger 两档标准化、versionHistory 收敛 | 中 |
| R-动效 | P0-3：29 处裸 120ms + 小数秒 → dur token | 小 |
| R-密度 | P1-2/3 + **G 间距**（非 8 基档 10/14/18 + 20/22 少量）一起做，配截图核对 | 中 |
| R-控件 | P1-1/4：子控件分段规范 + Modal 裸壳 | 中 |
| R-卫生 | P1-6/7/8/9、P2 全部 | 小 |

**当前无需等待项**：字号/字重/禁色/顶栏 tab 已全站一致 ✅（上轮成果经本轮复查无回退）。

---

## 六、拍板执行记录（2026-09-06 晚）

用户两项拍板已落地：

| 决策 | 落地内容 | 状态 |
|---|---|---|
| ① 全站以「白板」为主术语 | `src/aurora/panels/{canvas,kb}/*` 全部界面文案/注释「画布」→「白板」（view id `canvas`、class、icon、DB 字段等英文标识符不动）；空态标题措辞为「白板还是空的」（避免"空白白板"叠词）；smoke 断言同步；aurora TSX 层「画布」残留 0 | ✅ |
| ② 「确认删除」用软态 | 共享 `.aurora-btn--danger` 由实底改为软态（淡彩底 12% + danger 描边 35% + danger 文字，hover 加深 20% + danger-text），新增 `.aurora-btn--danger-solid` 实底档供最高危（清空/永久）场景；FileTree 删除确认（顺带修复 hover 误把 `--mc-danger-text` 当背景的 bug）、versionHistory 危险按钮 token 化软态（去硬编码 `#ef4444`）；kb/canvas csp/canvaslist 原已软态保留；删除 diary `dv-btn--danger` 死规则 | ✅ |

### 第二批执行记录（按排期 R-术语收尾 / R-按钮收尾 / R-动效）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ③ R-术语收尾 · 品牌拼写 | 全站 `Markcraft`（14 处，壳层默认应用名/标题栏/欢迎页/设置搜索文案/关于页/引导页）→ **`MarkCraft`**（权威拼写：index.html `<title>`、README、BlogPanel）；aurora TSX 层残留 0 | ✅ |
| ④ R-术语收尾 · 版本号 | 版本号收敛为统一三位 `v2.0.0`：状态栏 `Aurora v2.0`→`Aurora v2.0.0`（Settings/Welcome 两处）、About 主版本行「版本 2.0.0 (Aurora)」→`v2.0.0 (Aurora)`（消灭「版本/v」前缀双形，与 changelog `v2.0.0 —` 及欢迎 footer 一致）；changelog 历史条目 `v1.8.0` 保留 | ✅ |
| ⑤ R-按钮收尾 · KB 主按钮 | `aurora-kb-btn--primary` 135° 渐变 sheen（accent-hover→pressed）→ 共享实底 accent 范式（与 `.aurora-btn--primary` 逐字一致：accent 底 + inverse 字 + inset 高光 0.2，hover accent-hover/0.25、active accent-pressed/inset 阴影）；删除 `filter: brightness` 方案；基类 transition 补 background 属性 | ✅ |
| ⑥ R-动效 · 裸 120ms | 全站裸 `120ms`×29（components/canvas/editor/graph/settings/shell/ui）→ **`var(--mc-dur-micro)`**（100ms 微反馈档，语义=hover/图标变色）；shell 3 处 `var(--mc-dur-fast, 120ms)` fallback 清理为纯 token；残留 0 | ✅ |

### 第三批执行记录（R-控件 P1-1 · 子分段统一）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ⑦ P1-1 切换/选择类分段 → 凸起范式 | 用户拍板边界：**切换/选择类统一「轨道 bg-pressed 无边框 + 激活 bg-elevated 凸起 + inset 阴影 + accent 文字 600」；侧栏面板导航（白板左栏 csp 5-tab、编辑器右栏 rightbar-tab）与格式 toggle（日记 dv-format）保留 accent 下划线/淡彩桌面惯例**。落地的 5 处（CSS 收敛，TSX 零改动）：① `blog-seg`（博客 主题浅色/深色 + 字体 衬线/无衬线/等宽）实底 accent 反白 → 凸起；② `graph__seg`（图谱 模式 5 项/布局 4 项）淡彩+独立描边按钮 → 凸起，且 grid 4 列（5 项会折孤行）→ flex 均分单行；③ `canvaslist__tab`（白板列表弹层 列表/回收站）独立描边 → 凸起；④ `cip__seg`（白板检查器 标签 AND/OR）bg-elevated+边框轨道 → bg-pressed 凸起；⑤ `kb-modal__tab`（KB 新建弹层）补 accent 文字 + 600（轨道本已符合）。保留：csp-tab/rightbar-tab 下划线、dv-format 淡彩 | ✅ |
| ⑧ 死代码标注（并入卫生批） | 复查发现 `view-switcher`/`vt-btn`/`view-toolbar`/`share__tab` 等带 accent-soft 激活的分段 CSS 全 TSX 零消费（与 `.aurora-seg`/`.aurora-segmented` 同属残骸），不属本批范围，留 R-卫生批一并删除 | — |

### 第四批执行记录（R-控件 P1-4 · Modal 裸壳收敛）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ⑨ P1-4 日记心情选择器迁共享 Modal | `DiaryPanel` 手写伪 Modal（`.dv-overlay`+`.dv-mood-picker`：rgba(0,0,0,.5) 遮罩 z-index:1000、无 40px 头部分隔、✕ 无 hover、footer 用 33px 裸 `dv-btn`、圆角 12px 字面量、min-width 320 无宽度档）→ **迁移共享 `@components/ui/Modal`**（isOpen/title="选择今日心情"/size=sm 360/footer=共享 Button 取消 secondary+确认 primary）。收益：40px 头部+✕ hover、footer 48px、bg-content 底+radius-lg+shadow-popover+200ms 入场、焦点陷阱/ESC/遮罩/body 滚动锁定（原行为缺失）；`dv-confirm` 全 TSX 零消费死规则连同 `.dv-overlay`/容器/`__header`/`__footer`/`.dv-btn`×3 一并删除；保留心情选项内容样式（`__category-title/__grid/__item`）。`createPortal` import 移除。验证 tsc=0、DiaryPanel smoke 6/6 | ✅ |
| ⑩ P1-4 白板管理弹层宽度去内联 | `CanvasListMenu` 内联 `style={{width:440,maxHeight:'60vh'}}` → 落 CSS：`.aurora-canvaslist__overlay .aurora-cmdk { width:440px; max-height:60vh; }`（cmd 面板家族默认 560 过宽，管理列表收窄至 md 档）。TSX 零内联宽度 | ✅ |
| — | canvas share 弹层子项复核：`.aurora-share__tab` 等全 TSX 零消费 → 无真实组件可修，属死代码，并入 R-卫生批删除 | — |

当前待办提醒：R-密度剩余 G 间距（~180 处非 8 基档，需配截图目测核对）、R-卫生（P1-6/7/8/9 + P2 全部：死分段代码 view-switcher/vt-btn/view-toolbar/share 全族/aurora-seg/aurora-segmented/canvas-inspector/command-bar 全族、Modal 双实现去重、z-index、自定义变量桥接等）按排期后续推进。

### 第五批执行记录（R-密度 P1-2/P1-3 · 按钮/输入框尺寸谱收敛）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ⑪ P1-2 按钮族尺寸谱收敛 | 先做 TSX 活性验证，**剔除全部死代码**（aurora-share 全族 / view-toolbar / vt-btn / view-switcher / segmented / canvas-inspector / command-bar = TSX 零消费，留卫生批删），仅收敛活类。按钮/icon/ghost/次级统一 28px（共享 md 权威），26 非标档清零，30/32/34/36 偏高档归 28：blog（device-btn 30×26→28²、blog-btn 32、search、fchip 32（与 blog-chip 28 对齐）、icon-btn 26²、add 32、platform 34→32、deploy 36→32）；canvas csp（header-btn/zoom-btn 26²、footer-btn 30）；cip（delete/copy 32、chip 26、rec-add/rec-x 26、more 30、seg-btn 26→28 方形、layer-btn 24→28）；canvaslist/ctop/empty/dock（search/create/rename-input、ctop name/act/select、empty-btn 32、dock swatch 26、ctop export 30²）；editor（aid btn 26/block 30、filetree search 32/action 30/confirm 30）；graph grp-add 26；shell（titlebar icon 26²、sidebar toggle 36→28、audience/crash 30）。**保留 24 紧凑 icon 档**（zoom/overlay-close/pin/collapse/hist-actions/outline-toggle/dv2-cal nav/modal close）与 input sm24/lg32 变体 | ✅ |
| ⑫ 复核遗留 | blog-btn 渐变（135° accent sheen + filter brightness）复查为 P0-1 KB 渐变同源漏网项 → 标 R-按钮复核（下轮并入 R-卫生或单独处理）；存活 30px 仅剩分段 tab（既定 30 规范）+ 列表行 + 死类；26px 仅剩死类/compact 列表变体/滑轨 thumb | — |

### 待目测项（R-密度视觉验证）
尺寸收敛后请在 5174 目测：博客（发布按钮 36→32、平台卡 34→32、设备切换钮方形化）、白板（侧栏/检查器/顶栏按钮高度）、编辑器文件树操作钮、左侧栏底部折叠钮（36→28）。若个别容器显挤可报位置回退单点。

### 第六批执行记录（R-卫生 · P1-6/7/8/9 + P2-1 + Modal 尺寸档落地）
| 批次 | 落地内容 | 状态 |
|---|---|---|
| ⑬ P0-1 blog 渐变漏网（上批⑫遗留） | blog.css `.aurora-blog-btn--primary` 135° 渐变 + brightness hover → 共享实底 accent 范式（accent 底 + inverse 字 + inset 高光 0.2；hover accent-hover/0.25；active accent-pressed/inset 阴影）；同源 `.aurora-blog-generate`（40px 主 CTA 渐变 + `filter` transition）一并实底化（hover/active 走 token + inset；is-loading shimmer 保留）；graph.css 实底 `button.primary` 的 brightness hover → accent-hover + inset。全仓按钮渐变清零（残留渐变均为 titlebar/sidebar icon、settings 大 logo、用户头像等品牌装饰，语义正确保留） | ✅ |
| ⑭ P1-6 圆角字面量 | diary.css `border-radius: 8px`×5 → `var(--mc-radius-md)`（纯 token 化零视觉变化） | ✅ |
| ⑮ P1-7 裸 box-shadow | 分层收敛：瞬态强浮层（audience/crash 对话框、blog 预览浮层、canvas ctxmenu/dock float）→ `--mc-shadow-popover`；持续侧栏抽屉（canvas/editor overlay--left/right 定向阴影 ±2px 0 14px）→ `--mc-shadow-panel`（贴窗口边侧被裁、视觉等价）；shell.css:874 audience 处补漏。保留：焦点/选中 ring（accent 双圈）、彩色点内白 hairline（graph ic-dot）、`0 0 0 .5px` 裁切描边、danger-solid brightness hover、stat dot 辉光 = 装饰/语义非浮层 | ✅ |
| ⑯ P1-8 语义色漂移 | editor 徽标 `#34d399` → `--mc-success`（与底/描边同源）；insight `card--info` 中性灰 rgba → `color-mix(accent 6%)` 与 warn 卡同配方对称（对齐面板既定「info 用 accent」注释）；minigraph 灰底 → `--mc-bg-elevated`（与右栏卡容器一致） | ✅ |
| ⑰ P1-9 welcome hover 底色 | `#1a1e27`/`#1c2029`（同语义不同值微漂移）→ 统一 `--mc-bg-hover` | ✅ |
| ⑱ P2-1 死分段/死类 CSS 删除 | 先全量 TSX 活性核验后整段删：canvas.css 5 大段（command-bar 全族、view-switcher→inspector→color-picker→.aurora-view→element--selected→view-toolbar→vt-btn→.aurora-seg 连续死区、inspector textarea/delete 残余、孤例 vt-btn--active、share 全族 2290–2359 含平行 `.aurora-switch`）＋ ctx 补充死类；components.css `.aurora-segmented` 全套（含 thumb 渐变 #FFF→#E8ECF4 / #8B9BFF→#6B7CE6）＋ 共享 focus-ring/select 组中 view-toolbar/share 死选择器行。**保留**：`.aurora-cmdk`（CanvasCommandPalette/CanvasListMenu 活）、`.aurora-canvas-ctxmenu`（CanvasContextMenu/CanvasDock 活）。canvas.css 2762→2180 行。删除后括号配平、死类全仓零残留、tsc=0、smoke 75/75 | ✅ |
| ⑲ P1-4/审计 R 遗留 · 共享 Modal 尺寸档落地 | 审计 R 文档早已规划「Modal 段补 `.aurora-modal--sm/md/lg`(360/440/640)」但从未落 CSS → 共享 Modal `size` prop 长期失效（弹窗按内容/640 顶格渲染）。本次补档（sm 360/md 440/lg 640），全站共享 Modal 宽度档真正生效 | ✅（视觉影响见下待目测） |

### 待目测项（R-卫生批新增）
1. **共享 Modal 尺寸档生效**：DiaryPanel 心情选择器（sm→360）、MigrateWizard/InputModal/ConfirmProvider 等共享 Modal 消费点从"内容自适应/640 顶格"变为固定档位——若个别弹窗显窄/显挤可报位置调 size。
2. **阴影档位微变**：audience/crash 对话框、blog 预览浮层、canvas 右键菜单/抽屉阴影从手写值换 popover/panel 档（层级语义对齐、视觉近似）。

### R-卫生剩余（需目测后方可执行）
- **Modal 双实现去重（P2-5）**：Kb 三弹窗（KbCreateModal/Edit/Delete）+ aurora ConfirmProvider 走平行 `../../components/ui/Modal`（独立 box 样式 + `open/width` API），与共享 `@components/ui/Modal`（`isOpen/size` API）并存。切共享 = 结构/内边距/圆角重排属视觉重构，需目测批单独执行后删平行 Modal.tsx。
- **z-index 组（P2-3）**：9999×3（toast/shell/canvas dock）、9998×3、9000×2、2000×2 碰撞组收敛——需叠层目测防弹层错乱。
- **G 间距落码**：映射清单已出（见下第八批），待 5174 抽查后执行。

### 第七批执行记录（R-卫生 P2-4 · 自定义变量桥接复核）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ⑳ P2-4 自定义变量桥接复核 | 先盘点作用域 + 全仓消费活性再收敛：**① editor.css 两处 `.aurora-editor` 变量块（文件顶部「Token 桥接 A」L16-25 与底部「Aurora 化覆盖层」L2569-2602，同元素同键重复声明）→ 合并为单一声明块**（保留于底部覆盖层节，并入 A 独有活键 `--button-primary`，删 A 整块 + 注释折叠进覆盖层节头）；**② 删死键 trio** `--editor-font-family/--editor-font-size/--editor-line-height`（全仓 var() 零消费、仅 2 处声明；TiptapEditor L659-661 内联写入亦无 var() 读者=历史空写，features 层不动）——editor.css 与 diary.css `.dv2-editor-block` 两桥同删；**③ 复核通过保留**：diary `.dv2-editor-block` 桥（日记面板不在 `.aurora-editor` 内，注释明示否则回落 base.css 旧石板蓝 #0f172a，合法跨作用域）；kb `.aurora-kb.kb-shell` 桥（复合选择器压过 kb-ui.css 自带浅色映射，单声明位点）；components `--wh-item/--wh-visible`（滚轮弹层几何常量，同族 5 处 calc 消费）；editor `--editor-code-font-family`（tiptap.css/CodeBlockView/TiptapEditor 消费，活）。上下文澄清：base.css `:root` 已全局声明 `--editor-bg/text/border` + `--button-primary=var(--mc-accent)`，aurora 作用域重映射为防用户主题 CSS 全局改写的防御层，属架构意图。验证 tsc=0、smoke 75/75 | ✅ |

### 第八批执行记录（G 间距 · 映射清单盘点，未落码）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉑ G 间距映射清单 | 全仓扫描 padding/margin/gap 数值分布 → 确认越界家族 = 4n+2（10/14/18/22/26）与奇数（9/11/13），共 **189 处**（10px×109 为主、9px×18、14px×34、18px×16 + 零星），与审计 ~180 吻合。定基档 = **4px 网格**（权威锚点：`.aurora-btn--sm/md/lg` 随高 24/28/32 → 横 8/12/16；`.aurora-input`/`.aurora-dropdown__item` 28px 却用 10 = 待收敛漂移）。逐处映射规则：控件横向 14→12（md 权威）/ 10→12、条目 gap→8（权威 .aurora-dropdown__item gap 8）、面板/对话框 14→16、18→20（与声明内 20 侧统一）、22→24、9→8、26→24。产出 `docs/design/G-间距映射清单-2026-09-06.md`（逐处 file:line + 选择器 + 现值→建议 + 级别）：**A=147 规则明确可批量**（margin/gap/控件横向，不涉高度）、**B=41 竖向/混合内边距需抽查**、**C=1 人工**（editor outline 搜索输入 `6px 26px 6px 28px` 非对称图标槽）。未落码，待 5174 抽查后执行 | ⏸ 待抽查 |

### 第九批执行记录（G 间距 · A 类落码）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉒ G 间距 A 类落码 | 按映射清单逐行落码：脚本以「行号 + prop:值段」双重校验匹配后才替换，不匹配即跳过记 problem（防行号漂移误改）。A 类实为 **146 处可落**（清单标 147 含 kb.css:419 `padding:clamp(18px,2.4vw,30px)` 生成器误标——clamp 响应式边界不属机械映射，已排除）。**146/146 全部落地**，覆盖 12 个 css：控件横向内边距统一 10/14→12（含共享 `.aurora-input`/`.aurora-dropdown__item` 漂移修正、tab `0 8px 0 10px→0 8px 0 12px` 四值折叠、图标槽 `4px 10px 2px→4px 12px 2px` 三值保序）、条目 gap 9/10→8、面板 margin 10/14/18→12/16/20、命令面板 footer `8px 14px→8px 12px`（控件语境）、ctop/search 等输入类 →12。落码后复扫：**A 类残留 0、B/C 41 处零误伤**。tsc=0、smoke 75/75 绿。剩余：**B=41 竖向/混合内边距**（高度 ±2px 视觉变化）需 5174 抽查后落；**C=1** outline 搜索输入人工定夺 | ✅ 待目测 |

### 第十批执行记录（G 间距 · B 类落码）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉓ G 间距 B 类落码 | 41/41 全部落地（同一双重校验 + 幂等脚本，另加**全等 token 折叠**：`20px 20px 20px→20px` 等，保持声明最简）。覆盖 11 个 css：竖向/混合内边距统一上档——面板/对话框 padding 14→16、10/18→12/20（goto-dialog `18px 20px 20px→20px`、kb-card `10px 14px→12px 16px` 竖横双档、dash-kpi/lint-head `10px 12px→12px` 全折叠、toast `9px 14px→8px 16px`、section-title `10px 8px 4px→12px 8px 4px` 顶增底保序、shell nav `14px 8px 10px→16px 8px 12px`、filetree__confirm `18px→20px` 等）。复扫：**B 残留 0、A 146 无回退、C 1 原样**。tsc=0、smoke 75/75。至此 G 间距 187/188 落码完成 | ✅ |
| ㉔ G 间距 C 类定夺 | C=1（editor.css:1419 outline 搜索输入 `6px 26px 6px 28px`）**定夺：保留原样，记为设计豁免**。判定依据：该搜索框左为 13px 静态图标（absolute left:22）、右为清除按钮（13px 图标 + 按钮 2px padding，absolute right:20）——右按钮物理宽度 > 左图标，26/28 非对称 padding 是**补偿右侧更宽元素**的刻意对齐，左右图标视觉中心本就对称（均距边 ~28px）；若机械收敛右 26→24，长文字输入会贴到清除按钮（右缘越过按钮左缘）。网格纪律不凌驾于已校准布局，豁免记录于映射清单 | ✅ 豁免 |

### 第十一批执行记录（编辑界面搜索框 · 「上滑即显·下滑即隐」）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉕ 编辑左右列表搜索框交互改造 | 编辑器左栏文件树（FileTree）+ 右栏大纲（AuroraOutline）搜索框从「scrollTop 阈值式 macOS 逻辑（顶部显示/下滑>24 收起）」改为**滚动方向感知**：① 默认收起（打开面板不占位）；② **上滑**（scrollTop 减小、向列表开头方向）即展开、**下滑**（浏览深处）即收起；③ 已输入关键词锁定可见；④ 120ms 防抖 + 首帧仅记录基准（防恢复滚动位置误判 + 惯性回弹误触发）；⑤ 收起态入口：右栏 = AuroraOutline header 右侧常驻搜索 trigger（24px，展开态 `.is-active` accent）；左栏 = 因 `hideTopbar` 模式无自带 topbar，FileTree 改 `forwardRef` 暴露 `FileTreeHandle.openSearch`，EditorPanel 在左侧 overlay-head actions 加 `.aurora-editor__overlay-search` 按钮（并入 pin/close 24px 幽灵族）；FileTree 自带 topbar（非 hideTopbar 模式）保留 trigger 供将来全量使用；⑥ a11y：收起态 input `tabIndex=-1`（is-hidden 仅视觉折叠，防 Tab 聚焦不可见控件）。editor.css 追加 5 组样式：topbar/header-actions wrapper + 两 trigger（ghost/bordered 各自同族）+ overlay-search 并入组。验证 tsc=0、smoke 75/75 | ✅ 待目测 |

### 第十二批执行记录（搜索框体验修复 · 用户 5174 实测反馈）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉖ 搜索框抖动修复 + 移除图标入口 | **① 抖动修复**：上轮㉕的「单帧 delta 方向 + 120ms 尾部防抖」零阈值零迟滞，触摸板微调/惯性/展开收起动画 scrollTop clamp 任一帧方向翻转即 toggle → 改**累计位移迟滞状态机**（lastTop 逐帧 + pending 同向累计，±20px 阈值翻转清零；输入中挂起；去 timer）——两栏同构（FileTree/AuroraOutline 各自 `SEARCH_SCROLL_HYST=20`）。**② 图标入口移除（用户拍板「彻底移除」+ 左栏跟随）**：右栏 header search-trigger（无嵌套标题时孤悬）、左栏 EditorPanel overlay-search、FileTree topbar search-trigger 全删——显隐完全交给滚动方向；FileTree 还原普通函数组件（去 forwardRef/FileTreeHandle/useImperativeHandle/ref）；editor.css 删 3 组死类规则 + overlay-search 选择器行。a11y `tabIndex=-1` 保留。验证 tsc=0、smoke 75/75、括号配平 OK | ✅ 待目测迟滞手感 |

### 第十三批执行记录（搜索框底部反复抖动 · 翻转锁定窗修复）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉗ 底部区域搜索框自激振荡修复 | 用户 5174 实测：列表深处「下拉展开搜索框后，上滑想收回」，搜索框**反复快速抖动**。**根因 = 布局反馈自激振荡**：搜索框位于滚动区上方、文档流内，收起靠 `max-height:0` 0.24s 动画——收起的瞬间滚动区变高约 46px（filetree，含 margin）/40px（outline，含 padding），若视口正停在列表底部附近（距底 < 该值），浏览器持续把 scrollTop **钳制**回新最大值 → 一串「scrollTop 减小 = 伪上滑」scroll 事件 → 状态机（翻转即清零）误判「用户向列表开头滚动」→ 立即重新展开 → 滚动区复矮、max 变大不再钳制 → 等用户再下滑 ≥20px 又收起 → 底部钳制又误判……每滚一段抖一次。**修复**：翻转后加 **300ms 锁定窗**（`SEARCH_FLIP_LOCKOUT_MS=300`，须盖过 0.24s 折叠动画）——锁定期内 scroll 事件一律忽略、方向累计清零（仍逐帧更新 lastTop 基准），期满从零重累计；同一状态重复触发不加锁（guard：仅状态真正翻转才设锁）。两栏同构落地（FileTree/AuroraOutline 各加 `treeLockUntil`/`listLockUntil` ref）。验证 tsc=0、smoke 89/89（全 aurora 套件） | ✅ 待目测迟滞手感 |

### 第十四批执行记录（z-index 碰撞组收敛 · 语义层级带落地）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉘ P2-3 z-index 收敛 | 全仓盘点（aurora css 26 处 + tsx 内联 ~90 处 + features 遗留层）→ **先区分「根上下文真竞争」与「容器内局部层级」**：portal/fixed 到 body 的表面才参与全局竞争（已核 createPortal：filetree/outline ctxmenu、confirm、canvas cmdk/ctxmenu/dock 组/canvaslist、command、crash/audience 均 Portal）；graph/canvas/editor 内部 5-60 与 1000 锚定带被父堆叠上下文包含，不在此批。**落地 = 语义层级带唯一文档源**（`tokens.css` §14 层带表 + 每处带注释）：crash 9998→**10060**（兜底最高，原低于 canvas ctxmenu 10001 属反转已修）、audience 9999→**10050**（原与 toast 9999 同值）、editor 两 ctxmenu 10000→**10030**、toast 9999→**9990**（盖模态/命令、低于菜单，消除与 dock float 9999 同值）、filetree confirm-backdrop 9998→**9980**（Modal 阻断带）、canvaslist overlay 9000→**9980**（管理模态须盖过 canvas cmdk 9000）、dock mask/float 9998/9999 保留原序（补注释）、shell command/canvas cmdk 9000 保留（Command 带，互斥使用注明）。**遗留判定**：2000×2 为 tooltip 平行遗留（mc-tooltip 注释自证无消费方，待退役）；features/* 内联 9999-100000 属退役 UI 层（QuickSwitcher/FloatingFormatToolbar/LinkRedirectDialog 等），Phase 4 退役处理，不入全局带。收尾复扫：aurora css 顶层带无同语义同值碰撞、无残留 9999/9998/10000 魔数。纯 CSS 数值改动（无 TSX），验证 grep 全量核验 | ✅ 待 5174 目测 |

### 第十五批执行记录（Modal 双实现去重 · 平行遗留 Modal 删除）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉙ P2-5 Modal 双实现去重 | **盘点定界**：共享 `@components/ui/Modal`（`isOpen/size` API，样式单源 components.css）与平行遗留 `../../components/ui/Modal`（`open/width` API）并存，后者的 3 个消费方 = Kb 三弹窗（KbCreateModal/EditKbModal/DeleteKbModal）+ aurora ConfirmProvider（含平行 Button）。**先解「宽度档失效」疑云（⑲ 批补 CSS 档后组件侧遗留）**：共享 Modal panel 残留 inline `width:100%`（自无档时代的 max-width 640 顶格实现），按 CSS 优先级覆盖 `.aurora-modal--{sm/md/lg}` → size 档实际未生效（⑲ 待目测项悬置根因）。审计记录佐证（⑲：size prop 长期失效、弹窗按 640 顶格）。**落地**：① 共享 Modal.tsx 删 inline `style={{width:'100%'}}`，宽度改由档位类唯一控制——全站 4 个既有调用点（DiaryPanel sm / InputModal sm / ImportDialog sm / MigrateWizard md）均显式传 size、无一依赖 640 顶格，删除安全且使 ⑲ 档位承诺真正落地；② Kb 三弹窗 import 改 `@components/ui/Modal`，API 映射 `open→isOpen`、`width={460}→size="md"(440)`、`className→contentClassName`（共享 Modal className 落 overlay、contentClassName 落 panel，`.aurora-kb-modal` 需后者）；③ kb.css:759 独立 box 块（`.aurora-kb-modal{width:420…padding:20}` 平行时代遗留）删除，box 外观归共享 Modal 单源，仅留 body 内微调（610 body padding / desc / label）；④ aurora ConfirmProvider 的 Modal + Button 一并切共享（`@components/ui/*`），`open→isOpen`、`width={420}→size="md"`；⑤ 平行遗留 `src/aurora/components/ui/Modal.tsx` 删除 + barrel index.ts 去 Modal 导出。**验证**：grep 全仓旧 API 残留清零（无 `open=`/`width=`/`aurora/components/ui/Modal`、无 `.aurora-kb-modal{` box 规则）、tsc=0、aurora 全套 smoke 89/89 | ✅ 待 5174 目测 |

**待目测（本批视觉重构验收清单）**：① Kb 新建/编辑/删除三弹窗：宽 460→440、独立 box（bg-elevated+容器 padding 20）→ 共享 Modal 标准外观（bg-content、header 贴顶 40px、body/footer 分区、footer 48px）；② 确认框（删除文件/库等 confirm 场景）420→440、外观统一；③ **顺带生效**：全站共享 Modal size 档真正生效——Diary 心情选择器/ImportDialog/InputModal 从 640 顶格 → 360（sm）、MigrateWizard → 440（md），若个别弹窗显窄/显挤可报单点调 size。

### 第十六批执行记录（aurora ConfirmProvider 退役 · Confirm 单源收官）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉚ aurora ConfirmProvider 退役 | 盘点确认 aurora 自家 `app/ConfirmProvider` 为**零消费死宿主**：全仓 useConfirm 消费方仅 6 处（features：SettingsPanel/TagCloudContent/SaveAsModal/KbDashboard；aurora：DataSection）**全部走共享** `@components/ui/ConfirmProvider`；aurora 版只被 AuroraShell 挂载、其 useConfirm 无任何调用方。组件树叠层：`ToastProvider > aurora ConfirmProvider(死) > RealProviders(内嵌共享 ConfirmProvider) > ShellInner`——死宿主从未渲染任何 Modal。**落地**：① AuroraShell 摘除 import + Provider 包裹层（注释更新指向共享 Confirm）；② `src/aurora/app/ConfirmProvider.tsx` 删除；③ toast.css 死 CSS `.aurora-confirm__msg/.aurora-confirm__actions` 删除（全仓确认仅此一处消费，删除后留注释交代）。至此 Confirm 与 Modal 一样单源化（features + aurora 全站统一共享 ConfirmProvider，`variant:'default'|'danger'` API、Modal description 承载 message、sm 档 360）。**验证**：grep 全仓 aurora/app/ConfirmProvider 与 aurora-confirm class 引用清零（残留仅 G-间距映射清单的历史文档行，非代码）、tsc=0、aurora 全套 smoke 89/89。纯删除零视觉风险（死 Provider 不渲染） | ✅ |

### 第十七批执行记录（平行 ui 目录归零 · Button/Badge/Switch 收官）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉛ 平行 ui 目录归零 | **盘点定界**：`src/aurora/components/ui` 平行目录剩 3 文件（Button.tsx / Badge.tsx(内含 Badge+Checkbox+Switch) / index.ts barrel），6 处消费方全在 Aurora Settings sections——Button ×2（AboutSection/ShortcutsSection）、Switch ×4（Image/General/Editor/Data section），全部经 `@aurora/components/ui/*` alias；`aurora-badge/aurora-checkbox/aurora-radio` 类名的 tsx 消费方**仅平行 Badge.tsx 自身**（Badge/Checkbox/Radio 全仓零消费=死代码），Switch 为纯受控（`checked+onChange`）零自定义。**共享侧能力核对**：`@components/ui` 无 Switch/Badge/Checkbox（ui.css 注释明示「样式单源指向 aurora components.css」模式）→ Badge/Checkbox/Radio 直接退役；Switch 4 消费方**提级共享**（与 Modal/Button「共享组件 + aurora components.css 样式单源」同构）。共享 Button vs 平行差异（leftIcon IconName-string vs ReactNode、平行无默认 type vs 共享 type=button、variant subtle/brand）——本批消费方纯文字 sm+secondary/ghost+disabled/title/onClick，无 icon 字符串用法，切源零摩擦。**落地**：① 新建 `src/components/ui/Switch.tsx`（平行实现逐行平移 + 来源/样式单源注释）；② 共享 `ui/index.ts` barrel 增 `Switch`/`SwitchProps` 导出；③ Settings 6 处 import 切 `@components/ui/Button`×2 + `@components/ui/Switch`×4；④ 删平行 Button.tsx/Badge.tsx/index.ts + rmdir `aurora/components/ui`（`aurora/components` 仅剩 command-palette/shell，与共享体系无关）；⑤ components.css 删死 CSS 两整块：Badge（含 5 variant）+ Checkbox&Radio（checkbox/radio 均零消费，含 `.aurora-radio__*`）。**验证**：grep 平行引用清零（`@aurora/components/ui` 0 命中）+ 死类清零（aurora-badge/checkbox/radio 全 src 0）+ CSS 括号配平 150/150 + Switch export OK + tsc=0 + aurora 全套 smoke 89/89。**里程碑：`aurora/components/ui` 平行目录整体归零——Button/Modal/Confirm/Switch 四大基础控件全站共享单源收官** | ✅ 待 5174 目测 |

### 第十八批执行记录（Phase 4 退役第一批 · 死代码扫描清剿）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉜ Phase 4-① 死代码扫描清剿 | **背景**：Phase 4 历史清单（MIGRATION 6 chrome 组件退役等）**已过时**——editorInspector/EditorFormatToolbar/FloatingToolbar/SlashCommandPopup 四文件早不存在（残留仅 shell.css/excalidraw-hide-ui.css 历史叙述注释）、FileTree 已转正为实际左列表、GoToLineDialog 是真实实现（命令桥触达）、QuickSwitcher/LinkRedirectDialog 均被 AuroraShell/EditorPanel/LinkHealthPanel 实际消费——全部不进退役批。**方法论（本批价值）**：自写 node 引用图脚本（解析全部 import/export/动态 import 语句 + tsconfig alias 去 @ 在 src 解析 + 真实入口 BFS）扫出全仓 97 个不可达文件，二次筛查（全仓外部引用字串）分铁死 48 / 人判 49（多为死岛内部互引 + 专属测试引用）。**本批删除（铁死 48 中低风险 32 个）**：死 barrel 21（aurora shell/index、features export/import/lint/migrate/navigation/outline/preview/search/settings/shared/tags/templates/toolbar/fileManager/imageUpload + hooks/services/stores index）+ 独石死工具/hook 8（hooks useBlogFiles/useContentHandler/useEditorSettings/useMediaQuery/useWindowSize、services/fullscreen、utils/errorUtils）+ 旧 UI 残骸 3（components/ui/LazyBoundary、fileManager LinkHealthPanel/LinkMinimap/RecentFiles/TagPanel、blog FloatingPanel）等。**无 git 仓库 → 先备份 `.workbuddy/trash-phase4-backup/`（32 文件全量，目录结构保留）再删**。验证：tsc=0（零断链）+ aurora 全套 smoke 89/89。**待定（未删，交用户决策）**：editor 老内核/扩展群（Editor/RichEditor/LineNumbers/EditorOverlay/EditorErrorBoundary/extensions LinkHoverPreview/MarkHintExtension/mindmap×3/editor index/hooks 群）、canvas-v2 utils×5、kb 旧组件+ai 群（含专属测试 6+）、fileManager 旧 UI 群（CreateFileModal/FileTree*/FolderSelector/TabBar/VirtualizedFileTree/WelcomePage，含专属测试）、imageUpload 旧群、preview Mermaid/PlantUmlRenderer、toolbar 旧群（含 test 链）、shared InputModal/mathUtils、tags TagCloudContent/tagCoOccurrence、store/worker 死岛环（FullTextIndex/indexWorkerAdapter）、hooks/useLanguage | ✅ 待定清单决策 |
| ㉝ Phase 4-② 旧 UI 死岛群清理 | **触发**：用户 AskUserQuestion 拍板「续清无测试旧 UI 群」。**重建引用图**（上批删除后状态已变）：当前不可达收敛 65 个；候选群逐一复核全死（**useLanguage 例外**——上批删 barrel 后反被活代码直接引用，保留）。**删除 36 候选 + 12 连带测试 = 48 文件**：fileManager 旧 UI 群 8（CreateFileModal/FileTreeContextMenu/FileTreeDragDrop/FileTreeNode/FolderSelector/TabBar/VirtualizedFileTree/WelcomePage + 连带测试 2）、imageUpload 群 4（ImageCachePanel/ImageHostSettings/imageCacheManager/relativePathHandler）、kb 旧组件+ai 群 15（KbDashboard/KbEditor/KbManager/KbMiniGraph/KbNoteViewer/KbTemplateSelector/LearningPathPanel/ReviewPanel/TaskPanel/WritingGoalPanel/blindSpotAnalyzer/recommender/topicClusterer/kbTemplates + 连带测试 8：writingGoalTrend/KbManager/KbNoteViewer/KbTemplateSelector/LearningPathPanel/ReviewPanel/TaskPanel/WritingGoalPanel/kbTemplates）、canvas-v2 utils 5（shareLink/templateIO/templateThumbnail/templates/wordFrequency）、preview 渲染器 2（MermaidRenderer/PlantUmlRenderer + PlantUmlRenderer.test）、tags 2（TagCloudContent/tagCoOccurrence）、shared InputModal。删除前全量备份 `.workbuddy/trash-phase4-backup/`（累计 81 文件）。**新坑：KbEditor.test.tsx 用 `readFileSync` 读组件源码（非 import 语句）→ 静态连带筛查漏网**，tsc 也抓不到字符串路径依赖，仅全仓 vitest 首跑暴露（readFileSync 抛 ENOENT）→ 补删。**验证**：tsc=0 + **全仓 vitest 首次全量跑：837 passed / 1 failed / 2 skipped**——唯一失败 blogCssRefs.test 为**预存失败**（断言 KeyframeEditor 硬编码文案「匀速（linear）」，该活文件未删、tsc=0 证无活引用，与本批无关），KbEditor.test 补删后失败清零 | ✅ 完成（预存 1 失败与本批无关） |

全部批次 tsc=0、smoke 绿（Dexie/Tiptap warning 良性）。

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉞ Phase 4-③ editor 老内核群专项 | **触发**：用户点名「editor 老内核群专项」。**认知修正**：features/editor 并非「~15 文件死岛」而是数百文件活动代码（被 AuroraShell/BlogPanel/DiaryPanel/EditorPanel 深度消费：CodeMirrorEditor/TiptapEditor/cm6/活 extensions 均活），不可盲删。**方法论复用**：重建引用图（当前不可达 31）→ 二次外部引用字串筛查逐一证伪「命中活文件却判死」矛盾——全部为**基名误报**（BlogPanel 引 CssEditor/VisualCssEditor 含 Editor 子串；commandAdapter 引 `../types`=aurora 本地 types；AuroraShell 引 `../panels/settings/SettingsPanel`=aurora 自研版非 features 版；TiptapEditor 引活 WikiLinkHoverPreview 非死 LinkHoverPreview）。**入口修正坑**：indexWorker.ts 并非活入口——仅被死 indexWorkerAdapter 的 `new Worker(new URL(...))` 动态注册（引用图抓不到该形态，需 grep new Worker 兜底），且 vite/scripts/package 零引用 → 移出入口后全树（FullTextIndex/indexWorkerAdapter/indexWorker/chineseTokenizer）暴露为完整死环。**删除 31 死 + 3 连带测试 = 34 文件**：editor 老 WYSIWYG 内核群 21（Editor/RichEditor/EditorOverlay/EditorErrorBoundary/LineNumbers/markdownShortcuts/types/index barrel/components InlineMathPreview/extensions LinkHoverPreview+MarkHintExtension/mindmap 3/hooks useEditorShortcuts+useEditorSync/shortcuts 5——barrel re-export 活文件但活代码全走 deep import，删 barrel 无影响）+ toolbar 3（DiagramDropdown/TableEditor/popovers MathSymbolsPopover）+ settings/SettingsPanel.tsx（aurora 自研版在用、features 版死）+ shared/mathUtils + hooks/useLanguage（**㉝ 判活有误**：活代码全走 `stores/LanguageStore`，hooks/useLanguage 全仓零引用）+ store/worker 死环 4（FullTextIndex/indexWorkerAdapter/indexWorker/chineseTokenizer）。**连带测试 3**：TableEditor.test（测死 TableEditor）、MarkdownToolbar.test（测死 markdownShortcuts/mathUtils 格式函数链）、SettingsPanel.density.test（测死 features SettingsPanel）。备份 `.workbuddy/trash-phase4-backup/`（累计 115 文件）。**验证**：tsc=0 + 全仓 vitest **755 passed / 1 failed / 2 skipped（86 文件）**——唯一失败仍预存 blogCssRefs.test（KeyframeEditor 文案断言）；测试总数 840→758（-82）符合连带删 3 测试文件体量 | ✅ 完成（预存 1 失败与本批无关） |

全部批次 tsc=0、smoke 绿（Dexie/Tiptap warning 良性）。

### 第十九批执行记录（使用优化⑥ · 侧栏面板导航 tab 全站统一收官）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㉟ P1-1 收尾 · 侧栏 tab 同款 | **触发**：用户实测发现编辑器右栏 tab 与白板左右栏 tab 样式不一致（⑦批拍板把两者同归「侧栏面板导航 · accent 下划线惯例」，但细节各自为政：编辑器=纯文字横排/激活 text-primary+600，白板=纯图标（文字仅 tooltip）/激活 accent）。**用户拍板**：统一为「图标+文字竖排」。**落地**：① 白板两处 TSX 补渲染 `<span>{t.label}</span>`（csp CSS 的 flex-column/font-xs 结构本为此设计，纯图标属历史简化）——纯图标靠 hover 才能辨识的可用性问题顺带修复；② 编辑器 RightSidebar TABS 加 icon（大纲=list/脚注=footnote/块级反链=backlinks/辅助=wand）+ 渲染改图标+文字同构；③ 白板反链 icon `link`→`backlinks`（与编辑器同语义同图标）；④ editor.css `.aurora-rightbar__tabs/__tab` 重写为 csp 同款参数（去 32px 固定高/bg-elevated 底 → padding 8px 8px 0 + 透明底；tab flex:1 等宽/column/gap 3px/padding 6px 0 8px/font-xs/icon-muted/激活 accent+600+accent 下边框/hover secondary+bg-hover），canvas.css `.aurora-csp__tab` 对齐（hover 补 bg-hover、激活补 600、transition 补 background-color），两类名互注「同款同源，改一处须同步另一处」；⑤ CanvasSidebarPanel smoke `findByText('文件')` 加 `.aurora-csp__title` selector（tab 内新增文字后防双匹配）。**验证**：tsc=0、smoke 9/9（EditorPanel 6 + CanvasSidebarPanel 3，getByRole('tab',{name}) accessible name 不受图标影响）、build=0、CDP 全绿（hover 召唤三处 tab：6/6/4 个均图标+文字、16 项 computed 参数逐项相同 parity diff=[]）。截图 u6-editor-right.png / u6-canvas-left.png / u6-canvas-right.png | ✅ |

**至此 P1-1「分段/切换类控件」统一全景**：切换/选择类 = 凸起范式（⑦批 5 处）；侧栏面板导航 = 图标+文字竖排 accent 下划线（本批 3 处）；格式 toggle = 淡彩（保留）。三类范式各有唯一权威实现。

### 第二十批执行记录（使用优化⑦ · 触发竖条全站统一收官 + 「双链图谱」改名）

| 批次 | 落地内容 | 状态 |
|---|---|---|
| ㊱ 使用优化⑦ · 触发条统一 + 改名 | **触发**：用户发现知识图谱左栏触发竖条（18px 满高「导航」文字按钮 + flex 挤压重排）与编辑器/白板（7px 隐形感应条 + hover 召唤 overlay，编辑器 v7 权威范式）样式宽度均不一致；同时要求侧边栏「知识图谱」改名「双链图谱」。**落地**：① GraphPanel 触发交互整体换 v7 范式——`filterOpen`（hover 即开即收无防误触）替换为 `navHover/navPinned` 状态组 + hover-intent 定时器（220ms 停留滑入/180ms 延迟收起/快速掠过取消/卸载清理，与 EditorPanel 逐字同参），渲染改 `__hoverzone + __edge`（7px 隐形感应条）+ `__overlay` 浮层（256px absolute 不挤压画布重排）+ `__overlay-head`（图谱导航标题 + 图钉 svg 同款 + chevronLeft 收起）+ `__overlay-body`（头部固定内容滚动），原 `__rail/__rail-collapsed/__filter/__filter-head/__filter-collapse` 全系删除；② graph.css 同步重写（hoverzone/edge/overlay 系对齐 editor.css/canvas.css 同款参数 + 自带 `@keyframes aurora-overlay-in`——graph 直达路由下仅本文件加载须自带定义）；③ 改名 8 处：aurora-nav.ts（NAV_MAP 键 + SIDEBAR_GROUPS label）、GraphPanel sidebarActiveId、MenuBar 导航菜单项、commandCatalog（labelZh 改「双链图谱」，keywords 保留「知识图谱」旧名兜底搜索）、KbPanel KB 卡 title、Sidebar.test×2、KbPanel.smoke it 描述；帮助文档 defaultDocsZh.ts 正文不改（内容层，量大，单列待用户决策）。**验证**：tsc=0、GraphPanel smoke 7/7（4 处 rail 依赖改 `openNavOverlay` helper：fake timers 推进 260ms intent 对齐 EditorPanel.smoke 范式）、Sidebar+KbPanel 22 过、build=0、CDP 全绿（zone 7px/edge 常态透明/rail 已删、sidebar 含「双链图谱」无旧名、overlay 256px absolute z7 head/pin/close/body 齐、图钉 is-pinned+is-on+edge 渐变、close 关闭；截图节点坐标前后一致证明画布零重排）。截图 u7-graph-default.png / u7-graph-overlay.png / u7-graph-pinned.png。**插曲**：验证中 shell 被 SIGTERM 中断致 .git/refs 目录与近期 commit 对象丢失（工作区文件零损失），已从 reflog/FETCH_HEAD 重建 refs 并全量保底 commit | ✅ |

**至此「边缘召唤」交互范式全站统一**：编辑器左/右缘、白板左/右缘、双链图谱左缘共 5 处均为同一 v7 范式（7px 隐形感应条 → hover-intent 220ms → overlay 浮层滑入不挤压 → 图钉常驻/延迟收起），实现三处 CSS（editor/canvas/graph）互为同源镜像。

全部批次 tsc=0、smoke 绿（Dexie/Tiptap warning 良性）。

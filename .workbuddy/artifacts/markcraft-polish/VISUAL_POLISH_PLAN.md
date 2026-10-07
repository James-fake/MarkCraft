# MarkCraft 视觉精修方案（Polish Pass）

## 背景与诊断

用户对 Ardot 设计稿的"简陋感"提出反馈，并选择全面精修（配色方向 / 组件精致度 / 字体层级 / 密度留白）。

诊断结论：
- **约 70%** 源于 Ardot 画布渲染载体上限——画不出真实阴影/elevation、blur 玻璃态、渐变光感、品牌字体、真正的图标库、hover/过渡微动效。
- **约 30%** 源于当前三帧为"规范验证稿"：目标是验证明/暗双主题 token 角色映射（哪个块是 app bg、哪个是面板、accent 跨主题一致），未精雕视觉细节。

本方案在已有 `--mc-*` token 基础上升级**视觉层**，让实现后的界面（React + Tailwind + `--mc-*`）呈现"不简陋"的观感。设计稿（Ardot）的简陋是载体限制，不是方向错误；但规范本身需补上视觉精度，避免实现时缺少依据。

## 升级项

### 1. 配色方向（微调层次，accent 不变）

accent 保持 `#5B7CFA`（已验证跨主题一致且达 WCAG AA 对比度）。

| 角色 | 亮色 | 暗色 | 说明 |
|------|------|------|------|
| page / app bg | `#F6F7F9` | `#14161C` | 页面底色 |
| panel / sidebar | `#EEF0F4` | `#181B22` | 侧栏、导航容器 |
| card / input | `#FFFFFF` | `#1C1F27` | 卡片、输入框——亮色提亮到纯白，与 page 拉开对比 |
| border | `#E3E6EC` | `#2A2E38` | 1px 细描边 |
| text1 | `#1A1D24` | `#E8EAF0` | 主文字 |
| text2 | `#5A606B` | `#9AA0AC` | 次文字 |
| text3 | `#8A909C` | `#6B7180` | 提示/禁用 |

**关键改动**：亮色下把"卡片/输入"提亮到纯白，与 page 浅灰拉开对比，消除"全片浅灰糊在一起"的廉价感；暗色下 panel 与 card 区分更明显。

### 2. 组件视觉精致度

- **圆角梯度**：window 12 / panel·card 10 / button·input 8 / chip 6 / avatar 999(pill)
- **elevation tokens**（box-shadow）：
  - `--elev-1`：卡片静止（极淡投影，建立层级）
  - `--elev-2`：hover / 激活（略深 + 1px 上移）
  - `--elev-3`：命令面板 / 弹层 / 模态（明显投影 + 1px 描边）
- **描边**：1px 细描边 + 极淡 inset 高光（桌面质感）
- **图标**：弃用 emoji，统一 1.5px stroke 几何图标（`currentColor`，随文字色变化）

### 3. 字体与层级

- **字号阶梯**：`11 / 12 / 13 / 14 / 16 / 20 / 24 / 30`（拉长短端，caption 11px）
- **字重**：400 正文、500 UI 控件、600 标题（用 600 拉高层级对比）
- **行高**：标题 1.3、正文 1.6
- **字体栈**：`'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`（实现加载 Inter；稿内用 system-ui 近似）

### 4. 密度与留白（4px 基数）

- 组间间距 20–24、卡片内边距 16、列表项高 36(紧凑) / 44(舒适)、侧栏项高 32
- 舒适密度 ×1.25、紧凑 ×0.85（已有 `densityStore`，接入新间距 token）

### 5. 微交互（实现层）

- **hover**：背景 +1 亮度 / `translateY(-1px)` + `--elev-2`
- **active**：`scale(.98)`
- **focus-visible**：2px accent outline, offset 2
- **过渡**：150ms（快，颜色/变换） / 300ms（布局）

## 交付与流程

1. 本方案文档 `VISUAL_POLISH_PLAN.md`
2. P0 桌面壳 HTML 高保真原型 `p0-shell.html`（明暗一键切换）作视觉示范
3. 用户评审确认方向
4. 铺开知识图谱 / 设置帧，并将结构层规范同步回 Ardot 稿（受画布上限，仅结构精度：圆角、图标、层级、留白）

# 06 · 设置（Settings）规范

> 对应 `panels/settings/*` + `styles/panels/settings.css`。各分区已接入真实 store（`useSettings` / `useLanguage` / `UserProfileStore` 等）并持久化到 localStorage。

## 1. 顶栏与 Tab

- 分类 Tab（顶部水平排列，每项含内联图标）：`用户`(`user`) / `通用`(`settings`) / `外观`(`sun`) / `编辑器`(`edit`) / `图片`(`image`) / `导出`(`export`) / `数据`(`save`) / `快捷键`(`command`) / `关于`(`info`)。
- `用户`：账户设置（昵称 / 头像 / 生日），侧栏头像点击经 `nav('settings','user')` 直达；写入即持久化（`markcraft.userprofile`）。
- 默认激活：`通用`（经 `initialCategory` 入参可定位到任意分类）。

## 2. 各分区控件

**通用（GeneralSection）**
- 启动与恢复：启动时打开上次的文件（Switch，默认 true）；自动保存（Switch，默认 true）
- 语言与地区：界面语言（select：简体中文/繁體中文/English/日本語，默认 zh-CN）
- 更新：自动检查更新（Switch，默认 true）
- 隐私：发送匿名使用数据（Switch，默认 false）

**外观（AppearanceSection）**
- 主题模式（select：跟随系统/浅色/深色，默认 dark）
- 布局密度（select：舒适/紧凑，默认 comfortable）
- 界面字号（select：12–16px，默认 14）
- 减少动画（Switch，默认 false）
- 显示状态栏（Switch，默认 true）；侧边栏位于右侧（Switch，默认 false）

**编辑器（EditorSection）**
- 编辑体验：拼写检查（Switch，默认 false）；智能标点（Switch，默认 true）；段首缩进（Switch，默认 false）
- 自动配对：括号（Switch，默认 true）/ 引号（Switch，默认 true）/ Markdown（Switch，默认 true）
- 字体与排版：编辑器最大宽度（number，400–2000，默认 720）；Tab 宽度（select 2/4/8，默认 2）；代码块默认语言（text，默认空）
- ⚠️ 会话态开关（自动补全 / 专注模式 / 打字机模式 / 实时预览）仅由编辑器内联控制，**不在此处暴露**（避免与编辑器内联开关重复指向同一全局状态）。

**快捷键（ShortcutsSection）**
- 搜索输入框 + 4 组：文件(5) / 编辑(7) / 视图(6) / Markdown(6)。
- ⚠️ `Ctrl B` 被重复绑定两次（`切换侧边栏` 与 `粗体`）。

**关于（AboutSection）**
- 标志字符 `M` + 名称 Markcraft + 版本 `v2.0.0 (Aurora)` + 构建 `2024.08.23`。
- 按钮：检查更新（secondary）/ 更新日志（ghost）。更新日志：v2.0.0 & v1.8.0；致谢；相关链接 6 项。无 Switch。

## 3. 控件类型

- 全部使用 `Switch` 与 `select`（`Button` 仅用于关于页）。⚠️ `Switch` 目前从 `components/ui/Badge` 导出（与 `Checkbox` 同文件），非独立模块。

## 4. 未实现 / 范围外（本面板）

- 无导出；除快捷键内的搜索外无全局搜索；无 Segmented/开关组控件；关于页无 Switch。
- 所有控件当前为演示态，改动不持久化、不联动真实偏好。

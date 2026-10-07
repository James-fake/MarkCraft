


# ✨ MarkCraft

### 现代化 Markdown 编辑器 · 个人知识工坊 · 博客生成器

一款基于 React + TypeScript 构建的浏览器端 Markdown 编辑器，集成双引擎编辑、知识链接体系、3D 知识图谱、Excalidraw 白板、AI 知识库、64 种主题的博客工坊，让笔记从「孤岛」连接成「网络」，再让知识库成为「第二大脑」。

> 🌈 **MarkCraft** = `Markdown` + `Craft`，意为「**雕琢你的笔记**」 ✨

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)

![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)

![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite&logoColor=white)

![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D307075?logo=codemirror&logoColor=white)

![Tiptap](https://img.shields.io/badge/Tiptap-3.24-0DBDE7)

![Excalidraw](https://img.shields.io/badge/Excalidraw-0.17-6965F6)

![tldraw](https://img.shields.io/badge/tldraw-5.2-000000)

![Dexie](https://img.shields.io/badge/Dexie-4.4-FF7043)

![License](https://img.shields.io/badge/License-MIT-success)

![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff69b4)

![编辑器](https://img.shields.io/badge/双引擎-编辑器-blueviolet)

![白板](https://img.shields.io/badge/白板-Excalidraw%20混合引擎-9333EA)

![知识库](https://img.shields.io/badge/知识库-AI%20智能化-EC4899)

![知识图谱](https://img.shields.io/badge/知识图谱-3D%20球体-orange)

![博客](https://img.shields.io/badge/博客-64%20主题-critical)

![导出](https://img.shields.io/badge/导出-12%20格式-success)

### 🎯 功能一览

|        模块       |   数量   | 说明                               |
| :-------------: | :----: | :------------------------------- |
|      📝 编辑器     |  2 种引擎 | CodeMirror 6 源码 + Tiptap 所见即所得   |
| 🎨 白板 Canvas v2 |  混合引擎  | Excalidraw + HTML 卡片浮层 + 30+ 组件  |
|      📚 知识库     | 11 大模块 | 多库管理 · AI 盲区 · 学习路径 · 健康度        |
|     🔗 知识链接     |  13 项  | WikiLink / 反链 / 提及 / 嵌入          |
|     🌐 知识图谱     |  6 种布局 | 力导向 / 3D 球体 / 时间线 等              |
|     🏷️ 标签系统    |   嵌套树  | 支持 `#父/子` 多层嵌套                   |
|     🎨 博客主题     |  64 种  | 分 5 批，覆盖所有场景                     |
|     📤 导出格式     |  12 种  | Markdown → PDF / DOCX / EPUB ... |
|      ⌨️ 快捷键     |  28 项  | 格式/文件/视图/编辑/插入                   |
|      🎨 主题      |  5+6 种 | 5 编辑器主题 + 6 代码主题                 |
|     📋 命令面板     |  25 项  | 6 大分类，模糊搜索                       |
|     🤖 AI 能力    |   6 项  | 盲区 / 问答 / 推荐 / 语义搜索 / 聚类         |
|      💾 存储      |   双层   | localStorage + IndexedDB（Dexie）  |


---

## 📑 目录


| 📖 导航 | 🛠️ 技术 | 📦 使用 |
| :---: | :----: | :---: |
| 见下方分组 |  见下方分组 | 见下方分组 |


<details>

<summary><b>📖 内容导航</b>（点击展开/折叠）</summary>

- [✨ 核心特色](#核心特色)
- [📝 编辑核心](#编辑核心)
- [✅ 语法检查](#语法检查)
- [📇 Front Matter](#front-matter-支持)
- [🔗 知识链接体系](#知识链接体系)
- [🏷️ 标签系统](#标签系统)
- [🧭 MOC 生成器](#moc-生成器)
- [🌐 知识图谱](#知识图谱)
- [🎨 Canvas v2 白板](#canvas-v2-白板)
- [📚 知识库系统](#知识库系统)
- [🤖 AI 能力](#ai-能力)
- [🎨 个人博客工坊](#个人博客工坊)
- [🖱️ 界面与体验](#界面与体验)
- [📁 文件管理](#文件管理)
- [📤 导出](#导出)
- [🧮 数学公式与图表](#数学公式与图表)
- [📋 大纲导航](#大纲导航)

</details>

<details>

<summary><b>🛠️ 技术与开发</b>（点击展开/折叠）</summary>

- [🛠️ 技术栈](#技术栈)
- [📦 项目结构](#项目结构)
- [🚀 快速开始](#快速开始)
- [📖 使用指南](#使用指南)
- [🔧 配置说明](#配置说明)
- [👨‍💻 开发者指南](#开发者指南)
- [🗺️ 路线图](#已知问题与路线图)
- [🙏 鸣谢](#鸣谢)

</details>

---

## ✨ 核心特色

> 💡 **一句话概括**：把笔记从「孤岛」连成「网络」，让白板成为「思考画布」，让知识库成为「第二大脑」，再用一键博客把网络分享出去。


|      🎨     |      🎭      |     📚     |       🔗       |      🌐     |         🪧        |       🚀      |
| :---------: | :----------: | :--------: | :------------: | :---------: | :---------------: | :-----------: |
| **64 博客主题** |   **双引擎编辑**  | **AI 知识库** |   **13 项链接**   | **6 种图谱布局** | **Excalidraw 白板** |  **12 种导出格式** |
|   覆盖全场景审美   | CM6 + Tiptap |  盲区/路径/问答  | WikiLink/反链/嵌入 |   含 3D 球体   |     卡片 + 画笔混合     | PDF/DOCX/EPUB |


- 🎯 **双引擎编辑** — CodeMirror 6 源码 + Tiptap 所见即所得，一键切换
- 🪧 **Canvas v2 白板** — Excalidraw 底层 + HTML 卡片浮层 + CanvasEngine 适配器，混合画笔与卡片
- 📚 **AI 知识库系统** — 多库管理、健康度评分、盲区分析、学习路径、写作目标、KB 问答
- 🔗 **知识链接体系** — WikiLink 双向链接、反向链接、未链接提及、嵌入引用
- 🌐 **3D 知识图谱** — 6 种布局，含自动旋转的 3D 球体与中心性分析
- 🏷️ **嵌套标签系统** — 支持 `#父/子` 多层嵌套，自动构建标签树
- 🎨 **64 种博客主题** — 杂志/极简/赛博朋克/水墨禅意... 覆盖所有审美
- 📤 **12 种导出格式** — Markdown / HTML / PDF / Word / EPUB / LaTeX ...
- ⌨️ **28 项快捷键** — 全套格式化与文件操作快捷键
- 🎴 **5+6 种主题** — 编辑器主题 + 独立代码主题
- 💾 **双层存储** — localStorage（文件树）+ IndexedDB/Dexie（知识库/白板/向量索引）
- 🤖 **本地 AI** — `@xenova/transformers` 浏览器端推理，语义搜索/聚类无需后端
- 🌍 **中英双语** — 界面全国际化

**运行环境**：纯前端应用，文件树存 localStorage，知识库/白板存 IndexedDB，所有 AI 推理在浏览器本地完成，无需后端服务。


### 🎬 工作流程

```mermaid
flowchart LR
    A[📝 编写笔记<br/>CodeMirror / Tiptap] --> B[🔗 建立链接<br/>WikiLink / 标签]
    B --> C[🌐 图谱可视化<br/>3D 球体]
    C --> D[🎨 生成博客<br/>64 主题]
    D --> E[📤 导出分享<br/>12 格式]
```

> 💡 **6 步知识工坊** — 写笔记 → 建链接 → 看图谱 → 画白板 → 出知识库 → 发博客 ✨


---

## 📋 主要功能


---

### 🎯 11 大功能模块 · 全栈式知识管理

### 📝 编辑核心


**18 项编辑器核心功能** ✨ — 从源码到所见即所得，从格式化到自动补全


- 🎭 **双引擎编辑器** — CodeMirror 6（源码模式）+ Tiptap（所见即所得模式），一键切换
- 🔄 **实时预览** — 编辑区与预览区双向滚动同步，8ms 节流 + 平滑动画
- 🌈 **语法高亮** — 基于 highlight.js + lowlight 支持 21+ 种编程语言代码高亮，深色/浅色主题自适应
- 🎨 **彩虹括号** — 代码块内括号按层级染色，便于匹配
- 🔗 **自动配对** — 括号 `()`、`[]`、`{}`、引号 `""`、`''`、反引号自动补全
- ✨ **Markdown 自动补全** — 输入 Markdown 语法触发词时自动补全完整语法结构（链接、图片、代码块、表格等 8 种规则）
- ⌨️ **代码块补全** — 输入第三个反引号时自动生成完整代码块，工具栏选择语言后直接插入空代码块
- 📐 **智能缩进 / 退格** — Tab 增加 2 空格缩进，Shift+Tab 反缩进；代码块智能缩进
- ↩️ **撤销/重做** — 自定义操作分组历史栈，最多 100 步历史记录，支持事务性操作
- 🔍 **搜索替换** — 当前文件内搜索替换，支持匹配导航和搜索历史
- 🌍 **全局搜索** — `Ctrl+Shift+F` 跨所有文件搜索内容，按文件分组展示
- 🖼️ **图片处理** — 粘贴/拖拽/上传图片，占位符系统替代 Base64，编辑区内联预览
- 🗑️ **智能图片删除** — 光标在图片标记内时 Backspace/Delete 删除整个图片标记
- 📊 **表格编辑** — 快速插入 + 可视化高级编辑器，支持行列增删、对齐、Tab 导航、右键菜单
- 🛠️ **格式化工具栏** — 加粗、斜体、标题、列表、引用、代码块、Emoji、思维导图等按钮
- 📈 **文档统计** — 字数（纯文本/标准模式）、字符数、行数、阅读时间实时统计
- ⚡ **Slash 命令** — WYSIWYG 模式输入 `/` 触发快捷命令菜单，快速插入 Mermaid、思维导图、数学公式、脚注、表格、代码块等
- ✅ **拼写检查** — 源码模式下内置拼写检查扩展
- 🔤 **智能标点** — 自动转换直引号为弯引号等排版优化
- 💬 **Callout / Admonition** — 11 种类型提示框，支持可折叠
- 📋 **定义列表 / 缩写标记 / 注释** — 扩展 Markdown 语法支持

### ✅ 语法检查

- 🔍 **实时检测** — 7 类 Markdown 语法错误，波浪线标记 + 行尾圆点（红色=错误，黄色=警告）
- 💬 **悬浮面板** — 鼠标悬停状态栏计数弹出 LintPopover 问题列表
- 🛠️ **一键修复** — 可修复的问题右侧显示按钮，点击自动修复
- 🚫 **占位符感知** — 语法检查自动跳过图片占位符标记，避免误报

| 检测规则          | 严重性           | 可自动修复 |
| ------------- | ------------- | ----- |
| 未闭合的代码块       | error         | 是     |
| 链接格式不完整/空链接   | error/warning | 是     |
| 标题层级跳跃/缺空格    | warning       | 是     |
| 列表标记缺空格/缩进混用  | warning       | 是     |
| 反引号数量为奇数      | error         | 是     |
| 图片格式不完整/缺替代文字 | error/warning | 是     |
| 分割线混用字符       | warning       | 是     |

### 📇 Front Matter 支持


```
---                          📄 YAML 元数据
title: 我的笔记
date: 2026-07-08
tags: [笔记, 知识]            🔍 自动提取
category: 技术
draft: false
---
```


- 📄 **YAML 解析** — 自动解析 Markdown 文件头部的 `---` 包裹的 YAML 元数据
- 📝 **可视化编辑面板** — 标题、日期、标签、分类、描述、作者、封面图、slug、草稿、系列等字段表单化编辑
- 🔍 **自动提取** — 从 Front Matter 中提取标题作为文档显示名，提取标签用于博客生成

### 🔗 知识链接体系


| 🔗 WikiLink | ↩️ 反向链接 | 💡 未链接提及 |  📎 嵌入引用  |
| :---------: | :-----: | :------: | :-------: |
|   `[[目标]]`  |  谁引用了我  |  自动检测提及  | `![[目标]]` |


MarkCraft 内置完整的知识管理体系，让笔记从「孤岛」连接成「网络」。详细用法请参考应用内的《知识链接体系指南》。

- 🔗 **WikiLink 双向链接** — `[[目标]]` 或 `[[目标|显示文字]]`，建立笔记间的关联
- 💬 **关系标注** — `[[目标|关系:类型]]`（引用/支撑/反驳/延伸/相关/示例）、`[[目标|备注:内容]]`
- 🔍 **自动补全** — 输入 `[[` 弹出文件名模糊搜索，支持标题、路径、标签联想
- 👁️ **悬浮预览** — 鼠标悬停 WikiLink 显示目标文档摘要
- ⚠️ **断链检测** — 目标不存在时以红色虚线下划线标记
- 📎 **嵌入引用** — `![[目标]]` 直接展示另一篇笔记内容，源文件更新自动同步
- ↩️ **反向链接面板** — 显示哪些笔记引用了当前笔记，含上下文片段
- 💡 **未链接提及** — 检测正文中提到但未用 `[[]]` 包裹的提及，可一键转为正式链接
- 📊 **链接健康面板** — 仪表盘统计（总链接/断链/孤儿文件/平均密度/Top 出入链）、批量创建缺失文件、链接重定向
- 🗺️ **链接小地图** — Canvas 绘制当前文件的反链与出链可视化预览
- 🔎 **链接搜索** — 跨文件搜索所有 WikiLink 引用关系
- 🧭 **路径解析** — 支持 `[[文件名]]`、`[[文件夹/文件名]]`、`[[文件名#标题]]`，自动去除 `.md` 后缀

### 🏷️ 标签系统


```
#父标签
├── #父/子标签A          🌳 嵌套树
├── #父/子标签B
└── #父/子/孙标签C        ↳ 支持多层嵌套
```


- 🏷️ **标签提取** — `#标签` 自动提取，支持中英文、数字、斜杠嵌套（`#父/子`）
- 🌳 **标签树** — 嵌套树形展示，折叠/展开，统计每个标签（含子标签）的关联文件数
- 📋 **标签面板** — 右键重命名、查看详情、生成 MOC
- 🗂️ **标签索引** — `TagIndexStore` 维护标签到文件集合的映射，支持路径前缀查询（含子标签）

### 🧭 MOC 生成器

MOC（Map of Content，内容地图）自动生成聚合指定主题的索引文档：

- 🏷️ **标签模式** — 以某标签为根，聚合所有关联文件
- 🎯 **中心文件模式** — 以某文件为中心，BFS 遍历邻居到指定深度
- 📋 **三种模板** — `simple`（简单列表）/ `summary`（带摘要）/ `hierarchical`（层级分组）

### 🌐 知识图谱

全屏 Canvas 可视化，将笔记间的链接关系以图形方式呈现。快捷键 `Ctrl+Shift+G`。


```mermaid
graph TD
    C(🟢 中心节点)
    H(🟣 Hub)
    R1(🔵 引用)
    R2(🔵 引用)
    R3(🔵 引用)
    R4(🔵 引用)
    X(⚠️ 反驳):::red
    I(⚪ 孤立):::orange
    C --- H
    C --- R1
    C --- R2
    C --- R3
    C --- R4
    C -.->|反驳| X
    C -.->|孤立| I
    classDef red stroke:#EF4444,stroke-dasharray:5 3,color:#EF4444
    classDef orange stroke:#F59E0B,stroke-dasharray:2 4,color:#F59E0B
```

> 🎯 **图谱 = 你的第二大脑** — 节点（圆/菱形）= 笔记/标签，边 = 链接关系


#### 6 种布局算法

| 布局                 | 算法                       | 适用场景        |
| ------------------ | ------------------------ | ----------- |
| 力导向 `force`        | D3 风格物理模拟（斥力 + 引力 + 中心力） | 探索性可视化，自然聚类 |
| 径向 `radial`        | 按 BFS 深度分层同心圆            | 以某文件为中心展开   |
| 层次 `hierarchical`  | 拓扑排序分层                   | 文档依赖关系      |
| 圆形 `circular`      | 均匀圆周分布                   | 简洁总览        |
| **3D 球体 `sphere`** | Fibonacci 球面分布 + 透视投影    | 美观展示，自动旋转   |
| 时间线 `timeline`     | 按文件名 YYYY-MM-DD 排序       | 日记/时间序列     |

#### 🌐 3D 球体布局





- 🌐 **Fibonacci 球面分布** — 黄金角度均匀分布节点，无极点聚集
- 🎯 **透视投影** — `z` 轴近大远小，模拟 3D 深度
- 🔄 **自动旋转** — Y 轴缓慢旋转，拖拽时暂停便于操作
- 🛤️ **节点轨道** — 拖拽节点松开后，节点从放置位置开始围绕球心轨道旋转
- 🖱️ **球体布局交互** — 拖拽节点自由移动、拖拽空白平移视图、滚轮缩放（0.08x - 6x）

#### 👁️ 视觉与交互特性

- 🎨 **节点样式** — 文件节点（圆）/ 标签节点（菱形），大小随连接数增大
- 🌈 **颜色区分** — 普通蓝、Hub 紫（高连接）、中心绿、孤立灰、8 种社区色
- ✏️ **关系边着色** — 引用蓝、反驳红（虚线流动）、支撑绿、延伸紫（点线）、相关灰、示例琥珀
- ✨ **节点发光** — 选中节点脉冲呼吸动画，Hub 节点光晕
- 📦 **多节点框选** — Ctrl + 拖拽框选，批量操作（隐藏 / 设为中心 / 复制链接）
- 🔗 **拖拽创建链接** — 拖拽节点到另一节点，弹出关系类型选择器，自动写入 `[[target|关系:类型]]`
- 🖱️ **右键菜单** — 设为中心 / 隐藏 / 展开邻居 / 复制链接 / 查看详情
- 📊 **详情面板** — 展示入链、出链、标签、健康评分
- 🎬 **节点淡入淡出** — 增量更新时 300ms 平滑过渡

#### 📊 分析功能

- 🛤️ **最短路径** — BFS 查找两节点间最短路径，高亮显示
- 🏆 **PageRank 中心性** — 迭代 20 次计算节点重要度
- 🌉 **介数中心性 Betweenness** — 最短路径统计桥接节点
- 🏘️ **团簇发现** — 社区链接密度检测，>10 节点可聚合为单节点，双击展开
- 📸 **图谱快照** — localStorage 自动快照，对比模式显示新增/删除/修改差异，时间轴滑块切换
- 📊 **分析报告** — 一键生成 Markdown 报告（总览 / 拓扑 / 社区 / 中心性 / 优化建议），可复制或导出

#### 🎨 图谱配色

跟随 MarkCraft 全局主题（深色 / 浅色），通过 MutationObserver 监听 `data-theme` 实时切换，无需单独配置。

#### 📤 多格式导出

SVG 矢量图、Mermaid（`graph LR`）、Graphviz DOT（`digraph`）、JSON 结构化数据。

#### ⚡ 性能优化

- 🎚️ **LOD 分层** — 缩放 <0.3 仅圆点、0.3-0.6 显示标签、>0.6 完整渲染
- ✂️ **视口裁剪** — 只渲染可见区域节点
- 🗂️ **离屏 Canvas** — 静态层（边、网格）独立缓冲，脏标记重绘
- 🚀 **空间索引** — `SpatialIndex` 网格哈希，`findNodeAt` 从 O(N) → O(1)
- 📦 **批量绘制** — 同色边合并为单次 stroke
- 🏘️ **大图聚合** — >300 节点按社区聚合显示
- 🔄 **增量更新** — 订阅 `indexVersion`，单文件变更不重建全图

---

## 🎨 Canvas v2 白板


**🪧 Excalidraw 底层 + HTML 卡片浮层 + CanvasEngine 适配器**

`feature flag: VITE_CANVAS_ENGINE=excalidraw`


MarkCraft 的白板模块采用「混合引擎」架构：底层使用 Excalidraw 提供手绘风格的自由绘制，上层叠加 HTML 卡片浮层（`data-card-overlay`）承载富文本笔记、文件引用、嵌入内容，二者通过 `CanvasEngine` 适配器（鸭子类型伪装 tldraw Editor API）统一调度。

### 🧩 混合引擎架构

| 层       | 实现                             | 职责                            |
| ------- | ------------------------------ | ----------------------------- |
| 底层画布    | Excalidraw（z-0）                | 自由绘制、矩形/椭圆/箭头/文本/连线           |
| HTML 浮层 | `CardOverlay` / `OverlayCards` | 富文本卡片、文件引用、嵌入内容               |
| 适配器     | `CanvasEngine`                 | 鸭子类型伪装 tldraw Editor API，统一调度 |
| 持久化     | `canvasPersistence.ts`         | IndexedDB 序列化 / 加载            |

### 🎴 7 种卡片形状

| 形状                      | 说明                     |
| ----------------------- | ---------------------- |
| 📝 `NoteCardShape`      | 文本笔记卡片                 |
| 📁 `FileCardShape`      | 文件引用卡片（关联 Markdown 笔记） |
| 🔗 `EmbedCardShape`     | 嵌入引用卡片（嵌入另一篇笔记内容）      |
| 📦 `GroupCardShape`     | 分组卡片（聚合多卡片）            |
| 🖼️ `ImageCardShape`    | 图片卡片                   |
| 🗂️ `NestedCanvasShape` | 嵌套白板（白板中的白板）           |
| 🔗 `CanvasRefShape`     | 跨白板引用卡片                |

### 🛠️ 30+ 功能组件

- 🪧 **顶栏 Topbar** — 视图模式切换、保存状态、分享、导出
- 🎈 **浮动工具泡 FloatingToolbar** — 智能避障选位（6 候选位 × 最小重叠面积）
- 📐 **底栏 BottomBar** — 选择/拖拽/画笔/橡皮/矩形/椭圆/箭头/文本/🏷标签 + 「更多」
- 🖱️ **右键菜单 ContextMenu** — 上下文操作
- ⌨️ **命令面板 CommandPalette** — 快捷命令模糊搜索
- 📋 **图层面板 LayersPanel** — 卡片层级管理
- ⚙️ **属性面板 PropertyPanel** / `CardPropertyPanel` — 卡片属性编辑
- 🔍 **搜索面板 SearchPanel** — 全白板搜索
- 📑 **模板管理 TemplateManager** / `TemplatePicker` — 白板模板
- 🎁 **资源库 ResourceLibrary** — 复用资源
- ⭐ **收藏面板 FavoritesPanel** / `PinnedCards` — 收藏/置顶
- 📊 **文件列表 FileListPanel** — 关联文件管理
- 🧭 **自动布局 LayoutToolbar** / `AutoLayoutPanel` — force / tree / hierarchy 布局
- 📈 **演示模式 PresentationPanel** / `PresentationViewer` — 卡片演示播放
- 🔗 **关系编辑 RelationEditor** / `RelationTypeSelector` — 卡片关系标注
- 🌐 **知识图谱 KnowledgeGraph** / `BacklinkGraph` — 白板内反链可视化
- 🎨 **背景选择 BackgroundPicker** — 网格 / 点阵 / 无
- 🧹 **橡皮擦** — 局部擦除（free-draw capsule 分段、其它图元整删、卡片代理不擦）
- 📤 **导入导出** — JSON / PNG / SVG，支持文件/文件夹导入
- 🔗 **箭头绑定** — `createBoundArrow` + 卡片 `boundElements` + 移动后 `refreshArrowsForCard`
- ↩️ **撤销历史** — `scheduleHistory()` + `sceneSignature()` 图元指纹判定 + `emit('session')`
- 📋 **画布列表 CanvasListPanel** — 多白板管理
- 📤 **分享 ShareDialog** — 分享链接
- 🎯 **过滤 FilterPanel** — 按标签/类型过滤卡片
- 🌗 **暗色模式** — 跟随全局主题
- 🖱️ **双击/长按手势** — 卡片创建/编辑

### ⚡ 关键技术铁律

- **浮层 z-index**：需盖在画布/底栏之上的浮层（下拉、滑动条、选区框、工具泡）必须 portal 到 `.canvas-v2-root` 或 z-index > 100，否则被 root（fixed, z-100）整体压住而"消失"
- **Excalidraw 资源本地化**：`window.EXCALIDRAW_ASSET_PATH='/excalidraw-assets/'`，`vite.config.ts` 的 `excalidrawLocalAssets()` 在 dev/preview/build 时 heal `.DELETE.<hash>` 字体
- **zoom 必须是 `{value:number}`**：写缩放 `updateScene({appState:{zoom:{value}}})`，读取用 `zoom.value`；裸数字写回 → NaN 坐标 → 同步递归 `Maximum call stack`
- **卡片选中框 = 卡片子元素**：选择框渲染为选中 `CardLayer` 的内部子元素（共享 transform/z-index），杜绝"框跑到背后"

---

## 📚 知识库系统


**📚 P7 智能化系统 · 11 大模块 · IndexedDB 持久化 · 本地 AI 推理**

`Atelier Glass` 玻璃质感设计 · 多知识库并行管理


MarkCraft 的知识库系统是「第二大脑」：在文件树之上构建多个独立的知识库，每个知识库关联一个专属文件夹、若干白板、规则筛选、博客配置，并提供 AI 驱动的盲区分析、学习路径推荐、健康度评分、KB 问答等智能化能力。元数据存 IndexedDB（Dexie），文件树存 localStorage。

### 🎛️ 11 大功能模块

| 模块          | 说明                                     |
| ----------- | -------------------------------------- |
| 📊 **概览**   | 知识库统计（文件数/字数/标签/活动热力图）、健康度评分环形图、Top 标签 |
| 📝 **笔记**   | 知识库笔记列表、新建笔记（名称弹窗 + 保存确认弹窗 + 列表自动刷新）   |
| 🔍 **搜索**   | 跨库搜索、高级筛选器、保存查询预设                      |
| ✅ **任务**    | 任务清单、关联笔记、进度追踪                         |
| 🎯 **目标**   | 写作目标（字数/篇数/截止日期）、进度可视化                 |
| 📅 **回顾**   | 间隔重复回顾计划、定期复习                          |
| 💬 **问答**   | KB 问答面板（基于 RAG，本地向量检索）                 |
| 🔗 **依赖**   | 文件依赖关系图、循环引用检测                         |
| 🗺️ **MOC** | 自动生成内容地图（标签模式 / 中心文件模式 / 3 种模板）        |
| 💡 **盲区**   | AI 知识盲区分析、未覆盖主题、推荐补充方向                 |
| 📤 **导出**   | 文档导出 / 静态站点导出 / 分享打包                   |

### 🤖 AI 能力（6 项，本地推理）

| 能力       | 实现                     | 说明                          |
| -------- | ---------------------- | --------------------------- |
| 🎯 盲区分析  | `blindSpotAnalyzer.ts` | 基于标签覆盖度 + TF-IDF，识别知识盲区     |
| 💬 KB 问答 | `kbChat.ts`            | RAG 检索 + 上下文拼接              |
| 🎁 推荐    | `recommender.ts`       | 相似文件推荐、关联笔记推荐               |
| 🔎 语义搜索  | `semanticSearch.ts`    | `@xenova/transformers` 向量检索 |
| 🏷️ 主题聚类 | `topicClusterer.ts`    | K-Means 主题聚类                |
| 🤖 AI 服务 | `aiService.ts`         | 统一 AI 服务入口                  |

### 🩺 健康度评分系统

`healthScore.ts` 综合评估知识库健康度（0-100 分）：

- 📊 **覆盖度** — 标签/主题覆盖广度
- 🔗 **链接密度** — 笔记间互联程度
- 🌐 **图谱连通性** — 孤儿文件占比、平均路径长度
- 📈 **活跃度** — 最近活动时间、更新频率
- 🏷️ **标签均衡** — 标签使用分布

### 📋 知识库模板

`templates/kbTemplates.ts` 提供预设知识库模板（学习计划、研究项目、读书笔记等），一键创建带预设规则、文件夹结构、写作目标的知识库。

### 💾 存储架构

| 数据     | 存储位置                    | 说明                                |
| ------ | ----------------------- | --------------------------------- |
| 知识库元数据 | IndexedDB（Dexie `kv` 表） | `kb-list` 列表 + `kb-doc-{id}` 单文档  |
| 文件树    | localStorage            | `markdown-editor-data`            |
| 白板     | IndexedDB               | `canvas-list` + `canvas-doc-{id}` |
| 向量索引   | IndexedDB               | 语义搜索用                             |

### 🔑 关键技术铁律

- **全屏覆盖层必须 portal 到 `#kb-overlay-root`**：`KbChatPanel`、`KbExportMenu` 等用 `position:fixed; inset:0` 的面板必须渲染在 `.kb-shell` 内 `#kb-overlay-root`（由 `KbDashboard` 的 `useEffect` 创建），不可直接放在 `.kb-content-inner` 内（其 `animation: kbTabIn` 冻结 transform 会成为 fixed 的 containing block → 高度塌缩为 0 → 界面空白）
- **`kb.folderId` 与 `rootFolder` 存储分离**：KB 元数据存 IndexedDB，文件树存 localStorage，二者可能不同步（清缓存/换设备）。`addChildNode` 找不到 `parentId` 时**静默失败** → 任何依赖 `folderId` 的操作都必须先 `findNode(rootFolder, kb.folderId)` 校验，丢失时 `createFolder('root', kb.name)` 重建 + `saveKb` 更新元数据
- **视图切换避免互斥条件**：禁止用 `!activeKbId` vs `activeKbId && activeKb` 互斥切换组件——`activeKb` 异步加载时两个条件同时不满足 → 主编辑器透出 → 闪烁。采用「底层常驻 + 覆盖层切换」：KbManager 在 `showKbManager` 期间常驻挂载，KbDashboard/KbNoteViewer 以 `position:fixed; inset:0` 覆盖在上
- **笔记列表刷新**：`KbNoteViewer.onClose` 中调用 `loadActiveKb(activeKbId)` 重新加载 KB 元数据 → `kbFiles` useMemo（`[kb, rootFolder]`）重算 → 列表立即刷新

### 📝 笔记功能

- ➕ **新建笔记** — 点击「新建笔记」按钮弹出名称输入弹窗（Enter 确认 / Esc 取消），输入名称后 `createFile(folderId, name, '', false)` + 进入 KbNoteViewer 编辑模式
- 💾 **保存确认弹窗** — 新建笔记退出编辑模式时弹窗询问「保存/不保存」；点击「保存」保留笔记，点击「不保存」`deleteNode(fileId)` 删除
- 🔄 **列表自动刷新** — 编辑器关闭后 `loadActiveKb` 触发 `kbFiles` 重算，新建笔记立即出现在列表中
- ✏️ **KbNoteViewer** — 全屏笔记编辑器（H1 标题区 + TipTap/CodeMirror 正文区 + 源码/所见即所得/预览切换），与点击已有笔记打开的同一编辑器

---

### 🎨 个人博客工坊


---

**🎨 64 主题 · 12 色环 · 3 设备预览 · 5 部署平台 · 3 评论系统**


- 🎨 **Blog Studio** — 独立全屏设计工作室，深色工作台 + 专业设计工具风格界面
- 🎭 **64 种博客风格** — 分 5 批，一键切换，实时预览，覆盖个人博客、杂志、作品集、技术、摄影、文档、创意等场景
- 🎨 **12 色环配色 + 自定义** — 红/橙红/橙/橙黄/黄/黄绿/绿/蓝绿/蓝/蓝紫/紫/紫红 + 自定义色值
- 🎚️ **色彩调节** — 亮度 / 饱和度 / 锐度三轴调节
- 📁 **文件选择/排除** — 勾选需要包含的 Markdown 文档，排除不想加入博客的文件
- 👁️ **实时预览** — iframe srcdoc 沙箱预览，500ms 防抖更新
- 📱 **设备模拟** — 桌面/平板/手机三种预览尺寸切换
- 📄 **单文件 SPA 生成** — 博客输出为单个 HTML 文件，包含 hash 路由导航
- 📦 **多文件导出** — 支持导出为文件夹结构（ZIP 下载）
- 🚀 **博客部署** — 支持 GitHub Pages / Gitee Pages / Vercel / Cloudflare Pages / Netlify 一键部署
- 💬 **评论系统** — 支持 Giscus / Utterances / Waline 三种评论系统
- 📑 **TOC 目录** — 博客文章自动生成可跳转的目录导航，支持 sticky 定位和滚动联动
- 🔍 **站内搜索** — 博客内置全文搜索功能
- 📡 **RSS 订阅** — 自动生成 RSS feed
- 🗺️ **Sitemap** — 自动生成 sitemap.xml
- 📅 **归档页面** — 按日期归档文章
- 🏷️ **标签页面** — 按标签分类文章
- 👤 **关于 / 友链 / 系列页面** — 完整的站点子页面
- 📲 **PWA 支持** — 可选开启 PWA 离线访问
- 🔗 **分享按钮** — 社交平台一键分享
- 📊 **Mermaid 图表** — 博客内 Mermaid/思维导图代码块自动渲染为可视化图形
- 🧮 **KaTeX 公式** — 博客内数学公式自动渲染
- 🎨 **自定义 CSS** — 支持自定义 CSS 注入（含暗色模式专用 CSS），实时预览效果
- 🔍 **SEO 优化** — 自动生成 meta 标签、Open Graph、JSON-LD 结构化数据
- 👍 **阅读量 / 点赞** — 可选开启不蒜子统计与文章点赞

#### 🎭 博客风格分类

64 种主题分 5 批，按场景分类：


|   个人博客 📝  |  杂志资讯 📰  |  作品集 🖼️ |  技术博客 💻  |
| :--------: | :-------: | :------: | :-------: |
|  magazine  | newspaper | showcase |  terminal |
|   minimal  | editorial |  gallery |   hacker  |
|   classic  |  dispatch |   bento  |    docs   |
| typewriter |  magazine |  mosaic  |    wiki   |
|   poetry   |           |          | blueprint |

|   摄影 📷   |   文档 📚  |    创意 🎨    |  自然 🌿 |  复古 🕰️  |
| :-------: | :------: | :---------: | :----: | :------: |
| cinematic |   docs   |  cyberpunk  | garden |   retro  |
|   carbon  |   wiki   |  vaporwave  | forest | ink-wash |
|    noir   | academia |  steampunk  |  ocean |  ramsay  |
|           |  notion  |    pixel    | aurora |  artdeco |
|           |          | neumorphism |   zen  |          |


| 场景 | 示例主题                                                   |
| -- | ------------------------------------------------------ |
| 其他 | glassmorphism、claymorphism、brutalist、corporate、fashion |

#### ⚙️ 博客配置选项

- 站点标题、描述、作者、语言（zh-CN / en）、每页文章数、日期格式、站点 URL
- 博客风格（64 种）
- 配色方案（12 色环 + 自定义色值，支持亮度/饱和度/锐度调节）
- 主题模式（浅色/深色）
- 字体风格（衬线 / 无衬线 / 等宽）
- 文件选择（勾选/排除 Markdown 文档）
- 评论系统（Giscus / Utterances / Waline）
- 打赏（微信/支付宝二维码）
- 关于页面（头像、简介、技能、联系方式）
- 友链管理
- 系列文章
- 部署平台（GitHub / Gitee / Vercel / Cloudflare / Netlify）
- 自定义 CSS（含暗色专用）
- 配置导入导出（JSON）

### 🖱️ 界面与体验

- 🌗 **深色/浅色主题** — CSS 变量驱动，偏好持久化到 localStorage，所有弹窗和面板跟随主题切换
- 🎨 **5 种编辑器主题** — light（默认浅色）、dark（默认深色）、github、sepia（护眼暖色）、nord，支持自定义主题（导入 CSS 解析变量）
- 💻 **6 种代码主题** — default、monokai、dracula、one-dark、github-dark、solarized，独立于编辑器主题
- 🎯 **专注模式** — `F8` 隐藏所有面板，编辑区居中 800px，增大字号和行高，当前行高亮 + 非当前行淡出
- ⌨️ **打字机模式** — `F9` 光标始终保持在编辑区垂直居中，当前行蓝色竖线高亮
- 🖥️ **全屏模式** — `F11` 最大化编辑空间
- 🎨 **创新创意艺术风格** — 渐变装饰线、SVG 图标、菱形装饰点、层级色彩系统
- 🌟 **温暖文艺主页** — 全屏沉浸式布局，鼠标跟随光效、背景流动动画、文字打字机效果、3D 卡片翻转
- 📐 **精确行号对齐** — 行号与文本行像素级对齐，统一字体/行高/内边距
- 📐 **CSS Grid 自适应布局** — 编辑区/预览区/大纲区自适应宽度，关闭预览无空白
- 🔼 **滚动按钮** — 编辑区和预览区各有一键到顶/到底悬浮按钮
- 🏠 **欢迎页面** — 温暖文艺感全屏沉浸式布局，鼠标跟随光效、4 种动效、功能卡片网格
- 🌍 **中英双语** — 界面支持中文/英文切换，所有文案均国际化
- 📋 **命令面板** — `Ctrl+P` 唤出，6 大分类 25 项命令，模糊搜索，支持中英文
- ↩️ **导航历史** — `Alt+←` / `Alt+→` 后退/前进，跨文件跳转历史
- ⚡ **快速切换器** — `Ctrl+O` 最近文件快速切换
- 💾 **崩溃恢复** — 意外关闭后自动恢复未保存内容

### 📁 文件管理

- 🌳 **文件树** — 树形结构，文件夹/文件层级管理，内置折叠按钮，拖拽排序
- 📝 **创建/删除/重命名** — 右键菜单或三点按钮操作，删除带确认对话框
- 🤝 **拖拽移动与排序** — 文件/文件夹拖拽到不同位置，三种放置区域视觉反馈
- 📑 **多标签页** — 打开多个文件，标签页切换、关闭、重排、关闭其他/右侧全部
- 🔍 **快速打开** — `Ctrl+P` 模糊搜索文件名，最近打开优先
- 💾 **自动保存** — 编辑后 500ms 防抖自动保存到 localStorage，切换文件时立即保存
- 📂 **打开本地文件** — 支持 .md 和 .markdown 格式
- 📥 **文件导入** — 支持 Markdown、Word（.docx，基于 mammoth 解析）、HTML 导入
- 📅 **日记功能** — 一键创建今日日记，文件名 `YYYY-MM-DD.md`，自动查找/创建「日记」或「Daily Notes」文件夹
- 🔖 **书签系统** — 文件书签 / 标题书签，分组管理，点击快速跳转
- 🕘 **最近文件** — 最近打开的文件列表快速访问
- 📋 **模板系统** — 可复用内容模板，`Ctrl+Alt+T` 快速插入

### 📤 导出


|    📄    |  🌐  |  📕 |  📝  |   📚  |  📨  |  🌐 |  📋  |  🌳  |  📃 | 🖼️ |  🖼️ |
| :------: | :--: | :-: | :--: | :---: | :--: | :-: | :--: | :--: | :-: | :-: | :--: |
| Markdown | HTML | PDF | Word | LaTeX | EPUB | rST | Wiki | OPML | 纯文本 | PNG | JPEG |


- 💾 **另存为** — File System Access API 优先，降级为 Blob 下载
- 📤 **12 种格式导出** — Markdown、HTML、PDF、Word（DOCX）、LaTeX、EPUB、reStructuredText、MediaWiki、OPML、纯文本、PNG 图片、JPEG 图片
- 🎨 **样式预设** — HTML / PDF 导出支持样式预设 + 自定义 CSS
- 🖼️ **图片分辨率** — PNG / JPEG 支持 1x / 2x / 3x 分辨率
- 📁 **位置选择** — 支持选择完整文件路径或目标文件夹

### 🧮 数学公式与图表

- 🧮 **KaTeX 渲染** — 行内公式 `$...$` 和块级公式 `$$...$$` 实时渲染
- 👁️ **行内预览** — 编辑区光标在公式内时显示渲染预览
- 🔣 **数学符号面板** — 常用数学符号快速插入
- 📊 **Mermaid 图表** — 支持流程图、时序图、甘特图、类图、ER 图、饼图、状态图、用户旅程图、C4 图、思维导图等，跟随主题切换
- 🧠 **独立思维导图** — Mermaid mindmap 语法，7 种节点形状，Canvas 可视化渲染，右键菜单，节点编辑器
- 📝 **脚注支持** — marked-footnote 插件，脚注侧边栏管理
- ✨ **上下标 / 高亮 / 缩写** — `H~2~O`、`x^2^`、`==高亮==`、`*[HTML]: 超文本标记语言*`

### 📋 大纲导航

- 📋 **标题树形展示** — 6 色层级色彩系统，层级缩进，折叠/展开
- 🎯 **点击跳转** — 点击标题跳转到编辑区对应行
- 🔄 **滚动联动** — 编辑区滚动时自动高亮当前标题
- 🔽 **全部展开/折叠** — 一键操作
- 📊 **统计信息** — 标题计数、最大深度指示
- ⌨️ **快捷键** — `Ctrl+Shift+O` 切换大纲显隐

---

## 🛠️ 技术栈


|    ⚛️    |      🔵      |    ⚡   |    🎨    |      📝      |    🎭    |     🪧     |
| :------: | :----------: | :----: | :------: | :----------: | :------: | :--------: |
| React 18 | TypeScript 5 | Vite 5 | Tailwind | CodeMirror 6 | Tiptap 3 | Excalidraw |
|   用户界面   |     类型系统     |  构建工具  |    样式    |     源码编辑     |    富文本   |    白板绘制    |

|      📊     |      🎨      |   🔣  |    🌐   |     💾    |        🤖       |   🧪   |
| :---------: | :----------: | :---: | :-----: | :-------: | :-------------: | :----: |
|  marked 14  | highlight.js | KaTeX | Mermaid | DOMPurify | Transformers.js | Vitest |
| Markdown 解析 |     代码高亮     |  数学公式 |   图表渲染  |    安全净化   |     本地 AI 推理    |  测试框架  |


| 类别            | 技术                                    | 版本                | 说明                               |
| ------------- | ------------------------------------- | ----------------- | -------------------------------- |
| 前端框架          | React                                 | ^18.2.0           | 函数式组件 + Hooks                    |
| 编程语言          | TypeScript                            | ^5.2.2            | strict 模式                        |
| 构建工具          | Vite                                  | ^5.2.0            | HMR + 生产优化                       |
| 样式方案          | Tailwind CSS + CSS 变量 + Inline Styles | ^3.4.3            | 原子化 + 主题变量 + 组件样式                |
| 源码编辑器         | CodeMirror 6                          | ^6.x              | 代码编辑、语法高亮、自动补全                   |
| 所见即所得编辑器      | Tiptap                                | ^3.24.0           | 富文本编辑、节点视图                       |
| **白板绘制**      | **Excalidraw**                        | **^0.17.6**       | **手绘风格自由绘制（Canvas v2 底层）**       |
| **白板引擎**      | **tldraw**                            | **^5.2.4**        | **CanvasEngine 适配器目标 API**       |
| **本地数据库**     | **Dexie**                             | **^4.4.4**        | **IndexedDB 封装（知识库/白板/向量索引）**    |
| **本地 AI 推理**  | **@xenova/transformers**              | **^2.17.2**       | **浏览器端 transformer 模型（语义搜索/聚类）** |
| **虚拟列表**      | **react-window**                      | **^2.2.7**        | **大列表虚拟滚动（知识库/白板列表）**            |
| **ZIP 打包**    | **JSZip**                             | **^3.10.1**       | **博客/白板多文件导出**                   |
| Markdown 解析   | marked                                | ^14.1.3           | GFM + breaks                     |
| 代码高亮          | highlight.js + lowlight               | ^11.11.1 / ^3.3.0 | 21+ 语言支持                         |
| Markdown→高亮集成 | marked-highlight                      | ^2.2.4            | marked 插件                        |
| 数学公式          | KaTeX                                 | ^0.16.45          | 行内 + 块级渲染                        |
| 图表渲染          | mermaid                               | ^11.14.0          | 流程图 + 思维导图                       |
| HTML→Markdown | TurndownService                       | ^7.2.4            | WYSIWYG 反向转换                     |
| HTML 净化       | DOMPurify                             | ^3.4.8            | XSS 防护                           |
| DOM diff      | morphdom                              | ^2.7.8            | 高效 DOM 更新                        |
| 脚注支持          | marked-footnote                       | ^1.4.0            | marked 插件                        |
| Word 导入       | mammoth                               | ^1.12.0           | .docx → Markdown                 |
| PDF 导出        | html2pdf.js                           | ^0.14.0           | 客户端 PDF 生成                       |
| Word 导出       | docx                                  | ^9.7.1            | 客户端 DOCX 生成                      |
| 截图导出          | dom-to-image-more                     | ^3.10.0           | PNG / JPEG 截图                    |
| 测试框架          | Vitest + Testing Library              | ^1.0.0 / ^14.0.0  | 单元测试 + 组件测试                      |

---

## 🚀 快速开始


```bash
npm install && npm run dev
```

**3 步开启你的知识工坊** ⬇️


> 🎯 **最简启动**：`npm install && npm run dev`，打开 <http://localhost:5173> 即可使用


|    🥇 步骤 1    |    🥈 步骤 2    |            🥉 步骤 3            |
| :-----------: | :-----------: | :---------------------------: |
| `npm install` | `npm run dev` | 浏览器打开 `http://localhost:5173` |
|    📦 安装依赖    |   🚀 启动开发服务器  |            🎉 开始使用            |


### 📋 环境要求

| 依赖      | 最低版本    | 推荐版本        | 说明                 |
| ------- | ------- | ----------- | ------------------ |
| Node.js | >= 16.0 | >= 18.0 LTS | JavaScript 运行时     |
| npm     | >= 7.0  | >= 9.0      | 包管理器（随 Node.js 安装） |
| Git     | >= 2.0  | 最新版         | 版本控制（可选，用于克隆仓库）    |

> **提示**：推荐使用 Node.js 18.x 或 20.x LTS 版本以确保兼容性。可使用 [nvm](https://github.com/nvm-sh/nvm)（macOS/Linux）或 [nvm-windows](https://github.com/coreybutler/nvm-windows)（Windows）管理多个 Node.js 版本。

### 🪟 Windows 安装与运行

#### 1. 安装 Node.js

**方式一：官方安装包（推荐新手）**

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 **LTS** 版本的 Windows Installer（`.msi` 文件）
3. 双击运行安装程序，勾选 **Add to PATH**，一路 Next 完成安装
4. 打开 **命令提示符** 或 **PowerShell**，验证安装：

```powershell
node --version
npm --version
```

**方式二：nvm-windows（推荐开发者）**

1. 访问 [nvm-windows Releases](https://github.com/coreybutler/nvm-windows/releases)
2. 下载最新版 `nvm-setup.exe` 并安装
3. 在命令提示符或 PowerShell 中执行：

```powershell
nvm install 20
nvm use 20
```

**方式三：winget（Windows 10/11 内置）**

```powershell
winget install OpenJS.NodeJS.LTS
```

安装完成后**重新打开终端**，验证：

```powershell
node --version
npm --version
```

> **注意**：如果安装后 `node` 命令无法识别，请检查系统环境变量 `PATH` 中是否包含 Node.js 的安装路径，或重新打开终端窗口。

#### 2. 获取项目代码

**方式一：Git 克隆**

```powershell
git clone https://github.com/your-username/markcraft.git
cd markcraft
```

**方式二：下载 ZIP**

1. 访问项目 GitHub 页面，点击绿色 **Code** 按钮
2. 选择 **Download ZIP**
3. 解压到目标目录，在终端中进入：

```powershell
cd D:\path\to\markcraft
```

#### 3. 安装依赖

```powershell
npm install
```

> 如果下载速度慢，可使用国内镜像：
>
> ```powershell
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

#### 4. 启动开发服务器

```powershell
npm run dev
```

终端输出类似：

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

在浏览器中打开 `http://localhost:5173/` 即可使用。

#### 5. 生产构建

```powershell
npm run build
npm run preview
```

### 🍎 macOS 安装与运行

#### 1. 安装 Node.js

**方式一：官方安装包**

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 **LTS** 版本的 macOS Installer（`.pkg` 文件）
3. 双击运行安装程序，按提示完成安装
4. 打开 **终端**（Terminal），验证安装：

```bash
node --version
npm --version
```

**方式二：Homebrew（推荐开发者）**

```bash
# 安装 Homebrew（如未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node

# 验证
node --version
npm --version
```

**方式三：nvm（推荐多版本管理）**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 重新打开终端，或执行
source ~/.zshrc

# 安装并使用 Node.js LTS
nvm install --lts
nvm use --lts

# 验证
node --version
npm --version
```

#### 2. 获取项目代码

```bash
git clone https://github.com/your-username/markcraft.git
cd markcraft
```

#### 3. 安装依赖

```bash
npm install
```

> 如果下载速度慢，可使用国内镜像：
>
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

#### 4. 启动开发服务器

```bash
npm run dev
```

在浏览器中打开 `http://localhost:5173/` 即可使用。

#### 5. 生产构建

```bash
npm run build
npm run preview
```

### 🐧 Linux 安装与运行

#### 1. 安装 Node.js

**Ubuntu / Debian**

```bash
# 使用 NodeSource 仓库安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node --version
npm --version
```

**Fedora / RHEL / CentOS**

```bash
# 使用 NodeSource 仓库安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证
node --version
npm --version
```

**Arch Linux**

```bash
sudo pacman -S nodejs npm

# 验证
node --version
npm --version
```

**nvm（通用，推荐开发者）**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 重新打开终端，或执行
source ~/.bashrc

# 安装并使用 Node.js LTS
nvm install --lts
nvm use --lts

# 验证
node --version
npm --version
```

**Snap（Ubuntu 等）**

```bash
sudo snap install node --classic
```

#### 2. 获取项目代码

```bash
git clone https://github.com/your-username/markcraft.git
cd markcraft
```

#### 3. 安装依赖

```bash
npm install
```

> 如果下载速度慢，可使用国内镜像：
>
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

#### 4. 启动开发服务器

```bash
npm run dev
```

在浏览器中打开 `http://localhost:5173/` 即可使用。

#### 5. 生产构建

```bash
npm run build
npm run preview
```

### ❓ 常见问题

| 问题                         | 原因                   | 解决方案                                                                  |
| -------------------------- | -------------------- | --------------------------------------------------------------------- |
| 🐛 `node` 不是内部或外部命令        | Node.js 未安装或未加入 PATH | 重新安装 Node.js 并勾选 Add to PATH，或手动添加环境变量                                |
| 🔒 `npm install` 报错 EACCES | npm 全局目录权限不足         | 使用 `nvm` 管理 Node.js，或执行 `sudo chown -R $(whoami) ~/.npm`（macOS/Linux） |
| 🐌 `npm install` 速度极慢      | 默认源在国外               | 执行 `npm config set registry https://registry.npmmirror.com` 切换国内镜像    |
| 🚫 `npm run dev` 端口被占用     | 5173 端口已被其他程序使用      | Vite 会自动尝试 5174 等下一个可用端口，或手动指定：`npx vite --port 3000`                 |
| 🍎 macOS 提示"无法验证开发者"       | Gatekeeper 安全限制      | 系统偏好设置 → 安全性与隐私 → 点击"仍要打开"                                            |
| 🐧 Linux 下 `git clone` 失败  | 未安装 Git              | Ubuntu: `sudo apt install git` / Fedora: `sudo dnf install git`       |

### 📜 可用脚本

| 命令                      | 说明                          |
| ----------------------- | --------------------------- |
| `npm run dev`           | 启动 Vite 开发服务器（热更新）          |
| `npm run build`         | TypeScript 类型检查 + Vite 生产构建 |
| `npm run preview`       | 预览生产构建结果                    |
| `npm run lint`          | ESLint 代码检查                 |
| `npm run test`          | 运行 Vitest 测试（watch 模式）      |
| `npm run test:coverage` | 运行测试并生成覆盖率报告                |

---

## 🔧 配置说明


⏱️ **核心时序参数一览** ⏱️

|   8ms   |   50ms  |  300ms  |  500ms  |   30s  |
| :-----: | :-----: | :-----: | :-----: | :----: |
| 🔄 滚动同步 | 🔒 同步锁定 | 📊 索引重建 | 💾 自动保存 | ⏰ 定时保存 |


本项目为纯前端应用，无需环境变量配置。以下为内置的运行时参数：

| 参数                  | 默认值                             | 说明                                   |
| ------------------- | ------------------------------- | ------------------------------------ |
| 自动保存延迟              | 500ms                           | 编辑后防抖自动保存到 localStorage              |
| 自动保存间隔              | 30s                             | 定时保存（可在设置中调整 5-300s）                 |
| 撤销栈最大步数             | 100                             | 自定义撤销/重做历史记录上限                       |
| 滚动同步节流              | 8ms                             | 编辑器与预览区滚动同步的节流间隔                     |
| 同步锁定时长              | 50ms                            | 双向滚动同步时防止回弹的锁定时间                     |
| 代码块折叠阈值             | 10 行                            | 超过此行数的代码块默认折叠                        |
| 图片大小确认阈值            | 2MB                             | 超过此大小的图片嵌入前弹出确认                      |
| 博客预览防抖              | 500ms                           | Blog Studio 中设计变更到预览更新的延迟            |
| 索引重建防抖              | 300ms                           | 文件变更后链接/标签索引重建的防抖延迟                  |
| 图谱球体旋转速度            | 0.001 rad/帧                     | 3D 球体自动旋转角速度                         |
| 图谱缩放范围              | 0.08x - 6x                      | 鼠标滚轮缩放的上下限                           |
| 图谱团簇聚合阈值            | 300 节点                          | 超过此数量按社区聚合显示                         |
| localStorage 版本     | v5                              | 版本不匹配时重置为默认数据                        |
| **IndexedDB 数据库**   | Dexie `markcraft-db`            | 知识库 / 白板 / 向量索引持久化                   |
| **KB 列表 key**       | `kb-list`                       | IndexedDB `kv` 表，存储所有知识库元数据列表        |
| **KB 文档 key**       | `kb-doc-{id}`                   | IndexedDB `kv` 表，单个知识库完整文档           |
| **Canvas 列表 key**   | `canvas-list`                   | IndexedDB `kv` 表，白板列表                |
| **Canvas 文档 key**   | `canvas-doc-{id}`               | IndexedDB `kv` 表，单个白板文档              |
| **AI 推理引擎**         | @xenova/transformers            | 浏览器本地推理，无需后端                         |
| **AI 向量维度**         | 384 维                           | all-MiniLM-L6-v2 模型默认输出              |
| **KB 健康度评分**        | 0-100                           | 综合覆盖度/链接密度/连通性/活跃度/标签均衡              |
| **白板 feature flag** | `VITE_CANVAS_ENGINE=excalidraw` | 启用 Excalidraw 混合引擎                   |
| **Excalidraw 资源路径** | `/excalidraw-assets/`           | `window.EXCALIDRAW_ASSET_PATH` 本地化字体 |

---

## 📦 项目结构

```
MarkCraft/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── vitest.config.ts
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── setupTests.ts
    ├── types/
    │   ├── fileManager.ts
    │   ├── translations.ts
    │   ├── electron.d.ts
    │   └── fileSystemAccess.d.ts
    ├── workers/                     # Web Workers
    │   ├── indexWorker.ts          # 链接/标签索引后台计算
    │   └── indexWorkerAdapter.ts   # Worker 通信适配器
    ├── stores/                      # 全局状态管理
    │   ├── FileStore.tsx            # 文件管理 + 标签页状态
    │   ├── ThemeStore.tsx           # 主题状态
    │   ├── LanguageStore.tsx        # 国际化状态
    │   ├── ModalStore.tsx           # 弹窗状态
    │   ├── UndoRedoStore.tsx        # 撤销/重做状态
    │   ├── SettingsStore.tsx        # 应用设置状态
    │   ├── BookmarkStore.tsx        # 书签状态
    │   ├── LinkIndexStore.tsx       # 链接索引（WikiLink/反链/提及）
    │   ├── TagIndexStore.tsx        # 标签索引
    │   └── storage/                 # IndexedDB 存储层
    │       ├── db.ts                # Dexie 数据库封装（kv 表）
    │       └── migrate.ts           # 存储迁移
    ├── hooks/                       # 全局 Hooks
    │   ├── useAutoSave.ts           # 自动保存（防抖捕获 fileId）
    │   ├── useEditorSettings.ts
    │   ├── useKeyboardShortcuts.ts  # 13 个全局快捷键
    │   ├── useMarkdownRenderer.ts
    │   ├── useTheme.ts
    │   ├── useAppLayout.ts
    │   └── useLanguage.ts
    ├── locales/                     # 国际化文案
    │   ├── zh/                      # 中文（common/editor/toolbar/...）
    │   └── en.ts                    # 英文
    ├── services/                    # 公共服务
    │   ├── crashRecovery.ts         # 崩溃恢复
    │   ├── fileService.ts
    │   ├── fullscreen.ts
    │   ├── markedConfig.ts         # marked 配置
    │   └── undoRedoManager.ts
    ├── styles/                      # 全局样式
    │   ├── base.css
    │   ├── components.css
    │   ├── markdown.css
    │   ├── mermaid.css
    │   ├── syntax.css
    │   └── tiptap.css
    ├── utils/                       # 工具函数
    │   ├── errorUtils.ts
    │   ├── hash.ts
    │   ├── logger.ts
    │   ├── smoothScroll.ts
    │   └── titleUtils.ts
    └── features/                    # 功能模块
        ├── editor/                  # 编辑器核心
        │   ├── CodeMirrorEditor.tsx # CodeMirror 6 源码编辑器
        │   ├── TiptapEditor.tsx     # Tiptap 所见即所得编辑器
        │   ├── EditorLayout.tsx     # 编辑器布局
        │   ├── EditorStatusBar.tsx  # 状态栏
        │   ├── RichEditor.tsx       # 富文本容器
        │   ├── EmojiPicker.tsx
        │   ├── TableBubbleMenu.tsx
        │   ├── cm6/                 # CodeMirror 扩展
        │   │   ├── autocompleteExtension.ts
        │   │   ├── focusModeExtension.ts
        │   │   ├── imagePreviewExtension.ts
        │   │   ├── lintExtension.ts
        │   │   ├── markdownHighlight.ts
        │   │   ├── mathPreviewExtension.ts
        │   │   ├── rainbowBrackets.ts
        │   │   └── inputHandlers.ts
        │   ├── extensions/          # Tiptap 扩展（40+ 文件）
        │   │   ├── WikiLink.ts + WikiLinkAutocomplete.tsx
        │   │   ├── WikiLinkHoverPreview.tsx
        │   │   ├── EmbedContent.ts + EmbedContentView.tsx
        │   │   ├── MermaidBlock.ts + MathBlock.ts + MathInline.ts
        │   │   ├── SlashCommand.ts
        │   │   ├── SearchExtension.ts
        │   │   ├── CalloutNode.ts + CalloutView.tsx
        │   │   ├── DefinitionList.ts / AbbreviationMark.ts
        │   │   ├── CodeBlockWithView.ts / CodeBlockView.tsx
        │   │   ├── SmartBackspace.ts / SmartPunctuation.ts
        │   │   ├── SpellCheckExtension.ts
        │   │   ├── TableContextMenu.tsx / TableTabNavigation.ts
        │   │   ├── mindmap/          # 思维导图子模块
        │   │   │   ├── MindmapCanvas.tsx
        │   │   │   ├── MindmapParser.ts
        │   │   │   ├── mindmapLayout.ts
        │   │   │   └── ...
        │   │   └── ...
        │   ├── hooks/               # 编辑器 Hooks
        │   │   ├── shortcuts/       # 快捷键分组
        │   │   ├── useEditorShortcuts.ts
        │   │   ├── useTiptapExtensions.ts
        │   │   └── ...
        │   └── spell/               # 拼写检查
        ├── preview/                 # 预览模块
        │   ├── Preview.tsx
        │   ├── MermaidRenderer.tsx
        │   └── mathRenderer.ts
        ├── blog/                    # 博客工坊（64 种主题）
        │   ├── BlogStudio.tsx       # 博客设计工作室
        │   ├── BlogModal.tsx        # 博客入口弹窗
        │   ├── blogGenerator.ts     # 博客生成入口
        │   ├── components/          # 博客工作室组件
        │   │   ├── IconSidebar.tsx
        │   │   ├── LeftPanel.tsx
        │   │   ├── RightPanel.tsx
        │   │   ├── StudioControls.tsx
        │   │   └── panels/          # 配置面板
        │   │       ├── ContentPanel.tsx
        │   │       ├── StylePanel.tsx
        │   │       ├── ThemePanel.tsx
        │   │       ├── CssPanel.tsx
        │   │       ├── FeaturesPanel.tsx
        │   │       └── ...
        │   ├── hooks/useBlogGenerator.ts
        │   ├── services/            # 5 种部署平台适配器
        │   ├── templates/           # 博客页面模板
        │   │   ├── postTemplate.ts / indexTemplate.ts
        │   │   ├── archiveTemplate.ts / tagsTemplate.ts
        │   │   ├── rssTemplate.ts / sitemapTemplate.ts
        │   │   ├── searchTemplate.ts / aboutTemplate.ts
        │   │   ├── seriesTemplate.ts / linksTemplate.ts
        │   │   ├── pwaTemplate.ts / shareButtons.ts
        │   │   ├── seoUtils.ts / tocGenerator.ts
        │   │   └── styleBuilder/    # 样式构建器
        │   ├── themes/              # 64 种博客主题
        │   │   ├── inkWash.ts / terminal.ts / newspaper.ts
        │   │   ├── glassmorphism.ts / bento.ts / narrative.ts
        │   │   ├── cyberpunk.ts / aurora.ts / academia.ts
        │   │   ├── retro.ts / garden.ts / midnight.ts
        │   │   ├── newThemes.ts / custom.ts
        │   │   └── index.ts
        │   └── utils/               # 博客生成工具
        │       ├── singleFile/      # 单文件 SPA 生成器
        │       ├── blogMultiFileGenerator.ts
        │       ├── cssMinifier.ts / cssSanitizer.ts
        │       └── scopeWrapper.ts
        ├── graph/                   # 知识图谱
        │   └── GraphView.tsx        # 6 种布局 + 3D 球体 + 分析功能
        ├── fileManager/             # 文件管理 + 知识面板
        │   ├── Sidebar.tsx          # 侧边栏（文件/知识双页 Tab）
        │   ├── FileTreeNode.tsx
        │   ├── TabBar.tsx
        │   ├── BacklinksPanel.tsx   # 反向链接面板
        │   ├── BookmarkPanel.tsx    # 书签面板
        │   ├── TagPanel.tsx         # 标签树面板
        │   ├── LinkHealthPanel.tsx  # 链接健康面板
        │   ├── LinkMinimap.tsx      # 链接小地图
        │   ├── LinkSearchPanel.tsx  # 链接搜索
        │   ├── LinkRedirectDialog.tsx
        │   ├── DailyNoteManager.tsx # 日记功能
        │   ├── DailyNoteService.ts
        │   ├── MocGenerator.ts     # MOC 生成器
        │   ├── WelcomePage.tsx
        │   └── defaultDocsZh.ts / defaultDocsEn.ts  # 内置文档
        ├── commandPalette/          # 命令面板
        │   ├── CommandPalette.tsx
        │   └── commandRegistry.ts   # 25 项命令注册
        ├── toolbar/                 # 工具栏
        │   ├── MarkdownToolbar.tsx / WysiwygToolbar.tsx
        │   ├── groups/              # 按钮分组
        │   ├── popovers/            # 弹出面板
        │   └── mindmapTemplates.tsx
        ├── outline/                 # 大纲导航
        │   ├── Outline.tsx
        │   └── outlineUtils.ts
        ├── lint/                    # 语法检查
        │   ├── markdownLinter.ts
        │   ├── LintPopover.tsx
        │   └── rules/               # 检查规则
        ├── export/                  # 导出（12 种格式）
        │   ├── SaveAsModal.tsx
        │   ├── exportStyleManager.ts
        │   └── utils/
        │       ├── exportHtml.ts / exportPdf.ts
        │       ├── exportDocx.ts / exportEpub.ts
        │       ├── exportLatex.ts / exportMarkdown.ts
        │       ├── exportImage.ts / exportCss.ts
        │       ├── exportMediaWiki.ts / exportOpml.ts
        │       ├── exportPlainText.ts / exportRst.ts
        │       └── markedTypes.ts
        ├── search/                  # 搜索
        │   ├── GlobalSearch.tsx
        │   ├── QuickOpen.tsx
        │   ├── SearchReplace.tsx
        │   └── useGlobalSearch.ts
        ├── settings/                # 设置面板（5 个 Tab）
        │   ├── SettingsPanel.tsx
        │   ├── ShortcutManager.ts
        │   └── ShortcutRecorder.tsx
        ├── themes/                  # 主题管理
        │   ├── ThemeManager.ts      # 5 种编辑器主题
        │   └── CodeThemeManager.ts  # 6 种代码主题
        ├── tags/                    # 标签提取
        │   └── tagExtractor.ts
        ├── templates/               # 模板系统
        │   ├── TemplateInsertModal.tsx
        │   └── templateManager.ts
        ├── imageUpload/             # 图片上传与缓存
        │   ├── ImageCachePanel.tsx
        │   ├── ImageHostSettings.tsx
        │   ├── imageCacheManager.ts
        │   └── relativePathHandler.ts
        ├── import/                  # 文件导入
        │   ├── ImportDialog.tsx
        │   ├── importDocx.ts
        │   └── importHtml.ts
        ├── canvas-v2/               # 🎨 Canvas v2 白板（Excalidraw 混合引擎）
        │   ├── CanvasView.tsx      # 白板主视图
        │   ├── canvasStore.ts       # 白板 IndexedDB 存储
        │   ├── canvasPersistence.ts # 序列化 / 加载
        │   ├── dataMigration.ts     # v1 → v2 数据迁移
        │   ├── types.ts
        │   ├── engine/              # 混合引擎核心
        │   │   ├── CanvasEngine.ts       # 适配器（鸭子类型伪装 tldraw Editor）
        │   │   ├── ExcalidrawCanvas.tsx  # Excalidraw 底层
        │   │   ├── CardOverlay.tsx       # HTML 卡片浮层容器
        │   │   ├── OverlayCards.tsx      # 卡片浮层渲染
        │   │   ├── cardHelpers.ts        # 卡片工具
        │   │   ├── engineTypes.ts        # 引擎类型
        │   │   └── useCanvasEngine.tsx   # 引擎 Hook
        │   ├── shapes/              # 7 种卡片形状
        │   │   ├── NoteCardShape.tsx / FileCardShape.tsx
        │   │   ├── EmbedCardShape.tsx / GroupCardShape.tsx
        │   │   ├── ImageCardShape.tsx / NestedCanvasShape.tsx
        │   │   ├── CanvasRefShape.tsx
        │   │   └── index.ts
        │   ├── components/          # 30+ 功能组件
        │   │   ├── Topbar.tsx / BottomBar.tsx / FloatingToolbar.tsx
        │   │   ├── ContextMenu.tsx / CommandPalette.tsx
        │   │   ├── LayersPanel.tsx / PropertyPanel.tsx / CardPropertyPanel.tsx
        │   │   ├── SearchPanel.tsx / FilterPanel.tsx
        │   │   ├── TemplateManager.tsx / TemplatePicker.tsx
        │   │   ├── ResourceLibrary.tsx / FavoritesPanel.tsx / PinnedCards.tsx
        │   │   ├── FileListPanel.tsx / FilePickerModal.tsx
        │   │   ├── AutoLayoutPanel.tsx / LayoutToolbar.tsx
        │   │   ├── PresentationPanel.tsx / PresentationViewer.tsx
        │   │   ├── RelationEditor.tsx / RelationTypeSelector.tsx
        │   │   ├── KnowledgeGraph.tsx / BacklinkGraph.tsx
        │   │   ├── BackgroundPicker.tsx / EraserClearSlider.tsx
        │   │   ├── CanvasListPanel.tsx / CanvasPickerModal.tsx
        │   │   ├── ShareDialog.tsx / ReadOnlyCanvas.tsx
        │   │   ├── RecommendPanel.tsx / PenContextMenu.tsx
        │   │   └── sidebar/ / views/
        │   ├── hooks/               # useShortcuts 等
        │   ├── utils/               # 工具集
        │   │   ├── canvasExport.ts / canvasImport.ts
        │   │   ├── forceLayout.ts / treeLayout.ts / hierarchy.ts
        │   │   ├── graphBuilder.ts / mocGenerator.ts
        │   │   ├── searchIndex.ts / similarity.ts / tfidf.ts
        │   │   ├── wordFrequency.ts / statsCalculator.ts
        │   │   ├── presentationOrder.ts / shareLink.ts
        │   │   ├── templateIO.ts / templates.ts / templateThumbnail.ts
        │   │   ├── fileAsset.ts / fileFolderImport.ts
        │   │   ├── oembed.ts / tagColors.ts
        │   │   ├── layoutUtils.ts / tldrawColorMap.ts
        │   │   └── ...
        │   ├── store/ / theme/      # 状态 / 主题
        │   └── components/canvas.css
        ├── knowledgeBase/           # 📚 知识库系统（P7 智能化）
        │   ├── kbStore.ts           # IndexedDB 持久化（Dexie）
        │   ├── useKbStore.ts        # 知识库状态 Hook
        │   ├── types.ts             # KnowledgeBase 类型定义
        │   ├── healthScore.ts      # 健康度评分（0-100）
        │   ├── mocGenerator.ts     # MOC 自动生成
        │   ├── reviewGenerator.ts  # 回顾计划生成
        │   ├── kbTheme.ts          # Atelier Glass 主题
        │   ├── kb-ui.css            # 玻璃质感样式
        │   ├── ai/                  # AI 能力（本地推理）
        │   │   ├── aiService.ts          # 统一 AI 服务入口
        │   │   ├── blindSpotAnalyzer.ts # 盲区分析
        │   │   ├── kbChat.ts             # KB 问答（RAG）
        │   │   ├── recommender.ts       # 推荐
        │   │   ├── semanticSearch.ts    # 语义搜索（@xenova/transformers）
        │   │   └── topicClusterer.ts    # 主题聚类（K-Means）
        │   ├── components/          # 知识库 UI
        │   │   ├── KbManager.tsx         # 知识库管理器
        │   │   ├── KbDashboard.tsx       # 详情仪表盘（11 模块）
        │   │   ├── KbNoteViewer.tsx      # 笔记编辑器
        │   │   ├── KbEditor.tsx         # 知识库编辑器
        │   │   ├── KbChatPanel.tsx       # 问答面板
        │   │   ├── KbSearchPanel.tsx     # 搜索面板
        │   │   ├── KbExportMenu.tsx     # 导出菜单
        │   │   ├── KbMiniGraph.tsx      # 迷你图谱
        │   │   ├── KbTemplateSelector.tsx
        │   │   ├── AdvancedFilter.tsx   # 高级筛选
        │   │   ├── CrossKbSearch.tsx     # 跨库搜索
        │   │   ├── FileDependencyPanel.tsx
        │   │   ├── LearningPathPanel.tsx
        │   │   ├── ReviewPanel.tsx
        │   │   ├── TaskPanel.tsx
        │   │   ├── WritingGoalPanel.tsx
        │   │   ├── KbIcons.tsx
        │   │   └── kbOverlayRoot.ts
        │   ├── export/             # 导出
        │   │   ├── documentExporter.ts  # 文档导出
        │   │   ├── staticSiteExporter.ts # 静态站点导出
        │   │   └── sharePackager.ts      # 分享打包
        │   ├── import/
        │   │   └── externalImporter.ts  # 外部导入
        │   └── templates/
        │       └── kbTemplates.ts        # 知识库模板
        ├── dashboard/              # 📊 仪表盘数据层
        │   └── useDashboardData.ts  # 数据 hook（供 GraphPanel 链接健康消费）
        └── shared/                  # 共享组件
            ├── ErrorBoundary.tsx
            ├── FrontMatterPanel.tsx
            ├── InputModal.tsx
            ├── OptimizeImagesModal.tsx
            ├── imageHelpers.ts / imageStore.ts
            ├── mathRenderer.ts / mathUtils.ts
            ├── mermaidCache.ts
            └── frontMatter.ts
```

### 🧩 核心模块说明

#### 🌐 知识图谱模块 (`features/graph/`)

| 文件              | 说明                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------- |
| `GraphView.tsx` | 知识图谱核心组件（约 4700 行），含 6 种布局算法、3D 球体、中心性分析、团簇发现、快照对比、分析报告、多格式导出、LOD 分层、空间索引、离屏 Canvas 等完整功能 |

#### 🔗 知识链接模块 (`features/fileManager/` + `stores/`)

| 文件                              | 说明                                                   |
| ------------------------------- | ---------------------------------------------------- |
| `stores/LinkIndexStore.tsx`     | 链接索引存储，维护全文件 WikiLink/反链/未链接提及索引，支持精确与模糊解析、路径解析、标签注入 |
| `stores/TagIndexStore.tsx`      | 标签索引存储，维护标签到文件集合的映射，嵌套标签树                            |
| `features/tags/tagExtractor.ts` | 标签提取器，正则匹配 `#标签`，构建嵌套标签树                             |
| `BacklinksPanel.tsx`            | 反向链接面板，展示反链/出链/未链接提及，标签推荐                            |
| `TagPanel.tsx`                  | 标签树面板，右键重命名/MOC 生成                                   |
| `LinkHealthPanel.tsx`           | 链接健康仪表盘，断链/孤儿检测，批量创建                                 |
| `LinkMinimap.tsx`               | Canvas 链接小地图                                         |
| `LinkSearchPanel.tsx`           | 跨文件链接搜索                                              |
| `MocGenerator.ts`               | MOC 生成纯函数，标签/中心模式，3 种模板                              |

#### 🎨 博客模块 (`features/blog/`)

| 文件/目录                              | 说明                                                 |
| ---------------------------------- | -------------------------------------------------- |
| `BlogStudio.tsx`                   | 博客设计工作室主界面，深色工作台 + 图标侧栏 + 设备模拟预览                   |
| `BlogModal.tsx`                    | 博客入口弹窗                                             |
| `FrontMatterPanel.tsx`             | Front Matter 可视化编辑面板                               |
| `blogGenerator.ts`                 | 博客生成入口，单文件 SPA 生成 + 多文件导出                          |
| `hooks/useBlogGenerator.ts`        | 博客生成状态管理，设计配置 + 预览更新                               |
| `services/`                        | 5 种部署平台适配器（GitHub/Gitee/Vercel/Cloudflare/Netlify） |
| `templates/`                       | 博客页面模板（首页/文章/归档/标签/搜索/RSS/Sitemap/404）             |
| `themes/`                          | 15 种博客主题的完整 CSS 生成                                 |
| `utils/blogSingleFileGenerator.ts` | 单文件 SPA 博客生成器，含 Mermaid/KaTeX/TOC 支持               |
| `utils/blogMultiFileGenerator.ts`  | 多文件博客生成器                                           |
| `frontMatter.ts`                   | Front Matter YAML 解析与生成                            |

#### 编辑器核心 (`features/editor/`)

| 文件/目录                  | 说明                                                |
| ---------------------- | ------------------------------------------------- |
| `CodeMirrorEditor.tsx` | CodeMirror 6 源码编辑器                                |
| `TiptapEditor.tsx`     | Tiptap 所见即所得编辑器                                   |
| `EditorLayout.tsx`     | 编辑器布局管理，双引擎切换                                     |
| `UndoRedoManager.ts`   | 操作分组历史栈，支持事务性撤销/重做                                |
| `cm6/`                 | CodeMirror 6 扩展（自动补全、专注模式、图片预览、语法检查、数学预览）         |
| `extensions/`          | Tiptap 扩展（Live Preview、Mermaid、数学公式、Slash 命令、搜索等） |
| `imageStore.ts`        | 图片占位符系统，`image:ID` 替代 Base64                      |

#### 🎨 Canvas v2 白板模块 (`features/canvas-v2/`)

| 文件/目录                         | 说明                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CanvasView.tsx`              | 白板主视图，集成 Excalidraw + 卡片浮层 + 工具泡                                                                                                                 |
| `canvasStore.ts`              | IndexedDB 存储（canvas-list + canvas-doc-{id}）                                                                                                      |
| `canvasPersistence.ts`        | 序列化 / 加载，支持混合引擎格式                                                                                                                                |
| `engine/CanvasEngine.ts`      | 适配器核心，鸭子类型伪装 tldraw Editor API                                                                                                                   |
| `engine/ExcalidrawCanvas.tsx` | Excalidraw 底层画布（自由绘制）                                                                                                                            |
| `engine/CardOverlay.tsx`      | HTML 卡片浮层容器（z-index 管理）                                                                                                                          |
| `engine/OverlayCards.tsx`     | 卡片浮层渲染（NoteCard/FileCard/EmbedCard 等）                                                                                                            |
| `engine/cardHelpers.ts`       | 卡片创建/更新/绑定工具                                                                                                                                     |
| `engine/useCanvasEngine.tsx`  | 引擎状态 Hook                                                                                                                                        |
| `shapes/`                     | 7 种卡片形状（NoteCard/FileCard/EmbedCard/GroupCard/ImageCard/NestedCanvas/CanvasRef）                                                                  |
| `components/`                 | 30+ 功能组件（Topbar/BottomBar/FloatingToolbar/ContextMenu/CommandPalette/LayersPanel/PropertyPanel/SearchPanel/TemplateManager/PresentationViewer 等） |
| `utils/`                      | 布局算法（forceLayout/treeLayout/hierarchy）、图构建、TF-IDF、相似度、搜索索引、模板 IO、演示顺序                                                                            |
| `hooks/useShortcuts.ts`       | 白板快捷键                                                                                                                                            |
| `theme/canvasTheme.ts`        | 卡片配色 / 关系类型颜色 / 暗色模式                                                                                                                             |

#### 📚 知识库模块 (`features/knowledgeBase/`)

| 文件/目录                          | 说明                                                  |
| ------------------------------ | --------------------------------------------------- |
| `kbStore.ts`                   | IndexedDB 持久化层（基于 Dexie），多知识库列表 + 单文档分离存储           |
| `useKbStore.ts`                | 知识库状态 Hook（activeKb/loadActiveKb/getFiles/saveKb 等） |
| `types.ts`                     | `KnowledgeBase` 类型定义（11 大模块字段）                      |
| `healthScore.ts`               | 健康度评分（0-100），综合覆盖度/链接密度/连通性/活跃度/标签均衡                |
| `mocGenerator.ts`              | MOC 自动生成（标签模式 / 中心文件模式 / 3 种模板）                     |
| `reviewGenerator.ts`           | 间隔重复回顾计划生成                                          |
| `kbTheme.ts`                   | Atelier Glass 主题色（KB_STAT_COLORS 等）                 |
| `kb-ui.css`                    | 玻璃质感样式（.kb-* 类，--kb-* token）                      |
| `ai/aiService.ts`              | 统一 AI 服务入口                                          |
| `ai/blindSpotAnalyzer.ts`      | 知识盲区分析（标签覆盖度 + TF-IDF）                              |
| `ai/kbChat.ts`                 | KB 问答（RAG 检索 + 上下文拼接）                               |
| `ai/recommender.ts`            | 相似文件 / 关联笔记推荐                                       |
| `ai/semanticSearch.ts`         | 语义搜索（@xenova/transformers 向量检索）                     |
| `ai/topicClusterer.ts`         | 主题聚类（K-Means）                                       |
| `components/KbManager.tsx`     | 知识库管理器（常驻挂载 + 覆盖层切换）                                |
| `components/KbDashboard.tsx`   | 详情仪表盘（11 模块：概览/笔记/搜索/任务/目标/回顾/问答/依赖/MOC/盲区/导出）      |
| `components/KbNoteViewer.tsx`  | 全屏笔记编辑器（H1 + TipTap/CodeMirror + 源码/WYSIWYG/预览切换）   |
| `components/KbChatPanel.tsx`   | 问答面板（portal 到 #kb-overlay-root）                     |
| `components/KbSearchPanel.tsx` | 搜索面板（高级筛选 + 保存查询）                                   |
| `export/documentExporter.ts`   | 文档导出                                                |
| `export/staticSiteExporter.ts` | 静态站点导出                                              |
| `export/sharePackager.ts`      | 分享打包                                                |
| `templates/kbTemplates.ts`     | 知识库模板（学习计划/研究项目/读书笔记等）                              |

---

## 📖 使用指南


|      👤 普通用户      |  👨‍💻 开发者  |
| :---------------: | :---------: |
| 写作 / 链接 / 图谱 / 博客 | 二次开发 / 扩展功能 |
|      ⬇️ 见下方指南     |   ⬇️ 见下方指南  |


### 👤 普通用户

#### 首次启动

启动后显示欢迎页面，左侧文件树包含三个内置示例文件：

- **用户手册.md** — 编辑器功能完整使用指南
- **Markdown 入门教程.md** — Markdown 语法入门教程
- **知识链接体系指南.md** — 双向链接、标签、图谱、MOC 的实战指南

双击文件即可打开编辑。

#### 文件操作

| 操作     | 方法                               |
| ------ | -------------------------------- |
| 创建文件   | 点击侧边栏顶部 **+** 按钮                 |
| 重命名    | 右键文件 → 重命名，或三点菜单 → 重命名           |
| 删除     | 右键文件 → 删除，确认对话框后执行               |
| 移动     | 拖拽文件到目标文件夹                       |
| 快速打开   | `Ctrl+P` 输入文件名模糊搜索               |
| 打开本地文件 | 侧边栏「打开文件」按钮                      |
| 创建日记   | 侧边栏「日记」按钮，自动生成 `YYYY-MM-DD.md`   |
| 导入文件   | 侧边栏「导入」按钮，支持 .docx / .html / .md |
| 添加书签   | 右键文件 → 加入书签，或标题书签                |

#### 格式化操作

| 操作   | 快捷键            | 工具栏按钮    |
| ---- | -------------- | -------- |
| 加粗   | `Ctrl+B`       | **B**    |
| 斜体   | `Ctrl+I`       | *I*      |
| 下划线  | `Ctrl+U`       | U        |
| 删除线  | `Ctrl+Shift+S` | ~~S~~    |
| 高亮   | `Ctrl+Shift+H` | ==H==    |
| 行内代码 | `Ctrl+E`       | `code`   |
| 下标   | `Ctrl+,`       | H~~2~~O  |
| 上标   | `Ctrl+.`       | x^2^     |
| 链接   | `Ctrl+K`       | 链接图标     |
| 标题   | `Ctrl+1/2/3`   | H1/H2/H3 |
| 代码块  | `Ctrl+Alt+C`   | `</>`    |
| 引用   | `Ctrl+Shift+B` | 引用图标     |
| 搜索   | `Ctrl+F`       | 搜索图标     |
| 替换   | `Ctrl+H`       | 替换图标     |
| 跳转到行 | `Ctrl+G`       | —        |
| 缩进   | `Tab`          | —        |
| 反缩进  | `Shift+Tab`    | —        |
| 撤销   | `Ctrl+Z`       | —        |
| 重做   | `Ctrl+Shift+Z` | —        |

#### 写作模式

- **专注模式**：`F8` 隐藏所有面板，编辑区居中，当前行高亮、非当前行淡出
- **打字机模式**：`F9` 光标保持垂直居中，当前行蓝色竖线高亮
- **全屏模式**：`F11` 最大化编辑空间

三种模式可独立组合使用。

#### 编辑器切换

- **源码模式**（CodeMirror 6）：直接编辑 Markdown 源码，适合熟练用户，可开启实时预览
- **所见即所得模式**（Tiptap）：富文本编辑，实时渲染效果，输入 `/` 唤出 Slash 命令

通过工具栏的「编辑区」「预览区」按钮独立控制显隐，可组合「仅源码」「仅预览」「源码 + 预览双栏」三种布局。

#### 语法检查与修复

1. 编辑区中，有语法错误的行会显示波浪下划线和行尾圆点（红色=错误，黄色=警告）
2. 将鼠标悬停在状态栏的错误/警告计数上，弹出问题列表面板
3. 点击问题项可跳转到对应行
4. 可修复的问题右侧显示按钮，点击自动修复

#### 知识链接

1. 在笔记中输入 `[[` 弹出文件名搜索，选择目标建立 WikiLink 双向链接
2. 关系标注：`[[目标|关系:引用]]`、`[[目标|关系:反驳]]`（图谱中显示为红色虚线）
3. 嵌入引用：`![[目标]]` 在当前文档中展示另一篇笔记内容
4. 侧边栏切换到「知识」页，查看当前文件的**反向链接**、**未链接提及**
5. **链接健康面板**：查看断链、孤儿文件，批量创建缺失文件
6. **标签**：在正文中输入 `#标签`，侧边栏标签树自动展示，支持 `#父/子` 嵌套
7. **MOC 生成**：右键标签 → 生成 MOC，选择模板自动聚合关联文件

#### 知识图谱

1. 按 `Ctrl+Shift+G` 或侧边栏按钮打开知识图谱
2. 顶栏切换布局：力导向 / 径向 / 层次 / 圆形 / **3D 球体** / 时间线
3. **3D 球体布局**：节点自动旋转，拖拽节点可自由移动，松开后从放置位置继续旋转
4. **交互**：拖拽空白平移、滚轮缩放、Ctrl+拖拽框选、拖拽节点到另一节点创建链接
5. **分析**：顶栏切换中心性模式（PageRank / Betweenness），查看 Top-10 排行榜
6. **快照**：自动保存图谱快照，对比模式查看新增/删除/修改差异
7. **报告**：一键生成 Markdown 分析报告，含优化建议
8. **导出**：SVG / Mermaid / Graphviz / JSON

#### Canvas v2 白板

1. 在侧边栏或顶栏点击「白板」入口，进入 Canvas v2 全屏白板
2. **底栏工具**：选择 / 拖拽 / 画笔 / 橡皮 / 矩形 / 椭圆 / 箭头 / 文本 / 🏷标签；「更多」含直线 / 框 / 图片 / 网格吸附 / 自动布局 / 自动同步
3. **创建卡片**：双击空白创建 NoteCard；从侧边文件列表拖拽文件到白板创建 FileCard
4. **卡片编辑**：双击卡片进入编辑；属性面板调整颜色、大小、关联
5. **关系连线**：从一个卡片拖拽到另一卡片，弹出关系类型选择器（引用/支撑/反驳/延伸/相关/示例）
6. **自动布局**：选择卡片 → 「自动布局」按钮 → 选择 force / tree / hierarchy 布局
7. **演示模式**：「演示」按钮 → PresentationViewer 按顺序播放卡片
8. **多白板**：左上角画布列表管理多个白板，支持嵌套白板（NestedCanvas）
9. **导入导出**：JSON / PNG / SVG，支持文件 / 文件夹批量导入
10. **快捷键**：`Ctrl+Z` 撤销、`Ctrl+Shift+Z` 重做、`Delete` 删除、`Ctrl+D` 复制、`Ctrl+A` 全选

#### 知识库系统

1. 在侧边栏点击「知识库」入口，进入 KbManager 知识库管理器
2. **创建知识库**：点击「新建知识库」→ 选择模板（学习计划 / 研究项目 / 读书笔记）或空白 → 输入名称 → 自动创建专属文件夹
3. **进入知识库**：点击知识库卡片进入 KbDashboard 详情页
4. **11 大模块**（左侧导航）：
   - 📊 **概览** — 统计、健康度环形图、Top 标签、活动热力图
   - 📝 **笔记** — 知识库笔记列表；点击「新建笔记」弹出名称输入弹窗 → 输入名称 → 进入编辑模式 → 退出时弹窗询问保存 / 不保存
   - 🔍 **搜索** — 跨库搜索、高级筛选器、保存查询
   - ✅ **任务** — 任务清单、关联笔记、进度
   - 🎯 **目标** — 写作目标（字数 / 篇数 / 截止日期）
   - 📅 **回顾** — 间隔重复回顾计划
   - 💬 **问答** — KB 问答面板（基于 RAG 本地向量检索）
   - 🔗 **依赖** — 文件依赖关系图、循环引用检测
   - 🗺️ **MOC** — 自动生成内容地图（标签 / 中心文件模式）
   - 💡 **盲区** — AI 知识盲区分析、推荐补充方向
   - 📤 **导出** — 文档 / 静态站点 / 分享打包
5. **健康度评分**：0-100 分，综合评估覆盖度 / 链接密度 / 连通性 / 活跃度 / 标签均衡
6. **关联白板**：知识库可关联多个 Canvas v2 白板，白板中可引用知识库笔记
7. **规则筛选**：设置 `#tag` / `path:xxx` / `name:xxx` 规则自动包含符合条件的文件

#### 个人博客生成

1. 在欢迎页面或侧边栏点击「博客工作室」入口
2. 进入 Blog Studio 设计工作室
3. 在左侧「内容」Tab 中勾选需要包含的 Markdown 文档
4. 在左侧「风格」和「配色」Tab 中选择博客风格（64 种）、配色、字体等
5. 中间区域实时预览博客效果，可切换桌面/平板/手机视图
6. 配置站点信息、评论系统、打赏、关于页面、友链等
7. 点击右侧「生成博客」按钮生成博客文件
8. 选择下载方式：单文件 HTML 或文件夹 ZIP
9. 可选：配置部署平台，一键部署到 GitHub Pages / Vercel 等

#### Front Matter 编辑

1. 打开包含 Front Matter 的 Markdown 文件
2. 编辑区上方自动显示 Front Matter 可视化编辑面板
3. 直接在面板中修改标题、日期、标签、分类、描述、作者、封面图等元数据
4. 修改会实时同步到编辑区的 YAML 代码中

#### 导出文件

点击工具栏「另存为」按钮，选择保存位置和格式（12 种）：

| 格式               | 扩展名   | 说明              |
| ---------------- | ----- | --------------- |
| Markdown         | .md   | 纯 Markdown 源文件  |
| HTML             | .html | 网页，支持样式预设与自定义   |
| PDF              | .pdf  | 含目录、页码、页眉页脚选项   |
| Word             | .docx | 微软 Word 文档      |
| LaTeX            | .tex  | LaTeX 源文件       |
| EPUB             | .epub | 电子书格式           |
| reStructuredText | .rst  | rST 文档          |
| MediaWiki        | .wiki | 维基文本            |
| OPML             | .opml | 大纲交换格式          |
| 纯文本              | .txt  | 纯文本             |
| PNG 图片           | .png  | 截图，1x / 2x / 3x |
| JPEG 图片          | .jpg  | 截图，1x / 2x / 3x |

#### 插入图表

- **数学公式**：工具栏按钮，选择行内 `$...$` 或块级 `$$...$$`
- **Mermaid 图表**：工具栏「图表」按钮，插入流程图或思维导图代码块
- **独立思维导图**：工具栏「思维导图」按钮，Canvas 可视化编辑
- **表格**：工具栏「表格」按钮，快速插入或使用高级编辑器
- **脚注**：工具栏「脚注」按钮，自动生成脚注引用和定义
- **Slash 命令**：在所见即所得模式中输入 `/` 触发快捷命令

### 👨‍💻 开发者

#### 二次开发

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 开发并测试
4. 提交 PR

#### 添加博客主题风格

1. 在 `src/features/blog/themes/` 中创建新主题文件 `xxxTheme.ts`，编写 `getXxxCss(isDark: boolean): string` 函数
2. 在 `src/features/blog/themes/index.ts` 中导出新主题
3. 在 `src/features/blog/templates/types.ts` 的 `ThemeStyle` 联合类型中添加新 key
4. 在 `src/features/blog/hooks/useBlogGenerator.ts` 的 `THEME_STYLE_OPTIONS` 数组中添加选项

#### 添加语法检查规则

在 `src/features/lint/rules/` 中：

1. 编写检查函数，签名为 `function checkXxx(text: string, lines: string[], issues: LintIssue[]): void`
2. 在 `index.ts` 中导出并在 `markdownLinter.ts` 的 `lintMarkdown()` 函数中调用
3. 如需支持自动修复，在 `fixFunctions.ts` 中添加对应的修复逻辑

#### 添加导出格式

在 `src/features/export/utils/` 中：

1. 创建 `exportXxx.ts` 文件，实现 `generateXxxBlob(content: string): Blob` 函数
2. 在 `exportUtils.ts` 中导出并注册新格式
3. 在 `SaveAsModal.tsx` 的 `FORMAT_OPTIONS` 和 `FORMAT_EXTENSIONS` 中添加选项

#### 添加知识图谱布局算法

在 `src/features/graph/GraphView.tsx` 中：

1. 编写 `computeXxxLayout(nodes, width, height): Map<string, {x, y}>` 函数
2. 在 `LayoutType` 联合类型中添加新 key
3. 在 `simulate` 函数的非力导向分支中处理新布局（参考球体分支的 isSphere 判断）
4. 在布局切换 `useEffect` 中添加 `case 'xxx'` 调用新算法
5. 在顶栏布局选择器中添加按钮

#### 自定义知识图谱配色

知识图谱配色已统一跟随 MarkCraft 的全局深色/浅色主题，无需单独配置。如需自定义配色：

1. 修改 `src/features/graph/GraphView.tsx` 中的 `colors` 对象（已基于 `isDark` 分支）
2. `isDark` 由 MutationObserver 监听 `data-theme` 自动更新，无需手动管理

#### 添加命令面板命令

在 `src/features/commandPalette/commandRegistry.ts` 中：

1. 在 `CommandIds` 中添加新命令 ID
2. 调用 `commandRegistry.register(...)` 注册，提供 `labelZh`、`labelEn`、`icon`、`category`、`action`
3. 可选提供 `shortcut` 和 `keywords` 用于搜索

#### 添加白板卡片形状

在 `src/features/canvas-v2/shapes/` 中：

1. 创建 `XxxCardShape.tsx`，实现 `TLBaseShape` 派生类型 + `XxxCardUtil` 形状工具（继承 `BaseBoxShapeUtil`）
2. 在 `index.ts` 的 `canvasShapeUtils` 数组中注册新工具
3. 在 `engine/OverlayCards.tsx` 中添加 HTML 浮层渲染分支
4. 在 `engine/cardHelpers.ts` 中添加卡片创建 / 更新工具函数
5. 如需关系连线，在 `engine/useCanvasEngine.tsx` 中扩展 `RELATION_TYPES`

#### 扩展知识库 AI 能力

在 `src/features/knowledgeBase/ai/` 中：

1. 创建 `xxxAnalyzer.ts`，实现分析逻辑
2. 在 `aiService.ts` 中注册新能力
3. 在 `KbDashboard.tsx` 对应模块面板中调用并展示结果
4. 如需向量推理，使用 `@xenova/transformers` 在浏览器本地完成，避免引入后端依赖

#### 知识库扩展注意事项

- **全屏覆盖层**：新增 `position:fixed; inset:0` 的面板必须 `createPortal` 到 `#kb-overlay-root`（由 `KbDashboard` 创建），否则 `.kb-content-inner` 的冻结 transform 会导致高度塌缩
- **`folderId` 校验**：任何依赖 `kb.folderId` 的操作前必须 `findNode(rootFolder, kb.folderId)` 校验存在性，丢失时 `createFolder('root', kb.name)` 重建
- **列表刷新**：编辑器 `onClose` 中调用 `loadActiveKb(activeKbId)` 触发 `kbFiles` useMemo 重算



#### 模块结构约定

每个功能模块放置在 `src/features/` 对应子目录下，包含：

- 组件文件（`.tsx`）
- 工具函数文件（`.ts`）
- 测试文件（`__tests__/` 子目录）
- 扩展文件放置在 `extensions/` 或 `cm6/` 子目录

---

## 📚 API 文档

本项目为**纯前端应用**，无后端 API。所有数据存储在浏览器 localStorage 中。

### 💾 数据存储结构

```typescript
// localStorage key: 'markdown-editor-data'
interface StorageData {
  version: string          // 存储版本号（当前 'v5'）
  rootFolder: FileNode     // 文件树根节点
  openTabs: Tab[]          // 打开的标签页
  activeTabId: string | null
}

// localStorage key: 'app-theme-preference'
type ThemePreference = 'dark' | 'light'
```

### 🗃️ Store API

| Store          | 位置                          | 主要方法                                                   |
| -------------- | --------------------------- | ------------------------------------------------------ |
| FileStore      | `stores/FileStore.tsx`      | `useFileManager()` → 文件CRUD、标签页、搜索、内容读写                |
| ThemeStore     | `stores/ThemeStore.tsx`     | `useTheme()` → `{ theme, toggleTheme }`                |
| LanguageStore  | `stores/LanguageStore.tsx`  | `useLanguage()` → `{ t, language, toggleLanguage }`    |
| ModalStore     | `stores/ModalStore.tsx`     | `useModal()` → `openInputModal`, `openCreateFileModal` |
| UndoRedoStore  | `stores/UndoRedoStore.tsx`  | `useUndoRedo()` → `{ canUndo, canRedo, undo, redo }`   |
| SettingsStore  | `stores/SettingsStore.tsx`  | 应用设置（自动保存间隔、实时预览等）                                     |
| BookmarkStore  | `stores/BookmarkStore.tsx`  | 书签管理（文件/标题书签、分组）                                       |
| LinkIndexStore | `stores/LinkIndexStore.tsx` | `useLinkIndex()` → 链接索引、反链、提及、图谱数据、路径解析                |
| TagIndexStore  | `stores/TagIndexStore.tsx`  | `useTagIndex()` → 标签索引、标签树、路径查询                        |

### 🎨 博客模块核心接口

```typescript
interface BlogConfig {
  siteUrl: string
  siteTitle: string
  siteDescription: string
  author: string
  language: string
  postsPerPage: number
  dateFormat: string
  theme: 'light' | 'dark' | 'auto'
  layout: 'magazine' | 'minimal' | 'classic'
  colorScheme: 'red' | 'orange-red' | 'orange' | 'orange-yellow' | 'yellow'
    | 'yellow-green' | 'green' | 'blue-green' | 'blue' | 'blue-purple'
    | 'purple' | 'purple-red' | 'custom'
  colorLightness: number   // 0-100
  colorSaturation: number  // 0-200
  colorSharpness: number   // 0-200
  customColor: string      // hex color
  font: 'serif' | 'sans' | 'mono'
  themeStyle: ThemeStyle
  customCss: string
  comment?: CommentConfig
}

type ThemeStyle = 'magazine' | 'minimal' | 'classic'
  | 'ink-wash' | 'terminal' | 'newspaper'
  | 'glassmorphism' | 'bento' | 'narrative'
  | 'cyberpunk' | 'aurora' | 'academia'
  | 'retro' | 'garden' | 'midnight'
  | 'poetry' | 'typewriter' | 'ocean' | 'sunset' | 'editorial'
  | 'trending' | 'dispatch' | 'carbon' | 'blueprint' | 'hacker'
  | 'showcase' | 'mosaic' | 'gallery' | 'cinematic' | 'docs' | 'wiki' | 'neon' | 'origami'
  | 'swiss' | 'bauhaus' | 'artdeco' | 'zen' | 'brutalist' | 'vaporwave'
  | 'pixel' | 'neumorphism' | 'corporate' | 'fashion' | 'forest' | 'notion'
  | 'cafe' | 'travel' | 'music' | 'sketch' | 'cosmos' | 'claymorphism'
  | 'ice-crystal' | 'rams' | 'luxury' | 'comic'
  | 'steampunk' | 'gothic' | 'noir' | 'recipe' | 'timeline' | 'feed' | 'pastel' | 'newsletter'
  | 'custom'

type CommentSystem = 'none' | 'giscus' | 'utterances' | 'waline'

type DeployPlatform = 'github' | 'gitee' | 'vercel' | 'cloudflare' | 'netlify'
```

---

## 🧪 测试

```bash
# 运行所有测试（watch 模式）
npm run test

# 运行特定测试文件
npx vitest src/features/outline/__tests__/outlineUtils.test.ts

# 生成覆盖率报告
npm run test:coverage

# 单次运行（CI 环境）
npx vitest run
```

### 📊 测试覆盖范围

| 模块   | 测试文件                      | 覆盖内容                  |
| ---- | ------------------------- | --------------------- |
| 大纲工具 | `outlineUtils.test.ts`    | 标题解析、嵌套结构、ID 生成、代码块过滤 |
| 大纲组件 | `Outline.test.tsx`        | 渲染、折叠/展开、跳转、性能        |
| 语法检查 | `markdownLinter.test.ts`  | 检测规则、修复函数             |
| 工具栏  | `MarkdownToolbar.test.ts` | 渲染、交互                 |

---

## 🚢 部署说明

### ▲ Vercel

```bash
npm i -g vercel
vercel
```

或通过 Vercel Dashboard 导入 Git 仓库，框架选择 **Vite**，自动部署。

### 🐙 GitHub Pages

1. 修改 `vite.config.ts`：

```typescript
export default defineConfig({
  base: '/markcraft/',
  plugins: [react()]
})
```

1. 构建并部署：

```bash
npm run build
npx gh-pages -d dist
```

### 🐳 Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t markdown-editor .
docker run -p 8080:80 markdown-editor
```

---

## 🗺️ 已知问题与路线图

### ⚠️ 已知问题

<details>

<summary>📖 点击查看已知问题（4 项）</summary>

- 🌐 部分浏览器不支持 File System Access API，「另存为」功能降级为 Blob 下载
- 📄 PDF 导出依赖 html2pdf.js，复杂布局可能出现分页问题
- 🐌 大规模图谱（>500 节点）在低端设备可能卡顿，已通过 LOD / 视口裁剪 / 空间索引优化
- ⚠️ Tiptap 与 CodeMirror 切换时部分扩展可能产生 Duplicate extension 警告（不影响功能）

</details>

### 🎯 路线图


**项目进度** 📊

|       模块       | 完成度               |
| :------------: | :---------------- |
|     ✅ 编辑核心     | `██████████` 100% |
|     ✅ 知识链接     | `██████████` 100% |
|     ✅ 知识图谱     | `██████████` 100% |
|     ✅ 博客工坊     | `██████████` 100% |
|     ✅ 导出格式     | `██████████` 100% |
| ✅ Canvas v2 白板 | `██████████` 100% |
|     ✅ 知识库系统    | `██████████` 100% |
|  ✅ AI 能力（本地推理） | `████████░░` 80%  |
|    🚧 移动端适配    | `██░░░░░░░░` 20%  |
|     🚧 协作编辑    | `░░░░░░░░░░` 0%   |
|     🚧 云端同步    | `░░░░░░░░░░` 0%   |


#### 🔮 规划中

- [ ] ☁️ 云端同步（WebDAV / 自建后端）
- [ ] 📱 移动端适配（响应式布局优化）
- [ ] 🤝 协作编辑（WebSocket + CRDT）
- [ ] 🧩 浏览器扩展（Chrome / Firefox）
- [ ] 🔍 AEO 答案引擎优化
- [ ] 🚀 GitHub Pages 一键部署博客
- [ ] 🎨 Hexo 主题融合方案
- [ ] 📲 PWA 离线支持
- [ ] 🤖 更多 AI 模型（embedding / reranker / 生成式摘要）

#### ✅ 已完成

- [x] 🌍 国际化（i18n）— 已支持中英双语
- [x] 🔗 知识链接体系 — WikiLink / 反链 / 标签 / 图谱 / MOC
- [x] 🌐 知识图谱 — 6 种布局 + 3D 球体 + 中心性分析 + 团簇发现
- [x] 🎨 64 种博客主题
- [x] 📤 12 种导出格式
- [x] 📋 命令面板（25 项命令）
- [x] 📅 日记功能
- [x] 🪧 **Canvas v2 白板** — Excalidraw 混合引擎 + 30+ 组件 + 7 种卡片形状
- [x] 📚 **知识库系统** — 11 大模块 + 多库管理 + 健康度评分 + IndexedDB 持久化
- [x] 🤖 **AI 能力** — 盲区分析 / KB 问答 / 推荐 / 语义搜索 / 主题聚类（本地推理）
- [x] 💾 **IndexedDB 存储层** — Dexie 封装，知识库/白板/向量索引分离存储
- [x] 🔖 书签系统
- [x] 📋 模板系统

---

## 🤝 贡献指南

### 🔄 开发流程

1. **Fork** 项目仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 编写代码并添加测试
4. 确保通过 lint 检查：`npm run lint`
5. 确保通过测试：`npm run test`
6. 提交更改：`git commit -m 'feat: add some feature'`
7. 推送分支：`git push origin feature/your-feature`
8. 提交 **Pull Request**

### 📝 提交规范

| 前缀          | 说明           |
| ----------- | ------------ |
| `feat:`     | ✨ 新功能        |
| `fix:`      | 🐛 修复 Bug    |
| `refactor:` | ♻️ 重构（不改变功能） |
| `docs:`     | 📝 文档更新      |
| `test:`     | 🧪 测试相关      |
| `chore:`    | 🔧 构建/工具变更   |

### ✨ 代码规范

- 🔒 使用 TypeScript strict 模式
- 🧹 遵循 ESLint 配置（`npm run lint`）
- ⚛️ 组件使用**函数式组件 + Hooks**
- 🎨 样式优先使用 CSS 变量（`var(--xxx)`），确保主题兼容
- 📐 布局使用 CSS Grid + `min-h-0` 约束链，确保滚动正常
- 🧪 新增功能需添加对应的测试用例
- 📁 新增模块放置在 `src/features/` 对应子目录下

---

## 📄 许可证

[MIT License](https://opensource.org/licenses/MIT)

Copyright © 2026 MarkCraft Contributors

---

## 🙏 鸣谢

本项目依赖以下优秀的开源项目：

| 项目                                                                 | 说明                                |
| ------------------------------------------------------------------ | --------------------------------- |
| [React](https://react.dev/)                                        | 用户界面构建库                           |
| [TypeScript](https://www.typescriptlang.org/)                      | 类型安全的 JavaScript 超集               |
| [Vite](https://vitejs.dev/)                                        | 下一代前端构建工具                         |
| [Tailwind CSS](https://tailwindcss.com/)                           | 原子化 CSS 框架                        |
| [CodeMirror 6](https://codemirror.net/)                            | 可扩展的代码编辑器                         |
| [Tiptap](https://tiptap.dev/)                                      | 无头富文本编辑器框架                        |
| [marked](https://marked.js.org/)                                   | Markdown 解析器                      |
| [highlight.js](https://highlightjs.org/)                           | 代码语法高亮                            |
| [KaTeX](https://katex.org/)                                        | 数学公式渲染                            |
| [Mermaid](https://mermaid.js.org/)                                 | 图表和流程图渲染                          |
| [DOMPurify](https://github.com/cure53/DOMPurify)                   | HTML 净化库                          |
| [docx](https://github.com/dolanmiu/docx)                           | Word 文档生成                         |
| [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)            | 客户端 PDF 生成                        |
| [mammoth](https://github.com/mwilliamson/mammoth.js)               | Word 文档导入解析                       |
| [dom-to-image-more](https://github.com/1904labs/dom-to-image-more) | DOM 转图片                           |
| [Turndown](https://github.com/mixmark-io/turndown)                 | HTML → Markdown 转换                |
| [morphdom](https://github.com/patrick-steele-idem/morphdom)        | 高效 DOM diff 与更新                   |
| [Vitest](https://vitest.dev/)                                      | Vite 原生测试框架                       |
| [Excalidraw](https://excalidraw.com/)                              | 手绘风格白板绘制（Canvas v2 底层）            |
| [tldraw](https://tldraw.dev/)                                      | 白板引擎（CanvasEngine 适配器目标 API）      |
| [Dexie](https://dexie.org/)                                        | IndexedDB 封装（知识库/白板/向量索引持久化）      |
| [Transformers.js](https://huggingface.co/docs/transformers.js)     | 浏览器本地 AI 推理（@xenova/transformers） |
| [JSZip](https://stuk.github.io/jszip/)                             | ZIP 打包（博客/白板多文件导出）                |
| [react-window](https://github.com/bvaughn/react-window)            | 虚拟列表滚动                            |

---




### 🌟 如果这个项目对你有帮助，请点个 Star 吧！

⭐ **Star** · 🍴 **Fork** · 📋 **Issue** · 🔀 **PR**

|  🎯 |  🪧 |  📚 |  🤖 |  🔗  |  🌐  |   📤  |
| :-: | :-: | :-: | :-: | :--: | :--: | :---: |
| 双引擎 |  白板 | 知识库 |  AI | 知识链接 | 知识图谱 | 多格式导出 |

**让笔记从「孤岛」连成「网络」，让知识库成为「第二大脑」** ✨🔗🌐📚


|    📊    | 项目统计                              |
| :------: | :-------------------------------- |
|  📝 编辑器  | 2 引擎（CodeMirror 6 + Tiptap 3）     |
|   🪧 白板  | Excalidraw 混合引擎 / 30+ 组件 / 7 卡片形状 |
|  📚 知识库  | 11 模块 / 多库管理 / 健康度评分              |
| 🤖 AI 能力 | 6 项 / 本地推理 / 无需后端                 |
|  🔗 知识链接 | 13 项功能                            |
|  🌐 知识图谱 | 6 布局 / 跟随主主题                      |
|  🎨 博客主题 | 64 种 / 5 批                        |
|  📤 导出格式 | 12 种                              |
|  ⌨️ 快捷键  | 28 项                              |
|  🎴 主题样式 | 5 编辑器 + 6 代码                      |
|  📋 命令面板 | 25 项                              |
|   💾 存储  | localStorage + IndexedDB（Dexie）   |



**Made with** ❤️ **by MarkCraft Contributors**


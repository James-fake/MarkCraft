# UI PR 自检 · §18 桌面原生设计基线（入站闸门 Pre-flight Gate）

> 本模板对应设计基线 [`docs/MarkCraft-Desktop-Native-Baseline.md`](../../docs/MarkCraft-Desktop-Native-Baseline.md) 的 **§18 / §12 入站闸门**。
> **任何改动 `src/aurora/`（或 MarkCraft / Aurora 界面 UI）的 PR，合并前必须逐条勾选下方 14 项闸门；任一未过则先修再提。**
> 本 PR 不涉及 UI 时，在「改动概述」注明「不涉及 UI」即可，无需逐条勾选。

## 改动概述
<!-- 一句话说明本次 UI 改动的范围与意图；非 UI PR 注明「不涉及 UI」 -->

## §18 入站闸门自检（必勾）

- [ ] 1. 色值走 token：无新增硬编码 hex；无引用未定义 token
- [ ] 2. 分类色单来源：新文件/分组色已入 `categoricalColors.ts`；无紫粉
- [ ] 3. 圆角合规：仅 `--mc-radius-sm/md/lg/pill`；无裸 px 圆角
- [ ] 4. 字号语义：仅 `--mc-font-*`；无裸 `font-size`
- [ ] 5. 动效合规：仅 transform/opacity；<300ms；ease-out；非键盘高频动作
- [ ] 6. 降动守卫：新动效在 `prefers-reduced-motion` 下仍可理解
- [ ] 7. 危险分隔：删除等危险动作右置 + 分隔，不平铺
- [ ] 8. 无假 affordance：可点元素接真实行为；不可点去指针
- [ ] 9. 单主入口：同语义动作无多入口分散
- [ ] 10. 无 FAB / 占位：主动作在工具栏 / subbar；无 toast 摆设按钮
- [ ] 11. 弹层统一：对话框走 `Modal`；遮罩无 blur
- [ ] 12. 交互桌面化：键盘可达 + 右键菜单 + hover + 拖拽（按需）
- [ ] 13. 可达性：图标有 label；对比度达标；焦点序合理
- [ ] 14. 反模式扫描：过 §11 硬禁令清单，零命中

## 回归守卫（如适用）
<!-- 新增/修改界面是否同步更新了对应回归锁？例如 portalOverlayBasis.test.ts 的
     「浮层单源基底 + 变量全 --mc-* + 层级魔数不回流」契约 -->

- [ ] 相关界面回归守卫已同步更新（如适用）

## 关联
- 设计基线：`docs/MarkCraft-Desktop-Native-Baseline.md`
- 硬禁令清单：§11 ｜ 入站闸门：§12 ｜ 维护约定：§14
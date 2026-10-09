; ─────────────────────────────────────────────────────────────────────────────
; MarkCraft 安装向导自定义页：默认文件存储位置（Vault）
;
; 由 package.json 的 `build.nsis.include` 注入（仅 NSIS 安装包；portable 目标
; 无这些钩子，不受影响 —— 见 app-builder-lib/templates/nsis/portable.nsi）。
;
; 插入点：`customPageAfterChangeDir` 紧跟 MUI 的「安装位置」页之后
; （app-builder-lib/templates/nsis/assistedInstaller.nsh:42），正是「再选一个目录」的位置。
;
; 选择结果写入 `$INSTDIR\default-vault.txt`（**UTF-16LE**），应用首启读取并采用为默认 Vault。
;
; ⚠️ 编码：electron-builder 默认以 **Unicode** 构建 NSIS（NsisTarget 传 makensis 命令
;    `Unicode true`，非 `!define UNICODE` —— 直接跑 makensis 不加该命令会得到 ANSI 构建，
;    届时 `FileWriteUTF16LE` 报 "only available when building a Unicode installer"）。
;    Unicode 构建下 `FileWriteUTF16LE` 可用 → 中文路径**无损**。应用侧按 UTF-16LE 解码
;    （见 electron/main/index.ts#readDefaultVault，仍保留少量兜底编码）。
; ─────────────────────────────────────────────────────────────────────────────

; ⚠️ 注入时机：electron-builder 把本文件插在**模板之前**（见
;    NsisTarget.js#computeCommonInstallerScriptHeader），此时 MUI2 尚未被 include →
;    顶层直接 `!insertmacro MUI_HEADER_TEXT` 会报「macro not found」。
;    故这里显式先 include MUI2（它有 MUI_INCLUDED 守卫，模板随后再 include 是 no-op）。
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; ⚠️ 为什么**整段**（含 Var 与 customInit）都要 `!ifndef BUILD_UNINSTALLER` 包住：
;    electron-builder 会先用**同一份** header 编译一次「卸载器中间产物」
;    （defines.BUILD_UNINSTALLER），而 assistedInstaller.nsh 的**页面段整体**在该守卫内 →
;    那次编译里 customPageAfterChangeDir 不会被插入，于是：
;      · 页面函数成了「未引用函数」→ warning 6010；
;      · 页面用的 Var 成了「未引用变量」→ warning 6001；
;    而 makensis 以 `-WX`（警告即错误）运行 → 卸载器构建直接失败
;    （表现为 ERR_ELECTRON_BUILDER_CANNOT_EXECUTE）。故整段仅在安装器编译时发出。
!ifndef BUILD_UNINSTALLER
Var DefaultVaultDir
Var DefaultVaultDialog
Var DefaultVaultTextCtl
Var DefaultVaultBrowseBtn

; 默认值：文档目录下的 MarkCraft（用户可在页面上改）
!macro customInit
  StrCpy $DefaultVaultDir "$DOCUMENTS\MarkCraft"
!macroend

; 紧跟「安装位置」页之后插入自定义页
!macro customPageAfterChangeDir
  Page custom DefaultVaultPageCreate DefaultVaultPageLeave
!macroend

Function DefaultVaultPageCreate
  !insertmacro MUI_HEADER_TEXT "选择默认存储位置" "笔记文件默认保存在此文件夹，可与应用安装位置不同"

  nsDialogs::Create 1018
  Pop $DefaultVaultDialog
  ${If} $DefaultVaultDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "请选择笔记文件的默认存储位置（应用本体与笔记文件可以不在同一个位置）："
  Pop $0

  ${NSD_CreateText} 0 26u 72% 13u "$DefaultVaultDir"
  Pop $DefaultVaultTextCtl

  ${NSD_CreateBrowseButton} 75% 26u 25% 13u "浏览..."
  Pop $DefaultVaultBrowseBtn
  ${NSD_OnClick} $DefaultVaultBrowseBtn DefaultVaultBrowse

  ${NSD_CreateLabel} 0 48u 100% 30u "说明：$\r$\n  · 该文件夹不存在时会自动创建；$\r$\n  · 安装完成后也可在应用内随时「打开文件夹」切换。"
  Pop $0

  nsDialogs::Show
FunctionEnd

Function DefaultVaultBrowse
  ${NSD_GetText} $DefaultVaultTextCtl $DefaultVaultDir
  nsDialogs::SelectFolderDialog "选择笔记默认存储文件夹" "$DefaultVaultDir"
  Pop $0
  ${If} $0 != error
    StrCpy $DefaultVaultDir $0
    ${NSD_SetText} $DefaultVaultTextCtl "$DefaultVaultDir"
  ${EndIf}
FunctionEnd

Function DefaultVaultPageLeave
  ${NSD_GetText} $DefaultVaultTextCtl $DefaultVaultDir
  ; 空值 → 回落到文档目录默认值，避免写出空路径
  ${If} $DefaultVaultDir == ""
    StrCpy $DefaultVaultDir "$DOCUMENTS\MarkCraft"
  ${EndIf}
FunctionEnd
!endif ; BUILD_UNINSTALLER（页面宏 + 页面函数仅安装器需要）

!macro customInstall
  ; 建目录：失败不阻断安装（应用内可再改）
  CreateDirectory "$DefaultVaultDir"
  ; 记录到安装目录，供应用首启读取（UTF-16LE → 中文路径无损）
  FileOpen $0 "$INSTDIR\default-vault.txt" w
  FileWriteUTF16LE $0 "$DefaultVaultDir"
  FileClose $0
!macroend

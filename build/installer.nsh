; ─────────────────────────────────────────────────────────────────────────────
; MarkCraft 安装 / 卸载向导自定义（NSIS，经 package.json build.nsis.include 注入）
;
; 中英双语：build.nsis.installerLanguages = ["en_US","zh_CN"]，按系统语言自动选（不弹框）；
;   所有自定义文案用 LangString（1033 英文 / 2052 简体中文）。
;
; 安装器：
;   · customWelcomePage      —— 品牌欢迎页（MUI 官方欢迎页 + 位图）
;   · customPageAfterChangeDir —— 笔记存储位置；若检测到旧版本则顶部提示「已安装 vX，将升级到 vY」
;   · customInit             —— 读旧版本（$INSTDIR\version.txt）+ 升级时保留用户已选笔记位置
;   · customInstall          —— 写版本标记 + 笔记位置
; 卸载器：
;   · customUnInit / customUnWelcomePage / customUninstallPage / customUnInstall
;   · 卸载原因下拉 → 通过 curl 上报到遥测 Worker（尽力而为，失败静默）
;
; ⚠️ 编码：electron-builder 以 Unicode 构建 NSIS，FileWriteUTF16LE / FileReadUTF16LE 可用。
; ⚠️ 注入时机：本文件插在模板之前，MUI2 尚未 include → 这里先显式 include。
; ⚠️ 构建隔离：安装器段 !ifndef BUILD_UNINSTALLER；卸载器段 !ifdef BUILD_UNINSTALLER（-WX 未引用符号会失败）。
; ─────────────────────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; 高分屏清晰：声明 PerMonitorV2 DPI 感知（否则 Windows 把整个窗口位图拉伸 → 文字糊成像素）
ManifestDPIAwareness PerMonitorV2

BrandingText "MarkCraft"

; 现代字体：覆盖 MUI 内建的 ^Font / ^FontSize（英文 Segoe UI，中文微软雅黑）
LangString ^Font 1033 "Segoe UI"
LangString ^FontSize 1033 "9"
LangString ^Font 2052 "Microsoft YaHei UI"
LangString ^FontSize 2052 "9"

; ============================================================================
; 双语字符串（1033 = English，2052 = 简体中文）
; ============================================================================
LangString MSC_WELCOME_TITLE 1033 "Welcome to MarkCraft"
LangString MSC_WELCOME_TITLE 2052 "欢迎使用 MarkCraft"
LangString MSC_WELCOME_TEXT 1033 "A local-first Markdown writing and knowledge management tool.$\r$\n$\r$\nWikilinks, graph view, whiteboard and blog publishing — your data always stays in your own folders.$\r$\n$\r$\nNext: choose an install location, then a notes location."
LangString MSC_WELCOME_TEXT 2052 "本地优先的 Markdown 写作与知识管理。$\r$\n$\r$\n双链笔记、知识图谱、白板、博客发布，数据始终保存在你自己的文件夹里。$\r$\n$\r$\n接下来两步：选择安装位置 → 选择笔记存储位置。"
LangString MSC_TAGLINE 1033 "Local-first Markdown writing & knowledge management"
LangString MSC_TAGLINE 2052 "本地优先的 Markdown 写作与知识管理"
LangString MSC_WELCOME_BODY 1033 "Wikilinks, graph view, whiteboard and blog publishing — your data always stays in your own folders.$\r$\n$\r$\nNext: choose an install location, then a notes location."
LangString MSC_WELCOME_BODY 2052 "双链笔记、知识图谱、白板、博客发布，数据始终保存在你自己的文件夹里。$\r$\n$\r$\n接下来两步：选择安装位置 → 选择笔记存储位置。"

LangString MSC_FINISH_TEXT 1033 "MarkCraft has been installed.$\r$\n$\r$\nYour notes will be saved in the folder you chose. You can change it anytime from the app."
LangString MSC_FINISH_TEXT 2052 "MarkCraft 已安装完成。$\r$\n$\r$\n你的笔记会保存在安装时选择的文件夹中，可随时在应用内「打开文件夹」更改。"
LangString MSC_FINISH_RUN 1033 "Launch MarkCraft"
LangString MSC_FINISH_RUN 2052 "立即运行 MarkCraft"

LangString MSC_VAULT_HDR_TITLE 1033 "Choose notes location"
LangString MSC_VAULT_HDR_TITLE 2052 "选择默认存储位置"
LangString MSC_VAULT_HDR_SUB 1033 "Notes are saved here; this can differ from the install location"
LangString MSC_VAULT_HDR_SUB 2052 "笔记文件默认保存在此文件夹，可与应用安装位置不同"
LangString MSC_VAULT_LABEL 1033 "Choose the default folder for your notes (the app and your notes can live in different places):"
LangString MSC_VAULT_LABEL 2052 "请选择笔记文件的默认存储位置（应用本体与笔记文件可以不在同一个位置）："
LangString MSC_BROWSE 1033 "Browse..."
LangString MSC_BROWSE 2052 "浏览..."
LangString MSC_VAULT_HINT 1033 "Notes:$\r$\n  · The folder is created automatically if it does not exist;$\r$\n  · You can change it anytime from the app after installation."
LangString MSC_VAULT_HINT 2052 "说明：$\r$\n  · 该文件夹不存在时会自动创建；$\r$\n  · 安装完成后也可在应用内随时「打开文件夹」切换。"
LangString MSC_VAULT_DIALOG 1033 "Select the default notes folder"
LangString MSC_VAULT_DIALOG 2052 "选择笔记默认存储文件夹"

LangString MSC_UPDATE_PREFIX 1033 "Detected MarkCraft v"
LangString MSC_UPDATE_PREFIX 2052 "检测到已安装 MarkCraft v"
LangString MSC_UPDATE_MID 1033 ", upgrading to v"
LangString MSC_UPDATE_MID 2052 "，将升级到 v"
LangString MSC_UPDATE_SUFFIX 1033 "."
LangString MSC_UPDATE_SUFFIX 2052 "。"

LangString MSC_UN_HDR_TITLE 1033 "Uninstall MarkCraft"
LangString MSC_UN_HDR_TITLE 2052 "卸载 MarkCraft"
LangString MSC_UN_HDR_SUB 1033 "Confirm your uninstall options"
LangString MSC_UN_HDR_SUB 2052 "请确认卸载选项"
LangString MSC_UN_INTRO 1033 "MarkCraft will be removed from your computer."
LangString MSC_UN_INTRO 2052 "即将卸载 MarkCraft 程序本体。"
LangString MSC_UN_NOTES_KEPT 1033 "Your notes will NOT be deleted. They remain in:"
LangString MSC_UN_NOTES_KEPT 2052 "你的笔记文件不会被删除，仍保存在："
LangString MSC_UN_OPEN 1033 "Open notes folder"
LangString MSC_UN_OPEN 2052 "打开笔记文件夹"
LangString MSC_UN_DELETE_CHECK 1033 "Also delete notes and settings (cannot be undone)"
LangString MSC_UN_DELETE_CHECK 2052 "同时删除笔记与设置（不可恢复，慎选）"

LangString MSC_REASON_LABEL 1033 "Why are you uninstalling? (optional)"
LangString MSC_REASON_LABEL 2052 "卸载原因（可选）："
LangString MSC_REASON_0 1033 "No longer needed"
LangString MSC_REASON_0 2052 "不再需要"
LangString MSC_REASON_1 1033 "Switched to another app"
LangString MSC_REASON_1 2052 "改用其他软件"
LangString MSC_REASON_2 1033 "Missing features"
LangString MSC_REASON_2 2052 "功能不满足需求"
LangString MSC_REASON_3 1033 "Ran into problems"
LangString MSC_REASON_3 2052 "遇到问题 / 不稳定"
LangString MSC_REASON_4 1033 "Other"
LangString MSC_REASON_4 2052 "其他"

LangString MSC_UNINFO_HDR_TITLE 1033 "Uninstall complete"
LangString MSC_UNINFO_HDR_TITLE 2052 "卸载完成"
LangString MSC_UNINFO_HDR_SUB 1033 "Thanks for using MarkCraft"
LangString MSC_UNINFO_HDR_SUB 2052 "感谢使用 MarkCraft"
LangString MSC_UNINFO_DONE 1033 "MarkCraft has been uninstalled."
LangString MSC_UNINFO_DONE 2052 "MarkCraft 已从你的电脑上卸载。"
LangString MSC_UNINFO_DELETED 1033 "You chose to delete notes and settings; the data has been removed."
LangString MSC_UNINFO_DELETED 2052 "你选择了同时删除笔记与设置，相关数据已被清除。"
LangString MSC_UNINFO_KEPT 1033 "Your notes are still kept in:"
LangString MSC_UNINFO_KEPT 2052 "你的笔记仍保留在："

; ============================================================================
; 安装器
; ============================================================================
!ifndef BUILD_UNINSTALLER

; 完成页文案（$(...) 运行时按语言解析）
!define MUI_FINISHPAGE_TEXT "$(MSC_FINISH_TEXT)"
!define MUI_FINISHPAGE_RUN_TEXT "$(MSC_FINISH_RUN)"

; —— 品牌位图（scripts/gen-installer-bmp.cjs 生成；24-bit BMP）——
; ⚠️ electron-builder 已用 -D 预定义 MUI_WELCOMEFINISHPAGE_BITMAP（默认 metro 图），必须 /redef。
!define /redef MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-welcome.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEPAGE_TITLE "$(MSC_WELCOME_TITLE)"
!define MUI_WELCOMEPAGE_TEXT "$(MSC_WELCOME_TEXT)"

Var DefaultVaultDir
Var DefaultVaultDialog
Var DefaultVaultTextCtl
Var DefaultVaultBrowseBtn
Var InstalledVersion

; 升级检测：读旧版本标记（$INSTDIR\version.txt）；若存在则保留用户已选笔记位置（default-vault.txt）
!macro customInit
  InitPluginsDir
  File /oname=$PLUGINSDIR\mc-logo.bmp "${BUILD_RESOURCES_DIR}\installer-logo.bmp"
  StrCpy $InstalledVersion ""
  StrCpy $DefaultVaultDir "$DOCUMENTS\MarkCraft"
  IfFileExists "$INSTDIR\version.txt" 0 mcInitNoVer
    FileOpen $0 "$INSTDIR\version.txt" r
    FileRead $0 $InstalledVersion
    FileClose $0
  mcInitNoVer:
  IfFileExists "$INSTDIR\default-vault.txt" 0 mcInitNoVault
    FileOpen $0 "$INSTDIR\default-vault.txt" r
    FileReadUTF16LE $0 $DefaultVaultDir
    FileClose $0
  mcInitNoVault:
!macroend

; —— 自定义欢迎页（nsDialogs 自绘：logo 位图 + 现代字体排版）——
!macro customWelcomePage
  Page custom WelcomePageCreate
!macroend

Function WelcomePageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ; logo（96×96，已在 customInit 解压到 $PLUGINSDIR）
  ${NSD_CreateBitmap} 0 20u 48u 48u ""
  Pop $0
  ${NSD_SetImage} $0 "$PLUGINSDIR\mc-logo.bmp" $1

  ; 大标题（现代字体加粗）
  ${NSD_CreateLabel} 58u 20u 100% 26u "MarkCraft"
  Pop $0
  CreateFont $1 "$(^Font)" "18" "700"
  SendMessage $0 0x0030 $1 1

  ; 副标题
  ${NSD_CreateLabel} 58u 46u 100% 18u "$(MSC_TAGLINE)"
  Pop $0

  ; 正文
  ${NSD_CreateLabel} 0 80u 100% 110u "$(MSC_WELCOME_BODY)"
  Pop $0

  nsDialogs::Show
FunctionEnd

; —— 笔记默认存储位置（紧跟「安装位置」页之后）——
!macro customPageAfterChangeDir
  Page custom DefaultVaultPageCreate DefaultVaultPageLeave
!macroend

Function DefaultVaultPageCreate
  !insertmacro MUI_HEADER_TEXT "$(MSC_VAULT_HDR_TITLE)" "$(MSC_VAULT_HDR_SUB)"
  nsDialogs::Create 1018
  Pop $DefaultVaultDialog
  ${If} $DefaultVaultDialog == error
    Abort
  ${EndIf}

  ; 升级提示（仅当检测到旧版本）
  ${If} $InstalledVersion != ""
    ${NSD_CreateLabel} 0 0 100% 18u "$(MSC_UPDATE_PREFIX)$InstalledVersion$(MSC_UPDATE_MID)${VERSION}$(MSC_UPDATE_SUFFIX)"
    Pop $0
  ${EndIf}

  ${NSD_CreateLabel} 0 24u 100% 20u "$(MSC_VAULT_LABEL)"
  Pop $0
  ${NSD_CreateText} 0 50u 72% 13u "$DefaultVaultDir"
  Pop $DefaultVaultTextCtl
  ${NSD_CreateBrowseButton} 75% 50u 25% 13u "$(MSC_BROWSE)"
  Pop $DefaultVaultBrowseBtn
  ${NSD_OnClick} $DefaultVaultBrowseBtn DefaultVaultBrowse
  ${NSD_CreateLabel} 0 72u 100% 30u "$(MSC_VAULT_HINT)"
  Pop $0

  nsDialogs::Show
FunctionEnd

Function DefaultVaultBrowse
  ${NSD_GetText} $DefaultVaultTextCtl $DefaultVaultDir
  nsDialogs::SelectFolderDialog "$(MSC_VAULT_DIALOG)" "$DefaultVaultDir"
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

!macro customInstall
  ; 建目录：失败不阻断安装（应用内可再改）
  CreateDirectory "$DefaultVaultDir"
  ; 记录笔记位置，供应用首启读取（UTF-16LE → 中文路径无损）
  FileOpen $0 "$INSTDIR\default-vault.txt" w
  FileWriteUTF16LE $0 "$DefaultVaultDir"
  FileClose $0
  ; 版本标记（下次安装据此做升级检测）
  FileOpen $0 "$INSTDIR\version.txt" w
  FileWrite $0 "${VERSION}"
  FileClose $0
!macroend

!endif ; BUILD_UNINSTALLER


; ============================================================================
; 卸载器
; ============================================================================
!ifdef BUILD_UNINSTALLER

Var DeleteUserData
Var UnDataDialog
Var UnDataCheck
Var UnReasonList
Var UnReasonIndex
Var UnReasonCode
Var VaultPath
Var UnInfoDialog

; 读取安装时写入的笔记位置（删文件前，$INSTDIR 仍有效）
!macro customUnInit
  StrCpy $DeleteUserData "0"
  StrCpy $UnReasonCode ""
  StrCpy $VaultPath ""
  IfFileExists "$INSTDIR\default-vault.txt" 0 +4
    FileOpen $0 "$INSTDIR\default-vault.txt" r
    FileReadUTF16LE $0 $VaultPath
    FileClose $0
!macroend

; —— 卸载欢迎页：卸载原因下拉 + 笔记位置 + 删除数据勾选 ——
!macro customUnWelcomePage
  UninstPage custom un.UnDataPageCreate un.UnDataPageLeave
!macroend

Function un.UnDataPageCreate
  !insertmacro MUI_HEADER_TEXT "$(MSC_UN_HDR_TITLE)" "$(MSC_UN_HDR_SUB)"
  nsDialogs::Create 1018
  Pop $UnDataDialog
  ${If} $UnDataDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "$(MSC_UN_INTRO)"
  Pop $0

  ${NSD_CreateLabel} 0 24u 100% 14u "$(MSC_REASON_LABEL)"
  Pop $0
  ${NSD_CreateDropList} 0 40u 100% 60u ""
  Pop $UnReasonList
  ${NSD_CB_AddString} $UnReasonList "$(MSC_REASON_0)"
  ${NSD_CB_AddString} $UnReasonList "$(MSC_REASON_1)"
  ${NSD_CB_AddString} $UnReasonList "$(MSC_REASON_2)"
  ${NSD_CB_AddString} $UnReasonList "$(MSC_REASON_3)"
  ${NSD_CB_AddString} $UnReasonList "$(MSC_REASON_4)"
  ${NSD_CB_SelectString} $UnReasonList "$(MSC_REASON_0)"

  ${If} $VaultPath != ""
    ${NSD_CreateLabel} 0 64u 100% 18u "$(MSC_UN_NOTES_KEPT)"
    Pop $0
    ${NSD_CreateLabel} 0 82u 100% 18u "$VaultPath"
    Pop $0
    ${NSD_CreateButton} 0 102u 130u 15u "$(MSC_UN_OPEN)"
    Pop $0
    ${NSD_OnClick} $0 un.UnOpenVault
  ${EndIf}
  ${NSD_CreateCheckBox} 0 124u 100% 14u "$(MSC_UN_DELETE_CHECK)"
  Pop $UnDataCheck

  nsDialogs::Show
FunctionEnd

Function un.UnDataPageLeave
  ${NSD_GetState} $UnDataCheck $0
  ${If} $0 == 1
    StrCpy $DeleteUserData "1"
  ${Else}
    StrCpy $DeleteUserData "0"
  ${EndIf}

  ; 卸载原因下拉 → 映射为短码（供上报）
  SendMessage $UnReasonList 0x0147 0 0 $UnReasonIndex
  ${If} $UnReasonIndex == 1
    StrCpy $UnReasonCode "switched"
  ${ElseIf} $UnReasonIndex == 2
    StrCpy $UnReasonCode "missing-features"
  ${ElseIf} $UnReasonIndex == 3
    StrCpy $UnReasonCode "problems"
  ${ElseIf} $UnReasonIndex == 4
    StrCpy $UnReasonCode "other"
  ${Else}
    StrCpy $UnReasonCode "not-needed"
  ${EndIf}
FunctionEnd

Function un.UnOpenVault
  ${If} $VaultPath != ""
    ExecShell "open" "$VaultPath"
  ${EndIf}
FunctionEnd

; —— 卸载完成信息页 ——
!macro customUninstallPage
  UninstPage custom un.UnInfoPageCreate
!macroend

Function un.UnInfoPageCreate
  !insertmacro MUI_HEADER_TEXT "$(MSC_UNINFO_HDR_TITLE)" "$(MSC_UNINFO_HDR_SUB)"
  nsDialogs::Create 1018
  Pop $UnInfoDialog
  ${If} $UnInfoDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "$(MSC_UNINFO_DONE)"
  Pop $0
  ${If} $VaultPath != ""
    ${If} $DeleteUserData == "1"
      ${NSD_CreateLabel} 0 24u 100% 18u "$(MSC_UNINFO_DELETED)"
      Pop $0
    ${Else}
      ${NSD_CreateLabel} 0 24u 100% 18u "$(MSC_UNINFO_KEPT)"
      Pop $0
      ${NSD_CreateLabel} 0 42u 100% 18u "$VaultPath"
      Pop $0
    ${EndIf}
  ${EndIf}

  nsDialogs::Show
FunctionEnd

; —— 卸载执行：上报卸载原因（尽力而为，失败静默）+ 按需删除 userData ——
!macro customUnInstall
  ${If} $UnReasonCode != ""
    ; 把 JSON 写临时文件，避免命令行里嵌 JSON 的引号地狱
    FileOpen $0 "$TEMP\mc-uninstall.json" w
    FileWrite $0 '{"events":[{"type":"feature_use","installId":"uninstall","appVersion":"${VERSION}","platform":"win","feature":"uninstall:'
    FileWrite $0 "$UnReasonCode"
    FileWrite $0 '","count":1}]}'
    FileClose $0
    ; Win10+ 自带 curl.exe；--max-time 6 防止网络慢时卡住卸载
    nsExec::Exec '"$SYSDIR\curl.exe" -s -X POST "https://markcraft-telemetry-forwarder.2941954041.workers.dev/" -H "Content-Type: application/json" -H "X-MarkCraft-Key: c6e0fdbbfaa7647e2fe13f51cc93c8714fd0795ee3ca3dda" --max-time 6 -d "@$TEMP\mc-uninstall.json"'
    Delete "$TEMP\mc-uninstall.json"
  ${EndIf}

  ${If} $DeleteUserData == "1"
    RMDir /r "$APPDATA\MarkCraft"
    RMDir /r "$APPDATA\markcraft"
  ${EndIf}
!macroend

!endif ; BUILD_UNINSTALLER

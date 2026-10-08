# MarkCraft 代码签名指南

> 目标：让 `MarkCraft-Setup-*.exe` / `.dmg` 带上**可信发布者签名**，用户下载安装时不再被
> Windows SmartScreen / macOS Gatekeeper 拦成「未知发布者」。

## 为什么必须签名

- **Windows SmartScreen**：未签名（或签名信誉不足）的 exe，用户双击会看到「Windows 已保护你的电脑」
  蓝屏警告，需要点「更多信息 → 仍要运行」才能装 —— 大量用户到此流失。
- **发布者身份**：签名让「属性 → 数字签名」显示真实主体名，而非空白。
- **完整性**：签名后任何篡改都会导致校验失败，防中间人替换。

⚠️ **自签名证书（self-signed）不能解决分发问题** —— SmartScreen 只认**受信任 CA 签发**且
有**信誉积累**的证书。自签名仅可用于本地/内网测试。

---

## Windows

### 1. 取得证书（三选一）

| 途径 | 说明 | 适用 |
|---|---|---|
| **OV 证书**（组织验证） | DigiCert / Sectigo / GlobalSign 等签发 `.pfx`。有信誉积累期（新证书初期仍可能被 SmartScreen 警告，需下载量累积） | 常规商业分发 |
| **EV 证书**（扩展验证） | 同样来自 CA，但**立即获得 SmartScreen 信誉**（无积累期）。需硬件令牌（HSM/USB） | 追求「下载即无警告」 |
| **Azure Trusted Signing** | 微软云签名服务，按量计费，无需硬件令牌，CI 友好 | 云端 CI 构建 |

### 2. 配置 electron-builder

electron-builder 自动读取以下环境变量（**无需改配置**）：

```bash
# .pfx 文件路径（或 base64 内容，或 https URL）
CSC_LINK="C:/certs/markcraft.pfx"
CSC_KEY_PASSWORD="你的证书密码"
```

> 也可用 Windows 专用变量 `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`（多平台构建时区分）。

### 3. 构建

```bash
CSC_LINK="C:/certs/markcraft.pfx" CSC_KEY_PASSWORD="***" npm run electron:dist:win
```

### 4. 验证

```powershell
# 查看签名（应显示你的主体名，而非「未签名」）
Get-AuthenticodeSignature "release\MarkCraft-Setup-0.1.0-x64.exe" | Format-List
# 或
signtool verify /pa /v "release\MarkCraft-Setup-0.1.0-x64.exe"
```

---

## macOS

1. 加入 Apple Developer Program，申请 **Developer ID Application** 证书（`.p12`）。
2. 配置：

```bash
CSC_LINK="C:/certs/developer-id.p12"
CSC_KEY_PASSWORD="***"
# 公证（Notarization，macOS 10.15+ 必需，否则 Gatekeeper 拦截）
APPLE_ID="you@example.com"
APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"   # appleid.apple.com 生成
APPLE_TEAM_ID="XXXXXXXXXX"
```

3. `npm run electron:dist` —— electron-builder 会签名 + 自动公证。

---

## 未签名时会发生什么

- 构建**照常成功**，日志出现 `signing with signtool.exe`（无证书时为**空签**，等于不签）。
- Windows 上用户首次运行会看到 SmartScreen 警告。
- 这是**当前仓库的状态** —— 在拿到真实证书前，发布产物均为未签名。

---

## 本地测试用自签名（仅供开发，不可用于分发）

```powershell
# 生成自签名代码签名证书（PowerShell 管理员）
$c = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=MarkCraft Dev" -CertStoreLocation Cert:\CurrentUser\My `
  -NotAfter (Get-Date).AddYears(3)
# 导出为 pfx
$pwd = ConvertTo-SecureString -String "dev" -Force -AsPlainText
Export-PfxCertificate -Cert $c -FilePath "$env:USERPROFILE\markcraft-dev.pfx" -Password $pwd
```

然后 `CSC_LINK="$env:USERPROFILE\markcraft-dev.pfx" CSC_KEY_PASSWORD="dev" npm run electron:dist:win`。
签出的 exe 会显示「MarkCraft Dev」为发布者，但**仍是未受信任证书**，SmartScreen 依旧警告。

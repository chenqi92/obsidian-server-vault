# Server Vault

> Manage server credentials securely. Renders `server` code blocks as interactive cards with search, grouping, and AES-256-GCM encryption.

![Server Vault Preview](https://nas.allbs.cn:8888/cloudpic/2026/03/e5bc6735c667afad84b5760064a86303.png)

## ✨ Features

- **Code Block Rendering** — Write a ` ```server ` code block in Markdown and it renders as interactive server cards
- **Group & Collapse** — Organize servers into collapsible groups
- **Real-time Search** — Filter by alias, IP, username, or environment
- **One-click Copy** — Copy SSH commands, passwords, private/public keys to clipboard
- **Password Masking** — Passwords are hidden by default; click 👁 to temporarily reveal (auto-hides after 5s)
- **Edit & Add via Modal** — Use the ✏️ and ＋ buttons to edit/add servers through a form (sensitive data never stored in plaintext)
- **Environment Badges** — 🔴 Production / 🟡 Testing / 🟢 Development
- **Theme Support** — Uses Obsidian CSS variables, adapts to light/dark themes
- **Multiple YAML Formats** — Supports single object, flat array, and grouped array formats

## 📦 Installation

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the latest [Release](https://github.com/chenqi92/obsidian-server-vault/releases)
2. Create `.obsidian/plugins/server-vault/` in your vault
3. Copy the 3 files into that directory
4. Settings → Community Plugins → Enable **Server Vault**

### Via BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Add repo: `chenqi92/obsidian-server-vault`

## 📝 Usage

### Basic (Single Server)

````markdown
```server
alias: "My Database"
env: prod
host: 47.100.20.55
port: 22
user: root
```
````

### Grouped (Recommended)

````markdown
```server
- group: "AWS"
  servers:
    - alias: "Core Database"
      env: prod
      host: 47.100.20.55
      user: root
    - alias: "Cache Cluster"
      env: prod
      host: 47.100.20.56
      user: root

- group: "GCP"
  servers:
    - alias: "Frontend"
      env: test
      host: 101.35.22.10
      user: ubuntu
```
````

> **Do NOT write passwords in YAML!** Click ✏️ on the card → enter password in the modal → it gets encrypted before saving to disk.

### Supported Fields

| Field | Required | Description |
|-------|----------|-------------|
| `alias` | No | Display name (defaults to host) |
| `env` | No | `prod` / `test` / `dev` (default: `dev`) |
| `host` | Yes | IP address or hostname |
| `port` | No | SSH port (default: `22`) |
| `user` | No | Username (default: `root`) |
| `password` | No | Login password (enter via edit modal) |
| `privateKey` | No | SSH private key content |
| `publicKey` | No | SSH public key content |

## 🔐 Encryption

Built-in **AES-256-GCM** encryption with PBKDF2 key derivation (100,000 iterations).

### How it Works

1. **Enable encryption** in Settings → Server Vault
2. **Set master password** via command palette or settings panel
3. **Edit servers** via the ✏️ button — passwords are encrypted as `ENC(...)` before writing to disk
4. **Copy/Reveal** — passwords are decrypted on-the-fly when copying or revealing

> The master password is stored only in memory. It is cleared when you close the app.

### Commands (Ctrl/Cmd+P)

| Command | Description |
|---------|-------------|
| **Server Vault: Unlock** | Enter master password to decrypt |
| **Server Vault: Lock** | Clear master password from memory |

## ⚠️ Security Notes

- Sensitive data is **never stored in plaintext** when using the edit modal with encryption enabled
- The master password only exists in memory — never persisted to disk
- Uses Web Crypto API (AES-256-GCM + PBKDF2)

## 🛠️ Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production
```

**Tech Stack**: TypeScript + Svelte 4 + esbuild

## 📄 License

[MIT](LICENSE)

---

# 中文说明

> 在 Obsidian 中安全管理服务器凭据，将 `server` 代码块渲染为交互式卡片。

## 功能特性

- 代码块原位渲染为服务器卡片
- 项目分组 & 折叠
- 实时搜索（别名、IP、用户名、环境）
- 一键复制 SSH 命令、密码、密钥
- 通过弹窗表单编辑/新增服务器（敏感数据从不以明文落盘）
- AES-256-GCM 加密 + PBKDF2 密钥派生
- 完全适配明暗主题

## 使用方式

1. 在 Markdown 中创建 ` ```server ` 代码块，写入基础信息（host、user 等）
2. 点击卡片上的 ✏️ 按钮通过弹窗输入密码（密码自动加密后写入文件）
3. 点击 🔑 可直接解密复制密码到剪贴板
4. 点击 👁 可临时查看密码（5 秒后自动隐藏）

> ⚠️ 主密码仅保存在内存中，关闭 Obsidian 后自动清除。

# Server Vault

[![GitHub Release](https://img.shields.io/github/v/release/chenqi92/obsidian-server-vault)](https://github.com/chenqi92/obsidian-server-vault/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **[English](README.md)**

在 Obsidian 中安全管理服务器凭据，将 `server` 代码块渲染为交互式卡片，支持搜索、分组和 AES-256-GCM 加密。

![Server Vault 效果展示](https://nas.allbs.cn:8888/cloudpic/2026/03/e5bc6735c667afad84b5760064a86303.png)

## ✨ 功能特性

- **代码块原位渲染** — 在 Markdown 中写入 ` ```server ` 代码块，自动渲染为交互式服务器卡片
- **项目分组 & 折叠** — 支持按项目分组管理服务器，点击分组标题可展开/收起
- **实时搜索** — 顶部搜索栏，按别名、IP、用户名、环境实时过滤
- **一键复制** — SSH 命令、密码、私钥、公钥均可一键复制到剪贴板
- **密码遮挡** — 密码默认隐藏为 `••••••`，点击 👁 可临时显示（5 秒后自动隐藏）
- **表单编辑** — 通过 ✏️ 和 ＋ 按钮在弹窗中编辑/新增服务器，敏感数据加密后再写入文件
- **环境标识** — 🔴 生产 / 🟡 测试 / 🟢 开发
- **主题适配** — 完全使用 Obsidian CSS 变量，自动适配明暗主题
- **多格式兼容** — 支持单对象、扁平数组、分组数组等多种 YAML 格式

## 📦 安装

### 手动安装

1. 下载最新 [Release](https://github.com/chenqi92/obsidian-server-vault/releases) 中的 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian Vault 目录下创建 `.obsidian/plugins/server-vault/`
3. 将上述 3 个文件复制到该目录
4. 设置 → 社区插件 → 启用 **Server Vault**

### 通过 BRAT 安装

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 在 BRAT 设置中添加仓库：`chenqi92/obsidian-server-vault`

## 📝 使用方法

### 基础用法（单台服务器）

````markdown
```server
alias: "阿里云-核心数据库"
env: prod
host: 47.100.20.55
port: 22
user: root
```
````

### 项目分组（推荐）

````markdown
```server
- group: "阿里云"
  servers:
    - alias: "核心数据库"
      env: prod
      host: 47.100.20.55
      user: root
    - alias: "缓存集群"
      env: prod
      host: 47.100.20.56
      user: root

- group: "腾讯云"
  servers:
    - alias: "前端静态"
      env: test
      host: 101.35.22.10
      user: ubuntu
```
````

> ⚠️ **不要在 YAML 中直接写密码！** 点击卡片上的 ✏️ → 弹窗中输入密码 → 密码加密后写入文件。

### 支持的字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `alias` | 否 | 服务器别名，默认使用 host |
| `env` | 否 | 环境：`prod` / `test` / `dev`，默认 `dev` |
| `host` | **是** | IP 地址或域名 |
| `port` | 否 | SSH 端口，默认 `22` |
| `user` | 否 | 登录用户名，默认 `root` |
| `password` | 否 | 登录密码（通过编辑弹窗输入） |
| `privateKey` | 否 | SSH 私钥内容 |
| `publicKey` | 否 | SSH 公钥内容 |

## 🔐 加密功能

内置 **AES-256-GCM** 加密，PBKDF2 密钥派生（100,000 次迭代）。

### 使用流程

1. 设置 → Server Vault → 开启「启用加密」
2. 通过命令面板或设置面板设置主密码
3. 点击 ✏️ 编辑服务器 — 密码以 `ENC(...)` 格式加密后写入文件
4. 复制/查看 — 实时解密（不在屏幕上显示明文，除非主动点击查看）

> 主密码**仅保存在内存中**，关闭 Obsidian 后自动清除。

### 命令面板 (Ctrl/Cmd+P)

| 命令 | 说明 |
|------|------|
| **Server Vault: 解锁** | 输入主密码以解密查看加密的服务器数据 |
| **Server Vault: 锁定** | 清除内存中的主密码 |

## ⚠️ 安全提示

- 启用加密后，敏感数据**从不以明文存储**
- 主密码仅存在于内存中，不会持久化到磁盘
- 使用 Web Crypto API (`crypto.subtle`)，无第三方加密依赖
- 算法：AES-256-GCM + PBKDF2（100,000 次迭代，SHA-256）

## 🛠️ 开发

```bash
npm install
npm run dev    # 开发模式
npm run build  # 生产构建
```

**技术栈**：TypeScript + Svelte 4 + esbuild

## 📄 License

[MIT](LICENSE)

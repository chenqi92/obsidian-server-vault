# Server Vault

> 在 Obsidian 中管理服务器资产与凭据，将 `server` 代码块渲染为精美的交互式卡片。

![Server Vault 效果展示](https://nas.allbs.cn:8888/cloudpic/2026/03/e5bc6735c667afad84b5760064a86303.png)

## ✨ 功能特性

- **代码块原位渲染**：在 Markdown 中写入 ` ```server ` 代码块，自动渲染为交互式服务器资产卡片
- **项目分组 & 折叠**：支持按项目分组管理服务器，点击分组标题可展开/收起
- **实时搜索**：顶部搜索栏，按别名、IP、用户名、环境实时过滤
- **一键复制**：SSH 命令、密码、私钥、公钥均可一键复制到剪贴板
- **密码遮挡**：密码默认隐藏为 `••••••`，点击眼睛图标可临时显示
- **环境标识**：🔴 生产 / 🟡 测试 / 🟢 开发，一目了然
- **主题适配**：完全使用 Obsidian CSS 变量，自动适配明暗主题
- **多格式兼容**：支持单对象、扁平数组、分组数组等多种 YAML 格式

## 📦 安装

### 手动安装

1. 下载最新 [Release](https://github.com/chenqi92/obsidian-server-vault/releases) 中的 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian Vault 目录下创建 `.obsidian/plugins/server-vault/`
3. 将上述 3 个文件复制到该目录
4. 打开 Obsidian → 设置 → 社区插件 → 启用 **Server Vault**

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
password: "MySuperSecretPassword#2026"
```
````

### 多台服务器（横向并排）

````markdown
```server
- alias: "Web 服务器"
  env: prod
  host: 47.100.20.55
  user: root
  password: "Password123"

- alias: "数据库服务器"
  env: prod
  host: 47.100.20.56
  user: root
  password: "DbPass456"
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
      password: "MyPassword#2026"
    - alias: "缓存集群"
      env: prod
      host: 47.100.20.56
      user: root
      password: "CachePass"

- group: "腾讯云"
  servers:
    - alias: "前端静态"
      env: test
      host: 101.35.22.10
      user: ubuntu
      publicKey: "ssh-rsa AAAAB3Nza..."
```
````

### 支持的字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `alias` | 否 | 服务器别名，默认使用 host |
| `env` | 否 | 环境：`prod` / `test` / `dev`，默认 `dev` |
| `host` | 是 | IP 地址或域名 |
| `port` | 否 | SSH 端口，默认 `22` |
| `user` | 否 | 登录用户名，默认 `root` |
| `password` | 否 | 登录密码 |
| `privateKey` | 否 | SSH 私钥内容 |
| `publicKey` | 否 | SSH 公钥内容 |

## ⚠️ 安全提示

> **本插件以明文形式将密码和私钥存储在 Markdown 文件中。** 请注意以下风险：
>
> - 如果使用云同步（iCloud、OneDrive、Obsidian Git 等），密码将在云端暴露
> - 恶意或存在漏洞的第三方 Obsidian 插件可能读取 Vault 中的所有文件
> - 本地恶意软件可能扫描读取明文密码文件
>
> 建议仅在充分了解风险后使用，避免在包含敏感凭据的 Vault 中安装不受信任的插件。

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（watch）
npm run dev

# 生产构建
npm run build
```

**技术栈**：TypeScript + Svelte 4 + esbuild

## 📄 License

[MIT](LICENSE)

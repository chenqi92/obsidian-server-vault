import { Plugin, parseYaml, MarkdownPostProcessorContext, Modal, App, Notice, MarkdownView } from 'obsidian';
import ServerVault from './src/ui/ServerVault.svelte';
import { ServerVaultSettingTab, type ServerVaultSettings, DEFAULT_SETTINGS } from './src/settings';
import { isEncrypted, encryptValue, decryptValue } from './src/crypto';

/** 服务器数据类型定义 */
export interface ServerData {
    alias: string;
    env: 'prod' | 'test' | 'dev';
    host: string;
    port?: number;
    user: string;
    password?: string;
    privateKey?: string;
    publicKey?: string;
}

/** 服务器分组 */
export interface ServerGroup {
    group: string;
    servers: ServerData[];
}

/** 主密码输入弹窗 */
class MasterPasswordModal extends Modal {
    private resolvePromise: ((value: string | null) => void) | null = null;
    private prompt: string;

    constructor(app: App, prompt: string) {
        super(app);
        this.prompt = prompt;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: this.prompt });

        const input = contentEl.createEl('input', { type: 'password' });
        input.placeholder = '输入主密码...';
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.marginBottom = '12px';
        input.style.borderRadius = 'var(--radius-s)';
        input.style.border = '1px solid var(--background-modifier-border)';
        input.style.background = 'var(--background-primary)';
        input.style.color = 'var(--text-normal)';

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value) {
                this.resolvePromise?.(input.value);
                this.resolvePromise = null;
                this.close();
            }
        });

        const btnRow = contentEl.createDiv();
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.justifyContent = 'flex-end';

        const cancelBtn = btnRow.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => {
            this.resolvePromise?.(null);
            this.resolvePromise = null;
            this.close();
        });

        const confirmBtn = btnRow.createEl('button', { text: '确认', cls: 'mod-cta' });
        confirmBtn.addEventListener('click', () => {
            if (input.value) {
                this.resolvePromise?.(input.value);
                this.resolvePromise = null;
                this.close();
            }
        });

        // 自动聚焦
        setTimeout(() => input.focus(), 50);
    }

    onClose() {
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }
    }

    waitForInput(): Promise<string | null> {
        return new Promise(resolve => {
            this.resolvePromise = resolve;
            this.open();
        });
    }
}

export default class ServerVaultPlugin extends Plugin {
    settings: ServerVaultSettings = DEFAULT_SETTINGS;
    masterPassword: string | null = null;

    async onload() {
        console.log('Server Vault: 插件已加载');

        await this.loadSettings();
        this.addSettingTab(new ServerVaultSettingTab(this.app, this));

        // 注册命令
        this.addCommand({
            id: 'encrypt-current-file',
            name: '加密当前文件的服务器数据块',
            callback: () => this.encryptCurrentFile(),
        });

        this.addCommand({
            id: 'unlock-vault',
            name: '解锁（输入主密码）',
            callback: () => this.unlockVault(),
        });

        this.addCommand({
            id: 'lock-vault',
            name: '锁定（清除主密码）',
            callback: () => this.lockVault(),
        });

        // 注册代码块处理器
        this.registerMarkdownCodeBlockProcessor(
            'server',
            async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                try {
                    const trimmed = source.trim();
                    const rawData = parseYaml(trimmed);

                    const groups = this.normalizeToGroups(rawData);

                    if (groups.length === 0) {
                        el.createEl('div', { text: '⚠️ Server Vault: 无法解析服务器数据', cls: 'sv-error' });
                        el.createEl('pre', { text: trimmed, cls: 'sv-error-source' });
                        return;
                    }

                    // 尝试解密加密字段
                    const decryptedGroups = await this.decryptGroups(groups);

                    el.empty();
                    new ServerVault({ target: el, props: { groups: decryptedGroups } });
                } catch (e) {
                    console.error('Server Vault: 解析异常', e);
                    el.createEl('div', {
                        text: `⚠️ Server Vault: YAML 解析错误 - ${(e as Error).message}`,
                        cls: 'sv-error',
                    });
                }
            }
        );
    }

    // ==================== 设置 ====================

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ==================== 主密码管理 ====================

    async getMasterPassword(): Promise<string | null> {
        if (this.masterPassword) return this.masterPassword;
        const modal = new MasterPasswordModal(this.app, '🔐 输入主密码');
        const password = await modal.waitForInput();
        if (password) {
            this.masterPassword = password;
        }
        return password;
    }

    async unlockVault() {
        this.masterPassword = null; // 清除旧密码以便重新输入
        const password = await this.getMasterPassword();
        if (password) {
            new Notice('🔓 Server Vault 已解锁');
            this.refreshAllViews();
        }
    }

    lockVault() {
        this.masterPassword = null;
        new Notice('🔒 Server Vault 已锁定');
        this.refreshAllViews();
    }

    /** 刷新所有 Markdown 视图以触发重新渲染 */
    private refreshAllViews() {
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view.getViewType() === 'markdown') {
                const mdView = leaf.view as MarkdownView;
                mdView.previewMode?.rerender(true);
            }
        });
    }

    // ==================== 加密命令 ====================

    async encryptCurrentFile() {
        if (!this.settings.encryptionEnabled) {
            new Notice('⚠️ 请先在 Server Vault 设置中启用加密功能');
            return;
        }

        const password = await this.getMasterPassword();
        if (!password) return;

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file) {
            new Notice('⚠️ 请先打开一个 Markdown 文件');
            return;
        }

        const file = activeView.file;
        let content = await this.app.vault.read(file);

        const sensitiveFields = ['password', 'privateKey', 'publicKey'];
        let encryptCount = 0;

        // 遍历文件中的每一行，只在 server 代码块内加密
        const lines = content.split('\n');
        let inServerBlock = false;
        const newLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim() === '```server') {
                inServerBlock = true;
                newLines.push(line);
                continue;
            }
            if (inServerBlock && line.trim() === '```') {
                inServerBlock = false;
                newLines.push(line);
                continue;
            }

            if (inServerBlock) {
                let processed = line;
                for (const field of sensitiveFields) {
                    const regex = new RegExp(`^(\\s*${field}:\\s*)(.+)$`);
                    const match = line.match(regex);
                    if (match) {
                        let value = match[2].trim();
                        // 去掉引号
                        if ((value.startsWith('"') && value.endsWith('"')) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        // 跳过已加密、块标量指示符
                        if (!isEncrypted(value) && value !== '|' && value !== '>') {
                            const encrypted = await encryptValue(value, password);
                            processed = `${match[1]}"${encrypted}"`;
                            encryptCount++;
                        }
                        break;
                    }
                }
                newLines.push(processed);
            } else {
                newLines.push(line);
            }
        }

        if (encryptCount > 0) {
            await this.app.vault.modify(file, newLines.join('\n'));
            new Notice(`✅ 已加密 ${encryptCount} 个敏感字段`);
        } else {
            new Notice('ℹ️ 未发现需要加密的明文字段');
        }
    }

    // ==================== 解密逻辑 ====================

    /** 对所有分组中的服务器数据尝试解密 */
    private async decryptGroups(groups: ServerGroup[]): Promise<ServerGroup[]> {
        if (!this.masterPassword) return groups;

        const result: ServerGroup[] = [];
        for (const g of groups) {
            const decryptedServers: ServerData[] = [];
            for (const s of g.servers) {
                decryptedServers.push(await this.decryptServer(s));
            }
            result.push({ group: g.group, servers: decryptedServers });
        }
        return result;
    }

    /** 解密单台服务器的敏感字段 */
    private async decryptServer(server: ServerData): Promise<ServerData> {
        const result = { ...server };
        const fields: (keyof ServerData)[] = ['password', 'privateKey', 'publicKey'];

        for (const field of fields) {
            const value = result[field];
            if (typeof value === 'string' && isEncrypted(value) && this.masterPassword) {
                try {
                    (result as any)[field] = await decryptValue(value, this.masterPassword);
                } catch (e) {
                    console.warn(`Server Vault: 解密 ${field} 失败 (密码可能错误)`, e);
                    // 保留加密字符串，卡片会显示锁定状态
                }
            }
        }
        return result;
    }

    // ==================== 数据归一化 ====================

    private normalizeToGroups(rawData: any): ServerGroup[] {
        if (!rawData) return [];

        if (!Array.isArray(rawData) && typeof rawData === 'object') {
            if (rawData.group && Array.isArray(rawData.servers)) {
                const servers = rawData.servers.map((s: any) => this.normalizeServer(s)).filter(Boolean) as ServerData[];
                return servers.length > 0 ? [{ group: rawData.group, servers }] : [];
            } else {
                const s = this.normalizeServer(rawData);
                return s ? [{ group: '默认', servers: [s] }] : [];
            }
        }

        if (Array.isArray(rawData)) {
            const groups: ServerGroup[] = [];
            const ungrouped: ServerData[] = [];

            for (const item of rawData) {
                if (!item || typeof item !== 'object') continue;
                if (item.group && Array.isArray(item.servers)) {
                    const servers = item.servers.map((s: any) => this.normalizeServer(s)).filter(Boolean) as ServerData[];
                    if (servers.length > 0) groups.push({ group: item.group, servers });
                } else {
                    const s = this.normalizeServer(item);
                    if (s) ungrouped.push(s);
                }
            }

            if (ungrouped.length > 0) {
                groups.unshift({ group: '服务器', servers: ungrouped });
            }
            return groups;
        }

        return [];
    }

    private normalizeServer(raw: any): ServerData | null {
        if (!raw || typeof raw !== 'object') return null;
        return {
            alias: raw.alias || raw.host || '未命名',
            env: raw.env || 'dev',
            host: raw.host || '未配置',
            port: raw.port || 22,
            user: raw.user || 'root',
            password: raw.password || undefined,
            privateKey: raw.privateKey || undefined,
            publicKey: raw.publicKey || undefined,
        };
    }

    onunload() {
        this.masterPassword = null;
        console.log('Server Vault: 插件已卸载');
    }
}

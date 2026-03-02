import { Plugin, parseYaml, MarkdownPostProcessorContext, App, Notice, MarkdownView, TFile } from 'obsidian';
import ServerVault from './src/ui/ServerVault.svelte';
import { ServerVaultSettingTab, type ServerVaultSettings, DEFAULT_SETTINGS } from './src/settings';
import { isEncrypted, encryptValue, decryptValue } from './src/crypto';
import { EditServerModal } from './src/EditServerModal';
import { MasterPasswordModal } from './src/MasterPasswordModal';

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

export interface ServerGroup {
    group: string;
    servers: ServerData[];
}

/** 记录代码块的原始格式以便回写 */
type FormatType = 'single' | 'flat' | 'grouped';

export default class ServerVaultPlugin extends Plugin {
    settings: ServerVaultSettings = DEFAULT_SETTINGS;
    masterPassword: string | null = null;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new ServerVaultSettingTab(this.app, this));

        this.addCommand({ id: 'unlock-vault', name: '解锁（输入主密码）', callback: () => this.unlockVault() });
        this.addCommand({ id: 'lock-vault', name: '锁定（清除主密码）', callback: () => this.lockVault() });

        this.registerMarkdownCodeBlockProcessor('server', async (source, el, ctx) => {
            try {
                const trimmed = source.trim();
                const rawData = parseYaml(trimmed);
                const { groups, formatType } = this.normalizeToGroups(rawData);

                if (groups.length === 0) {
                    el.createEl('div', { text: '⚠️ Server Vault: 无法解析', cls: 'sv-error' });
                    return;
                }

                // 解密用于显示
                const displayGroups = await this.decryptGroups(groups);

                el.empty();
                new ServerVault({
                    target: el,
                    props: {
                        groups: displayGroups,
                        onDecrypt: (v: string) => this.decryptField(v),
                        onEdit: (gIdx: number, sIdx: number) => {
                            this.handleEdit(groups, displayGroups, gIdx, sIdx, formatType, trimmed, ctx.sourcePath);
                        },
                        onAdd: () => {
                            this.handleAdd(groups, formatType, trimmed, ctx.sourcePath);
                        },
                    },
                });
            } catch (e) {
                el.createEl('div', { text: `⚠️ YAML 错误: ${(e as Error).message}`, cls: 'sv-error' });
            }
        });
    }

    // ==================== 设置 & 密码管理 ====================

    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); }

    async getMasterPassword(): Promise<string | null> {
        if (this.masterPassword) return this.masterPassword;
        const modal = new MasterPasswordModal(this.app);
        const pw = await modal.waitForInput();
        if (pw) this.masterPassword = pw;
        return pw;
    }

    async unlockVault() {
        this.masterPassword = null;
        if (await this.getMasterPassword()) {
            new Notice('🔓 已解锁');
            this.refreshViews();
        }
    }

    lockVault() {
        this.masterPassword = null;
        new Notice('🔒 已锁定');
        this.refreshViews();
    }

    private refreshViews() {
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view.getViewType() === 'markdown') {
                (leaf.view as MarkdownView).previewMode?.rerender(true);
            }
        });
    }

    // ==================== 解密 ====================

    /** 解密单个字段值 → 剪贴板/显示 */
    async decryptField(encValue: string): Promise<string | null> {
        if (!isEncrypted(encValue)) return encValue;
        const pw = await this.getMasterPassword();
        if (!pw) return null;
        try {
            return await decryptValue(encValue, pw);
        } catch {
            new Notice('❌ 解密失败，主密码可能错误');
            this.masterPassword = null; // 清除错误密码
            return null;
        }
    }

    private async decryptGroups(groups: ServerGroup[]): Promise<ServerGroup[]> {
        if (!this.masterPassword) return groups;
        return Promise.all(groups.map(async g => ({
            group: g.group,
            servers: await Promise.all(g.servers.map(s => this.decryptServer(s))),
        })));
    }

    private async decryptServer(s: ServerData): Promise<ServerData> {
        const r = { ...s };
        for (const f of ['password', 'privateKey', 'publicKey'] as const) {
            const v = r[f];
            if (typeof v === 'string' && isEncrypted(v) && this.masterPassword) {
                try { (r as any)[f] = await decryptValue(v, this.masterPassword); } catch { /* 保持原值 */ }
            }
        }
        return r;
    }

    // ==================== 编辑 & 回写 ====================

    private async handleEdit(
        originalGroups: ServerGroup[], displayGroups: ServerGroup[],
        gIdx: number, sIdx: number,
        formatType: FormatType, rawSource: string, sourcePath: string
    ) {
        const display = displayGroups[gIdx]?.servers[sIdx];
        const original = originalGroups[gIdx]?.servers[sIdx];
        if (!display || !original) return;

        const groupNames = originalGroups.map(g => g.group);
        const modal = new EditServerModal(this.app, display, groupNames, async ({ data: formData }) => {
            const pw = await this.getMasterPassword();
            if (!pw && this.settings.encryptionEnabled) {
                new Notice('⚠️ 需要设置主密码才能保存');
                return;
            }

            const updated = { ...original };
            updated.alias = formData.alias || original.alias;
            updated.env = formData.env || original.env;
            updated.host = formData.host || original.host;
            updated.port = formData.port ?? original.port;
            updated.user = formData.user || original.user;

            for (const field of ['password', 'privateKey', 'publicKey'] as const) {
                if (formData[field] !== undefined && formData[field] !== '') {
                    updated[field] = pw ? await encryptValue(formData[field]!, pw) : formData[field];
                }
            }

            originalGroups[gIdx].servers[sIdx] = updated;
            const newSource = this.serializeGroups(originalGroups, formatType);
            await this.writeBlock(sourcePath, rawSource, newSource);
            new Notice('✅ 服务器信息已保存');
        });
        modal.open();
    }

    /** 新增服务器 */
    private handleAdd(
        originalGroups: ServerGroup[], formatType: FormatType,
        rawSource: string, sourcePath: string
    ) {
        const groupNames = originalGroups.map(g => g.group);
        const modal = new EditServerModal(this.app, null, groupNames, async ({ data: formData, targetGroup }) => {
            const pw = await this.getMasterPassword();
            if (!pw && this.settings.encryptionEnabled) {
                new Notice('⚠️ 需要设置主密码才能保存');
                return;
            }

            const newServer: ServerData = {
                alias: formData.alias || formData.host || '未命名',
                env: (formData.env as any) || 'dev',
                host: formData.host || '未配置',
                port: formData.port || 22,
                user: formData.user || 'root',
            };

            for (const field of ['password', 'privateKey', 'publicKey'] as const) {
                if (formData[field]) {
                    (newServer as any)[field] = pw ? await encryptValue(formData[field]!, pw) : formData[field];
                }
            }

            // 找到或创建目标分组
            const groupName = targetGroup || groupNames[0] || '服务器';
            let group = originalGroups.find(g => g.group === groupName);
            if (!group) {
                group = { group: groupName, servers: [] };
                originalGroups.push(group);
            }
            group.servers.push(newServer);

            // 有多个分组时自动升格为 grouped 格式
            const newFmt: FormatType = originalGroups.length > 1 ? 'grouped'
                : (formatType === 'single' && group.servers.length > 1) ? 'flat'
                    : formatType;
            const newSource = this.serializeGroups(originalGroups, newFmt);
            await this.writeBlock(sourcePath, rawSource, newSource);
            new Notice('✅ 新服务器已添加');
        });
        modal.open();
    }

    /** 将新内容写回 .md 文件中的代码块 */
    private async writeBlock(sourcePath: string, oldSource: string, newSource: string) {
        const file = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) return;

        let content = await this.app.vault.read(file);
        // 查找并替换代码块内容（```server\n...```）
        const oldBlock = '```server\n' + oldSource + '\n```';
        const newBlock = '```server\n' + newSource + '\n```';

        if (content.includes(oldBlock)) {
            content = content.replace(oldBlock, newBlock);
            await this.app.vault.modify(file, content);
        } else {
            new Notice('⚠️ 未找到原始代码块，可能已被修改');
        }
    }

    // ==================== YAML 序列化 ====================

    private serializeGroups(groups: ServerGroup[], fmt: FormatType): string {
        if (fmt === 'single' && groups.length === 1 && groups[0].servers.length === 1) {
            return this.serializeServer(groups[0].servers[0], '');
        }
        if (fmt === 'flat' && groups.length === 1) {
            return groups[0].servers.map(s =>
                '- ' + this.serializeServer(s, '  ').trimStart()
            ).join('\n\n');
        }
        // grouped
        return groups.map(g => {
            const ss = g.servers.map(s =>
                '    - ' + this.serializeServer(s, '      ').trimStart()
            ).join('\n');
            return `- group: "${g.group}"\n  servers:\n${ss}`;
        }).join('\n\n');
    }

    private serializeServer(s: ServerData, indent: string): string {
        const lines: string[] = [];
        const add = (key: string, val: any) => {
            if (val === undefined || val === null || val === '') return;
            const strVal = typeof val === 'string' && (val.includes(' ') || val.includes('"') || val.startsWith('ENC('))
                ? `"${val.replace(/"/g, '\\"')}"` : String(val);
            lines.push(`${indent}${key}: ${strVal}`);
        };
        add('alias', s.alias);
        add('env', s.env);
        add('host', s.host);
        if (s.port && s.port !== 22) add('port', s.port);
        add('user', s.user);
        add('password', s.password);
        add('privateKey', s.privateKey);
        add('publicKey', s.publicKey);
        return lines.join('\n');
    }

    // ==================== 数据归一化 ====================

    private normalizeToGroups(raw: any): { groups: ServerGroup[]; formatType: FormatType } {
        if (!raw) return { groups: [], formatType: 'single' };

        if (!Array.isArray(raw) && typeof raw === 'object') {
            if (raw.group && Array.isArray(raw.servers)) {
                const servers = raw.servers.map((s: any) => this.norm(s)).filter(Boolean) as ServerData[];
                return { groups: servers.length > 0 ? [{ group: raw.group, servers }] : [], formatType: 'grouped' };
            }
            const s = this.norm(raw);
            return s ? { groups: [{ group: '默认', servers: [s] }], formatType: 'single' } : { groups: [], formatType: 'single' };
        }

        if (Array.isArray(raw)) {
            const groups: ServerGroup[] = [];
            const ungrouped: ServerData[] = [];
            let hasGroups = false;

            for (const item of raw) {
                if (!item || typeof item !== 'object') continue;
                if (item.group && Array.isArray(item.servers)) {
                    hasGroups = true;
                    const servers = item.servers.map((s: any) => this.norm(s)).filter(Boolean) as ServerData[];
                    if (servers.length > 0) groups.push({ group: item.group, servers });
                } else {
                    const s = this.norm(item);
                    if (s) ungrouped.push(s);
                }
            }
            if (ungrouped.length > 0) groups.unshift({ group: '服务器', servers: ungrouped });
            return { groups, formatType: hasGroups ? 'grouped' : 'flat' };
        }
        return { groups: [], formatType: 'single' };
    }

    private norm(r: any): ServerData | null {
        if (!r || typeof r !== 'object') return null;
        return {
            alias: r.alias || r.host || '未命名', env: r.env || 'dev', host: r.host || '未配置',
            port: r.port || 22, user: r.user || 'root',
            password: r.password || undefined, privateKey: r.privateKey || undefined, publicKey: r.publicKey || undefined,
        };
    }

    onunload() { this.masterPassword = null; }
}

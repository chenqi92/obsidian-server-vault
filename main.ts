import { Plugin, parseYaml, MarkdownPostProcessorContext } from 'obsidian';
import ServerVault from './src/ui/ServerVault.svelte';

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

export default class ServerVaultPlugin extends Plugin {

    async onload() {
        console.log('Server Vault: 插件已加载');

        this.registerMarkdownCodeBlockProcessor(
            'server',
            (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                try {
                    const trimmed = source.trim();
                    const rawData = parseYaml(trimmed);
                    console.log('Server Vault: parseYaml 结果 ↓', typeof rawData, rawData);

                    const groups = this.normalizeToGroups(rawData);

                    if (groups.length === 0) {
                        el.createEl('div', {
                            text: '⚠️ Server Vault: 无法解析服务器数据，请检查 YAML 格式。',
                            cls: 'sv-error',
                        });
                        el.createEl('pre', { text: trimmed, cls: 'sv-error-source' });
                        return;
                    }

                    el.empty();

                    new ServerVault({
                        target: el,
                        props: { groups },
                    });
                } catch (e) {
                    console.error('Server Vault: 解析异常', e);
                    el.createEl('div', {
                        text: `⚠️ Server Vault: YAML 解析错误 - ${(e as Error).message}`,
                        cls: 'sv-error',
                    });
                    el.createEl('pre', { text: source.trim(), cls: 'sv-error-source' });
                }
            }
        );
    }

    /**
     * 将各种格式的 YAML 数据统一归一化为 ServerGroup[] 结构。
     *
     * 支持的格式：
     * 1. 单个 ServerData 对象（无 group 字段）
     * 2. ServerData 数组（扁平列表）
     * 3. 单个 ServerGroup 对象（含 group + servers）
     * 4. ServerGroup 数组
     * 5. 混合数组（部分有 group，部分无）
     */
    private normalizeToGroups(rawData: any): ServerGroup[] {
        if (!rawData) return [];

        // 单个对象
        if (!Array.isArray(rawData) && typeof rawData === 'object') {
            if (rawData.group && Array.isArray(rawData.servers)) {
                // 单个分组对象
                const servers = rawData.servers.map((s: any) => this.normalizeServer(s)).filter(Boolean) as ServerData[];
                return servers.length > 0 ? [{ group: rawData.group, servers }] : [];
            } else {
                // 单个服务器对象
                const s = this.normalizeServer(rawData);
                return s ? [{ group: '默认', servers: [s] }] : [];
            }
        }

        // 数组
        if (Array.isArray(rawData)) {
            const groups: ServerGroup[] = [];
            const ungroupedServers: ServerData[] = [];

            for (const item of rawData) {
                if (!item || typeof item !== 'object') continue;

                if (item.group && Array.isArray(item.servers)) {
                    // 分组对象
                    const servers = item.servers.map((s: any) => this.normalizeServer(s)).filter(Boolean) as ServerData[];
                    if (servers.length > 0) {
                        groups.push({ group: item.group, servers });
                    }
                } else {
                    // 扁平服务器对象
                    const s = this.normalizeServer(item);
                    if (s) ungroupedServers.push(s);
                }
            }

            if (ungroupedServers.length > 0) {
                groups.unshift({ group: '服务器', servers: ungroupedServers });
            }

            return groups;
        }

        return [];
    }

    /** 归一化单个服务器对象，填充默认值 */
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
        console.log('Server Vault: 插件已卸载');
    }
}

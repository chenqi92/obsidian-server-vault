import { App, PluginSettingTab, Setting } from 'obsidian';
import type ServerVaultPlugin from '../main';

export interface ServerVaultSettings {
    encryptionEnabled: boolean;
}

export const DEFAULT_SETTINGS: ServerVaultSettings = {
    encryptionEnabled: false,
};

export class ServerVaultSettingTab extends PluginSettingTab {
    plugin: ServerVaultPlugin;

    constructor(app: App, plugin: ServerVaultPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Server Vault' });

        new Setting(containerEl)
            .setName('启用加密')
            .setDesc('对密码、私钥等敏感字段使用 AES-256-GCM 加密。启用后可通过命令面板加密/解密。')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.encryptionEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.encryptionEnabled = value;
                    await this.plugin.saveSettings();
                    this.display(); // 刷新界面
                }));

        if (this.plugin.settings.encryptionEnabled) {
            const isUnlocked = !!this.plugin.masterPassword;

            new Setting(containerEl)
                .setName('主密码')
                .setDesc(isUnlocked
                    ? '✅ 已解锁 — 当前会话中主密码已缓存'
                    : '🔒 未设置 — 点击右侧按钮输入主密码')
                .addButton(btn => {
                    btn.setButtonText(isUnlocked ? '🔒 锁定' : '🔓 设置主密码');
                    if (!isUnlocked) btn.setCta();
                    btn.onClick(async () => {
                        if (isUnlocked) {
                            this.plugin.lockVault();
                        } else {
                            await this.plugin.unlockVault();
                        }
                        this.display();
                    });
                });
        }

        containerEl.createEl('h3', { text: '命令说明' });

        const list = containerEl.createEl('ul');
        list.createEl('li').innerHTML =
            '<strong>Server Vault: 加密当前文件</strong> — 将当前文件中 server 代码块的明文密码/密钥加密';
        list.createEl('li').innerHTML =
            '<strong>Server Vault: 解锁</strong> — 输入主密码以查看加密数据';
        list.createEl('li').innerHTML =
            '<strong>Server Vault: 锁定</strong> — 清除内存中的主密码';

        const note = containerEl.createEl('p');
        note.style.color = 'var(--text-muted)';
        note.style.fontSize = '0.85em';
        note.textContent = '主密码仅保存在内存中，关闭 Obsidian 后自动清除。加密算法：AES-256-GCM + PBKDF2（100,000 次迭代）。';
    }
}

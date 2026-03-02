import { App, Modal, Setting, Notice } from 'obsidian';
import type { ServerData } from '../main';

/**
 * 服务器编辑弹窗
 * 密码/私钥/公钥字段使用 password input，保证敏感数据不以明文出现在屏幕上。
 * 留空表示保持原有值不变。
 */
export class EditServerModal extends Modal {
    private formData: Partial<ServerData>;
    private original: ServerData | null;
    private onSave: (data: Partial<ServerData>) => void;

    constructor(app: App, original: ServerData | null, onSave: (data: Partial<ServerData>) => void) {
        super(app);
        this.original = original;
        this.onSave = onSave;
        this.formData = original
            ? { alias: original.alias, env: original.env, host: original.host, port: original.port, user: original.user }
            : { env: 'dev' as const, port: 22, user: 'root' };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('sv-edit-modal');
        contentEl.createEl('h2', { text: this.original ? '✏️ 编辑服务器' : '➕ 添加服务器' });

        // ---- 基础信息 ----
        new Setting(contentEl).setName('别名').addText(t =>
            t.setValue(this.formData.alias || '').setPlaceholder('例：阿里云-核心数据库')
                .onChange(v => this.formData.alias = v));

        new Setting(contentEl).setName('环境').addDropdown(dd =>
            dd.addOption('dev', '🟢 开发').addOption('test', '🟡 测试').addOption('prod', '🔴 生产')
                .setValue(this.formData.env || 'dev').onChange(v => this.formData.env = v as any));

        new Setting(contentEl).setName('主机 / IP').addText(t =>
            t.setValue(this.formData.host || '').setPlaceholder('47.100.20.55')
                .onChange(v => this.formData.host = v));

        new Setting(contentEl).setName('端口').addText(t =>
            t.setValue(String(this.formData.port || 22)).setPlaceholder('22')
                .onChange(v => this.formData.port = parseInt(v) || 22));

        new Setting(contentEl).setName('用户名').addText(t =>
            t.setValue(this.formData.user || 'root').setPlaceholder('root')
                .onChange(v => this.formData.user = v));

        // ---- 敏感信息（type=password）----
        contentEl.createEl('h3', { text: '🔐 凭据信息' });

        const hasPassword = !!this.original?.password;
        new Setting(contentEl)
            .setName('密码')
            .setDesc(hasPassword ? '已有密码。留空则保持原密码不变，输入新值将覆盖。' : '可选。输入后将加密存储。')
            .addText(t => {
                t.inputEl.type = 'password';
                t.inputEl.autocomplete = 'new-password';
                t.setPlaceholder(hasPassword ? '●●●●●● (留空保持不变)' : '输入密码...');
                t.onChange(v => this.formData.password = v || undefined);
            });

        const hasKey = !!this.original?.privateKey;
        const pkSetting = new Setting(contentEl)
            .setName('私钥')
            .setDesc(hasKey ? '已有私钥。留空则保持不变。' : '可选。粘贴 SSH 私钥内容。');
        const pkArea = pkSetting.controlEl.createEl('textarea', { cls: 'sv-textarea' });
        pkArea.placeholder = hasKey ? '(留空保持不变)' : '-----BEGIN RSA PRIVATE KEY-----\n...';
        pkArea.spellcheck = false;
        pkArea.addEventListener('input', () => this.formData.privateKey = pkArea.value || undefined);

        const hasPub = !!this.original?.publicKey;
        const pubSetting = new Setting(contentEl)
            .setName('公钥')
            .setDesc(hasPub ? '已有公钥。留空则保持不变。' : '可选。');
        const pubArea = pubSetting.controlEl.createEl('textarea', { cls: 'sv-textarea' });
        pubArea.placeholder = hasPub ? '(留空保持不变)' : 'ssh-rsa AAAAB3Nza...';
        pubArea.spellcheck = false;
        pubArea.addEventListener('input', () => this.formData.publicKey = pubArea.value || undefined);

        // ---- 按钮 ----
        const btnRow = contentEl.createDiv({ cls: 'sv-modal-buttons' });

        const cancelBtn = btnRow.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = btnRow.createEl('button', { text: '保存', cls: 'mod-cta' });
        saveBtn.addEventListener('click', () => {
            if (!this.formData.host?.trim()) {
                new Notice('⚠️ 主机地址不能为空');
                return;
            }
            this.onSave(this.formData);
            this.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

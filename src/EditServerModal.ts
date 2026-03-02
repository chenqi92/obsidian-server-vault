import { App, Modal, Setting, Notice } from 'obsidian';
import type { ServerData } from '../main';

/** onSave 回调中额外携带分组信息 */
export interface EditServerResult {
    data: Partial<ServerData>;
    /** 仅新增时有效：目标分组名 */
    targetGroup?: string;
}

/**
 * 服务器编辑弹窗
 * - 新增时显示分组选择（可选已有分组或新建分组）
 * - 密码/私钥/公钥字段使用 password input
 * - 留空表示保持原有值不变
 */
export class EditServerModal extends Modal {
    private formData: Partial<ServerData>;
    private original: ServerData | null;
    private onSave: (result: EditServerResult) => void;
    private existingGroups: string[];
    private selectedGroup: string = '';
    private newGroupName: string = '';

    constructor(
        app: App,
        original: ServerData | null,
        existingGroups: string[],
        onSave: (result: EditServerResult) => void
    ) {
        super(app);
        this.original = original;
        this.existingGroups = existingGroups;
        this.onSave = onSave;
        this.formData = original
            ? { alias: original.alias, env: original.env, host: original.host, port: original.port, user: original.user }
            : { env: 'dev' as const, port: 22, user: 'root' };
        this.selectedGroup = existingGroups[0] || '';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('sv-edit-modal');
        contentEl.createEl('h2', { text: this.original ? '✏️ 编辑服务器' : '➕ 添加服务器' });

        // ---- 分组选择（仅新增时显示）----
        if (!this.original) {
            const groupSetting = new Setting(contentEl)
                .setName('所属分组')
                .setDesc('选择已有分组或输入新分组名');

            if (this.existingGroups.length > 0) {
                groupSetting.addDropdown(dd => {
                    for (const g of this.existingGroups) dd.addOption(g, g);
                    dd.addOption('__new__', '＋ 新建分组...');
                    dd.setValue(this.selectedGroup);
                    dd.onChange(v => {
                        this.selectedGroup = v;
                        // 显示/隐藏新分组输入框
                        newGroupRow.style.display = v === '__new__' ? 'flex' : 'none';
                    });
                });
            } else {
                this.selectedGroup = '__new__';
            }

            const newGroupRow = contentEl.createDiv({ cls: 'sv-new-group-row' });
            newGroupRow.style.display = this.selectedGroup === '__new__' || this.existingGroups.length === 0 ? 'flex' : 'none';
            const newGroupInput = newGroupRow.createEl('input', { type: 'text', placeholder: '输入新分组名，例：华为云' });
            newGroupInput.style.cssText = 'flex:1;padding:6px 8px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s,4px);background:var(--background-primary);color:var(--text-normal);font-size:0.9em;margin:0 0 8px 0;';
            newGroupInput.addEventListener('input', () => this.newGroupName = newGroupInput.value);
        }

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

            // 确定目标分组
            let targetGroup: string | undefined;
            if (!this.original) {
                if (this.selectedGroup === '__new__' || this.existingGroups.length === 0) {
                    if (!this.newGroupName.trim()) {
                        new Notice('⚠️ 请输入分组名称');
                        return;
                    }
                    targetGroup = this.newGroupName.trim();
                } else {
                    targetGroup = this.selectedGroup;
                }
            }

            this.onSave({ data: this.formData, targetGroup });
            this.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

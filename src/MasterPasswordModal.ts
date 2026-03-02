import { App, Modal } from 'obsidian';

/** 主密码输入弹窗 */
export class MasterPasswordModal extends Modal {
    private resolvePromise: ((value: string | null) => void) | null = null;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: '🔐 输入主密码' });

        const input = contentEl.createEl('input', { type: 'password' });
        input.placeholder = '输入主密码...';
        input.style.cssText = 'width:100%;padding:8px;margin-bottom:12px;border-radius:var(--radius-s);border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);';

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value) {
                this.resolvePromise?.(input.value);
                this.resolvePromise = null;
                this.close();
            }
        });

        const btnRow = contentEl.createDiv();
        btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

        const cancelBtn = btnRow.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => { this.resolvePromise?.(null); this.resolvePromise = null; this.close(); });

        const confirmBtn = btnRow.createEl('button', { text: '确认', cls: 'mod-cta' });
        confirmBtn.addEventListener('click', () => {
            if (input.value) { this.resolvePromise?.(input.value); this.resolvePromise = null; this.close(); }
        });

        setTimeout(() => input.focus(), 50);
    }

    onClose() {
        if (this.resolvePromise) { this.resolvePromise(null); this.resolvePromise = null; }
    }

    waitForInput(): Promise<string | null> {
        return new Promise(resolve => { this.resolvePromise = resolve; this.open(); });
    }
}

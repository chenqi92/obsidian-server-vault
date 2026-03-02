<script lang="ts">
    import { Notice } from "obsidian";
    import type { ServerData } from "../../main";

    export let data: ServerData;
    export let onDecrypt: (val: string) => Promise<string | null>;
    export let onEdit: () => void;

    let revealedPw: string | null = null;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;

    function isEnc(v: string | undefined): boolean {
        return typeof v === "string" && v.startsWith("ENC(") && v.endsWith(")");
    }

    /** 复制字段值（如果加密，先解密再复制到剪贴板，不显示） */
    async function copyField(val: string | undefined, msg: string) {
        if (!val) return;
        let plain = val;
        if (isEnc(val)) {
            const d = await onDecrypt(val);
            if (!d) return;
            plain = d;
        }
        navigator.clipboard
            .writeText(plain)
            .then(() => new Notice(`✅ ${msg}`, 1500))
            .catch(() => new Notice("❌ 复制失败", 2000));
    }

    /** 临时显示密码（5秒后自动隐藏） */
    async function toggleReveal() {
        if (revealedPw) {
            revealedPw = null;
            if (revealTimer) clearTimeout(revealTimer);
            return;
        }
        let pwd = data.password;
        if (!pwd) return;
        if (isEnc(pwd)) {
            const d = await onDecrypt(pwd);
            if (!d) return;
            pwd = d;
        }
        revealedPw = pwd;
        revealTimer = setTimeout(() => {
            revealedPw = null;
        }, 5000);
    }

    $: sshCmd = `ssh -p ${data.port || 22} ${data.user}@${data.host}`;
    $: hasPw = !!data.password;
    $: hasPk = !!data.privateKey;
    $: hasPub = !!data.publicKey;
    $: pwEnc = isEnc(data.password);
    $: displayPw = revealedPw
        ? revealedPw
        : pwEnc
          ? "🔒 已加密"
          : hasPw
            ? "••••••"
            : "—";
    $: authLabel = hasPk ? "密钥" : hasPub ? "公钥" : hasPw ? "密码" : "—";

    function envLabel(env: string): string {
        return (
            (
                { prod: "生产", test: "测试", dev: "开发" } as Record<
                    string,
                    string
                >
            )[env] || env
        );
    }
</script>

<div class="sv-card">
    <!-- Header -->
    <div class="sv-hd">
        <span class="sv-dot sv-{data.env}"></span>
        <span class="sv-name">{data.alias}</span>
        <span class="sv-tag">{envLabel(data.env)}</span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="sv-edit-btn" on:click={onEdit} title="编辑">✏️</span>
    </div>

    <!-- Body -->
    <div class="sv-bd">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="sv-kv sv-clickable"
            on:click={() => copyField(data.host, "IP 已复制")}
        >
            <span class="sv-k">IP</span>
            <span class="sv-v sv-cp">{data.host}</span>
        </div>
        <div class="sv-kv">
            <span class="sv-k">端口</span>
            <span class="sv-v">{data.port || 22}</span>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="sv-kv sv-clickable"
            on:click={() => copyField(data.user, "用户名已复制")}
        >
            <span class="sv-k">用户</span>
            <span class="sv-v sv-cp">{data.user}</span>
        </div>
        {#if hasPw || hasPk || hasPub}
            <div class="sv-kv">
                <span class="sv-k">认证</span>
                <span class="sv-v sv-auth">
                    <span
                        class="sv-auth-badge"
                        class:sv-enc={pwEnc ||
                            isEnc(data.privateKey) ||
                            isEnc(data.publicKey)}>{authLabel}</span
                    >
                    {#if hasPw}
                        <code
                            class="sv-pw"
                            class:sv-enc-text={pwEnc && !revealedPw}
                            >{displayPw}</code
                        >
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <span
                            class="sv-eye"
                            on:click|stopPropagation={toggleReveal}
                            title={revealedPw ? "隐藏" : "查看密码"}
                        >
                            {revealedPw ? "🙈" : "👁"}
                        </span>
                    {/if}
                </span>
            </div>
        {/if}
    </div>

    <!-- Footer -->
    <div class="sv-ft">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
            class="sv-act sv-primary"
            on:click={() => copyField(sshCmd, "SSH 命令已复制")}>>_ SSH</span
        >
        {#if hasPw}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copyField(data.password, "密码已复制")}
                >🔑 密码</span
            >
        {/if}
        {#if hasPk}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copyField(data.privateKey, "私钥已复制")}
                >📄 私钥</span
            >
        {/if}
        {#if hasPub}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copyField(data.publicKey, "公钥已复制")}
                >🔓 公钥</span
            >
        {/if}
    </div>
</div>

<style>
    .sv-card {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s, 6px);
        overflow: hidden;
        transition: border-color 0.15s;
        display: flex;
        flex-direction: column;
        font-size: 0.84em;
    }
    .sv-card:hover {
        border-color: var(--interactive-accent);
    }

    .sv-hd {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: var(--background-secondary-alt);
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .sv-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 5px currentColor;
    }
    .sv-prod {
        background: var(--color-red, #e03e3e);
        color: var(--color-red, #e03e3e);
    }
    .sv-test {
        background: var(--color-yellow, #e0a225);
        color: var(--color-yellow, #e0a225);
    }
    .sv-dev {
        background: var(--color-green, #2db44d);
        color: var(--color-green, #2db44d);
    }
    .sv-name {
        flex: 1;
        font-weight: 600;
        color: var(--text-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .sv-tag {
        font-size: 0.72em;
        padding: 1px 5px;
        border-radius: 3px;
        background: var(--background-modifier-hover);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.3px;
        font-weight: 600;
        flex-shrink: 0;
    }
    .sv-edit-btn {
        cursor: pointer;
        font-size: 0.85em;
        padding: 2px 4px;
        border-radius: 3px;
        transition: background 0.12s;
        flex-shrink: 0;
        opacity: 0.5;
    }
    .sv-edit-btn:hover {
        background: var(--background-modifier-hover);
        opacity: 1;
    }

    .sv-bd {
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
    }
    .sv-kv {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 22px;
        padding: 1px 4px;
        border-radius: 3px;
        transition: background 0.12s;
    }
    .sv-clickable {
        cursor: pointer;
    }
    .sv-clickable:hover {
        background: var(--background-modifier-hover);
    }
    .sv-k {
        color: var(--text-muted);
        font-size: 0.88em;
        flex-shrink: 0;
    }
    .sv-v {
        font-family: var(--font-monospace);
        color: var(--text-normal);
        font-size: 0.92em;
        text-align: right;
    }
    .sv-cp {
        color: var(--text-accent);
    }

    .sv-auth {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .sv-auth-badge {
        font-family: var(--font-interface);
        font-size: 0.82em;
        padding: 0 4px;
        border-radius: 3px;
        background: var(--background-modifier-hover);
        color: var(--text-muted);
    }
    .sv-enc {
        background: rgba(224, 62, 62, 0.15);
        color: var(--text-error, #e03e3e);
    }
    .sv-pw {
        font-size: 0.85em;
        color: var(--text-muted);
        letter-spacing: 0.5px;
        background: none;
        padding: 0;
    }
    .sv-enc-text {
        font-style: italic;
        letter-spacing: 0;
        font-size: 0.78em;
    }
    .sv-eye {
        cursor: pointer;
        font-size: 0.82em;
        padding: 1px 2px;
        border-radius: 3px;
        transition: background 0.12s;
    }
    .sv-eye:hover {
        background: var(--background-modifier-hover);
    }

    .sv-ft {
        display: flex;
        gap: 4px;
        padding: 6px 10px;
        flex-wrap: wrap;
        border-top: 1px solid var(--background-modifier-border);
        background: var(--background-secondary-alt);
        margin-top: auto;
    }
    .sv-act {
        cursor: pointer;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 0.82em;
        font-family: var(--font-interface);
        font-weight: 500;
        transition: background 0.12s;
        user-select: none;
        white-space: nowrap;
        background: var(--interactive-normal);
        color: var(--text-normal);
    }
    .sv-act:hover {
        background: var(--interactive-hover);
    }
    .sv-act.sv-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }
    .sv-act.sv-primary:hover {
        background: var(--interactive-accent-hover);
    }
</style>

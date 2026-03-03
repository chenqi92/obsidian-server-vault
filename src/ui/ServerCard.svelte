<script lang="ts">
    import { Notice, setIcon } from "obsidian";
    import type { ServerData } from "../../main";

    export let data: ServerData;
    export let onDecrypt: (val: string) => Promise<string | null>;
    export let onEdit: () => void;
    export let onDelete: () => void;

    let deleteConfirm = false;
    let deleteTimer: ReturnType<typeof setTimeout> | null = null;

    function handleDelete() {
        if (!deleteConfirm) {
            deleteConfirm = true;
            deleteTimer = setTimeout(() => {
                deleteConfirm = false;
            }, 2000);
            return;
        }
        if (deleteTimer) clearTimeout(deleteTimer);
        deleteConfirm = false;
        onDelete();
    }

    let revealedPw: string | null = null;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;

    function isEnc(v: string | undefined): boolean {
        return typeof v === "string" && v.startsWith("ENC(") && v.endsWith(")");
    }

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

    /** Svelte action: 使用 Obsidian setIcon 渲染 Lucide 图标 */
    function icon(node: HTMLElement, name: string) {
        setIcon(node, name);
        return {
            update(newName: string) {
                node.empty();
                setIcon(node, newName);
            },
        };
    }

    $: sshCmd = `ssh -p ${data.port || 22} ${data.user}@${data.host}`;
    $: hasPw = !!data.password;
    $: hasPk = !!data.privateKey;
    $: hasPub = !!data.publicKey;
    $: pwEnc = isEnc(data.password);
    $: displayPw = revealedPw
        ? revealedPw
        : pwEnc
          ? "已加密"
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
        <span class="sv-icon-btn" on:click={onEdit} title="编辑">
            <span use:icon={"pencil"}></span>
        </span>
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
                            isEnc(data.publicKey)}
                    >
                        {#if pwEnc || isEnc(data.privateKey) || isEnc(data.publicKey)}
                            <span class="sv-icon-inline" use:icon={"lock"}
                            ></span>
                        {:else}
                            <span class="sv-icon-inline" use:icon={"unlock"}
                            ></span>
                        {/if}
                        {authLabel}
                    </span>
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
                            <span use:icon={revealedPw ? "eye-off" : "eye"}
                            ></span>
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
            on:click={() => copyField(sshCmd, "SSH 命令已复制")}
        >
            <span class="sv-icon-inline" use:icon={"terminal"}></span> SSH
        </span>
        {#if hasPw}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copyField(data.password, "密码已复制")}
            >
                <span class="sv-icon-inline" use:icon={"key"}></span> 密码
            </span>
        {/if}
        {#if hasPk}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copyField(data.privateKey, "私钥已复制")}
            >
                <span class="sv-icon-inline" use:icon={"file-key"}></span> 私钥
            </span>
        {/if}
        {#if hasPub}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copyField(data.publicKey, "公钥已复制")}
            >
                <span class="sv-icon-inline" use:icon={"shield"}></span> 公钥
            </span>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
            class="sv-act sv-del"
            class:sv-del-confirm={deleteConfirm}
            on:click|stopPropagation={handleDelete}
            title="删除"
        >
            {#if deleteConfirm}
                确认?
            {:else}
                <span use:icon={"trash-2"}></span>
            {/if}
        </span>
    </div>
</div>

<style>
    .sv-card {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s, 6px);
        padding: 12px 14px;
        min-width: 260px;
        max-width: 340px;
        flex: 1 1 280px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: box-shadow 0.15s;
    }
    .sv-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    /* Header */
    .sv-hd {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .sv-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .sv-prod {
        background: #e53935;
    }
    .sv-test {
        background: #fbc02d;
    }
    .sv-dev {
        background: #43a047;
    }
    .sv-name {
        font-weight: 600;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-normal);
    }
    .sv-tag {
        font-size: 0.72em;
        padding: 1px 6px;
        border-radius: 3px;
        background: var(--background-modifier-border);
        color: var(--text-muted);
    }
    .sv-icon-btn {
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.12s;
        display: inline-flex;
        align-items: center;
    }
    .sv-icon-btn:hover {
        opacity: 1;
    }
    /* Lucide inline icon sizing */
    .sv-icon-btn :global(svg),
    .sv-icon-inline :global(svg) {
        width: 14px;
        height: 14px;
        stroke-width: 2;
    }
    .sv-icon-inline {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
    }
    .sv-eye {
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.15s;
        display: inline-flex;
        align-items: center;
        margin-left: 4px;
    }
    .sv-eye :global(svg) {
        width: 14px;
        height: 14px;
    }
    .sv-eye:hover {
        opacity: 1;
    }
    /* Body */
    .sv-bd {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.88em;
    }
    .sv-kv {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
        border-radius: 3px;
    }
    .sv-clickable {
        cursor: pointer;
        transition: background 0.1s;
    }
    .sv-clickable:hover {
        background: var(--background-modifier-hover);
    }
    .sv-k {
        color: var(--text-faint);
        min-width: 34px;
        font-size: 0.9em;
        flex-shrink: 0;
    }
    .sv-v {
        color: var(--text-normal);
        font-family: var(--font-monospace);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .sv-cp::after {
        content: "";
        display: inline-block;
        width: 0;
    }
    .sv-auth {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
    }
    .sv-auth-badge {
        font-size: 0.82em;
        padding: 1px 6px;
        border-radius: 3px;
        background: var(--background-modifier-border);
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }
    .sv-auth-badge :global(svg) {
        width: 11px;
        height: 11px;
    }
    .sv-enc {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }
    .sv-pw {
        font-family: var(--font-monospace);
        font-size: 0.9em;
        letter-spacing: 0.05em;
        color: var(--text-muted);
    }
    .sv-enc-text {
        color: var(--text-accent);
    }
    /* Footer */
    .sv-ft {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 8px;
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
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }
    .sv-act :global(svg) {
        width: 12px;
        height: 12px;
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
    .sv-del {
        margin-left: auto;
        opacity: 0.5;
        transition:
            opacity 0.15s,
            background 0.15s,
            color 0.15s;
    }
    .sv-del:hover {
        opacity: 1;
    }
    .sv-del-confirm {
        opacity: 1;
        background: #e53935 !important;
        color: #fff !important;
        animation: sv-shake 0.3s;
    }
    @keyframes sv-shake {
        0%,
        100% {
            transform: translateX(0);
        }
        25% {
            transform: translateX(-3px);
        }
        75% {
            transform: translateX(3px);
        }
    }
</style>

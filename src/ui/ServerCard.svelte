<script lang="ts">
    import { Notice } from "obsidian";
    import type { ServerData } from "../../main";

    export let data: ServerData;

    let passwordVisible = false;

    function copy(text: string, msg: string) {
        navigator.clipboard
            .writeText(text)
            .then(() => new Notice(`✅ ${msg}`, 1500))
            .catch(() => new Notice("❌ 复制失败", 2000));
    }

    $: sshCmd = `ssh -p ${data.port || 22} ${data.user}@${data.host}`;
    $: authLabel = data.privateKey
        ? "密钥"
        : data.publicKey
          ? "公钥"
          : data.password
            ? "密码"
            : "—";
    $: masked = passwordVisible ? data.password : "••••••";

    function getEnvLabel(env: string): string {
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
    <!-- Header: 紧凑 -->
    <div class="sv-hd">
        <span class="sv-dot sv-{data.env}"></span>
        <span class="sv-name">{data.alias}</span>
        <span class="sv-tag">{getEnvLabel(data.env)}</span>
    </div>

    <!-- Body: 紧凑的 key-value -->
    <div class="sv-bd">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="sv-kv" on:click={() => copy(data.host, "IP 已复制")}>
            <span class="sv-k">IP</span>
            <span class="sv-v sv-cp">{data.host}</span>
        </div>
        <div class="sv-kv">
            <span class="sv-k">端口</span>
            <span class="sv-v">{data.port || 22}</span>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="sv-kv" on:click={() => copy(data.user, "用户名已复制")}>
            <span class="sv-k">用户</span>
            <span class="sv-v sv-cp">{data.user}</span>
        </div>
        <div class="sv-kv">
            <span class="sv-k">认证</span>
            <span class="sv-v sv-auth">
                <span class="sv-auth-badge">{authLabel}</span>
                {#if data.password}
                    <code class="sv-pw">{masked}</code>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <span
                        class="sv-eye"
                        on:click|stopPropagation={() =>
                            (passwordVisible = !passwordVisible)}
                    >
                        {passwordVisible ? "🙈" : "👁"}
                    </span>
                {/if}
            </span>
        </div>
    </div>

    <!-- Footer: 横排按钮 -->
    <div class="sv-ft">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
            class="sv-act sv-primary"
            on:click={() => copy(sshCmd, "SSH 命令已复制")}
        >
            >_ SSH
        </span>
        {#if data.password}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copy(data.password || "", "密码已复制")}
                >🔑 密码</span
            >
        {/if}
        {#if data.privateKey}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copy(data.privateKey || "", "私钥已复制")}
                >📄 私钥</span
            >
        {/if}
        {#if data.publicKey}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="sv-act"
                on:click={() => copy(data.publicKey || "", "公钥已复制")}
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
        transition: border-color 0.15s ease;
        display: flex;
        flex-direction: column;
        font-size: 0.84em;
    }
    .sv-card:hover {
        border-color: var(--interactive-accent);
    }

    /* Header */
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

    /* Body */
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
        transition: background-color 0.12s ease;
    }
    .sv-kv:has(.sv-cp) {
        cursor: pointer;
    }
    .sv-kv:has(.sv-cp):hover {
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

    /* Auth */
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
    .sv-pw {
        font-size: 0.85em;
        color: var(--text-muted);
        letter-spacing: 0.5px;
        background: none;
        padding: 0;
    }
    .sv-eye {
        cursor: pointer;
        font-size: 0.82em;
        padding: 1px 2px;
        border-radius: 3px;
        transition: background 0.12s ease;
    }
    .sv-eye:hover {
        background: var(--background-modifier-hover);
    }

    /* Footer */
    .sv-ft {
        display: flex;
        gap: 4px;
        padding: 6px 10px;
        border-top: 1px solid var(--background-modifier-border);
        background: var(--background-secondary-alt);
        flex-wrap: wrap;
        margin-top: auto;
    }
    .sv-act {
        cursor: pointer;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 0.82em;
        font-family: var(--font-interface);
        font-weight: 500;
        transition: background 0.12s ease;
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

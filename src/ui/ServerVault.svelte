<script lang="ts">
    import { Notice } from "obsidian";
    import type { ServerData, ServerGroup } from "../../main";
    import ServerCard from "./ServerCard.svelte";

    export let groups: ServerGroup[];

    /** 搜索关键词 */
    let searchQuery = "";

    /** 各分组的折叠状态（key: 分组名, value: 是否折叠） */
    let collapsedGroups: Record<string, boolean> = {};

    /** 切换分组折叠 */
    function toggleGroup(groupName: string) {
        collapsedGroups[groupName] = !collapsedGroups[groupName];
        collapsedGroups = collapsedGroups; // 触发响应式更新
    }

    /** 根据搜索关键词过滤后的分组 */
    $: filteredGroups = groups
        .map((g) => {
            if (!searchQuery.trim()) return g;
            const q = searchQuery.toLowerCase();
            const filtered = g.servers.filter(
                (s) =>
                    (s.alias && s.alias.toLowerCase().includes(q)) ||
                    (s.host && s.host.toLowerCase().includes(q)) ||
                    (s.user && s.user.toLowerCase().includes(q)) ||
                    (s.env && s.env.toLowerCase().includes(q)),
            );
            return { ...g, servers: filtered };
        })
        .filter((g) => g.servers.length > 0);

    /** 统计总服务器数 */
    $: totalServers = groups.reduce((sum, g) => sum + g.servers.length, 0);

    /** 统计过滤后的服务器数 */
    $: filteredTotal = filteredGroups.reduce(
        (sum, g) => sum + g.servers.length,
        0,
    );
</script>

<div class="sv-vault">
    <!-- ====== 搜索栏 ====== -->
    <div class="sv-search-bar">
        <svg
            class="sv-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
            class="sv-search-input"
            type="text"
            bind:value={searchQuery}
            placeholder="搜索服务器（别名 / IP / 用户名）..."
        />
        {#if searchQuery}
            <span class="sv-search-count">{filteredTotal} / {totalServers}</span
            >
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="sv-search-clear" on:click={() => (searchQuery = "")}
                >✕</span
            >
        {/if}
    </div>

    <!-- ====== 分组列表 ====== -->
    {#if filteredGroups.length === 0}
        <div class="sv-empty">
            {#if searchQuery}
                未找到匹配「{searchQuery}」的服务器
            {:else}
                暂无服务器数据
            {/if}
        </div>
    {/if}

    {#each filteredGroups as grp (grp.group)}
        <div class="sv-group">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="sv-group-header"
                on:click={() => toggleGroup(grp.group)}
            >
                <span
                    class="sv-group-chevron"
                    class:sv-collapsed={collapsedGroups[grp.group]}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
                <span class="sv-group-name">{grp.group}</span>
                <span class="sv-group-count">{grp.servers.length}</span>
            </div>

            {#if !collapsedGroups[grp.group]}
                <div class="sv-group-body">
                    {#each grp.servers as server (server.host + server.alias)}
                        <ServerCard data={server} />
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .sv-vault {
        font-family: var(--font-interface);
    }

    /* ---- 搜索栏 ---- */
    .sv-search-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin-bottom: 12px;
        background-color: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-m, 8px);
        transition: border-color 0.2s ease;
    }

    .sv-search-bar:focus-within {
        border-color: var(--interactive-accent);
    }

    .sv-search-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        opacity: 0.5;
    }

    .sv-search-input {
        flex: 1;
        border: none;
        background: transparent;
        color: var(--text-normal);
        font-size: 0.88em;
        font-family: var(--font-interface);
        outline: none;
        padding: 2px 0;
    }

    .sv-search-input::placeholder {
        color: var(--text-faint);
    }

    .sv-search-count {
        font-size: 0.75em;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .sv-search-clear {
        cursor: pointer;
        color: var(--text-muted);
        font-size: 0.82em;
        padding: 2px 4px;
        border-radius: var(--radius-s, 4px);
        transition: background-color 0.15s ease;
    }

    .sv-search-clear:hover {
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    /* ---- 空状态 ---- */
    .sv-empty {
        text-align: center;
        padding: 24px;
        color: var(--text-muted);
        font-size: 0.88em;
    }

    /* ---- 分组 ---- */
    .sv-group {
        margin-bottom: 8px;
    }

    .sv-group-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        cursor: pointer;
        border-radius: var(--radius-s, 4px);
        transition: background-color 0.15s ease;
        user-select: none;
    }

    .sv-group-header:hover {
        background-color: var(--background-modifier-hover);
    }

    .sv-group-chevron {
        display: flex;
        align-items: center;
        transition: transform 0.2s ease;
    }

    .sv-group-chevron svg {
        width: 14px;
        height: 14px;
        opacity: 0.5;
    }

    .sv-group-chevron.sv-collapsed {
        transform: rotate(-90deg);
    }

    .sv-group-name {
        font-size: 0.85em;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .sv-group-count {
        font-size: 0.72em;
        padding: 1px 6px;
        border-radius: 10px;
        background-color: var(--background-modifier-hover);
        color: var(--text-faint);
    }

    .sv-group-body {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 8px;
        padding: 6px 0 6px 20px;
    }
</style>

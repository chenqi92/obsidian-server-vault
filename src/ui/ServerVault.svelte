<script lang="ts">
    import { Notice } from "obsidian";
    import type { ServerData, ServerGroup } from "../../main";
    import ServerCard from "./ServerCard.svelte";

    export let groups: ServerGroup[];
    export let onDecrypt: (val: string) => Promise<string | null>;
    export let onEdit: (groupIndex: number, serverIndex: number) => void;
    export let onAdd: () => void;

    let searchQuery = "";
    let collapsedGroups: Record<string, boolean> = {};

    function toggleGroup(name: string) {
        collapsedGroups[name] = !collapsedGroups[name];
        collapsedGroups = collapsedGroups;
    }

    $: filteredGroups = groups
        .map((g) => {
            if (!searchQuery.trim()) return g;
            const q = searchQuery.toLowerCase();
            return {
                ...g,
                servers: g.servers.filter(
                    (s) =>
                        s.alias?.toLowerCase().includes(q) ||
                        s.host?.toLowerCase().includes(q) ||
                        s.user?.toLowerCase().includes(q) ||
                        s.env?.toLowerCase().includes(q),
                ),
            };
        })
        .filter((g) => g.servers.length > 0);

    $: totalServers = groups.reduce((sum, g) => sum + g.servers.length, 0);
    $: filteredTotal = filteredGroups.reduce(
        (sum, g) => sum + g.servers.length,
        0,
    );

    /** 计算某个 server 在原始 groups 中的真实索引 */
    function getOriginalServerIndex(
        filteredGroup: ServerGroup,
        serverInFiltered: ServerData,
    ): { gIdx: number; sIdx: number } {
        for (let gi = 0; gi < groups.length; gi++) {
            if (groups[gi].group !== filteredGroup.group) continue;
            for (let si = 0; si < groups[gi].servers.length; si++) {
                if (groups[gi].servers[si] === serverInFiltered)
                    return { gIdx: gi, sIdx: si };
            }
        }
        return { gIdx: 0, sIdx: 0 };
    }
</script>

<div class="sv-vault">
    <!-- 搜索栏 -->
    <div class="sv-search-bar">
        <svg
            class="sv-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
            class="sv-search-input"
            type="text"
            bind:value={searchQuery}
            placeholder="搜索服务器..."
        />
        {#if searchQuery}
            <span class="sv-search-count">{filteredTotal}/{totalServers}</span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="sv-search-clear" on:click={() => (searchQuery = "")}
                >✕</span
            >
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="sv-add-btn" on:click={onAdd} title="新增服务器">＋</span>
    </div>

    {#if filteredGroups.length === 0}
        <div class="sv-empty">
            {searchQuery ? `未找到「${searchQuery}」` : "暂无数据"}
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
                        ><polyline points="6 9 12 15 18 9"></polyline></svg
                    >
                </span>
                <span class="sv-group-name">{grp.group}</span>
                <span class="sv-group-count">{grp.servers.length}</span>
            </div>
            {#if !collapsedGroups[grp.group]}
                <div class="sv-group-body">
                    {#each grp.servers as server (server.host + server.alias)}
                        {@const idx = getOriginalServerIndex(grp, server)}
                        <ServerCard
                            data={server}
                            {onDecrypt}
                            onEdit={() => onEdit(idx.gIdx, idx.sIdx)}
                        />
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
    .sv-search-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin-bottom: 12px;
        background: var(--background-secondary);
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
        transition: background 0.15s ease;
    }
    .sv-search-clear:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }
    .sv-empty {
        text-align: center;
        padding: 24px;
        color: var(--text-muted);
        font-size: 0.88em;
    }
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
        transition: background 0.15s;
        user-select: none;
    }
    .sv-group-header:hover {
        background: var(--background-modifier-hover);
    }
    .sv-group-chevron {
        display: flex;
        align-items: center;
        transition: transform 0.2s;
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
        background: var(--background-modifier-hover);
        color: var(--text-faint);
    }
    .sv-group-body {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 8px;
        padding: 6px 0 6px 20px;
    }

    .sv-add-btn {
        cursor: pointer;
        font-size: 1.1em;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-s, 4px);
        color: var(--text-muted);
        transition:
            background 0.15s,
            color 0.15s;
        flex-shrink: 0;
    }
    .sv-add-btn:hover {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }
</style>

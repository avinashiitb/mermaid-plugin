<script lang="ts">
  import ArrowDropDownIcon from '~icons/material-symbols/arrow-drop-down';
  import LockIcon from '~icons/material-symbols/lock-outline';
  import FolderOpenIcon from '~icons/material-symbols/folder-open';
  import SaveIcon from '~icons/material-symbols/save';
  import ShareIcon from '~icons/material-symbols/share';
  import FileDownloadIcon from '~icons/material-symbols/file-download';
  import DeleteIcon from '~icons/material-symbols/delete';
  import ImageIcon from '~icons/material-symbols/image';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    onExportClick: () => void;
    onLoad: () => void;
    onSave: () => void;
    onExportDS: () => void;
    onClear: () => void;
    onBackgroundChange: (color: string) => void;
    onShare?: () => void;
  }

  let { 
    onExportClick, onLoad, onSave, onExportDS, onClear, onBackgroundChange, onShare 
  }: Props = $props();

  let open = $state(false);
  let menuRef: HTMLDivElement | undefined = $state();

  const COLORS = ["#ffffff", "#f8f9fa", "#f5faff", "#fffce8", "#fdf8f6"];

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      open = false;
    }
  };

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });
</script>

<div style="position: relative" bind:this={menuRef} class="dropdown-menu">
  <button
    style="display: flex; align-items: center; padding: 8px 16px; background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem; color: #374151; cursor: pointer; font-weight: 500;"
    onclick={() => open = !open}
  >
    <LockIcon style="font-size: 1.1rem; margin-right: 8px; color: #6b7280" />
    Options
    <ArrowDropDownIcon style="margin-left: 4px; color: #6b7280" />
  </button>

  {#if open}
    <div class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 z-50">
      <div class="py-1">
        <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Export Options
        </div>
        <button class="menu-item" onclick={() => { onExportDS(); open = false; }}>
          <FileDownloadIcon class="text-blue-600" />
          <span>Devscribe (.ds)</span>
        </button>
        <button class="menu-item" onclick={() => { onExportClick(); open = false; }}>
          <ImageIcon class="text-purple-600" />
          <span>Export Diagram</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .menu-item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 0.875rem;
    color: #374151;
    background-color: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .menu-item:hover {
    background-color: #f9fafb;
  }
  .menu-item :global(svg) {
    font-size: 1.25rem;
  }
</style>

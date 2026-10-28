<script lang="ts">
  import { inputStateStore, updateCode, defaultState } from '$lib/util/state';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { toBase64 } from 'js-base64';

  interface Breadcrumb {
    label: string;
    isFile?: boolean;
  }

  interface Props {
    fileId?: string;
    fileName?: string;
    lastEdited?: number;
    breadcrumbs?: Breadcrumb[];
    saveStatus?: 'saved' | 'saving' | 'error';
    fileData?: any;
    onRename?: (newName: string) => void;
  }

  let { 
    fileId = 'local-diag',
    fileName = 'Untitled Diagram',
    lastEdited,
    breadcrumbs = [],
    saveStatus = 'saved',
    fileData,
    onRename
  }: Props = $props();

  let isMenuOpen = $state(false);
  let menuRef: HTMLDivElement | undefined = $state();

  // Close dropdown on click outside
  $effect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        isMenuOpen = false;
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
    };
  });

  const breadcrumbsList = $derived(
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs
      : [{ label: fileName, isFile: true }]
  );

  const handleUndo = () => {
    window.dispatchEvent(new CustomEvent('mermaid-undo'));
  };

  const handleRedo = () => {
    window.dispatchEvent(new CustomEvent('mermaid-redo'));
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to reset this diagram to the default template?')) {
      updateCode(defaultState.code, { updateDiagram: true, resetPanZoom: true });
      toast.info('Diagram reset to default template');
    }
  };

  const handleExportPNG = async () => {
    isMenuOpen = false;
    try {
      const svg = document.querySelector<HTMLElement>('#container svg');
      if (!svg) {
        toast.error('Diagram not rendered yet');
        return;
      }

      const box = svg.getBoundingClientRect();
      const svgEl = svg as unknown as SVGSVGElement;
      const viewBox = svgEl.viewBox?.baseVal;
      const contentWidth = viewBox && viewBox.width > 0 ? viewBox.width : (box.width || 800);
      const contentHeight = viewBox && viewBox.height > 0 ? viewBox.height : (box.height || 600);
      const multiplier = 2;

      const canvas = document.createElement('canvas');
      canvas.width = contentWidth * multiplier;
      canvas.height = contentHeight * multiplier;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cloneSvg = svg.cloneNode(true) as HTMLElement;
      cloneSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      cloneSvg.setAttribute('width', `${canvas.width}px`);
      cloneSvg.setAttribute('height', `${canvas.height}px`);

      const svgString = cloneSvg.outerHTML
        .replaceAll('<br>', '<br/>')
        .replaceAll(/<img([^>]*)>/g, (m, g: string) => `<img ${g} />`);
      const base64 = toBase64(`<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`);

      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const a = document.createElement('a');
        a.download = `${fileName || 'diagram'}.png`;
        a.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        a.click();
        a.remove();
        toast.success('Diagram exported as PNG');
      };
      image.src = `data:image/svg+xml;base64,${base64}`;
    } catch (err) {
      console.error('Export PNG failed:', err);
      toast.error('Failed to export PNG');
    }
  };

  const handleExportSVG = () => {
    isMenuOpen = false;
    try {
      const svgElement = document.querySelector('#container svg')?.cloneNode(true) as HTMLElement;
      if (!svgElement) {
        toast.error('Diagram not rendered yet');
        return;
      }
      svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      const svgString = svgElement.outerHTML
        .replaceAll('<br>', '<br/>')
        .replaceAll(/<img([^>]*)>/g, (m, g: string) => `<img ${g} />`);
      const base64 = toBase64(`<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`);
      const a = document.createElement('a');
      a.download = `${fileName || 'diagram'}.svg`;
      a.href = `data:image/svg+xml;base64,${base64}`;
      a.click();
      a.remove();
      toast.success('Diagram exported as SVG');
    } catch (err) {
      console.error('Export SVG failed:', err);
      toast.error('Failed to export SVG');
    }
  };

  const handleExportDS = () => {
    isMenuOpen = false;
    try {
      const state = get(inputStateStore);
      const payload = JSON.stringify({
        _id: fileId || `mermaid-${Date.now()}`,
        version: '1.0.0',
        time: Date.now(),
        parent_file: fileId || 'standalone-export',
        blocks: [{ type: 'mermaid-plugin', data: state }],
        createdAt: fileData?.createdAt || Date.now(),
        updatedAt: Date.now(),
        fileType: 'mermaid-plugin'
      }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'diagram'}.ds`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Diagram exported as DevScribe (.ds)');
    } catch (err) {
      console.error('Export DevScribe failed:', err);
      toast.error('Failed to export .ds');
    }
  };

  const handleExportJSON = () => {
    isMenuOpen = false;
    try {
      const state = get(inputStateStore);
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'diagram'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Diagram exported as JSON');
    } catch (err) {
      console.error('Export JSON failed:', err);
      toast.error('Failed to export JSON');
    }
  };
</script>

<header class="readdy-light-topbar">
  <!-- LEFT: file path breadcrumbs & clean title -->
  <div class="topbar-left">
    <nav class="breadcrumb-nav" aria-label="file path">
      <svg class="folder-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2H4z" />
      </svg>
      {#each breadcrumbsList as seg, idx}
        {#if !seg.isFile}
          <span class="breadcrumb-segment" title={seg.label}>
            {seg.label}
          </span>
          <span class="breadcrumb-separator">›</span>
        {:else}
          <span class="breadcrumb-title" title={seg.label}>
            {seg.label}
          </span>
        {/if}
      {/each}
    </nav>
  </div>

  <!-- CENTER: auto-save status indicator -->
  <div class="topbar-center">
    <div class="save-status-container">
      {#if saveStatus === 'saved'}
        <span class="save-status saved" title="All changes saved">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-6.586l7.071-7.07-1.414-1.415L11 12.586l-2.657-2.657-1.414 1.414L11 15.414z" />
          </svg>
          Saved
        </span>
      {:else if saveStatus === 'saving'}
        <span class="save-status saving" title="Saving changes...">
          <svg class="ri-spin" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.364 5.636L16.95 7.05A7 7 0 1 0 19 12h2a9 9 0 1 1-2.636-6.364z" />
          </svg>
          Saving
        </span>
      {:else if saveStatus === 'error'}
        <span class="save-status error" title="Failed to save changes">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
          </svg>
          Save Error
        </span>
      {/if}
    </div>
  </div>

  <!-- RIGHT: Undo, Redo, Divider, Delete, Export -->
  <div class="topbar-right">
    <button
      onclick={handleUndo}
      class="export-icon-btn"
      title="Undo (⌘Z)"
      aria-label="Undo"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.828 7l2.536-2.536L7 3.05 1.343 8.707 7 14.364l1.364-1.364L5.828 9H13a6 6 0 0 1 0 12H4v2h9a8 8 0 0 0 0-16H5.828z"/>
      </svg>
    </button>

    <button
      onclick={handleRedo}
      class="export-icon-btn"
      title="Redo (⌘⇧Z)"
      aria-label="Redo"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.172 7H11a8 8 0 0 0 0 16h9v-2h-9a6 6 0 0 1 0-12h7.172l-2.536 2.536L17 14.364l5.657-5.657L17 3.05l-1.364 1.364L18.172 7z"/>
      </svg>
    </button>

    <div class="topbar-divider"></div>

    <button
      onclick={handleClear}
      class="export-icon-btn"
      title="Reset diagram to default"
      aria-label="Delete diagram"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4V2h10v2h5v2h-2v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6H2V4h5zM6 6v14h12V6H6zm3 3h2v8H9V9zm4 0h2v8h-2V9z"/>
      </svg>
    </button>

    <div class="relative inline-block" bind:this={menuRef}>
      <button
        onclick={() => (isMenuOpen = !isMenuOpen)}
        class="export-icon-btn"
        title="Export diagram"
        id="options-menu-trigger"
        aria-label="Export options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 19h16v-7h2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8h2v7zm9-10v7h-2V9H6l6-7 6 7h-5z"/>
        </svg>
      </button>

      {#if isMenuOpen}
        <div class="options-dropdown-menu">
          <div style="padding: 4px 0;">
            <div class="menu-section-header">Export diagram</div>

            <button
              class="menu-item-light"
              id="export-png-btn"
              onclick={handleExportPNG}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px; color: #6965db;">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              Export as Image (.png)
            </button>

            <button
              class="menu-item-light"
              id="export-svg-btn"
              onclick={handleExportSVG}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px; color: #009688;">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Export as SVG (.svg)
            </button>

            <button
              class="menu-item-light"
              id="export-ds-btn"
              onclick={handleExportDS}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px; color: #4F46E5;">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              DevScribe (.ds)
            </button>

            <button
              class="menu-item-light"
              id="export-json-btn"
              onclick={handleExportJSON}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px; color: #F59E0B;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Export as JSON (.json)
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .readdy-light-topbar {
    display: flex;
    height: 40px;
    padding: 0 16px 0 20px;
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #374151;
    box-sizing: border-box;
    width: 100%;
    z-index: 20;
    flex-shrink: 0;
  }

  .topbar-left, .topbar-center, .topbar-right {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .topbar-right {
    gap: 6px;
  }

  .breadcrumb-nav {
    display: flex;
    align-items: center;
    gap: 0;
    font-size: 12px;
    color: #9ca3af;
    overflow: visible;
    flex-wrap: nowrap;
  }

  .folder-icon {
    margin-right: 6px;
    opacity: 0.7;
    color: #9ca3af;
    flex-shrink: 0;
  }

  .breadcrumb-segment {
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
    color: #9ca3af;
    cursor: default;
  }

  .breadcrumb-separator {
    color: #9ca3af;
    opacity: 0.5;
    margin: 0 4px;
    font-size: 13px;
    user-select: none;
  }

  .breadcrumb-title {
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    cursor: default;
  }

  .export-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    color: #374151;
    transition: all 0.15s ease, transform 0.1s ease;
    box-sizing: border-box;
    padding: 0;
  }

  .export-icon-btn:hover:not(:disabled) {
    background-color: #f3f4f6;
    border-color: #d1d5db;
    transform: translateY(-1px);
  }

  .export-icon-btn:active:not(:disabled) {
    transform: translateY(0px);
  }

  .export-icon-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .topbar-divider {
    width: 1px;
    height: 16px;
    background: #e5e7eb;
    margin: 0 4px;
  }

  .save-status-container {
    display: flex;
    align-items: center;
  }

  .save-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    transition: all 0.25s ease;
  }

  .save-status.saved {
    background-color: #ecfdf5;
    color: #059669;
  }

  .save-status.saving {
    background-color: #eff6ff;
    color: #2563eb;
  }

  .save-status.error {
    background-color: #fef2f2;
    color: #dc2626;
  }

  .options-dropdown-menu {
    position: absolute;
    right: 0;
    top: 36px;
    width: 210px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid #e5e7eb;
    z-index: 100;
    overflow: hidden;
  }

  .menu-section-header {
    padding: 8px 16px 4px 16px;
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .menu-item-light {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background-color: transparent;
    border: none;
    font-size: 13px;
    color: #374151;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .menu-item-light:hover {
    background-color: #f3f4f6;
    color: #111827;
  }

  @keyframes spin-anim {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .ri-spin {
    animation: spin-anim 1s linear infinite;
    display: inline-block;
  }
</style>

<script lang="ts">
  import { inputStateStore } from '$/util/state';
  import { get } from 'svelte/store';
  import { toBase64 } from 'js-base64';
  import dayjs from 'dayjs';
  import CloseIcon from '~icons/material-symbols/close';
  import DownloadIcon from '~icons/material-symbols/download';
  import CopyIcon from '~icons/material-symbols/content-copy';

  interface Props {
    onClose: () => void;
    fileName?: string;
  }
  let { onClose, fileName = 'diagram' }: Props = $props();

  let selectedFormat = $state<'png' | 'svg' | 'mmd'>('png');
  let bgColor = $state<'white' | 'black' | 'transparent'>('white');

  // Logic inspired from Actions.svelte
  const getFileName = (extension: string) =>
    `${fileName}-${dayjs().format('YYYY-MM-DD-HHmmss')}.${extension}`;

  const getSvgElement = () => {
    const svgElement = document.querySelector('#container svg')?.cloneNode(true) as HTMLElement;
    if (svgElement) {
      svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }
    return svgElement;
  };

  const getBase64SVG = (svg?: HTMLElement): string => {
    const originalSvg = document.querySelector('#container svg');
    const box = originalSvg ? originalSvg.getBoundingClientRect() : { width: 800, height: 600 };

    if (!svg) {
      svg = getSvgElement();
    }
    if (!svg) return '';

    // Forces dimensions so it fully loads inside an <img> tag without collapsing
    svg.setAttribute('width', (box.width || 800).toString());
    svg.setAttribute('height', (box.height || 600).toString());

    // Apply background color to clone for export preview
    svg.style.backgroundColor = bgColor === 'transparent' ? 'transparent' : bgColor;
    if (bgColor === 'black') {
      svg.style.color = 'white'; // basic dark mode fallback
    } else {
      svg.style.color = 'black';
    }

    const svgString = svg.outerHTML
      .replaceAll('<br>', '<br/>')
      .replaceAll(/<img([^>]*)>/g, (m, g: string) => `<img ${g} />`);

    return toBase64(`<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`);
  };

  let previewSrc = $state('');

  // Update preview dynamically on format, color settings triggers
  $effect(() => {
    if (selectedFormat !== 'mmd') {
      const base64 = getBase64SVG();
      if (base64) {
        previewSrc = `data:image/svg+xml;base64,${base64}`;
      }
    } else {
      previewSrc = '';
    }
  });

  const simulateDownload = (download: string, href: string): void => {
    const a = document.createElement('a');
    a.download = download;
    a.href = href;
    a.click();
    a.remove();
  };

  const handleExport = async () => {
    const state = get(inputStateStore);

    if (selectedFormat === 'mmd') {
      const blob = new Blob([state.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      simulateDownload(getFileName('mmd'), url);
      URL.revokeObjectURL(url);
    } else if (selectedFormat === 'svg') {
      simulateDownload(getFileName('svg'), `data:image/svg+xml;base64,${getBase64SVG()}`);
    } else if (selectedFormat === 'png') {
      // Setup Canvas for PNG output
      const canvas = document.createElement('canvas');
      const svg = getSvgElement();
      if (!svg) return;

      const box = svg.getBoundingClientRect();
      const multiplier = 2; // High quality
      canvas.width = (box.width || 800) * multiplier;
      canvas.height = (box.height || 600) * multiplier;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.fillStyle = bgColor === 'transparent' ? 'rgba(0,0,0,0)' : bgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        simulateDownload(
          getFileName('png'),
          canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
        );
      };
      image.src = `data:image/svg+xml;base64,${getBase64SVG()}`;
    }
    onClose();
  };

  const copyToClipboard = async () => {
    const state = get(inputStateStore);
    try {
      if (selectedFormat === 'mmd') {
        await navigator.clipboard.writeText(state.code);
        alert('Code copied to clipboard!');
      } else {
        alert('Direct image copy supported via the main settings panel.');
      }
    } catch (e) {
      console.error(e);
    }
  };
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <!-- Modal Frame - Larger & Closer to Screenshot Aspect Ratio -->
  <div
    class="relative flex h-[580px] max-h-[95vh] w-[900px] max-w-[95vw] animate-in flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl duration-200 zoom-in-95 fade-in">
    <!-- Top Bar: Proper Font sizing -->
    <div class="flex items-center justify-between border-b border-gray-100 px-8 py-5">
      <h2 class="m-0 text-xl font-bold text-gray-900">Export diagram</h2>
      <button
        onclick={onClose}
        class="cursor-pointer rounded-full border-none bg-transparent p-1 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600">
        <CloseIcon style="font-size: 1.5rem" />
      </button>
    </div>

    <!-- Main Grid -->
    <div class="grid flex-1 grid-cols-5 overflow-hidden">
      <!-- Left column: Options -->
      <div class="col-span-2 flex flex-col gap-6 overflow-y-auto p-8">
        <div>
          <label class="mb-3 block text-sm font-semibold text-gray-900">Export format</label>
          <div class="flex flex-col gap-3">
            {#each ['png', 'svg', 'mmd'] as format}
              <button
                onclick={() => (selectedFormat = format as any)}
                class="flex cursor-pointer flex-col items-start rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-md
                {selectedFormat === format
                  ? 'border-teal-500 bg-teal-50/20 ring-1 ring-teal-500/30'
                  : 'border-gray-200 hover:border-teal-200'}">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-4 w-4 items-center justify-center rounded-full border {selectedFormat ===
                    format
                      ? 'border-teal-500'
                      : 'border-gray-400'}">
                    {#if selectedFormat === format}
                      <div class="h-2 w-2 rounded-full bg-teal-500"></div>
                    {/if}
                  </div>
                  <span class="font-semibold text-gray-900 uppercase">{format}</span>
                </div>
                <span class="mt-1 ml-6 text-xs text-gray-500">
                  {#if format === 'png'}
                    High quality raster image
                  {:else if format === 'svg'}
                    Scalable vector graphics
                  {:else}
                    Mermaid syntax code
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        </div>

        <div>
          <label class="mb-3 block text-sm font-semibold text-gray-900">Background color</label>
          <div class="flex items-center gap-2">
            {#each ['white', 'black', 'transparent'] as color}
              <button
                title={color}
                onclick={() => (bgColor = color as any)}
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-transform hover:scale-105
                {bgColor === color ? 'ring-2 ring-teal-500 ring-offset-2' : 'border-gray-300'}"
                style="background-color: {color === 'transparent' ? 'white' : color}; {color ===
                'transparent'
                  ? 'background-image: linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%); background-size: 8px 8px; background-position: 0 0, 4px 4px;'
                  : ''}">
                {#if color === 'black' && bgColor === 'black'}
                  <div class="h-2 w-2 rounded-full bg-white"></div>
                {:else if bgColor === color}
                  <div class="h-2 w-2 rounded-full bg-teal-500"></div>
                {/if}
              </button>
            {/each}
            <button
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Right column: Preview -->
      <div class="col-span-3 flex flex-col gap-3 overflow-hidden border-l border-gray-100 p-8">
        <label class="block text-sm font-semibold text-gray-900">Preview</label>
        <div
          class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {#if selectedFormat === 'mmd'}
            <div
              class="relative h-full w-full overflow-auto bg-white p-6 font-mono text-sm text-gray-800">
              <pre class="m-0 leading-relaxed text-slate-700">{get(inputStateStore).code}</pre>
              <button
                onclick={copyToClipboard}
                title="Copy code"
                class="absolute top-4 right-4 cursor-pointer rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition hover:bg-gray-50">
                <CopyIcon style="font-size: 1.2rem; color: #4b5563" />
              </button>
            </div>
          {:else}
            <div
              class="flex h-full w-full items-center justify-center overflow-hidden bg-gray-50/30 p-6">
              <!-- Grid background if transparent -->
              {#if bgColor === 'transparent'}
                <div
                  class="absolute inset-0 z-0"
                  style="background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 16px 16px;">
                </div>
              {/if}
              <img
                src={previewSrc}
                alt="Diagram Preview"
                class="relative z-10 max-h-full max-w-full object-contain"
                style="background-color: {bgColor === 'transparent' ? 'transparent' : bgColor};" />
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Bottom Actions Wrapper with sub-banner -->
    <div class="flex flex-col gap-4 border-t border-gray-100 bg-white px-8 py-5">
      <div class="flex items-center justify-end gap-3">
        <button
          onclick={onClose}
          class="cursor-pointer rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
          Cancel
        </button>
        <button
          onclick={handleExport}
          class="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800">
          Export
        </button>
      </div>
    </div>
  </div>
</div>

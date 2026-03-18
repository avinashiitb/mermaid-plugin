<script lang="ts">
  import EditIcon from '~icons/material-symbols/edit';
  import HistoryIcon from '~icons/material-symbols/history';
  import ExcalidrawMenu from './ExcalidrawMenu.svelte';
  import ExportModal from './ExportModal.svelte';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';

  dayjs.extend(relativeTime);

  interface Props {
    fileId: string;
    fileName: string;
    lastEdited: number;
    excalidrawAPI?: any; // Kept for layout compatibility
    fileData?: any;
    onRename: (newName: string) => void;
  }

  let { 
    fileId, fileName, lastEdited, excalidrawAPI, fileData, onRename 
  }: Props = $props();

  let showExportModal = $state(false);
  let isEditingName = $state(false);
  let tempName = $state(fileName);

  // Keep state sync with external props updates
  $effect(() => {
    tempName = fileName;
  });

  const submitRename = () => {
    if (tempName.trim() && tempName !== fileName) {
      onRename(tempName);
    }
    isEditingName = false;
  };

  const handleLoad = () => {
    alert("Load file callback triggered!");
  };

  const handleSaveJSON = () => {
    alert("Save JSON callback triggered!");
  };

  const handleExportDS = () => {
    alert("Export .ds callback triggered!");
  };

  const handleClear = () => {
    alert("Clear Canvas callback triggered!");
  };

  const handleBackground = (color: string) => {
    alert(`Background color callback triggered: ${color}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: fileName,
        text: 'Check out this diagram!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("Sharing not supported in this environment, copied current page URL link to clipboard instead!");
      void navigator.clipboard.writeText(window.location.href);
    }
  };
</script>

<header class="flex justify-between items-center px-6 bg-white border-b border-gray-200 shadow-sm z-10 h-16">
  <div class="flex items-center gap-3">
    {#if isEditingName}
      <input
        autoFocus
        bind:value={tempName}
        onblur={submitRename}
        onkeydown={(e) => e.key === 'Enter' && submitRename()}
        class="text-lg font-semibold text-gray-900 border border-indigo-500 rounded-md px-2 py-0.5 outline-none"
      />
    {:else}
      <button
        type="button"
        class="text-left text-lg font-semibold text-gray-900 m-0 cursor-pointer bg-transparent border-none p-0 outline-none"
        onclick={() => {
          tempName = fileName;
          isEditingName = true;
        }}
      >
        <h1>{fileName}</h1>
      </button>
    {/if}
    <button
      class="bg-transparent border-none cursor-pointer text-gray-400 p-1 flex items-center rounded-md hover:bg-gray-100 transition"
      onclick={() => {
          tempName = fileName;
          isEditingName = true;
      }}
    >
      <EditIcon style="font-size: 1rem" />
    </button>
    
    <div class="flex items-center gap-1 text-sm text-gray-400 ml-2">
      <HistoryIcon style="font-size: 0.9rem" />
      <span>Last edited {dayjs(lastEdited).fromNow()}</span>
    </div>
  </div>

  <div class="flex items-center gap-4">
    <ExcalidrawMenu
      onExportClick={() => showExportModal = true}
      onLoad={handleLoad}
      onSaveJSON={handleSaveJSON}
      onExportDS={handleExportDS}
      onClear={handleClear}
      onBackgroundChange={handleBackground}
      onShare={handleShare}
    />
  </div>

  {#if showExportModal}
    <ExportModal onClose={() => showExportModal = false} />
  {/if}
</header>

<style>
  /* Local overrides if needed, using tailwind otherwise. */
</style>

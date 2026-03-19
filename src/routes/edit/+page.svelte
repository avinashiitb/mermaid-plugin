<script lang="ts">
  import Actions from '$/components/Actions.svelte';
  import Card from '$/components/Card/Card.svelte';
  import DiagramDocButton from '$/components/DiagramDocumentationButton.svelte';
  import Editor from '$/components/Editor.svelte';
  import History from '$/components/History/History.svelte';
  import McWrapper from '$/components/McWrapper.svelte';
  import MermaidChartIcon from '$/components/MermaidChartIcon.svelte';
  import EditorChooserModal from '$/components/migration/EditorChooserModal.svelte';
  import TopBar from '$/components/TopBar.svelte';
  import PanZoomToolbar from '$/components/PanZoomToolbar.svelte';
  import Preset from '$/components/Preset.svelte';
  import Share from '$/components/Share.svelte';
  import SyncRoughToolbar from '$/components/SyncRoughToolbar.svelte';
  import { Button } from '$/components/ui/button';
  import * as Resizable from '$/components/ui/resizable';
  import { Switch } from '$/components/ui/switch';
  import { Toggle } from '$/components/ui/toggle';
  import VersionSecurityToolbar from '$/components/VersionSecurityToolbar.svelte';
  import View from '$/components/View.svelte';
  import type { EditorMode, Tab } from '$/types';
  import { shouldShowEditorChooser } from '$/util/migration/domainMigration';
  import { PanZoomState } from '$/util/panZoom';
  import { inputStateStore, stateStore, updateCodeStore, urlsStore } from '$/util/state';
import { get } from 'svelte/store';
  import { logEvent, logMermaidChartClick } from '$/util/stats';
  import { initHandler } from '$/util/util';
  import { onMount } from 'svelte';
  import CodeIcon from '~icons/custom/code';
  import HistoryIcon from '~icons/material-symbols/history';
  import GearIcon from '~icons/material-symbols/settings-outline-rounded';

  const panZoomState = new PanZoomState();

  const tabSelectHandler = (tab: Tab) => {
    const editorMode: EditorMode = tab.id === 'code' ? 'code' : 'config';
    updateCodeStore({ editorMode });
  };

  const editorTabs: Tab[] = [
    {
      icon: CodeIcon,
      id: 'code',
      title: 'Code'
    },
    {
      icon: GearIcon,
      id: 'config',
      title: 'Config'
    }
  ];

  let width = $state(0);
  let isMobile = $derived(width < 640);
  let isViewMode = $state(true);
  let showEditorChooser = $state(false);
  let fileId = $state<string | null>(null);
  let isHistoryOpen = $state(false);
  let diagName = $state('Untitled Diagram');
  let lastEdited = $state(Date.now());
  let isSaving = false;

  onMount(async () => {
    showEditorChooser = shouldShowEditorChooser();
    
    const urlParams = new URLSearchParams(window.location.search);
    fileId = urlParams.get('fileId');

    if (fileId && (window as any).pluginAPI) {
      try {
        const pluginAPI = (window as any).pluginAPI;
        const fileDetails = await pluginAPI.getFileDetailsById(fileId);
        if (fileDetails) {
          diagName = fileDetails.title || 'Untitled Diagram';
          lastEdited = fileDetails.lastEdited || Date.now();
        }

        const documents = await pluginAPI.getDocumentsByParentFile(fileId);
        if (documents && documents.length > 0) {
          const content = documents[0];
          const rawData = content.blocks?.[0]?.data;
          if (rawData) {
            if (rawData.code) {
              inputStateStore.set(rawData);
            } else if (typeof rawData === 'string') {
              updateCodeStore({ code: rawData });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load document from DB:', err);
      }
    } else {
      await initHandler();
    }

    window.addEventListener('appinstalled', () => {
      logEvent('pwaInstalled', { isMobile });
    });
  });

  $effect(() => {
    if (!fileId || !(window as any).pluginAPI) return;

    const autoSaveToDatabase = async () => {
      const pluginAPI = (window as any).pluginAPI;
      if (isSaving) return;
      isSaving = true;

      try {
        const state = get(inputStateStore);
        if (!state.code) return;

        const documents = await pluginAPI.getDocumentsByParentFile(fileId);
        const existingDoc = documents && documents.length > 0 ? documents[0] : null;

        const updatedContents = {
          version: "2.28.2",
          time: Date.now(),
          blocks: [{ type: "mermaid", data: state }],
          parent_file: fileId,
          _id: existingDoc?._id
        };

        await pluginAPI.updateDocument(fileId, [updatedContents]);
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        isSaving = false;
      }
    };

    const intervalId = setInterval(autoSaveToDatabase, 5000);
    return () => clearInterval(intervalId);
  });

  let editorPane: Resizable.Pane | undefined;
  $effect(() => {
    if (isMobile) {
      editorPane?.resize(50);
    }
  });
</script>

<div class="flex h-full flex-col overflow-hidden">
  {#snippet mobileToggle()}
    <div class="flex items-center gap-2">
      Edit <Switch
        id="editorMode"
        class="data-[state=checked]:bg-accent"
        bind:checked={isViewMode}
        onclick={() => {
          logEvent('mobileViewToggle');
        }} /> View
    </div>
  {/snippet}

  <TopBar 
    fileId={fileId || "local-diag"}
    fileName={diagName}
    lastEdited={lastEdited}
    onRename={async (newName) => {
      diagName = newName;
      lastEdited = Date.now();
      const pluginAPI = (window as any).pluginAPI;
      if (fileId && pluginAPI) {
        try {
          await pluginAPI.updateFileName(fileId, newName);
        } catch (e) {
          console.error("Failed to rename on DB:", e);
        }
      }
    }}
  />

  <div class="flex flex-1 flex-col overflow-hidden" bind:clientWidth={width}>
    <div
      class={[
        'size-full',
        isMobile && ['w-[200%] duration-300', isViewMode && '-translate-x-1/2']
      ]}>
      <Resizable.PaneGroup
        direction="horizontal"
        autoSaveId="liveEditor"
        class="gap-4 p-2 pt-0 sm:gap-0 sm:p-6 sm:pt-0">
        <Resizable.Pane bind:this={editorPane} defaultSize={30} minSize={15}>
          <div class="flex h-full flex-col gap-4 sm:gap-6">
            <Card
              onselect={tabSelectHandler}
              isOpen
              tabs={editorTabs}
              activeTabID={$stateStore.editorMode}
              isClosable={false}>
              {#snippet actions()}
                <DiagramDocButton />
              {/snippet}
              <Editor {isMobile} />
            </Card>

            <div class="group flex flex-wrap justify-between gap-4 sm:gap-6">
              <Preset />
              <Actions />
            </div>
          </div>
        </Resizable.Pane>
        <Resizable.Handle class="mr-1 hidden opacity-0 sm:block" />
        <Resizable.Pane minSize={15} class="relative flex h-full flex-1 flex-col overflow-hidden">
          <View {panZoomState} shouldShowGrid={$stateStore.grid} />
          <div class="absolute top-0 right-0"><PanZoomToolbar {panZoomState} /></div>
          <div class="absolute right-0 bottom-0"><VersionSecurityToolbar /></div>
          <div class="absolute bottom-0 left-0 sm:left-5"><SyncRoughToolbar /></div>
        </Resizable.Pane>
        {#if isHistoryOpen}
          <Resizable.Handle class="ml-1 hidden opacity-0 sm:block" />
          <Resizable.Pane minSize={15} defaultSize={30} class="hidden h-full grow flex-col sm:flex">
            <History />
          </Resizable.Pane>
        {/if}
      </Resizable.PaneGroup>
    </div>
  </div>
</div>

<EditorChooserModal bind:open={showEditorChooser} />

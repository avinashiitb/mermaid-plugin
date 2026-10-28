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
  import { stateStore, updateCodeStore, urlsStore, applyLoadedState, inputStateStore } from '$/util/state';
  import {
    getFileId,
    isDevScribe,
    loadDevScribeFile,
    saveDevScribeFile,
    renameDevScribeFile,
    type BreadcrumbItem
  } from '$/util/devscribe';
  import { get } from 'svelte/store';
  import { logEvent, logMermaidChartClick } from '$/util/stats';
  import { initHandler } from '$/util/util';
  import { onMount, onDestroy } from 'svelte';
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
  let diagName = $state('Untitled Diagram');
  let lastEdited = $state(Date.now());
  let breadcrumbs = $state<BreadcrumbItem[]>([]);
  let existingDoc = $state<any | null>(null);
  let isDevScribeEnv = $state(false);
  let isSaving = $state(false);
  let saveStatus = $state<'saved' | 'saving' | 'error'>('saved');
  let isContentLoading = $state(true);

  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  const scheduleAutoSave = (currentState: any) => {
    if (!fileId || !isDevScribeEnv || isContentLoading) return;
    clearTimeout(saveTimeout);
    saveStatus = 'saving';
    saveTimeout = setTimeout(async () => {
      if (isSaving) return;
      isSaving = true;
      try {
        await saveDevScribeFile(fileId!, currentState, existingDoc);
        lastEdited = Date.now();
        saveStatus = 'saved';
      } catch (err) {
        console.error('[Mermaid] Auto-save error:', err);
        saveStatus = 'error';
      } finally {
        isSaving = false;
      }
    }, 1500);
  };

  onMount(async () => {
    showEditorChooser = shouldShowEditorChooser();

    // Resolve DevScribe fileId
    const currentFileId = getFileId();
    fileId = currentFileId;
    isDevScribeEnv = isDevScribe();

    if (currentFileId && isDevScribeEnv) {
      try {
        isContentLoading = true;
        const data = await loadDevScribeFile(currentFileId);
        if (data.details) {
          diagName = data.details.title || 'Untitled Diagram';
          lastEdited = data.details.lastEdited || Date.now();
        }
        if (data.breadcrumbs) {
          breadcrumbs = data.breadcrumbs;
        }
        if (data.document) {
          existingDoc = data.document;
        }
        if (data.diagramState) {
          applyLoadedState(data.diagramState);
        }
      } catch (err) {
        console.error('[Mermaid] Error loading DevScribe file:', err);
      } finally {
        isContentLoading = false;
      }
    } else {
      isContentLoading = false;
    }

    await initHandler();

    window.addEventListener('appinstalled', () => {
      logEvent('pwaInstalled', { isMobile });
    });

    // Auto-save on diagram changes
    const unsubscribeStore = inputStateStore.subscribe((state) => {
      if (!isContentLoading) {
        scheduleAutoSave(state);
      }
    });

    const handleBeforeUnload = () => {
      if (fileId && isDevScribeEnv) {
        const state = get(inputStateStore);
        void saveDevScribeFile(fileId, state, existingDoc);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(saveTimeout);
      unsubscribeStore();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  const handleRename = async (newName: string) => {
    diagName = newName;
    lastEdited = Date.now();
    if (fileId && isDevScribeEnv) {
      await renameDevScribeFile(fileId, newName);
    }
  };

  let isHistoryOpen = $state(false);

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
    breadcrumbs={breadcrumbs}
    saveStatus={saveStatus}
    fileData={existingDoc}
    onRename={handleRename}
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

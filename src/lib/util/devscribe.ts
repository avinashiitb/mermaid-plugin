import type { State } from '$lib/types';

export interface DevScribeFileDetails {
  title?: string;
  lastEdited?: number;
  folderId?: string;
  fileType?: string;
}

export interface BreadcrumbItem {
  label: string;
  isFile: boolean;
}

export const isDevScribe = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).pluginAPI);
};

export const getFileId = (): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Check window.pluginAPI context (injected via preload)
  const api = (window as any).pluginAPI;
  if (api?.context?.fileId) {
    return api.context.fileId;
  }

  // 2. Check query string in URL: ?fileId=...
  if (window.location.search) {
    const urlParams = new URLSearchParams(window.location.search);
    const qId = urlParams.get('fileId');
    if (qId) return qId;
  }

  // 3. Check hash for query string: #/?fileId=... or #edit?fileId=...
  if (window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.split('?')[1];
    const hashParams = new URLSearchParams(hashQuery);
    const hId = hashParams.get('fileId');
    if (hId) return hId;
  }

  return null;
};

export const getStorageKey = (prefix = 'codeStore'): string => {
  const fileId = getFileId();
  return fileId ? `${prefix}_${fileId}` : prefix;
};

export const getPluginAPI = (): any => {
  if (typeof window !== 'undefined') {
    return (window as any).pluginAPI;
  }
  return null;
};

export const loadDevScribeFile = async (
  fileId: string
): Promise<{
  details: DevScribeFileDetails | null;
  breadcrumbs: BreadcrumbItem[];
  document: any | null;
  diagramState: Partial<State> | null;
}> => {
  const api = getPluginAPI();
  if (!api) {
    return { details: null, breadcrumbs: [], document: null, diagramState: null };
  }

  let details: DevScribeFileDetails | null = null;
  let breadcrumbs: BreadcrumbItem[] = [];
  let document: any | null = null;
  let diagramState: Partial<State> | null = null;

  // 1. Fetch file details
  try {
    if (api.getFileDetailsById) {
      details = await api.getFileDetailsById(fileId);
    }
  } catch (e) {
    console.error('[DevScribe] Failed to fetch file details:', e);
  }

  // 2. Fetch breadcrumbs
  try {
    if (api.getNestedPath) {
      const result = await api.getNestedPath({ fileId });
      if (result) {
        breadcrumbs = [
          ...(result.folders || []).map((f: any) => ({ label: f.name, isFile: false })),
          ...(result.file ? [{ label: result.file.title, isFile: true }] : [])
        ];
      }
    }
  } catch (e) {
    console.error('[DevScribe] Failed to fetch breadcrumbs:', e);
  }

  // 3. Fetch documents
  try {
    if (api.getDocumentsByParentFile) {
      const docs = await api.getDocumentsByParentFile(fileId);
      if (docs && docs.length > 0) {
        document = docs[0];
        const blocks = document.blocks;
        if (Array.isArray(blocks) && blocks.length > 0) {
          const firstBlock = blocks[0];
          // Block data might be an object with code, or a string
          if (firstBlock?.data) {
            if (typeof firstBlock.data === 'string') {
              diagramState = { code: firstBlock.data };
            } else if (typeof firstBlock.data === 'object') {
              diagramState = firstBlock.data;
            }
          } else if (firstBlock?.code) {
            diagramState = { code: firstBlock.code };
          }
        }
      }
    }
  } catch (e) {
    console.error('[DevScribe] Failed to fetch document content:', e);
  }

  return { details, breadcrumbs, document, diagramState };
};

export const saveDevScribeFile = async (
  fileId: string,
  state: State,
  existingDoc: any | null
): Promise<boolean> => {
  const api = getPluginAPI();
  if (!api || !api.updateDocument) return false;

  try {
    // Preserve existing version or increment
    let version = existingDoc?.version ?? 1;
    if (typeof version === 'number') {
      version += 1;
    }

    const payload = {
      version,
      time: Date.now(),
      blocks: [
        {
          type: 'mermaid-plugin',
          data: {
            code: state.code,
            mermaid: state.mermaid,
            panZoom: state.panZoom,
            rough: state.rough,
            grid: state.grid,
            pan: state.pan,
            zoom: state.zoom,
            editorMode: state.editorMode
          }
        }
      ],
      parent_file: fileId,
      _id: existingDoc?._id
    };

    await api.updateDocument(fileId, [payload]);
    return true;
  } catch (e) {
    console.error('[DevScribe] Failed to save document:', e);
    return false;
  }
};

export const renameDevScribeFile = async (
  fileId: string,
  newName: string
): Promise<boolean> => {
  const api = getPluginAPI();
  if (!api || !api.updateFileName) return false;

  try {
    await api.updateFileName(newName);
    return true;
  } catch (e) {
    console.error('[DevScribe] Failed to rename file:', e);
    return false;
  }
};

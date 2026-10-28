import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getFileId, getStorageKey, isDevScribe, loadDevScribeFile, saveDevScribeFile, renameDevScribeFile } from './devscribe';

describe('devscribe utilities', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as any).pluginAPI;
  });

  afterEach(() => {
    delete (window as any).pluginAPI;
  });

  it('detects devscribe environment when pluginAPI is present', () => {
    expect(isDevScribe()).toBe(false);

    (window as any).pluginAPI = { context: { fileId: 'test-123' } };
    expect(isDevScribe()).toBe(true);
  });

  it('retrieves fileId from window.pluginAPI context', () => {
    (window as any).pluginAPI = { context: { fileId: 'context-file-456' } };
    expect(getFileId()).toBe('context-file-456');
  });

  it('scopes storage keys per fileId', () => {
    (window as any).pluginAPI = { context: { fileId: 'file-abc' } };
    expect(getStorageKey('codeStore')).toBe('codeStore_file-abc');
    expect(getStorageKey('autoHistoryStore')).toBe('autoHistoryStore_file-abc');

    (window as any).pluginAPI = { context: { fileId: 'file-xyz' } };
    expect(getStorageKey('codeStore')).toBe('codeStore_file-xyz');
  });

  it('falls back to default key when no fileId is present', () => {
    expect(getStorageKey('codeStore')).toBe('codeStore');
  });

  it('loads and saves document through pluginAPI correctly', async () => {
    let savedPayload: any = null;
    let renamedTitle: string | null = null;

    (window as any).pluginAPI = {
      context: { fileId: 'file-1' },
      getFileDetailsById: async (id: string) => ({
        title: 'My Architecture Diagram',
        lastEdited: 1000,
        folderId: 'folder-1',
        fileType: 'mermaid-plugin'
      }),
      getDocumentsByParentFile: async (id: string) => [
        {
          _id: 'doc-1',
          version: 1,
          time: 1000,
          parent_file: id,
          blocks: [
            {
              type: 'mermaid-plugin',
              data: {
                code: 'graph TD; A-->B;'
              }
            }
          ]
        }
      ],
      updateDocument: async (id: string, docs: any[]) => {
        savedPayload = { id, docs };
      },
      updateFileName: async (name: string) => {
        renamedTitle = name;
      }
    };

    const loaded = await loadDevScribeFile('file-1');
    expect(loaded.details?.title).toBe('My Architecture Diagram');
    expect(loaded.diagramState?.code).toBe('graph TD; A-->B;');

    const saveSuccess = await saveDevScribeFile(
      'file-1',
      {
        code: 'graph TD; A-->C;',
        mermaid: '{"theme":"default"}',
        updateDiagram: true,
        rough: false
      },
      loaded.document
    );

    expect(saveSuccess).toBe(true);
    expect(savedPayload.id).toBe('file-1');
    expect(savedPayload.docs[0].blocks[0].data.code).toBe('graph TD; A-->C;');
    expect(savedPayload.docs[0].version).toBe(2);

    const renameSuccess = await renameDevScribeFile('file-1', 'Renamed Diagram');
    expect(renameSuccess).toBe(true);
    expect(renamedTitle).toBe('Renamed Diagram');
  });
});

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { readPublicImportJson } from '@/lib/public-import-data';

type PublicImportFilesState = {
  data: Record<string, unknown> | null;
  error: string | null;
  loading: boolean;
};

async function readServerFallback(files: string[], signal: AbortSignal) {
  const params = new URLSearchParams();
  files.forEach(file => params.append('file', file));
  const response = await fetch(`/api/import-data-public-fallback?${params.toString()}`, {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Import data fallback returned ${response.status} ${response.statusText}`);
  }
  const payload = await response.json() as { files?: Record<string, unknown> };
  return payload.files ?? {};
}

export function usePublicImportFiles(files: string[]) {
  const stableFiles = useMemo(() => Array.from(new Set(files)), [files.join('|')]);
  const [state, setState] = useState<PublicImportFilesState>({
    data: null,
    error: null,
    loading: true,
  });

  const load = useCallback(async (signal: AbortSignal, retainData = false) => {
    setState(current => ({
      data: retainData ? current.data : null,
      error: null,
      loading: true,
    }));
    try {
      const entries = await Promise.all(
        stableFiles.map(async file => [file, await readPublicImportJson<unknown>(file, signal)] as const),
      );
      if (!signal.aborted) {
        setState({ data: Object.fromEntries(entries), error: null, loading: false });
      }
      return;
    } catch (directError) {
      if (signal.aborted) return;
      if (process.env.NEXT_PUBLIC_IMPORT_DATA_SERVER_FALLBACK === 'false') {
        setState({
          data: null,
          error: directError instanceof Error ? directError.message : 'Unable to load public import data.',
          loading: false,
        });
        return;
      }
    }

    try {
      const fallbackData = await readServerFallback(stableFiles, signal);
      if (!signal.aborted) setState({ data: fallbackData, error: null, loading: false });
    } catch (fallbackError) {
      if (!signal.aborted) {
        setState({
          data: null,
          error: fallbackError instanceof Error ? fallbackError.message : 'Unable to load import data.',
          loading: false,
        });
      }
    }
  }, [stableFiles]);

  useEffect(() => {
    let controller = new AbortController();
    void load(controller.signal);

    const handleUpdate = () => {
      controller.abort();
      controller = new AbortController();
      void load(controller.signal, true);
    };
    window.addEventListener('import-data-updated', handleUpdate);
    return () => {
      controller.abort();
      window.removeEventListener('import-data-updated', handleUpdate);
    };
  }, [load]);

  return state;
}

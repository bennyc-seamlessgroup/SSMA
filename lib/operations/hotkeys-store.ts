import { readImportJson, writeImportJson } from '@/lib/import-data';
import { normalizeTicker } from '@/lib/ticker-data';

export type OperationsHotkeyPlatform = 'Reddit' | 'X' | 'Facebook' | 'Linkedin';

export type OperationsHotkeyMapping = {
  ticker: string;
  kwatchHotkey: string;
  platform?: OperationsHotkeyPlatform | string | null;
  createUser: string;
  createDatetime: string;
};

type OperationsHotkeysFile = {
  source: 'operations_hotkeys_input';
  schemaVersion: 1;
  ticker: string;
  updatedAt: string;
  hotkeys: OperationsHotkeyMapping[];
};

function filePath(ticker: string) {
  return `operations/${normalizeTicker(ticker)}_hotkeys.json`;
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function blankFile(ticker: string): OperationsHotkeysFile {
  return {
    source: 'operations_hotkeys_input',
    schemaVersion: 1,
    ticker,
    updatedAt: new Date().toISOString(),
    hotkeys: [],
  };
}

function normalizeMapping(input: Partial<OperationsHotkeyMapping>, fallbackTicker = 'CURR'): OperationsHotkeyMapping {
  return {
    ticker: normalizeTicker(input.ticker ?? fallbackTicker),
    kwatchHotkey: text(input.kwatchHotkey),
    platform: text(input.platform) || null,
    createUser: text(input.createUser) || 'operations',
    createDatetime: text(input.createDatetime) || new Date().toISOString(),
  };
}

function normalizeFile(input: Partial<OperationsHotkeysFile>, ticker: string): OperationsHotkeysFile {
  return {
    ...blankFile(ticker),
    ...input,
    source: 'operations_hotkeys_input',
    schemaVersion: 1,
    ticker,
    hotkeys: Array.isArray(input.hotkeys) ? input.hotkeys.map(row => normalizeMapping(row, ticker)).filter(row => row.kwatchHotkey) : [],
  };
}

export async function readOperationsHotkeys(ticker = 'CURR') {
  const normalizedTicker = normalizeTicker(ticker);
  try {
    return normalizeFile(await readImportJson<OperationsHotkeysFile>(filePath(normalizedTicker)), normalizedTicker);
  } catch {
    return blankFile(normalizedTicker);
  }
}

export async function saveOperationsHotkey(input: Partial<OperationsHotkeyMapping>) {
  const mapping = normalizeMapping(input);
  if (!mapping.kwatchHotkey) throw new Error('Hotkey is required.');
  const current = await readOperationsHotkeys(mapping.ticker);
  const existingIndex = current.hotkeys.findIndex(row => row.kwatchHotkey === mapping.kwatchHotkey);
  const nextHotkeys = [...current.hotkeys];
  nextHotkeys[existingIndex >= 0 ? existingIndex : nextHotkeys.length] = {
    ...mapping,
    createDatetime: existingIndex >= 0 ? nextHotkeys[existingIndex].createDatetime : mapping.createDatetime,
  };
  const nextFile: OperationsHotkeysFile = {
    ...current,
    updatedAt: new Date().toISOString(),
    hotkeys: nextHotkeys.sort((a, b) => String(a.platform ?? '').localeCompare(String(b.platform ?? '')) || a.kwatchHotkey.localeCompare(b.kwatchHotkey)),
  };
  await writeImportJson(filePath(mapping.ticker), nextFile);
  return nextFile;
}

export async function deleteOperationsHotkey(ticker = 'CURR', kwatchHotkey = '') {
  const normalizedTicker = normalizeTicker(ticker);
  const current = await readOperationsHotkeys(normalizedTicker);
  const nextFile: OperationsHotkeysFile = {
    ...current,
    updatedAt: new Date().toISOString(),
    hotkeys: current.hotkeys.filter(row => row.kwatchHotkey !== kwatchHotkey),
  };
  await writeImportJson(filePath(normalizedTicker), nextFile);
  return nextFile;
}

import { readImportJson, writeImportJson } from '@/lib/import-data';
import { normalizeTicker } from '@/lib/ticker-data';

export type OperationsMarketDataRecord = {
  tradeDate: string;
  ticker: string;
  issuedShare: string;
  shortAvailabilityPct: string;
  shortAvailabilityShares: string;
  costToBorrowNew: string;
  daysToCover: string;
  shortInterestShares: string;
  shortInterestPcFreeFloat: string;
  score: string;
  tanRequestData: string;
};

type OperationsMarketDataFile = {
  source: 'operations_market_data_input';
  schemaVersion: 1;
  ticker: string;
  updatedAt: string;
  records: OperationsMarketDataRecord[];
};

const fields: Array<keyof OperationsMarketDataRecord> = [
  'tradeDate',
  'ticker',
  'issuedShare',
  'shortAvailabilityPct',
  'shortAvailabilityShares',
  'costToBorrowNew',
  'daysToCover',
  'shortInterestShares',
  'shortInterestPcFreeFloat',
  'score',
  'tanRequestData',
];

function filePath(ticker: string) {
  return `operations/${normalizeTicker(ticker)}_market_data_inputs.json`;
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function blankFile(ticker: string): OperationsMarketDataFile {
  return {
    source: 'operations_market_data_input',
    schemaVersion: 1,
    ticker,
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

function normalizeRecord(input: Partial<OperationsMarketDataRecord>, fallbackTicker = 'CURR'): OperationsMarketDataRecord {
  const ticker = normalizeTicker(input.ticker ?? fallbackTicker);
  return {
    tradeDate: text(input.tradeDate) || new Date().toISOString().slice(0, 10),
    ticker,
    issuedShare: text(input.issuedShare),
    shortAvailabilityPct: text(input.shortAvailabilityPct),
    shortAvailabilityShares: text(input.shortAvailabilityShares),
    costToBorrowNew: text(input.costToBorrowNew),
    daysToCover: text(input.daysToCover),
    shortInterestShares: text(input.shortInterestShares),
    shortInterestPcFreeFloat: text(input.shortInterestPcFreeFloat),
    score: text(input.score),
    tanRequestData: text(input.tanRequestData),
  };
}

function normalizeFile(input: Partial<OperationsMarketDataFile>, ticker: string): OperationsMarketDataFile {
  return {
    ...blankFile(ticker),
    ...input,
    source: 'operations_market_data_input',
    schemaVersion: 1,
    ticker,
    records: Array.isArray(input.records) ? input.records.map(row => normalizeRecord(row, ticker)) : [],
  };
}

export async function readOperationsMarketData(ticker = 'CURR') {
  const normalizedTicker = normalizeTicker(ticker);
  try {
    return normalizeFile(await readImportJson<OperationsMarketDataFile>(filePath(normalizedTicker)), normalizedTicker);
  } catch {
    return blankFile(normalizedTicker);
  }
}

export async function saveOperationsMarketData(input: Partial<OperationsMarketDataRecord>) {
  const record = normalizeRecord(input);
  const current = await readOperationsMarketData(record.ticker);
  const existingIndex = current.records.findIndex(row => row.tradeDate === record.tradeDate && row.ticker === record.ticker);
  const nextRecords = [...current.records];
  nextRecords[existingIndex >= 0 ? existingIndex : nextRecords.length] = record;
  const nextFile: OperationsMarketDataFile = {
    ...current,
    updatedAt: new Date().toISOString(),
    records: nextRecords.sort((a, b) => b.tradeDate.localeCompare(a.tradeDate)),
  };
  await writeImportJson(filePath(record.ticker), nextFile);
  return { ...nextFile, record, message: `Saved ${record.tradeDate} market data.` };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map(value => value.trim());
}

export async function saveOperationsMarketDataBatch(csvText: string, ticker = 'CURR') {
  const normalizedTicker = normalizeTicker(ticker);
  const rows = csvText.split(/\r?\n/).map(row => row.trim()).filter(Boolean);
  if (rows.length < 2) return { ...await readOperationsMarketData(normalizedTicker), totalRows: 0, message: 'No market data rows found.' };
  const headers = parseCsvLine(rows[0]);
  const records = rows.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    return normalizeRecord(row, normalizedTicker);
  });
  const current = await readOperationsMarketData(normalizedTicker);
  const byKey = new Map(current.records.map(row => [`${row.ticker}:${row.tradeDate}`, row]));
  records.forEach(row => byKey.set(`${row.ticker}:${row.tradeDate}`, row));
  const nextFile: OperationsMarketDataFile = {
    ...current,
    updatedAt: new Date().toISOString(),
    records: Array.from(byKey.values()).sort((a, b) => b.tradeDate.localeCompare(a.tradeDate)),
  };
  await writeImportJson(filePath(normalizedTicker), nextFile);
  return { ...nextFile, totalRows: records.length, message: `Uploaded ${records.length} records.`, fields };
}

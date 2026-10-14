type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = finiteNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function datePart(value: unknown) {
  return String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}

function hasCurrentKpiValue(row: Row) {
  if (finiteNumber(row.rawValue) !== null) return true;
  const display = String(row.value ?? '').trim().toUpperCase();
  return Boolean(display) && !['N/A', '--', 'NULL', 'UNAVAILABLE'].includes(display);
}

function isShortInterestPercentKpi(row: Row) {
  const key = String(row.key ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const label = String(row.label ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return [
    'shortinterest',
    'shortinterestfloat',
    'shortinterestpercent',
    'shortinterestpercentfloat',
    'shortinterestpct',
    'shortinterestpcfreefloat',
  ].includes(key) || [
    'shortinterest',
    'shortinterestfloat',
    'shortinterestpercent',
    'shortinterestpercentfloat',
    'shortinterestpct',
    'shortinterestpcfreefloat',
  ].includes(label);
}

function marketHistoryRecords(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload.map(record);

  const root = record(payload);
  if (Array.isArray(root.data)) return root.data.map(record);
  const data = record(root.data);
  const category = record(root['market-history']);
  const nestedCategory = record(data['market-history']);
  const containers = [category, nestedCategory, data, root];

  for (const container of containers) {
    if (Array.isArray(container.records)) return container.records.map(record);
  }
  return [];
}

function shortInterestPercent(row: Row) {
  const nested = record(row.shortInterest);
  return firstFiniteNumber(
    row.shortInterestPercent,
    row.shortInterestPcFreeFloat,
    row.short_interest_percent,
    nested.percent,
    nested.shortInterestPercent,
    nested.shortInterestPcFreeFloat,
  );
}

function formatPercent(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function applyShortInterestFallback(
  snapshotKpisValue: unknown,
  marketHistoryPayload: unknown,
  reportDate: string,
) {
  const snapshotKpis = Array.isArray(snapshotKpisValue)
    ? snapshotKpisValue.map(record)
    : [];
  const candidates = marketHistoryRecords(marketHistoryPayload)
    .map((row, index) => ({
      date: datePart(row.tradeDate ?? row.date ?? row.snapshotDate),
      value: shortInterestPercent(row),
      index,
    }))
    .filter((entry): entry is { date: string; value: number; index: number } => (
      Boolean(entry.date)
      && entry.date <= reportDate
      && entry.value !== null
      && entry.value >= 0
    ))
    .sort((left, right) => left.date.localeCompare(right.date) || left.index - right.index);
  const fallback = candidates.at(-1);

  if (!fallback) return snapshotKpis;

  return snapshotKpis.map(row => {
    if (!isShortInterestPercentKpi(row) || hasCurrentKpiValue(row)) return row;

    return {
      ...row,
      rawValue: fallback.value,
      value: formatPercent(fallback.value),
      observationDate: fallback.date,
      fallbackAsOfDate: fallback.date,
      fallbackSourceScope: 'market-history-short-interest-percent',
      numericChange: null,
      percentChange: null,
      changeValue: '--',
      changePercent: '--',
      comparisonLabel: '',
      tone: '',
    };
  });
}

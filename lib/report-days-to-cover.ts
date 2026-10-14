type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function datePart(value: unknown) {
  return String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}

function hasCurrentKpiValue(row: Row) {
  if (finiteNumber(row.rawValue) !== null) return true;
  const display = String(row.value ?? '').trim().toUpperCase();
  return Boolean(display) && !['N/A', '--', 'NULL', 'UNAVAILABLE'].includes(display);
}

function isDaysToCoverKpi(row: Row) {
  const key = String(row.key ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const label = String(row.label ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return key === 'daystocover' || label === 'daystocover';
}

function formatDays(value: number) {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} days`;
}

export function applyDaysToCoverFallback(
  snapshotKpisValue: unknown,
  daysToCoverChartValue: unknown,
  reportDate: string,
) {
  const snapshotKpis = Array.isArray(snapshotKpisValue)
    ? snapshotKpisValue.map(record)
    : [];
  const chart = record(daysToCoverChartValue);
  const dates = Array.isArray(chart.dates) ? chart.dates : [];
  const values = Array.isArray(chart.values) ? chart.values : [];
  const candidates = dates
    .map((date, index) => ({ date: datePart(date), value: finiteNumber(values[index]), index }))
    .filter((entry): entry is { date: string; value: number; index: number } => (
      Boolean(entry.date)
      && entry.date <= reportDate
      && entry.value !== null
      && entry.value >= 0
    ))
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  const fallback = candidates.at(-1);

  if (!fallback) return snapshotKpis;

  return snapshotKpis.map(row => {
    if (!isDaysToCoverKpi(row) || hasCurrentKpiValue(row)) return row;

    return {
      ...row,
      rawValue: fallback.value,
      value: formatDays(fallback.value),
      observationDate: fallback.date,
      fallbackAsOfDate: fallback.date,
      fallbackSourceScope: 'dated-report-days-to-cover-trend',
      numericChange: null,
      percentChange: null,
      changeValue: '--',
      changePercent: '--',
      comparisonLabel: '',
      tone: '',
    };
  });
}

export type MarketPublicationRecord = {
  tradeDate?: string;
  date?: string;
  borrowFeePercent?: unknown;
  availableShares?: unknown;
  availableSharesIbkr?: unknown;
  availableSharesFutu?: unknown;
  availableSharesChartExchange?: unknown;
  utilizationPercent?: unknown;
  daysToCover?: unknown;
  initialMargin?: unknown;
  initialMarginIbkr?: unknown;
  initialMarginFutu?: unknown;
  maintenanceMargin?: unknown;
  maintenanceMarginIbkr?: unknown;
  maintenanceMarginFutu?: unknown;
  averageDurationDays?: unknown;
  [key: string]: unknown;
};

export type MarketPublicationManualInputs = {
  utilization: MarketPublicationRecord[];
  availability: MarketPublicationRecord[];
  margins: MarketPublicationRecord[];
};

export type MarketPublicationField = {
  key: string;
  label: string;
  source: 'Vendor API' | 'Manual Input' | 'Vendor / Manual Input';
  value: number | null;
  children?: MarketPublicationField[];
};

export function marketNumber(value: unknown) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[%,$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function maximum(...values: unknown[]) {
  const numeric = values.map(marketNumber).filter((value): value is number => value !== null);
  return numeric.length ? Math.max(...numeric) : null;
}

export function marketRecordDate(record: MarketPublicationRecord) {
  return String(record.tradeDate ?? record.date ?? '').slice(0, 10);
}

export function marketPublicationFields(record: MarketPublicationRecord | null | undefined): MarketPublicationField[] {
  const source = record ?? {};
  const shortableChildren: MarketPublicationField[] = [
    { key: 'availableSharesChartExchange', label: 'Chart Exchange', source: 'Vendor API', value: marketNumber(source.availableSharesChartExchange) },
    { key: 'availableSharesIbkr', label: 'IBKR', source: 'Manual Input', value: marketNumber(source.availableSharesIbkr) },
    { key: 'availableSharesFutu', label: 'Futu', source: 'Manual Input', value: marketNumber(source.availableSharesFutu) },
  ];
  const allShortableSourcesReady = shortableChildren.every(field => field.value !== null);
  const allInitialMarginsReady = marketNumber(source.initialMarginIbkr) !== null && marketNumber(source.initialMarginFutu) !== null;
  const allMaintenanceMarginsReady = marketNumber(source.maintenanceMarginIbkr) !== null && marketNumber(source.maintenanceMarginFutu) !== null;
  return [
    { key: 'borrowFeePercent', label: 'Borrow Fee', source: 'Vendor API', value: marketNumber(source.borrowFeePercent) },
    {
      key: 'availableShares',
      label: 'Shortable Shares',
      source: 'Vendor / Manual Input',
      value: allShortableSourcesReady
        ? marketNumber(source.availableShares) ?? maximum(source.availableSharesChartExchange, source.availableSharesIbkr, source.availableSharesFutu)
        : null,
      children: shortableChildren,
    },
    { key: 'utilizationPercent', label: 'Utilization', source: 'Manual Input', value: marketNumber(source.utilizationPercent) },
    { key: 'daysToCover', label: 'Days to Cover', source: 'Vendor API', value: marketNumber(source.daysToCover) },
    {
      key: 'initialMargin',
      label: 'Initial Margin',
      source: 'Manual Input',
      value: allInitialMarginsReady
        ? marketNumber(source.initialMargin) ?? maximum(source.initialMarginIbkr, source.initialMarginFutu)
        : null,
    },
    {
      key: 'maintenanceMargin',
      label: 'Maintenance Margin',
      source: 'Manual Input',
      value: allMaintenanceMarginsReady
        ? marketNumber(source.maintenanceMargin) ?? maximum(source.maintenanceMarginIbkr, source.maintenanceMarginFutu)
        : null,
    },
    { key: 'averageDurationDays', label: 'Average Duration', source: 'Manual Input', value: marketNumber(source.averageDurationDays) },
  ];
}

export function isCompleteMarketPublicationRecord(record: MarketPublicationRecord | null | undefined) {
  return Boolean(marketRecordDate(record ?? {})) && marketPublicationFields(record).every(field => field.value !== null);
}

export function latestCompleteMarketPublicationRecord<T extends MarketPublicationRecord>(records: T[]) {
  return [...records]
    .filter(isCompleteMarketPublicationRecord)
    .sort((a, b) => marketRecordDate(b).localeCompare(marketRecordDate(a)))[0] ?? null;
}

function exactDateRecord(records: MarketPublicationRecord[], date: string) {
  return records.find(record => marketRecordDate(record) === date) ?? null;
}

export function marketPublicationRecordForDate(
  history: MarketPublicationRecord[],
  manualInputs: MarketPublicationManualInputs,
  date: string,
): MarketPublicationRecord {
  const market: MarketPublicationRecord = exactDateRecord(history, date) ?? { tradeDate: date };
  const utilization = exactDateRecord(manualInputs.utilization, date);
  const availability = exactDateRecord(manualInputs.availability, date);
  const margins = exactDateRecord(manualInputs.margins, date);
  const availableShares = maximum(
    market.availableSharesChartExchange,
    market.availableSharesIbkr,
    market.availableSharesFutu,
    availability?.availableSharesIbkr,
    availability?.availableSharesFutu,
  );
  const initialMargin = maximum(
    market.initialMarginIbkr,
    market.initialMarginFutu,
    margins?.initialMarginIbkr,
    margins?.initialMarginFutu,
  );
  const maintenanceMargin = maximum(
    market.maintenanceMarginIbkr,
    market.maintenanceMarginFutu,
    margins?.maintenanceMarginIbkr,
    margins?.maintenanceMarginFutu,
  );

  return {
    ...market,
    tradeDate: date,
    availableShares,
    availableSharesIbkr: availability?.availableSharesIbkr ?? market.availableSharesIbkr ?? null,
    availableSharesFutu: availability?.availableSharesFutu ?? market.availableSharesFutu ?? null,
    utilizationPercent: utilization?.utilizationPercent ?? market.utilizationPercent ?? null,
    initialMargin,
    initialMarginIbkr: margins?.initialMarginIbkr ?? market.initialMarginIbkr ?? null,
    initialMarginFutu: margins?.initialMarginFutu ?? market.initialMarginFutu ?? null,
    maintenanceMargin,
    maintenanceMarginIbkr: margins?.maintenanceMarginIbkr ?? market.maintenanceMarginIbkr ?? null,
    maintenanceMarginFutu: margins?.maintenanceMarginFutu ?? market.maintenanceMarginFutu ?? null,
    averageDurationDays: margins?.averageDurationDays ?? market.averageDurationDays ?? null,
  };
}

export function latestCompleteMarketPublicationRecordFromSources(
  history: MarketPublicationRecord[],
  manualInputs: MarketPublicationManualInputs,
): MarketPublicationRecord | null {
  const dates = [...new Set(history.map(marketRecordDate).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  for (const date of dates) {
    const candidate = marketPublicationRecordForDate(history, manualInputs, date);
    if (isCompleteMarketPublicationRecord(candidate)) return candidate;
  }
  return null;
}

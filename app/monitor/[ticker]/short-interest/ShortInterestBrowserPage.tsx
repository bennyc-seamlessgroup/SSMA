'use client';

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import type { WatchItemSeverity } from '@/lib/short-interest/watchItemRules';
import { aiAnalysisFile, normalizeTicker, shortInterestFile } from '@/lib/ticker-data';
import { useState, type ReactNode } from 'react';

type Row = Record<string, unknown>;
type ImportEnvelope<T> = {
  sourcePlatform?: string;
  data?: T;
};

type AiAnalysis = {
  short_interest_current_interpretation?: string;
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalNumeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return numeric(value);
}

function latest(items: Row[], dateKey = 'date') {
  return [...items].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? {};
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

function formatCompactNumber(value: unknown) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(parsed);
}

function formatAxisNumber(value: unknown) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(Math.round(parsed));
}

function formatPercent(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'No Source' : `${parsed.toLocaleString('en-US', options)}%`;
}

function signed(value: number, options?: Intl.NumberFormatOptions) {
  const formatted = Math.abs(value).toLocaleString('en-US', options);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function sourceChip(source: string) {
  return <span className="source-chip ready">Source: {source}</span>;
}

function InfoTitle({ children, text }: { children: ReactNode; text: string }) {
  return <span className="with-info">{children} <InfoTooltip text={text} /></span>;
}

function AiSummary({ value }: { value: string }) {
  const paragraphs = value.split(/\n+/).map(paragraph => paragraph.trim()).filter(Boolean);
  return (
    <div className="short-ai-analysis-copy">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const parts = paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}>
            {parts.map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
              ? <strong key={`${partIndex}-${part}`}>{part.slice(2, -2)}</strong>
              : <span key={`${partIndex}-${part.slice(0, 16)}`}>{part}</span>)}
          </p>
        );
      })}
    </div>
  );
}

function shortDateLabel(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return '';
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${Number(month)}/${Number(day)}`;
  return raw;
}

function TrendLine({ values, labels, label, valueFormatter = formatCompactNumber }: {
  values: number[];
  labels?: string[];
  label: string;
  valueFormatter?: (value: number) => string;
}) {
  const cleaned = values.map(value => Number.isFinite(value) ? value : 0);
  const plottedValues = cleaned.length ? cleaned : [0, 0];
  const rawMax = Math.max(...plottedValues);
  const rawMin = Math.min(...plottedValues);
  const rawRange = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax) * 0.02, 1));
  const padding = rawRange * 0.18;
  const max = rawMax + padding;
  const min = Math.max(0, rawMin - padding);
  const range = Math.max(max - min, 1);
  const mid = min + (range / 2);
  const points = plottedValues.map((value, index) => {
    const x = plottedValues.length === 1 ? 50 : (index / (plottedValues.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { value, x, y };
  });
  const displayLabels = labels?.length === plottedValues.length
    ? labels
    : plottedValues.map((_, index) => `Day ${index + 1}`);

  return (
    <div className="terminal-line-chart short-interest-chart axis-line-chart">
      <span className="chart-axis-title chart-axis-title-y">{label}</span>
      <div className="chart-y-axis" aria-hidden="true">
        <span>{formatAxisNumber(max)}</span>
        <span>{formatAxisNumber(mid)}</span>
        <span>{formatAxisNumber(min)}</span>
      </div>
      <div className="chart-plot-area">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line className="chart-axis-line" x1="0" y1="0" x2="0" y2="100" />
          <line className="chart-axis-line" x1="0" y1="100" x2="100" y2="100" />
          <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} />
        </svg>
        {points.map((point, index) => {
          const shouldLabel = index === 0 || index === points.length - 1;
          const edgeClass = index === 0 ? 'edge-start' : index === points.length - 1 ? 'edge-end' : '';
          return (
            <span
              className={`trend-marker ${shouldLabel ? 'show-label' : ''} ${edgeClass}`}
              key={`${point.x}-${point.value}-${index}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <i />
              {shouldLabel && <b>{valueFormatter(point.value)}</b>}
              <em className="trend-tooltip">
                <strong>{displayLabels[index]}</strong>
                <span>{label}: {valueFormatter(point.value)}</span>
              </em>
            </span>
          );
        })}
      </div>
      <div className="chart-x-axis" aria-hidden="true">
        {displayLabels.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      </div>
      <span className="chart-axis-title chart-axis-title-x">Date</span>
    </div>
  );
}

function delta(current: number | null, previous: number | null, options?: Intl.NumberFormatOptions) {
  if (current === null || previous === null || previous === 0) return null;
  const change = current - previous;
  return {
    change,
    percent: (change / previous) * 100,
    valueText: signed(change, options),
  };
}

function DeltaBadge({ info, suffix = '', display }: { info: ReturnType<typeof delta>; suffix?: string; display?: string }) {
  if (display) {
    const match = display.match(/^(.+?)(\([^)]*\))$/);
    return (
      <span className={`short-kpi-delta ${display.startsWith('-') ? 'down' : display.startsWith('+') ? 'up' : 'neutral'}`}>
        <strong>{match?.[1]?.trim() ?? display}</strong>
        <em>{match ? `${match[2]} vs yesterday` : 'vs yesterday'}</em>
      </span>
    );
  }
  if (!info) {
    return <span className="short-kpi-delta neutral">No prior update</span>;
  }
  const tone = info.change > 0 ? 'up' : info.change < 0 ? 'down' : 'neutral';
  const sign = info.change > 0 ? '+' : info.change < 0 ? '-' : '';
  return (
    <span className={`short-kpi-delta ${tone}`}>
      <strong>{info.valueText}{suffix}</strong>
      <em>({sign}{Math.abs(info.percent).toLocaleString('en-US', { maximumFractionDigits: 2 })}%) vs yesterday</em>
    </span>
  );
}

function ExecutiveMetric({ label, value, changePercent }: { label: string; value: string; changePercent?: number | null }) {
  const tone = typeof changePercent !== 'number' || !Number.isFinite(changePercent)
    ? 'neutral'
    : changePercent > 0
      ? 'up'
      : changePercent < 0
        ? 'down'
        : 'neutral';
  return (
    <div className="short-executive-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={tone}>
        {typeof changePercent === 'number' && Number.isFinite(changePercent)
          ? `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('en-US', { maximumFractionDigits: 2 })}% vs yesterday`
          : 'No prior period'}
      </em>
    </div>
  );
}

type ShortVolumeRow = {
  date: string;
  totalShortVolume: number;
  totalVolume: number;
  offExchangeNonExempt: number;
  offExchangeExempt: number;
  nasdaqBx: number;
  nasdaqPhlx: number;
  nyse: number;
  nyseArca: number;
  nyseNational: number;
  nyseAmerican: number;
  chx: number;
  totalLongVolume: number;
};

type ShortVolumeMode = 'volume' | 'totalPercent' | 'exchangePercent';

type FtdRow = {
  tradeDate: string;
  settlementDate: string;
  closingDeadline: string;
  failsToDeliver: number;
  ftdChange: number;
  tradeVolume: number;
  price: number;
  notional: number;
};

const shortVolumeRows: ShortVolumeRow[] = [
  { date: '2026-07-09', totalShortVolume: 26573, totalVolume: 64597, offExchangeNonExempt: 13414, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 0, nyse: 2600, nyseArca: 8559, nyseNational: 0, nyseAmerican: 2000, chx: 0, totalLongVolume: 38024 },
  { date: '2026-07-08', totalShortVolume: 18809, totalVolume: 46374, offExchangeNonExempt: 15340, offExchangeExempt: 0, nasdaqBx: 100, nasdaqPhlx: 0, nyse: 400, nyseArca: 2594, nyseNational: 100, nyseAmerican: 175, chx: 100, totalLongVolume: 27564 },
  { date: '2026-07-07', totalShortVolume: 9944, totalVolume: 29269, offExchangeNonExempt: 6954, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 0, nyse: 575, nyseArca: 2190, nyseNational: 0, nyseAmerican: 225, chx: 0, totalLongVolume: 19325 },
  { date: '2026-07-06', totalShortVolume: 7429, totalVolume: 19300, offExchangeNonExempt: 4067, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 0, nyse: 150, nyseArca: 3187, nyseNational: 0, nyseAmerican: 25, chx: 0, totalLongVolume: 11871 },
  { date: '2026-07-02', totalShortVolume: 4254, totalVolume: 8554, offExchangeNonExempt: 3914, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 100, nyse: 20, nyseArca: 220, nyseNational: 0, nyseAmerican: 0, chx: 0, totalLongVolume: 4300 },
  { date: '2026-07-01', totalShortVolume: 3935, totalVolume: 19435, offExchangeNonExempt: 2556, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 0, nyse: 65, nyseArca: 1314, nyseNational: 0, nyseAmerican: 0, chx: 0, totalLongVolume: 15500 },
  { date: '2026-06-30', totalShortVolume: 9612, totalVolume: 35550, offExchangeNonExempt: 7454, offExchangeExempt: 4, nasdaqBx: 1080, nasdaqPhlx: 0, nyse: 45, nyseArca: 617, nyseNational: 304, nyseAmerican: 0, chx: 108, totalLongVolume: 25938 },
  { date: '2026-06-29', totalShortVolume: 74044, totalVolume: 193582, offExchangeNonExempt: 43425, offExchangeExempt: 6601, nasdaqBx: 400, nasdaqPhlx: 100, nyse: 703, nyseArca: 21978, nyseNational: 437, nyseAmerican: 400, chx: 0, totalLongVolume: 119538 },
  { date: '2026-06-26', totalShortVolume: 21813, totalVolume: 32534, offExchangeNonExempt: 3942, offExchangeExempt: 0, nasdaqBx: 200, nasdaqPhlx: 0, nyse: 525, nyseArca: 17146, nyseNational: 0, nyseAmerican: 0, chx: 0, totalLongVolume: 10721 },
  { date: '2026-06-25', totalShortVolume: 12541, totalVolume: 26140, offExchangeNonExempt: 3996, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 0, nyse: 150, nyseArca: 8395, nyseNational: 0, nyseAmerican: 0, chx: 0, totalLongVolume: 13599 },
  { date: '2026-06-24', totalShortVolume: 19959, totalVolume: 43915, offExchangeNonExempt: 14674, offExchangeExempt: 2300, nasdaqBx: 0, nasdaqPhlx: 0, nyse: 374, nyseArca: 2611, nyseNational: 0, nyseAmerican: 0, chx: 0, totalLongVolume: 23955 },
  { date: '2026-06-23', totalShortVolume: 10902, totalVolume: 24640, offExchangeNonExempt: 8012, offExchangeExempt: 0, nasdaqBx: 100, nasdaqPhlx: 100, nyse: 500, nyseArca: 1389, nyseNational: 0, nyseAmerican: 800, chx: 1, totalLongVolume: 13738 },
  { date: '2026-06-22', totalShortVolume: 26949, totalVolume: 77578, offExchangeNonExempt: 21007, offExchangeExempt: 0, nasdaqBx: 600, nasdaqPhlx: 0, nyse: 966, nyseArca: 3676, nyseNational: 100, nyseAmerican: 600, chx: 0, totalLongVolume: 50628 },
  { date: '2026-06-18', totalShortVolume: 26514, totalVolume: 88872, offExchangeNonExempt: 23679, offExchangeExempt: 0, nasdaqBx: 0, nasdaqPhlx: 200, nyse: 177, nyseArca: 2458, nyseNational: 0, nyseAmerican: 0, chx: 0, totalLongVolume: 62359 },
];

const ftdTableRows: FtdRow[] = [
  { tradeDate: '2026-06-11', settlementDate: '2026-06-12', closingDeadline: '2026-07-16', failsToDeliver: 648, ftdChange: 503, tradeVolume: 116100, price: 3.08, notional: 1996 },
  { tradeDate: '2026-06-10', settlementDate: '2026-06-11', closingDeadline: '2026-07-15', failsToDeliver: 145, ftdChange: -7984, tradeVolume: 187300, price: 2.93, notional: 425 },
  { tradeDate: '2026-06-09', settlementDate: '2026-06-10', closingDeadline: '2026-07-14', failsToDeliver: 8129, ftdChange: 8129, tradeVolume: 177600, price: 2.96, notional: 24062 },
  { tradeDate: '2026-06-08', settlementDate: '2026-06-09', closingDeadline: '2026-07-13', failsToDeliver: 0, ftdChange: -238, tradeVolume: 266600, price: 2.97, notional: 0 },
  { tradeDate: '2026-06-05', settlementDate: '2026-06-08', closingDeadline: '2026-07-10', failsToDeliver: 238, ftdChange: 238, tradeVolume: 160900, price: 3.18, notional: 757 },
  { tradeDate: '2026-06-04', settlementDate: '2026-06-05', closingDeadline: '2026-07-09', failsToDeliver: 0, ftdChange: 0, tradeVolume: 247400, price: 3.51, notional: 0 },
  { tradeDate: '2026-06-03', settlementDate: '2026-06-04', closingDeadline: '2026-07-08', failsToDeliver: 0, ftdChange: -1827, tradeVolume: 142300, price: 3.11, notional: 0 },
  { tradeDate: '2026-06-02', settlementDate: '2026-06-03', closingDeadline: '2026-07-07', failsToDeliver: 1827, ftdChange: 1827, tradeVolume: 103900, price: 3.28, notional: 5993 },
  { tradeDate: '2026-06-01', settlementDate: '2026-06-02', closingDeadline: '2026-07-06', failsToDeliver: 0, ftdChange: 0, tradeVolume: 42300, price: 3.19, notional: 0 },
  { tradeDate: '2026-05-29', settlementDate: '2026-06-01', closingDeadline: '2026-07-03', failsToDeliver: 0, ftdChange: 0, tradeVolume: 75600, price: 3.14, notional: 0 },
  { tradeDate: '2026-05-28', settlementDate: '2026-05-29', closingDeadline: '2026-07-02', failsToDeliver: 0, ftdChange: 0, tradeVolume: 75400, price: 3.19, notional: 0 },
  { tradeDate: '2026-05-27', settlementDate: '2026-05-28', closingDeadline: '2026-07-01', failsToDeliver: 0, ftdChange: 0, tradeVolume: 101000, price: 3.17, notional: 0 },
  { tradeDate: '2026-05-26', settlementDate: '2026-05-27', closingDeadline: '2026-06-30', failsToDeliver: 0, ftdChange: -892, tradeVolume: 146200, price: 3.27, notional: 0 },
  { tradeDate: '2026-05-22', settlementDate: '2026-05-26', closingDeadline: '2026-06-26', failsToDeliver: 892, ftdChange: -61, tradeVolume: 72700, price: 3.07, notional: 2738 },
];

const shortVolumeBaseColumns: Array<{ key: keyof ShortVolumeRow; label: string }> = [
  { key: 'date', label: 'Date' },
  { key: 'totalShortVolume', label: 'Total Short Volume' },
  { key: 'totalVolume', label: 'Total Volume' },
  { key: 'offExchangeNonExempt', label: 'Off Exchange Non-Exempt' },
  { key: 'offExchangeExempt', label: 'Off Exchange Exempt' },
  { key: 'nasdaqBx', label: 'Nasdaq BX' },
  { key: 'nasdaqPhlx', label: 'Nasdaq PHLX' },
  { key: 'nyse', label: 'NYSE' },
  { key: 'nyseArca', label: 'NYSE Arca' },
  { key: 'nyseNational', label: 'NYSE National' },
  { key: 'nyseAmerican', label: 'NYSE American' },
  { key: 'chx', label: 'CHX' },
  { key: 'totalLongVolume', label: 'Total Long Volume' },
];

const ftdColumns: Array<{ key: keyof FtdRow; label: string }> = [
  { key: 'tradeDate', label: 'Trade Date' },
  { key: 'failsToDeliver', label: 'Fails-to-Deliver' },
  { key: 'ftdChange', label: 'FTD Change' },
  { key: 'tradeVolume', label: 'Trade Volume' },
  { key: 'settlementDate', label: 'Settlement Date' },
  { key: 'closingDeadline', label: 'Closing Deadline' },
  { key: 'price', label: 'Price' },
  { key: 'notional', label: '$ Notional' },
];

const numericFtdColumnKeys: Array<keyof FtdRow> = ['failsToDeliver', 'ftdChange', 'tradeVolume', 'price', 'notional'];

function formatMarketTableValue(value: unknown, mode?: 'currency' | 'percent') {
  const parsed = numeric(value);
  if (parsed === null) return String(value ?? '—');
  if (mode === 'currency') return `$${parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (mode === 'percent') return `${parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  return parsed.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortVolumeValue(row: ShortVolumeRow, key: keyof ShortVolumeRow, mode: ShortVolumeMode) {
  if (key === 'date') return row.date;
  const value = row[key] as number;
  if (mode === 'volume') return formatMarketTableValue(value);
  const denominator = mode === 'totalPercent' ? row.totalVolume : row.totalShortVolume;
  return denominator ? formatMarketTableValue((value / denominator) * 100, 'percent') : '—';
}

function PagedShortVolumeTable() {
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ShortVolumeMode>('volume');
  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(shortVolumeRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = shortVolumeRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <article className="terminal-card short-market-table-card">
      <div className="short-market-table-card__head">
        <div>
          <h3><InfoTitle text="Daily reported short volume by venue. API integration will replace this placeholder table.">Short Volume</InfoTitle></h3>
          <p>Daily reported short, long, and venue-level short volume.</p>
        </div>
        <select value={mode} onChange={event => setMode(event.target.value as ShortVolumeMode)} aria-label="Short volume display mode">
          <option value="volume">Short Volume</option>
          <option value="totalPercent">Short Percent of Total</option>
          <option value="exchangePercent">Short Percent of Exchange</option>
        </select>
      </div>
      <div className="short-market-table-wrap">
        <table className="short-market-table">
          <thead>
            <tr>{shortVolumeBaseColumns.map(column => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr key={row.date}>
                {shortVolumeBaseColumns.map(column => (
                  <td key={column.key} className={column.key === 'date' ? '' : 'num'}>{shortVolumeValue(row, column.key, mode)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager page={safePage} totalPages={totalPages} onPage={setPage} />
    </article>
  );
}

function PagedFtdTable() {
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(ftdTableRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = ftdTableRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <article className="terminal-card short-market-table-card">
      <div className="short-market-table-card__head">
        <div>
          <h3><InfoTitle text="Failures-to-deliver are settlement failures reported with a delay. API integration will replace this placeholder table.">Fails-to-Deliver</InfoTitle></h3>
          <p>Settlement failures, closing deadlines, price, and notional value.</p>
        </div>
      </div>
      <div className="short-market-table-wrap">
        <table className="short-market-table">
          <thead>
            <tr>{ftdColumns.map(column => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr key={row.tradeDate}>
                {ftdColumns.map(column => {
                  const value = row[column.key];
                  const isCurrency = column.key === 'price';
                  return (
                    <td key={column.key} className={numericFtdColumnKeys.includes(column.key) ? 'num' : ''}>
                      {column.key === 'ftdChange' && typeof value === 'number'
                        ? signed(value, { maximumFractionDigits: 0 })
                        : isCurrency
                          ? formatMarketTableValue(value, 'currency')
                          : formatMarketTableValue(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager page={safePage} totalPages={totalPages} onPage={setPage} />
    </article>
  );
}

function TablePager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return (
    <div className="short-market-table-pager">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</button>
      <span>Page {page} / {totalPages}</span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>Next</button>
    </div>
  );
}

type BriefingMetric = 'shares' | 'floatPercent' | 'daysToCover';

type BriefingTrendRow = {
  date: string;
  shares: number | null;
  floatPercent: number | null;
  daysToCover: number | null;
};

const briefingMetricConfig: Record<BriefingMetric, {
  label: string;
  color: string;
  format: (value: number | null) => string;
}> = {
  shares: {
    label: 'Short Interest Shares',
    color: '#2f6dd5',
    format: value => value === null ? 'Data unavailable' : formatNumber(value),
  },
  floatPercent: {
    label: 'Short Interest Float %',
    color: '#d98b16',
    format: value => value === null ? 'Data unavailable' : formatPercent(value, { maximumFractionDigits: 2 }),
  },
  daysToCover: {
    label: 'Days to Cover',
    color: '#15966f',
    format: value => value === null ? 'Data unavailable' : `${formatNumber(value, { maximumFractionDigits: 2 })} days`,
  },
};

function metricRange(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!valid.length) return { min: 0, max: 1 };
  const rawMin = Math.min(...valid);
  const rawMax = Math.max(...valid);
  const padding = Math.max((rawMax - rawMin) * .12, Math.abs(rawMax) * .025, .1);
  return { min: Math.max(0, rawMin - padding), max: rawMax + padding };
}

function ShortInterestCombinedChart({ data }: { data: BriefingTrendRow[] }) {
  const [enabled, setEnabled] = useState<Record<BriefingMetric, boolean>>({
    shares: true,
    floatPercent: true,
    daysToCover: true,
  });
  const [focusedMetric, setFocusedMetric] = useState<BriefingMetric>('floatPercent');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const metrics = Object.keys(briefingMetricConfig) as BriefingMetric[];
  const secondaryMetric = focusedMetric === 'shares'
    ? (enabled.floatPercent ? 'floatPercent' : 'daysToCover')
    : focusedMetric;
  const width = 1000;
  const height = 330;
  const plot = { left: 78, right: 86, top: 24, bottom: 52 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const ranges = Object.fromEntries(metrics.map(metric => [
    metric,
    metricRange(data.map(row => row[metric])),
  ])) as Record<BriefingMetric, { min: number; max: number }>;
  const x = (index: number) => plot.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (metric: BriefingMetric, value: number) => {
    const range = ranges[metric];
    return plot.top + (1 - ((value - range.min) / Math.max(range.max - range.min, .0001))) * plotHeight;
  };
  const linePoints = (metric: BriefingMetric) => data
    .map((row, index) => row[metric] === null ? null : `${x(index)},${y(metric, row[metric] as number)}`)
    .filter(Boolean)
    .join(' ');
  const focusedIndex = hoveredIndex ?? Math.max(0, data.length - 1);

  if (!data.length) {
    return <div className="short-briefing-chart-empty">Short-interest trend data unavailable.</div>;
  }

  return (
    <div className="short-briefing-chart">
      <div className="short-briefing-chart__legend" aria-label="Trend metrics">
        {metrics.map(metric => (
          <button
            type="button"
            className={`${enabled[metric] ? 'active' : ''} ${focusedMetric === metric ? 'focused' : ''}`}
            key={metric}
            onClick={() => setEnabled(current => ({ ...current, [metric]: !current[metric] }))}
            onMouseEnter={() => setFocusedMetric(metric)}
          >
            <i style={{ background: briefingMetricConfig[metric].color }} />
            {briefingMetricConfig[metric].label}
          </button>
        ))}
      </div>
      <div className="short-briefing-chart__canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Short interest shares, float percentage, and days to cover trend"
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={event => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
            const index = Math.round(((svgX - plot.left) / plotWidth) * Math.max(0, data.length - 1));
            setHoveredIndex(Math.max(0, Math.min(data.length - 1, index)));
          }}
        >
          {[0, .25, .5, .75, 1].map((ratio, index) => {
            const gridY = plot.top + ratio * plotHeight;
            const sharesRange = ranges.shares;
            const secondaryRange = ranges[secondaryMetric];
            const sharesValue = sharesRange.max - ratio * (sharesRange.max - sharesRange.min);
            const secondaryValue = secondaryRange.max - ratio * (secondaryRange.max - secondaryRange.min);
            return (
              <g key={ratio}>
                <line className="short-briefing-chart__grid" x1={plot.left} x2={width - plot.right} y1={gridY} y2={gridY} />
                <text className="short-briefing-chart__axis" x={plot.left - 12} y={gridY + 4} textAnchor="end">{formatCompactNumber(sharesValue)}</text>
                <text className="short-briefing-chart__axis" x={width - plot.right + 12} y={gridY + 4}>
                  {secondaryMetric === 'floatPercent'
                    ? `${formatNumber(secondaryValue, { maximumFractionDigits: 1 })}%`
                    : formatNumber(secondaryValue, { maximumFractionDigits: 1 })}
                </text>
                {index === 0 && (
                  <>
                    <text className="short-briefing-chart__axis-title" x={plot.left} y={12}>Shares</text>
                    <text className="short-briefing-chart__axis-title" x={width - plot.right} y={12} textAnchor="end">
                      {secondaryMetric === 'floatPercent' ? 'Float %' : 'Days to Cover'}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {metrics.map(metric => enabled[metric] && (
            <polyline
              key={metric}
              className={`short-briefing-chart__line ${focusedMetric === metric ? 'focused' : ''}`}
              points={linePoints(metric)}
              style={{ stroke: briefingMetricConfig[metric].color }}
              onMouseEnter={() => setFocusedMetric(metric)}
            />
          ))}
          {hoveredIndex !== null && (
            <line
              className="short-briefing-chart__cursor"
              x1={x(hoveredIndex)}
              x2={x(hoveredIndex)}
              y1={plot.top}
              y2={plot.top + plotHeight}
            />
          )}
          {metrics.map(metric => enabled[metric] && data[focusedIndex]?.[metric] !== null && (
            <circle
              key={`${metric}-${focusedIndex}`}
              cx={x(focusedIndex)}
              cy={y(metric, data[focusedIndex][metric] as number)}
              r={focusedMetric === metric ? 5 : 3.5}
              fill={briefingMetricConfig[metric].color}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
          {data.map((row, index) => (
            <text
              className="short-briefing-chart__date"
              key={`${row.date}-${index}`}
              x={x(index)}
              y={height - 18}
              textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            >
              {shortDateLabel(row.date)}
            </text>
          ))}
        </svg>
        {hoveredIndex !== null && (
          <div
            className="short-briefing-chart__tooltip"
            style={{
              left: `${(x(hoveredIndex) / width) * 100}%`,
              transform: hoveredIndex === 0
                ? 'translateX(0)'
                : hoveredIndex === data.length - 1
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)',
            }}
          >
            <strong>{data[hoveredIndex].date}</strong>
            {metrics.filter(metric => enabled[metric]).map(metric => (
              <span className={focusedMetric === metric ? 'focused' : ''} key={metric}>
                <i style={{ background: briefingMetricConfig[metric].color }} />
                {briefingMetricConfig[metric].label}
                <b>{briefingMetricConfig[metric].format(data[hoveredIndex][metric])}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function shortScoreExplanation(score: number, level: string) {
  if (score >= 80) return `${level} pressure means short-side risk is elevated. Borrow cost, short exposure, availability, or coverage conditions may be signaling a stronger squeeze-risk setup.`;
  if (score >= 65) return `${level} pressure means the score is above the normal range. Management should monitor whether borrow cost, short exposure, or share availability continues to tighten.`;
  if (score >= 40) return `${level} pressure means short-side conditions are present but not yet severe. The setup warrants monitoring, especially if multiple inputs move higher together.`;
  return `${level} pressure means current short-side conditions are relatively contained. The score does not indicate meaningful pressure unless the underlying inputs begin to worsen.`;
}

function shortScoreSummary(score: number, level: string) {
  if (score >= 80) return `${level} short-side pressure. Escalate monitoring of borrow cost, utilization, and inventory.`;
  if (score >= 65) return `${level} short-side pressure. Watch borrow cost, utilization, and available inventory.`;
  if (score >= 40) return `${level} pressure. Monitor whether multiple short-market inputs tighten together.`;
  return `${level} pressure. Current short-market conditions remain relatively contained.`;
}

type ShortSignal = {
  label: string;
  status: string;
  severity: WatchItemSeverity;
};

export function ShortInterestBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const dataFile = shortInterestFile(normalizedTicker);
  const analysisFile = aiAnalysisFile(normalizedTicker);
  const contentFile = 'content/page_content.json';
  const { data, error, loading } = usePublicImportFiles([dataFile, analysisFile, contentFile]);

  if (loading && !data) return <PortalPageLoading variant="shortInterest" />;
  if (error || !data) {
    return <div className="page"><section className="panel"><h2>Short interest data unavailable</h2><p>{error}</p></section></div>;
  }

  const ortexEnvelope = (data[dataFile] ?? {}) as ImportEnvelope<Row>;
  const contentEnvelope = (data[contentFile] ?? {}) as ImportEnvelope<Record<string, Row>>;
  const contentMap = contentEnvelope.data ?? {};
  const pageContent = record(contentMap.shortInterest);
  const aiAnalysis = (data[analysisFile] ?? null) as AiAnalysis | null;

  const ortexData = record(ortexEnvelope.data);
  const shortCurrent = record(ortexData.current);
  const dailyRows = rows(ortexData.daily);
  const shortInterestTrendRows = dailyRows
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
    .slice(-7);
  const shortSharesTrendRows = shortInterestTrendRows.filter(row => optionalNumeric(record(row.shortInterest).shortInterestShares) !== null);
  const borrowFeeTrendRows = shortInterestTrendRows.filter(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) !== null);
  const availabilityTrendRows = shortInterestTrendRows.filter(row => optionalNumeric(record(row.availability).shortAvailabilityShares) !== null);
  const sortedDailyRows = [...dailyRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestDaily = sortedDailyRows[0] ?? {};
  const previousDaily = sortedDailyRows[1] ?? {};

  const shortInterestShares = numeric(shortCurrent.shortInterestShares);
  const shortInterestPercent = numeric(shortCurrent.shortInterestPcFreeFloat);
  const borrowFee = numeric(shortCurrent.costToBorrowAll);
  const sharesAvailable = numeric(shortCurrent.shortAvailabilityShares);
  const utilization = numeric(shortCurrent.shortAvailabilityPct);
  const shortScore = Math.round(numeric(shortCurrent.shortScore) ?? 0);
  const shortScoreLevel = shortScore >= 80 ? 'Extreme' : shortScore >= 65 ? 'High' : shortScore >= 40 ? 'Moderate' : 'Low';
  const shortScoreTone = shortScore >= 80 ? 'extreme' : shortScore >= 65 ? 'high' : shortScore >= 40 ? 'moderate' : 'low';
  const daysToCover = numeric(shortCurrent.daysToCoverQuantity);
  const latestShortInterest = record(latestDaily.shortInterest);
  const previousShortInterest = record(previousDaily.shortInterest);
  const latestDaysToCover = record(latestDaily.daysToCover);
  const previousDaysToCover = record(previousDaily.daysToCover);
  const latestBorrowFee = record(latestDaily.borrowFeeAll);
  const previousBorrowFee = record(previousDaily.borrowFeeAll);
  const latestAvailability = record(latestDaily.availability);
  const previousAvailability = record(previousDaily.availability);
  const latestShortScore = record(latestDaily.shortScore);
  const previousShortScore = record(previousDaily.shortScore);
  const latestClosing = record(latestDaily.closingPrices);
  const previousClosing = record(previousDaily.closingPrices);
  const shortInterestDelta = delta(numeric(latestShortInterest.shortInterestShares), numeric(previousShortInterest.shortInterestShares), { maximumFractionDigits: 0 });
  const shortInterestPctDelta = delta(numeric(latestShortInterest.shortInterestPcFreeFloat), numeric(previousShortInterest.shortInterestPcFreeFloat), { maximumFractionDigits: 2 });
  const daysToCoverDelta = delta(numeric(latestDaysToCover.daysToCover), numeric(previousDaysToCover.daysToCover), { maximumFractionDigits: 2 });
  const borrowFeeDelta = delta(numeric(latestBorrowFee.costToBorrowAll), numeric(previousBorrowFee.costToBorrowAll), { maximumFractionDigits: 2 });
  const shortScoreDelta = delta(Math.round(numeric(latestShortScore.score) ?? 0) || null, numeric(previousShortScore.score), { maximumFractionDigits: 1 });
  const sharesAvailableDelta = delta(numeric(latestAvailability.shortAvailabilityShares), numeric(previousAvailability.shortAvailabilityShares), { maximumFractionDigits: 0 });
  const utilizationDelta = delta(numeric(latestAvailability.shortAvailabilityPct), numeric(previousAvailability.shortAvailabilityPct), { maximumFractionDigits: 2 });
  const shortCards = record(record(record(ortexData.derived).shortInterestPage).cards) as Record<string, Row> | undefined;
  const shortInterestCard = record(shortCards?.shortInterest);
  const siPercentCard = record(shortCards?.shortInterestPercentFloat);
  const daysToCoverCard = record(shortCards?.daysToCover);
  const borrowFeeCard = record(shortCards?.borrowFee);
  const sharesAvailableCard = record(shortCards?.sharesAvailable);
  const utilizationCard = record(shortCards?.utilization);
  const shortScoreCard = record(shortCards?.shortScore);
  const shortScoreLevelCard = record(shortCards?.shortScoreLevel);
  const currentInterpretation = record(ortexData.currentInterpretation);
  const ftdRows = rows(ortexData.ftd);
  const latestFtd = latest(ftdRows);
  const previousFtd = [...ftdRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))[1] ?? {};
  const ftdShares = optionalNumeric(shortCurrent.ftdShares ?? latestFtd.ftdShares);
  const ftdChangePercent = optionalNumeric(shortCurrent.ftdChangePercent)
    ?? percentageChange(ftdShares, numeric(previousFtd.ftdShares));
  const shortInterestChangePercent = numeric(shortInterestCard.changePercent) ?? shortInterestDelta?.percent;
  const borrowFeeChangePercent = numeric(borrowFeeCard.changePercent) ?? borrowFeeDelta?.percent;
  const sharesAvailableChangePercent = numeric(sharesAvailableCard.changePercent) ?? sharesAvailableDelta?.percent;
  const aiSummary = text(
    aiAnalysis?.short_interest_current_interpretation,
    text(currentInterpretation.body, shortScoreExplanation(shortScore, shortScoreLevel)),
  ).trim();
  const scoreRanges = [
    { range: '0-39', level: 'Low', description: 'Short-side pressure is relatively contained.', active: shortScore < 40 },
    { range: '40-64', level: 'Moderate', description: 'Pressure is developing and should be monitored.', active: shortScore >= 40 && shortScore < 65 },
    { range: '65-79', level: 'High', description: 'Elevated conditions may increase squeeze risk.', active: shortScore >= 65 && shortScore < 80 },
    { range: '80-100', level: 'Extreme', description: 'Severe short-side pressure warrants close review.', active: shortScore >= 80 },
  ];
  const signals: ShortSignal[] = [
    {
      label: 'Short Interest Trend',
      status: (shortInterestChangePercent ?? 0) >= 20 ? 'Rising rapidly' : (shortInterestChangePercent ?? 0) > 0 ? 'Rising' : (shortInterestChangePercent ?? 0) < 0 ? 'Falling' : 'Stable',
      severity: (shortInterestChangePercent ?? 0) >= 20 ? 'high' : (shortInterestChangePercent ?? 0) > 0 ? 'medium' : 'low',
    },
    {
      label: 'Borrow Fee Pressure',
      status: (borrowFee ?? 0) >= 50 ? 'Extreme' : (borrowFee ?? 0) >= 30 ? 'Elevated' : 'Normal',
      severity: (borrowFee ?? 0) >= 50 ? 'high' : (borrowFee ?? 0) >= 30 ? 'medium' : 'low',
    },
    {
      label: 'Utilization Pressure',
      status: (utilization ?? 0) >= 85 ? 'High' : (utilization ?? 0) >= 60 ? 'Moderate' : 'Low',
      severity: (utilization ?? 0) >= 85 ? 'high' : (utilization ?? 0) >= 60 ? 'medium' : 'low',
    },
    {
      label: 'Availability Stress',
      status: (sharesAvailable ?? Infinity) <= 100_000 ? 'Constrained' : (sharesAvailableChangePercent ?? 0) <= -30 ? 'Tightening' : 'Available',
      severity: (sharesAvailable ?? Infinity) <= 100_000 ? 'high' : (sharesAvailableChangePercent ?? 0) <= -30 ? 'medium' : 'low',
    },
    {
      label: 'Days to Cover Risk',
      status: (daysToCover ?? 0) >= 5 ? 'High' : (daysToCover ?? 0) >= 3 ? 'Moderate' : 'Low',
      severity: (daysToCover ?? 0) >= 5 ? 'high' : (daysToCover ?? 0) >= 3 ? 'medium' : 'low',
    },
    {
      label: 'FTD Pressure',
      status: ftdShares === null ? 'No data' : (ftdShares >= 500_000 || (ftdChangePercent ?? 0) >= 50) ? 'Building' : 'Normal',
      severity: ftdShares === null ? 'info' : (ftdShares >= 500_000 || (ftdChangePercent ?? 0) >= 50) ? 'medium' : 'low',
    },
  ];
  const scoreProgress = Math.min(100, Math.max(0, shortScore));

  return (
    <ImportDataPreviewPage
      title="Short Interest Intelligence"
      description="Executive short-interest briefing built from the latest available market data."
      files={[
        dataFile,
        analysisFile,
      ]}
    >
      <section className="terminal-section short-interest-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2>Short Interest Overview</h2>
            <p className="section-subtitle">{text(pageContent.overviewSubtitle, 'Executive view of short exposure, borrow pressure, available inventory, and squeeze-risk inputs.')}</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(ortexEnvelope.sourcePlatform ?? 'Market data')}
          </div>
        </div>

        <div className="short-executive-grid">
          <article className={`terminal-card short-executive-card short-executive-score ${shortScoreTone}`}>
            <span>Short Interest Score</span>
            <div className="short-overview-score-layout">
              <div className="short-score-compact">
                <div
                  className="short-score-radial"
                  style={{ background: `conic-gradient(var(--short-score-accent) ${scoreProgress}%, #e8eef7 ${scoreProgress}% 100%)` }}
                >
                  <div>
                    <strong>{numeric(shortCurrent.shortScore) === null ? 'N/A' : shortScore}</strong>
                    <small>/ 100</small>
                  </div>
                </div>
                <div className="short-score-compact__copy">
                  <em>{String(shortScoreLevelCard.valueDisplay ?? shortScoreLevel)} Risk</em>
                  <DeltaBadge info={shortScoreDelta} display={String(shortScoreCard.deltaDisplay ?? '')} />
                  <p>{shortScoreSummary(shortScore, shortScoreLevel)}</p>
                </div>
              </div>
              <div className="short-score-card-ranges" aria-label="Short Interest Score interpretation ranges">
                {scoreRanges.map(row => (
                  <div className={row.active ? 'active' : ''} key={row.range}>
                    <strong>{row.range}</strong>
                    <span><b>{row.level}</b>{row.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="terminal-card short-executive-card short-key-metrics-card">
            <span>Key Short Metrics</span>
            <div className="short-executive-metrics">
              <ExecutiveMetric label="Short Interest %" value={String(siPercentCard.valueDisplay ?? formatPercent(shortInterestPercent, { maximumFractionDigits: 2 }))} changePercent={numeric(siPercentCard.changePercent) ?? shortInterestPctDelta?.percent} />
              <ExecutiveMetric label="Short Interest Shares" value={String(shortInterestCard.valueDisplay ?? formatNumber(shortInterestShares))} changePercent={shortInterestChangePercent} />
              <ExecutiveMetric label="Days to Cover" value={String(daysToCoverCard.valueDisplay ?? formatNumber(daysToCover, { maximumFractionDigits: 2 }))} changePercent={numeric(daysToCoverCard.changePercent) ?? daysToCoverDelta?.percent} />
              <ExecutiveMetric label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} changePercent={borrowFeeChangePercent} />
              <ExecutiveMetric label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilization, { maximumFractionDigits: 2 }))} changePercent={numeric(utilizationCard.changePercent) ?? utilizationDelta?.percent} />
            </div>
          </article>

        </div>

        <div className="short-signal-strip" aria-label="Current short-interest signals">
          {signals.map(signal => (
            <div className={`short-signal-pill ${signal.severity}`} key={signal.label}>
              <i aria-hidden="true" />
              <span>{signal.label}</span>
              <strong>{signal.status}</strong>
            </div>
          ))}
        </div>

        <article className="terminal-card short-executive-card short-management-guide short-ai-analysis-card">
          <span>AI Analysis</span>
          <AiSummary value={aiSummary || 'Data unavailable'} />
          <small>AI-assisted interpretation. Review underlying data before making decisions.</small>
        </article>
      </section>

      <section className="terminal-section short-interest-trends-section">
        <div className="terminal-section__head">
          <div>
            <span>Trend Analysis</span>
            <h2>Short Interest Movement</h2>
            <p className="section-subtitle">Trend charts for short exposure, borrow cost, and borrow availability.</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(ortexEnvelope.sourcePlatform ?? 'Market data')}
          </div>
        </div>
        <div className="short-interest-trend-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Trend of reported short-interest shares. Rising values indicate more shares have been sold short.">Short Interest Trend</InfoTitle></h3>
            <TrendLine
              label="Shares"
              labels={shortSharesTrendRows.map(row => shortDateLabel(row.date))}
              values={shortSharesTrendRows.map(row => optionalNumeric(record(row.shortInterest).shortInterestShares) as number)}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Cost to borrow shows how expensive it is for short sellers to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3>
            <TrendLine
              label="CTB"
              labels={borrowFeeTrendRows.map(row => shortDateLabel(row.date))}
              values={borrowFeeTrendRows.map(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) as number)}
              valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Shortable shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.">Shortable Shares Trend</InfoTitle></h3>
            <TrendLine
              label="Available"
              labels={availabilityTrendRows.map(row => shortDateLabel(row.date))}
              values={availabilityTrendRows.map(row => optionalNumeric(record(row.availability).shortAvailabilityShares) as number)}
            />
          </div>
        </div>
      </section>

      <section className="terminal-section short-market-data-section">
        <div className="terminal-section__head">
          <div>
            <span>Market Data Tables</span>
            <h2>Short Volume & Fails-to-Deliver</h2>
            <p className="section-subtitle">Placeholder tables for future API data. Each table shows 7 records per page for readability.</p>
          </div>
        </div>
        <div className="short-market-data-grid">
          <PagedShortVolumeTable />
          <PagedFtdTable />
        </div>
      </section>
      <PageDisclaimerNotice noticeKey="shortInterest" disclaimerKey="regulatoryFiling" />
    </ImportDataPreviewPage>
  );
}

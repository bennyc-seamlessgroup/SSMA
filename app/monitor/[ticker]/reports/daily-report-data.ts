'use client';

import { fetchAiReport, type AiReport } from '@/lib/ai-report-api';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import type { ReportArchiveRecord } from '@/lib/report-archive';

type Row = Record<string, unknown>;

type DailyReportPayload = Row & {
  ticker?: unknown;
  reportDateIso?: unknown;
  snapshotKpis?: unknown;
  shortInterestScore?: unknown;
  shortLending?: unknown;
};

const unavailableAiAnalysis = 'AI analysis is not available for this report date.';
const marginKeys = new Set(['initialMargin', 'maintenanceMargin']);

function objectValue(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function signed(value: number, suffix: string) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

function decimalRatioToPercent(value: unknown) {
  const numeric = finiteNumber(value);
  if (numeric === null) return null;

  // The report API currently returns margin ratios such as 1.5 for 150%.
  // Retain compatibility if the backend later returns percentage points.
  return Math.abs(numeric) <= 10 ? numeric * 100 : numeric;
}

function normalizeMarginKpi(value: unknown) {
  const row = objectValue(value);
  const key = String(row.key ?? '');
  if (!marginKeys.has(key)) return row;

  const rawValue = decimalRatioToPercent(row.rawValue);
  const previousRawValue = decimalRatioToPercent(row.previousRawValue);
  const numericChange = rawValue !== null && previousRawValue !== null
    ? rawValue - previousRawValue
    : null;
  const percentChange = numericChange !== null && previousRawValue !== 0
    ? numericChange / Math.abs(previousRawValue as number) * 100
    : null;

  return {
    ...row,
    rawValue,
    previousRawValue,
    numericChange,
    percentChange,
    value: rawValue === null ? 'N/A' : `${rawValue.toFixed(2)}%`,
    changeValue: numericChange === null ? '--' : signed(numericChange, ' pts'),
    changePercent: percentChange === null ? '--' : signed(percentChange, '%'),
  };
}

function normalizeReportPayload(payload: DailyReportPayload, report: ReportArchiveRecord, aiAnalysis: string) {
  const responseTicker = String(payload.ticker ?? '').trim().toUpperCase();
  const responseDate = String(payload.reportDateIso ?? '').trim();

  if (responseTicker !== report.ticker.toUpperCase()) {
    throw new Error(`The report API returned data for ${responseTicker || 'an unknown ticker'} instead of ${report.ticker}.`);
  }
  if (responseDate !== report.reportDate) {
    throw new Error(`The report API returned ${responseDate || 'an unknown date'} instead of ${report.reportDate}.`);
  }

  const snapshotKpis = Array.isArray(payload.snapshotKpis)
    ? payload.snapshotKpis.map(normalizeMarginKpi)
    : [];
  const shortInterestScore = objectValue(payload.shortInterestScore);
  const shortLending = objectValue(payload.shortLending);
  const ftdChart = objectValue(shortLending.ftdChart);

  return {
    ...payload,
    snapshotKpis,
    shortInterestScore: {
      ...shortInterestScore,
      aiAnalysis,
      aiSourceScope: aiAnalysis === unavailableAiAnalysis ? 'none' : 'authenticated-ai-report',
    },
    shortLending: {
      ...shortLending,
      ftdChart: {
        ...ftdChart,
        title: 'Fails-to-Deliver Trend',
      },
    },
  };
}

export async function buildDailyReportData(report: ReportArchiveRecord) {
  const ticker = report.ticker.toUpperCase();
  const reportPath = `/market-data/reports?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(report.reportDate)}`;

  const [payload, aiReport] = await Promise.all([
    cachedAuthenticatedFetch<DailyReportPayload>(reportPath),
    fetchAiReport(ticker, report.reportDate).catch((): AiReport => ({})),
  ]);
  const aiAnalysis = typeof aiReport.short_interest_current_interpretation === 'string'
    && aiReport.short_interest_current_interpretation.trim()
    ? aiReport.short_interest_current_interpretation
    : unavailableAiAnalysis;

  return normalizeReportPayload(payload, report, aiAnalysis);
}

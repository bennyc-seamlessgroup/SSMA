import { DashboardV2Client } from './DashboardV2Client';
import { DashboardV2DevTables } from './DashboardV2DevTables';
import { readImportFile, readLocalImportText, type ImportEnvelope } from '@/lib/import-data';
import { readDashboardMargins } from '@/lib/operations/dashboard-margin-store';
import { readOperationsSecFilings, type OperationsSecFilingRecord } from '@/lib/operations/sec-filings-store';

export const dynamic = 'force-dynamic';

type TrendPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
  margin?: number | null;
};

type CompanyEvent = {
  id: string;
  date: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
  url?: string;
};

type DashboardV2ConsolidatedData = {
  current?: Record<string, unknown>;
  trends?: TrendPoint[];
  events?: CompanyEvent[];
  missingFromSource?: unknown[];
  derived?: Record<string, unknown>;
};

const dashboardV2File = 'dashboard_v2_CURR_consolidated_4_web.json';

async function readDashboardV2File<T>(relativePath: string): Promise<ImportEnvelope<T>> {
  try {
    return await readImportFile<T>(relativePath);
  } catch {
    if (process.env.IMPORT_DATA_DEBUG === 'true') {
      console.warn(`Dashboard v2 import data unavailable in configured source; using bundled fallback for ${relativePath}.`);
    }
    return JSON.parse(readLocalImportText(relativePath)) as ImportEnvelope<T>;
  }
}

function plainText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function dateOnly(value: unknown) {
  const raw = plainText(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return raw.slice(0, 10);
}

function secFilingEvents(rows: OperationsSecFilingRecord[]): CompanyEvent[] {
  return rows
    .map((row, index): CompanyEvent | null => {
      const formType = plainText(row.formType, 'SEC');
      const filingDate = dateOnly(row.filingDate);
      if (!filingDate) return null;
      const title = plainText(row.formDescription, `${formType} filing`);
      const summary = [
        row.formDescription,
        row.reportingDate ? `Reporting date: ${row.reportingDate}` : '',
        row.act ? `Act: ${row.act}` : '',
        row.filmNumber ? `Film number: ${row.filmNumber}` : '',
        row.fileNumber ? `File number: ${row.fileNumber}` : '',
        row.accessionNumber ? `Accession: ${row.accessionNumber}` : '',
      ].filter(Boolean).join(' · ') || 'SEC filing available for review.';
      return {
        id: `sec-filing-${plainText(row.id ?? row.accessionNumber, String(index))}`,
        date: filingDate,
        type: 'SEC',
        title: `${formType} · ${title}`,
        summary: summary.length > 220 ? `${summary.slice(0, 217)}...` : summary,
        source: 'Operations SEC filings',
        url: plainText(row.filingsUrl),
      };
    })
    .filter((event): event is CompanyEvent => Boolean(event))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default async function DashboardV2Page() {
  const [dashboardEnvelope, secFilings, marginInputs] = await Promise.all([
    readDashboardV2File<DashboardV2ConsolidatedData>(dashboardV2File),
    readOperationsSecFilings(),
    readDashboardMargins().catch(() => ({
      storage: 'local' as const,
      s3Key: 'dashboard/CURR_margin_inputs.json',
      records: [],
    })),
  ]);
  const trendData = Array.isArray(dashboardEnvelope.data?.trends) ? dashboardEnvelope.data.trends : [];
  const dashboardEvents = Array.isArray(dashboardEnvelope.data?.events) ? dashboardEnvelope.data.events : [];
  const events = [...dashboardEvents, ...secFilingEvents(secFilings.records)];
  const current = dashboardEnvelope.data?.current ?? null;
  const missingFromSource = Array.isArray(dashboardEnvelope.data?.missingFromSource) ? dashboardEnvelope.data.missingFromSource : [];
  const derived = dashboardEnvelope.data?.derived ?? null;

  return (
    <div className="page dashboard-v2-page">
      <div className="dashboard-v2-header">
        <span>Dashboard</span>
        <p>Borrow market dashboard</p>
      </div>

      <DashboardV2Client data={trendData} events={events} marginRecords={marginInputs.records} />
      <DashboardV2DevTables
        file={dashboardV2File}
        sourcePlatform={dashboardEnvelope.sourcePlatform ?? dashboardEnvelope.source ?? 'Internal'}
        status={dashboardEnvelope.status ?? 'ready'}
        current={current}
        trends={trendData as Array<Record<string, unknown>>}
        marginInputs={marginInputs.records as unknown as Array<Record<string, unknown>>}
        marginFile={marginInputs.s3Key ?? 'dashboard/CURR_margin_inputs.json'}
        marginStatus={marginInputs.storage ?? 'ready'}
        events={events as Array<Record<string, unknown>>}
        missingFromSource={missingFromSource}
        derived={derived}
      />
    </div>
  );
}

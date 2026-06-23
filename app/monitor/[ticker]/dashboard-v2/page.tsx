import { DashboardV2Client } from './DashboardV2Client';
import { DashboardV2DevTables } from './DashboardV2DevTables';
import { readImportFile, readLocalImportText, type ImportEnvelope } from '@/lib/import-data';

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

export default async function DashboardV2Page() {
  const dashboardEnvelope = await readDashboardV2File<DashboardV2ConsolidatedData>(dashboardV2File);
  const trendData = Array.isArray(dashboardEnvelope.data?.trends) ? dashboardEnvelope.data.trends : [];
  const events = Array.isArray(dashboardEnvelope.data?.events) ? dashboardEnvelope.data.events : [];
  const current = dashboardEnvelope.data?.current ?? null;
  const missingFromSource = Array.isArray(dashboardEnvelope.data?.missingFromSource) ? dashboardEnvelope.data.missingFromSource : [];
  const derived = dashboardEnvelope.data?.derived ?? null;

  return (
    <div className="page dashboard-v2-page">
      <div className="dashboard-v2-header">
        <span>Dashboard</span>
        <p>Borrow market dashboard</p>
      </div>

      <DashboardV2Client data={trendData} events={events} />
      <DashboardV2DevTables
        file={dashboardV2File}
        sourcePlatform={dashboardEnvelope.sourcePlatform ?? dashboardEnvelope.source ?? 'Internal'}
        status={dashboardEnvelope.status ?? 'ready'}
        current={current}
        trends={trendData as Array<Record<string, unknown>>}
        events={events as Array<Record<string, unknown>>}
        missingFromSource={missingFromSource}
        derived={derived}
      />
    </div>
  );
}

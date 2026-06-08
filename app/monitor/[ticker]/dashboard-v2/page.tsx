import { DashboardV2Chart } from './DashboardV2Chart';
import { DashboardV2Kpis } from './DashboardV2Kpis';
import { readImportFile } from '@/lib/import-data';

export const dynamic = 'force-dynamic';

type TrendPoint = {
  date: string;
  price: number;
  feeRate: number;
  tradeVolume: number;
  shortableShares: number;
  averageDuration: number;
  utilization: number;
  margin?: number;
};

type CompanyEvent = {
  id: string;
  date: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
};

export default async function DashboardV2Page() {
  const [trendEnvelope, eventsEnvelope] = await Promise.all([
    readImportFile<TrendPoint[]>('dashboard_v2_trends.json'),
    readImportFile<CompanyEvent[]>('dashboard_v2_events.json'),
  ]);
  const trendData = Array.isArray(trendEnvelope.data) ? trendEnvelope.data : [];
  const events = Array.isArray(eventsEnvelope.data) ? eventsEnvelope.data : [];

  return (
    <div className="page dashboard-v2-page">
      <div className="dashboard-v2-header">
        <span>Dashboard (v2)</span>
        <p>Borrow market dashboard</p>
      </div>

      <DashboardV2Kpis data={trendData} />

      <DashboardV2Chart data={trendData} events={events} />
    </div>
  );
}

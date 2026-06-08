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

export default async function DashboardV2Page() {
  const trendEnvelope = await readImportFile<TrendPoint[]>('dashboard_v2_trends.json');
  const trendData = Array.isArray(trendEnvelope.data) ? trendEnvelope.data : [];

  return (
    <div className="page dashboard-v2-page">
      <div className="page__header dashboard-v2-header">
        <div>
          <div className="terminal-eyebrow">Borrow Market Dashboard</div>
          <h1 className="page__title">Dashboard (v2)</h1>
          <p className="page__desc">Borrow fee, margin, availability, utilization, duration, price, and volume in one market-data view.</p>
        </div>
      </div>

      <DashboardV2Kpis data={trendData} />

      <DashboardV2Chart data={trendData} />
    </div>
  );
}

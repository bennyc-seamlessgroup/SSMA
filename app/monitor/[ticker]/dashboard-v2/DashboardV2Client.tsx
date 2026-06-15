'use client';

import { useState } from 'react';
import { DashboardV2Chart } from './DashboardV2Chart';
import { DashboardV2Kpis, dashboardV2Periods, type PeriodKey } from './DashboardV2Kpis';

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

export function DashboardV2Client({ data, events }: { data: TrendPoint[]; events: CompanyEvent[] }) {
  const [period, setPeriod] = useState<PeriodKey>('1Y');

  return (
    <>
      <DashboardV2Kpis data={data} period={period} />

      <div className="dashboard-v2-shared-period">
        <div className="dashboard-v2-period-control" aria-label="Dashboard v2 comparison period">
          {dashboardV2Periods.map(item => (
            <button
              type="button"
              key={item}
              className={period === item ? 'active' : ''}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <DashboardV2Chart data={data} events={events} period={period} />
    </>
  );
}

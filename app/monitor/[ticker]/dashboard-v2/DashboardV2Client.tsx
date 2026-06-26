'use client';

import { useState } from 'react';
import { DashboardV2Chart } from './DashboardV2Chart';
import { DashboardV2Kpis, type PeriodKey } from './DashboardV2Kpis';
import type { DashboardMarginRecord } from '@/lib/operations/dashboard-margin-store';

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

export function DashboardV2Client({ data, events, marginRecords }: { data: TrendPoint[]; events: CompanyEvent[]; marginRecords: DashboardMarginRecord[] }) {
  const [period, setPeriod] = useState<PeriodKey>('1Y');

  return (
    <>
      <DashboardV2Kpis data={data} period={period} marginRecords={marginRecords} />
      <DashboardV2Chart data={data} events={events} period={period} onPeriodChange={setPeriod} />
    </>
  );
}

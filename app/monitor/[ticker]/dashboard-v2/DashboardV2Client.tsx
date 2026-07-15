'use client';

import { useState } from 'react';
import { DashboardV2Chart } from './DashboardV2Chart';
import { DashboardV2Kpis, type PeriodKey } from './DashboardV2Kpis';
import type { DashboardMarginRecord, DashboardUtilizationRecord } from '@/lib/operations/data-types';
import { CustomAlertCenter } from './CustomAlertCenter';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

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

export function DashboardV2Client({
  ticker,
  data,
  events,
  utilizationRecords,
  marginRecords,
  current,
}: {
  ticker: string;
  data: TrendPoint[];
  events: CompanyEvent[];
  utilizationRecords: DashboardUtilizationRecord[];
  marginRecords: DashboardMarginRecord[];
  current: Record<string, unknown> | null;
}) {
  const [period, setPeriod] = useState<PeriodKey>('1Y');

  return (
    <>
      <DashboardV2Kpis data={data} period={period} utilizationRecords={utilizationRecords} marginRecords={marginRecords} />
      <CustomAlertCenter ticker={ticker} data={data} current={current} />
      <DashboardV2Chart data={data} events={events} period={period} onPeriodChange={setPeriod} />
      <PageDisclaimerNotice noticeKey="dashboard" disclaimerKey="globalPlatform" />
    </>
  );
}

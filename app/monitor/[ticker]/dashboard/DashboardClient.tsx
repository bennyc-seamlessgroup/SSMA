'use client';

import { useState } from 'react';
import { DashboardChart } from './DashboardChart';
import { DashboardKpis, type PeriodKey } from './DashboardKpis';
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
  averageDuration: number | null;
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

export function DashboardClient({
  ticker,
  data,
  events,
  utilizationRecords,
  marginRecords,
}: {
  ticker: string;
  data: TrendPoint[];
  events: CompanyEvent[];
  utilizationRecords: DashboardUtilizationRecord[];
  marginRecords: DashboardMarginRecord[];
}) {
  const [kpiPeriod, setKpiPeriod] = useState<PeriodKey>('1Y');
  const [lendingPeriod, setLendingPeriod] = useState<PeriodKey>('1Y');
  const [marketPeriod, setMarketPeriod] = useState<PeriodKey>('1Y');
  const [overviewPeriod, setOverviewPeriod] = useState<PeriodKey>('1Y');

  return (
    <>
      <DashboardKpis data={data} period={kpiPeriod} onPeriodChange={setKpiPeriod} utilizationRecords={utilizationRecords} marginRecords={marginRecords} />
      <CustomAlertCenter ticker={ticker} />
      <DashboardChart
        title="Borrow Utilization & Duration History"
        series={['utilization', 'averageDuration']}
        fixedAxes={[
          { metric: 'utilization', side: 'left' },
          { metric: 'averageDuration', side: 'right' },
        ]}
        data={data}
        events={[]}
        sourceEndpoints={[
          { endpoint: 'GET /market-data/history?category=market-history', label: 'Utilization & duration history' },
        ]}
        period={lendingPeriod}
        onPeriodChange={setLendingPeriod}
      />
      <DashboardChart
        title="Short History"
        series={['price', 'feeRate', 'tradeVolume', 'shortableShares']}
        fixedAxes={[
          { metric: 'feeRate', side: 'left' },
          { metric: 'price', side: 'right' },
          { metric: 'shortableShares', side: 'left' },
          { metric: 'tradeVolume', side: 'right' },
        ]}
        data={data}
        events={[]}
        sourceEndpoints={[
          { endpoint: 'GET /market-data/history?category=market-history', label: 'Borrow & shortable-share history' },
        ]}
        period={marketPeriod}
        onPeriodChange={setMarketPeriod}
      />
      <DashboardChart
        title="Cross-Metric Trend Overview"
        series={['price', 'feeRate', 'tradeVolume', 'shortableShares', 'utilization', 'averageDuration', 'daysToCover']}
        data={data}
        events={events}
        sourceEndpoints={[
          { endpoint: 'GET /market-data/history?category=market-history', label: 'Consolidated market history' },
          { endpoint: 'GET /manual-input/sec-filings', label: 'Chart events' },
        ]}
        period={overviewPeriod}
        onPeriodChange={setOverviewPeriod}
      />
      <PageDisclaimerNotice noticeKey="dashboard" disclaimerKey="globalPlatform" />
    </>
  );
}

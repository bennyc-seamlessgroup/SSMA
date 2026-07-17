import { normalizeTicker } from '@/lib/ticker-data';
import { InternalFloatRoleView } from './InternalFloatRoleView';
import { InternalFloatPageTour } from './InternalFloatPageTour';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

export default async function InternalFloatPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page dashboard-page internal-float-page">
      <InternalFloatPageTour />

      <InternalFloatRoleView ticker={normalizedTicker} />
      <PageDisclaimerNotice noticeKey="internalFloat" disclaimerKey="internalFloat" />
    </div>
  );
}

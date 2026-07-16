import { normalizeTicker } from '@/lib/ticker-data';
import { InternalFloatRoleView } from './InternalFloatRoleView';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

export default async function InternalFloatPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page dashboard-page internal-float-page">
      <section className="internal-float-tips" aria-label="Internal float usage tips">
        <strong><span aria-hidden="true">💡</span> Tips</strong>
        <ul>
          <li>Start with issued share and public float.</li>
          <li>Add management / strategic holdings, tokenized shares, and collateralized shares.</li>
          <li>Use each section&apos;s Edit button to test assumptions and update real tradable float instantly.</li>
        </ul>
      </section>

      <InternalFloatRoleView ticker={normalizedTicker} />
      <PageDisclaimerNotice noticeKey="internalFloat" disclaimerKey="internalFloat" />
    </div>
  );
}

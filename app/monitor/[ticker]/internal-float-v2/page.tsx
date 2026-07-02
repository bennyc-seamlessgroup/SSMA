import { normalizeTicker } from '@/lib/ticker-data';
import { InternalFloatRoleView } from './InternalFloatRoleView';

export default async function InternalFloatV2Page({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page dashboard-page internal-float-page internal-float-v2-page">
      <div className="page__header dashboard-command-header">
        <div>
          <div className="terminal-eyebrow internal-float-v2-eyebrow">
            <span>Private Internal Input</span>
          </div>
          <h1 className="page__title">Share Allocation &amp; Tradable Float Intelligence</h1>
          <p className="page__desc">Analyze ownership structure, public float composition, tokenized shares, collateralized shares, and estimated real tradable float.</p>
        </div>
      </div>

      <section className="internal-float-v2-tips" aria-label="Internal float usage tips">
        <strong><span aria-hidden="true">💡</span> Tips</strong>
        <ul>
          <li>Start with official shares outstanding and public float.</li>
          <li>Add management / strategic holdings, tokenized shares, and collateralized shares.</li>
          <li>Use each section&apos;s Edit button to test assumptions and update real tradable float instantly.</li>
        </ul>
      </section>

      <InternalFloatRoleView ticker={normalizedTicker} />
    </div>
  );
}

import { calculateFloatAdjustments, readInternalFloatInputs, type FloatAdjustments } from '@/lib/internal-float';
import { InternalFloatV2Client } from './InternalFloatV2Client';

export default async function InternalFloatV2Page() {
  const holdingsEnvelope = await readInternalFloatInputs();
  const holdings = holdingsEnvelope.data;
  const adjustments = await calculateFloatAdjustments(holdings) as FloatAdjustments;

  return (
    <div className="page dashboard-page internal-float-page internal-float-v2-page">
      <div className="page__header dashboard-command-header">
        <div>
          <div className="terminal-eyebrow">Private Internal Input</div>
          <h1 className="page__title">Share Allocation &amp; Tradable Float Intelligence</h1>
          <p className="page__desc">Analyze ownership structure, public float composition, tokenized shares, collateralized shares, and estimated real tradable float.</p>
        </div>
      </div>

      <InternalFloatV2Client initialHoldings={holdings} initialAdjustments={adjustments} />
    </div>
  );
}

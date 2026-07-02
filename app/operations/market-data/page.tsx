import { OperationsShell } from '../OperationsShell';
import { MarketDataOperationsClient } from './MarketDataOperationsClient';

export default function OperationsMarketDataPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Future Dashboard Data</span>
          <h1>Market Data Intake</h1>
          <p>Review, enter, or batch-upload normalized daily market records. This workspace is isolated from the current Dashboard input flow.</p>
        </div>
      </div>

      <MarketDataOperationsClient />
    </OperationsShell>
  );
}

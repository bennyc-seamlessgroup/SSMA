import { OperationsShell } from '../OperationsShell';
import { MarketDataOperationsClient } from './MarketDataOperationsClient';

export default function OperationsMarketDataPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Manual Input V2</span>
          <h1>Market Data Intake</h1>
          <p>Enter operations-maintained values that feed the centralized market data pipeline.</p>
        </div>
      </div>

      <MarketDataOperationsClient />
    </OperationsShell>
  );
}

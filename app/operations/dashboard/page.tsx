import { OperationsShell } from '../OperationsShell';
import { MarketDataOperationsClient } from '../market-data/MarketDataOperationsClient';

export default function OperationsDashboardPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Manual Input V2</span>
          <h1>Dashboard Inputs</h1>
          <p>Enter daily dashboard values through the centralized manual input API.</p>
        </div>
      </div>

      <MarketDataOperationsClient />
    </OperationsShell>
  );
}

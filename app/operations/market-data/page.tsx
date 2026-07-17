import { OperationsShell } from '../OperationsShell';
import { MarketDataOperationsClient } from './MarketDataOperationsClient';

export default function OperationsMarketDataPage() {
  return (
    <OperationsShell>
      <MarketDataOperationsClient />
    </OperationsShell>
  );
}

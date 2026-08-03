import { OperationsShell } from '../OperationsShell';
import { TickerManagementOperationsClient } from './TickerManagementOperationsClient';

export default function OperationsTickerManagementPage() {
  return (
    <OperationsShell>
      <TickerManagementOperationsClient />
    </OperationsShell>
  );
}

import { OperationsShell } from '../OperationsShell';
import { ManagementHoldingsOperationsClient } from './ManagementHoldingsOperationsClient';

export default function OperationsOwnershipPage() {
  return (
    <OperationsShell>
      <ManagementHoldingsOperationsClient />
    </OperationsShell>
  );
}

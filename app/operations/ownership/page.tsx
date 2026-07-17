import { OperationsShell } from '../OperationsShell';
import { ManagementHoldingsOperationsClient } from './ManagementHoldingsOperationsClient';
import { TraditionalCustodyOperationsClient } from './TraditionalCustodyOperationsClient';

export default function OperationsOwnershipPage() {
  return (
    <OperationsShell>
      <ManagementHoldingsOperationsClient />
      <TraditionalCustodyOperationsClient />
    </OperationsShell>
  );
}

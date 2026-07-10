import { OperationsShell } from '../OperationsShell';
import { ManagementHoldingsOperationsClient } from './ManagementHoldingsOperationsClient';

export default function OperationsOwnershipPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Ownership</span>
          <h1>Ownership Data Operations</h1>
          <p>Manage management and strategic holdings inputs used by Ownership and Internal Float workflows.</p>
        </div>
      </div>

      <ManagementHoldingsOperationsClient />
    </OperationsShell>
  );
}

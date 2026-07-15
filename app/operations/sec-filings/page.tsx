import { OperationsShell } from '../OperationsShell';
import { SecFilingsOperationsClient } from './SecFilingsOperationsClient';

export default function OperationsSecFilingsPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">SEC Filings</span>
          <h1>Manual Filing Entry</h1>
          <p>Input missing or corrected SEC filing rows for operations review. Records are saved through the centralized manual-input API.</p>
        </div>
      </div>

      <SecFilingsOperationsClient />
    </OperationsShell>
  );
}

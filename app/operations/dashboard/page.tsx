import { OperationsShell } from '../OperationsShell';
import { DashboardMarginOperationsClient } from './DashboardMarginOperationsClient';

export default function OperationsDashboardPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Dashboard</span>
          <h1>Dashboard Inputs</h1>
          <p>Enter daily margin and average duration values for the user portal dashboard cards.</p>
        </div>
      </div>

      <DashboardMarginOperationsClient />
    </OperationsShell>
  );
}

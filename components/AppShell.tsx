import { Sidebar } from './Sidebar';
import { MonitorExpertChat } from './MonitorExpertChat';
import { formatImportDataUpdatedAt } from '@/lib/import-data-version';

export function AppShell({
  ticker,
  companyName,
  importDataVersion,
  importDataUpdatedAt,
  children,
}: {
  ticker: string;
  companyName: string;
  importDataVersion: string;
  importDataUpdatedAt: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="portal-page monitor-portal">
      <Sidebar ticker={ticker} companyName={companyName} importDataVersion={importDataVersion} />
      <main className="portal-main main-content">
        <div className="import-data-status-bar">
          <span>Latest import data update</span>
          <strong>{formatImportDataUpdatedAt(importDataUpdatedAt)}</strong>
        </div>
        {children}
      </main>
      <MonitorExpertChat ticker={ticker} />
    </div>
  );
}

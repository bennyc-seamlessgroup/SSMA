import { Sidebar } from './Sidebar';
import { MonitorExpertChat } from './MonitorExpertChat';
import { AuthGuard } from './AuthGuard';
import { DesignBTopbar } from './DesignBTopbar';

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
        <AuthGuard>
          <DesignBTopbar ticker={ticker} companyName={companyName} importDataUpdatedAt={importDataUpdatedAt} />
          {children}
        </AuthGuard>
      </main>
      <MonitorExpertChat ticker={ticker} />
    </div>
  );
}

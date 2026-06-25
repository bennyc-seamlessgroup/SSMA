import { Sidebar } from './Sidebar';
import { MonitorExpertChat } from './MonitorExpertChat';
import { AuthGuard } from './AuthGuard';
import { DesignBTopbar } from './DesignBTopbar';

export function AppShell({
  ticker,
  companyName,
  importDataVersion,
  children,
}: {
  ticker: string;
  companyName: string;
  importDataVersion: string;
  children: React.ReactNode;
}) {
  return (
    <div className="portal-page monitor-portal">
      <Sidebar ticker={ticker} companyName={companyName} importDataVersion={importDataVersion} />
      <main className="portal-main main-content">
        <AuthGuard>
          <DesignBTopbar ticker={ticker} companyName={companyName} />
          {children}
        </AuthGuard>
      </main>
      <MonitorExpertChat ticker={ticker} />
    </div>
  );
}

import { Sidebar } from './Sidebar';
import { MonitorExpertChat } from './MonitorExpertChat';

export function AppShell({ ticker, companyName, children }: { ticker: string; companyName: string; children: React.ReactNode }) {
  return (
    <div className="portal-page monitor-portal">
      <Sidebar ticker={ticker} companyName={companyName} />
      <main className="portal-main main-content">
        {children}
      </main>
      <MonitorExpertChat ticker={ticker} />
    </div>
  );
}

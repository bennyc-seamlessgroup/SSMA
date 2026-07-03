import { Sidebar } from './Sidebar';
import { MonitorExpertChat } from './MonitorExpertChat';
import { AuthGuard } from './AuthGuard';
import { DesignBTopbar } from './DesignBTopbar';
import { DisclaimerFooter } from './DisclaimerFooter';
import { PublicDemoWelcome } from './PublicDemoWelcome';
import { TickerDataStatusProvider } from './TickerDataStatusProvider';

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
    <AuthGuard ticker={ticker}>
      <TickerDataStatusProvider ticker={ticker}>
        <div className="portal-page monitor-portal">
          <Sidebar ticker={ticker} companyName={companyName} importDataVersion={importDataVersion} />
          <main className="portal-main main-content">
            <DesignBTopbar ticker={ticker} companyName={companyName} />
            {children}
            <DisclaimerFooter />
          </main>
          <PublicDemoWelcome />
          <MonitorExpertChat ticker={ticker} />
        </div>
      </TickerDataStatusProvider>
    </AuthGuard>
  );
}

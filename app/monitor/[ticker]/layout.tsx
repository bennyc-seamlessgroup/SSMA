import { AppShell } from '@/components/AppShell';
import { buildDashboard } from '@/lib/mock-data';

export default async function TickerLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const bundle = buildDashboard(ticker);

  return (
    <AppShell
      ticker={bundle.company.ticker}
      companyName={bundle.company.company_name}
      importDataVersion="browser-pending"
    >
      {children}
    </AppShell>
  );
}

import { AppShell } from '@/components/AppShell';
import { getImportDataVersion } from '@/lib/import-data-version';
import { buildDashboard } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export default async function TickerLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const bundle = buildDashboard(ticker);
  const importDataVersion = await getImportDataVersion();

  return (
    <AppShell
      ticker={bundle.company.ticker}
      companyName={bundle.company.company_name}
      importDataVersion={importDataVersion.version}
    >
      {children}
    </AppShell>
  );
}

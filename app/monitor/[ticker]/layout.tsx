import { AppShell } from '@/components/AppShell';
import { normalizeTicker } from '@/lib/ticker-data';

export default async function TickerLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <AppShell
      ticker={normalizedTicker}
      companyName=""
      importDataVersion="browser-pending"
    >
      {children}
    </AppShell>
  );
}

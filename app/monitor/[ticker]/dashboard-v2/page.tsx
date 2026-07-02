import { DashboardV2BrowserPage } from './DashboardV2BrowserPage';

export default async function DashboardV2Page({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <DashboardV2BrowserPage ticker={ticker} />;
}

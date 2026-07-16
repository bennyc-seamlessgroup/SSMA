import { DashboardBrowserPage } from './DashboardBrowserPage';

export default async function DashboardPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <DashboardBrowserPage ticker={ticker} />;
}

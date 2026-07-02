import { ReportArchiveBrowserPage } from './ReportArchiveBrowserPage';

export default async function ReportsArchivePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <ReportArchiveBrowserPage ticker={ticker} />;
}

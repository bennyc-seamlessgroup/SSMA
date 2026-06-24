import { buildDashboard } from '@/lib/mock-data';
import { listReportArchive, type ReportArchiveRecord } from '@/lib/report-archive';
import { ReportArchiveCenter } from './ReportArchiveCenter';

export const dynamic = 'force-dynamic';

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function ReportsArchivePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker?.toUpperCase() ?? 'CURR';
  const { company } = buildDashboard(normalizedTicker);
  let reports: ReportArchiveRecord[] = [];
  let archiveError = '';

  try {
    reports = await listReportArchive(company.ticker);
  } catch (error) {
    archiveError = error instanceof Error ? error.message : 'Unable to load report archive.';
  }
  const todayDate = localDateString();

  return (
    <div className="page report-archive-page">
      <div className="page__header dashboard-command-header">
        <div>
          <h1 className="page__title">Report Archive</h1>
          <p className="page__desc">Access and download all daily reports.</p>
        </div>
      </div>

      {archiveError ? (
        <section className="report-history-empty">{archiveError}</section>
      ) : null}

      <ReportArchiveCenter ticker={company.ticker} reports={reports} todayDate={todayDate} />
    </div>
  );
}

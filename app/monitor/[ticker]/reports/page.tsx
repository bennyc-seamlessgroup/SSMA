import { buildDashboard } from '@/lib/mock-data';
import type { ReportRecord } from '@/lib/types';
import { ReportArchiveHistory } from './ReportArchiveHistory';

const reportWindowMeta: Record<ReportRecord['report_type'], { label: string; shortLabel: string; description: string; tone: string }> = {
  '8AM': {
    label: 'Pre-Market Brief',
    shortLabel: '8:00 AM',
    description: 'Opening risk, overnight changes, and management talking points before the market opens.',
    tone: 'Morning',
  },
  '1150AM': {
    label: 'Midday Flow Report',
    shortLabel: '11:50 AM',
    description: 'Intraday trading flow, pressure changes, and items to monitor into the close.',
    tone: 'Midday',
  },
  '7PM': {
    label: 'Post-Market Digest',
    shortLabel: '7:00 PM',
    description: 'Closing summary, escalation items, and next-session watchlist for executives.',
    tone: 'Close',
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatReportDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default async function ReportsArchivePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker?.toUpperCase() ?? 'CURR';
  const { company, reports } = buildDashboard(normalizedTicker);
  const reportGroups = (['8AM', '1150AM', '7PM'] as const)
    .map(type => ({
      type,
      meta: reportWindowMeta[type],
      reports: reports
        .filter(report => report.report_type === type)
        .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()),
    }))
    .filter(group => group.reports.length > 0);
  const latestReport = [...reports].sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0];

  return (
    <div className="page report-archive-page">
      <div className="page__header dashboard-command-header">
        <div>
          <h1 className="page__title">Report Archive</h1>
          <p className="page__desc">Search and download generated daily intelligence reports for {company.ticker}.</p>
        </div>
      </div>

      <section className="report-archive-summary">
        <div className="report-archive-summary__copy">
          <span className="report-archive-kicker">Report History</span>
          <h2>Daily reports grouped by delivery window</h2>
          <p>Use the grouped cards to find the right daily report quickly, then download the archived PDF from the matching window.</p>
        </div>
        <div className="report-archive-summary__stats" aria-label="Report archive summary">
          <div>
            <span>Reports</span>
            <strong>{reports.length}</strong>
          </div>
          <div>
            <span>Daily windows</span>
            <strong>3</strong>
          </div>
          <div>
            <span>Latest</span>
            <strong>{latestReport ? formatReportDate(latestReport.generated_at) : 'N/A'}</strong>
          </div>
        </div>
      </section>

      <section className="report-window-grid" aria-label="Daily report windows">
        {reportGroups.map(group => {
          const primaryReport = group.reports[0];
          return (
            <article className="report-window-card" key={group.type}>
              <div className="report-window-card__head">
                <div>
                  <span>{group.meta.tone}</span>
                  <h2>{group.meta.label}</h2>
                </div>
                <strong>{group.meta.shortLabel}</strong>
              </div>
              <p>{group.meta.description}</p>
              <div className="report-window-card__latest">
                <span>Latest report</span>
                <strong>{primaryReport.title}</strong>
                <small>{formatDate(primaryReport.generated_at)}</small>
              </div>
              <div className="report-window-card__actions">
                <a className="button secondary" href={`/api/reports/archive/${company.ticker}/${group.type}`}>Download latest</a>
                <span>{group.reports.length} archived</span>
              </div>
            </article>
          );
        })}
      </section>

      <ReportArchiveHistory ticker={company.ticker} reports={reports} reportWindowMeta={reportWindowMeta} />
    </div>
  );
}

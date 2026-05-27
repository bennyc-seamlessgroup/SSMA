import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { buildDashboard } from '@/lib/mock-data';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default async function ReportsArchivePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker?.toUpperCase() ?? 'CURR';
  const { company, reports } = buildDashboard(normalizedTicker);
  const tableRows = reports.map(report => ({
    report: report.title,
    window: report.report_time,
    reportType: report.report_type,
    generated: formatDate(report.generated_at),
    status: 'Sent',
    download: `/api/reports/archive/${company.ticker}/${report.report_type}`,
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Report Archive</h1>
          <p className="page__desc">Review generated intelligence reports, download PDFs, and confirm archive coverage for {company.ticker}.</p>
        </div>
      </div>

      <section className="grid cols-4">
        <div className="metric">
          <div className="metric__label with-info">Archived reports <InfoTooltip text="Number of reports currently available in the workspace archive." /></div>
          <div className="metric__value">{reports.length}</div>
          <div className="metric__note">available downloads</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Daily windows <InfoTooltip text="Scheduled report windows that can generate recurring intelligence reports." /></div>
          <div className="metric__value">3</div>
          <div className="metric__note">pre-market, midday, post-market</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Retention <InfoTooltip text="How long generated reports remain available for audit, review, and client delivery records." /></div>
          <div className="metric__value">12 mo</div>
          <div className="metric__note">workspace policy</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Formats <InfoTooltip text="Export formats currently supported by the report archive." /></div>
          <div className="metric__value">PDF</div>
          <div className="metric__note">downloadable report files</div>
        </div>
      </section>

      <section className="panel">
        <div className="section__head">
          <h2 className="panel__title with-info">
            Report History
            <InfoTooltip text="Search, sort, and download previously generated reports for this company workspace." />
          </h2>
        </div>
        <ImportDataTable
          columns={['report', 'window', 'reportType', 'generated', 'status', 'download']}
          rows={tableRows}
        />
      </section>

      <section className="grid cols-2">
        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title with-info">Archive Policy <InfoTooltip text="Rules that determine report retention, supported file formats, and audit traceability." /></h2>
          </div>
          <div className="section-list">
            <div className="section"><strong>Retention period</strong><p className="page__desc">Reports are retained for 12 months in this demo workspace.</p></div>
            <div className="section"><strong>Audit trail</strong><p className="page__desc">Generated timestamp, report window, status, and download route are stored with each archive item.</p></div>
            <div className="section"><strong>Future connector</strong><p className="page__desc">Generated report metadata can later be written into <span className="import-file-tag">import_data/reports</span>.</p></div>
          </div>
        </div>
        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title with-info">Operations <InfoTooltip text="Workflow controls for report export, sharing, and operational review." /></h2>
          </div>
          <div className="section-list">
            <div className="section"><strong>CSV export</strong><p className="page__desc">Planned for operations and finance reporting.</p></div>
            <div className="section"><strong>Secure sharing</strong><p className="page__desc">Planned for internal executive and IR team review.</p></div>
            <div className="section"><strong>Approval workflow</strong><p className="page__desc">Reports can be aligned with delivery approval settings before sending.</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}

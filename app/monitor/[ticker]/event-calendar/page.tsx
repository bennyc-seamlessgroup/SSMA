import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function EventCalendarPage() {
  return (
    <ImportDataPreviewPage
      title="Catalyst Intelligence Center"
      description="Upcoming catalyst and event candidates sourced from filings, reports, options expirations, and manual uploads."
      files={['options/expiration_wall.json', 'news_filings/sec_filings.json', 'reports/daily_brief.json']}
    >
      <div className="research-module-grid">
        <div className="research-hero-card"><span>Catalyst Lens</span><strong>Next 30 / 90 Days</strong><p>Use this page to understand what events could move the stock, then validate source records in the tables below.</p></div>
        <div className="research-mini-card"><span>Financial</span><strong>Earnings / filings</strong><small>SEC and company-calendar driven catalysts.</small></div>
        <div className="research-mini-card"><span>Market Structure</span><strong>Index / lockup events</strong><small>Potential technical flow catalysts.</small></div>
        <div className="research-mini-card"><span>Corporate</span><strong>Investor events</strong><small>Conference, investor day, and announcement watch.</small></div>
      </div>
    </ImportDataPreviewPage>
  );
}

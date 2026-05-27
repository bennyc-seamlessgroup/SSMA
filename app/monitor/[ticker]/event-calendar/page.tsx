import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function EventCalendarPage() {
  return (
    <ImportDataPreviewPage
      title="Event Calendar"
      description="Upcoming catalyst and event candidates sourced from filings, reports, options expirations, and manual uploads."
      files={['options/expiration_wall.json', 'news_filings/sec_filings.json', 'reports/daily_brief.json']}
    />
  );
}

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function NewsPage() {
  return (
    <ImportDataPreviewPage
      title="News & Filings"
      description="SEC filings, filing summaries, press releases, and news records from the standardized import data pool."
      files={[
        'news_filings/sec_filings.json',
        'news_filings/filing_summaries.json',
        'news_filings/news.json',
        'news_filings/press_releases.json',
      ]}
    />
  );
}

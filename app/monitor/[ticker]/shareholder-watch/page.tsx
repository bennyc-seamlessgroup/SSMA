import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function ShareholderWatchPage() {
  return (
    <ImportDataPreviewPage
      title="Shareholder Watch"
      description="Ownership changes, activist filings, top holders, and ownership trend records for shareholder monitoring."
      files={['ownership/ownership_changes.json', 'ownership/activist_filings.json', 'ownership/top_holders.json', 'ownership/ownership_trend.json']}
    />
  );
}

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function ShortInterestReportPage() {
  return (
    <ImportDataPreviewPage
      title="Short Interest Report"
      description="Placeholder report file for short interest, borrow fee, availability, and squeeze risk."
      files={['reports/short_interest_report.json', 'short/short_interest.json', 'short/borrow_fee.json', 'short/short_score.json']}
    />
  );
}

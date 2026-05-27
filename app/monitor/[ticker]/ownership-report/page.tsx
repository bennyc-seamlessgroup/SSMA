import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function OwnershipReportPage() {
  return (
    <ImportDataPreviewPage
      title="Ownership Report"
      description="Placeholder report file for institutional ownership, holder changes, and activist filing summaries."
      files={['reports/ownership_report.json', 'ownership/institutional_holdings.json', 'ownership/ownership_changes.json']}
    />
  );
}

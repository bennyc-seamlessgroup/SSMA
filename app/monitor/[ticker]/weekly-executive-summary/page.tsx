import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function WeeklyExecutiveSummaryPage() {
  return (
    <ImportDataPreviewPage
      title="Weekly Executive Summary"
      description="Placeholder report file for weekly CEO/CFO/IR-level market intelligence summaries."
      files={['reports/weekly_executive_summary.json']}
    />
  );
}

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function DailyBriefPage() {
  return (
    <ImportDataPreviewPage
      title="Daily Brief"
      description="Placeholder report file for the daily company intelligence brief."
      files={['reports/daily_brief.json']}
    />
  );
}

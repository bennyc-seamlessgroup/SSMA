import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function OptionsReportPage() {
  return (
    <ImportDataPreviewPage
      title="Options Report"
      description="Placeholder report file for options flow, put/call ratio, open interest, gamma exposure, and expiration walls."
      files={['reports/options_report.json', 'options/options_summary.json', 'options/put_call_ratio.json', 'options/gamma_exposure.json']}
    />
  );
}

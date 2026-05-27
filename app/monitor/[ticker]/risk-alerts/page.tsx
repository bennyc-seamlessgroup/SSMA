import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function RiskAlertsPage() {
  return (
    <ImportDataPreviewPage
      title="Risk Alerts"
      description="Alert output and rules for ownership, insider, short interest, options, filings, and sentiment events."
      files={['reports/risk_report.json', 'alerts/alerts.json', 'alerts/alert_rules.json']}
    />
  );
}

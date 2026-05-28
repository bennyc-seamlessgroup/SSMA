import { ImportDataTable } from '@/components/ImportDataTable';
import { SettingsBackLink } from '@/components/SettingsBackLink';
import { readImportFile } from '@/lib/import-data';

type AlertRule = {
  alertType?: string;
  title?: string;
  enabled?: boolean;
  severity?: string;
  destination?: string;
};

export default async function AlertRulesPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker?.toUpperCase() ?? 'CURR';
  const rules = readImportFile<AlertRule[]>('alerts/alert_rules.json').data;
  const rows = rules.map(rule => ({
    alertType: rule.alertType ?? '',
    title: rule.title ?? '',
    severity: rule.severity ?? '',
    destination: rule.destination ?? '',
    status: rule.enabled ? 'Enabled' : 'Disabled',
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Alert Rules</h1>
          <p className="page__desc">Alert-ready rule definitions for ownership, insider, short interest, options, filings, and sentiment events.</p>
        </div>
        <SettingsBackLink ticker={normalizedTicker} />
      </div>
      <section className="panel">
        <ImportDataTable columns={['alertType', 'title', 'severity', 'destination', 'status']} rows={rows} />
      </section>
    </div>
  );
}

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function SmartMoneyPage() {
  return (
    <ImportDataPreviewPage
      title="Smart Money Intelligence"
      description="Institutional ownership, shareholder changes, insider activity, and options positioning research."
      files={[
        'ownership/top_holders.json',
        'ownership/ownership_changes.json',
        'ownership/activist_filings.json',
        'insider/insider_transactions.json',
        'insider/net_insider_activity.json',
        'options/put_call_ratio.json',
        'options/open_interest.json',
        'options/gamma_exposure.json',
      ]}
    >
      <div className="research-module-grid">
        <div className="research-hero-card"><span>Smart Money Signal</span><strong>Bullish Bias</strong><p>Detailed ownership, insider, and options records remain below. Use this page to validate what institutions, insiders, and options traders are doing.</p></div>
        <div className="research-mini-card"><span>Institutional Activity</span><strong>Accumulation Watch</strong><small>Review ownership changes and activist filings below.</small></div>
        <div className="research-mini-card"><span>Insider Activity</span><strong>Neutral</strong><small>Review Form 3/4/5 style imported records below.</small></div>
        <div className="research-mini-card"><span>Options Activity</span><strong>Bullish</strong><small>Review put/call and gamma files below.</small></div>
      </div>
    </ImportDataPreviewPage>
  );
}

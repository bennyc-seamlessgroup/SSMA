import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

const conditions = [
  ['Short Interest', 'Triggered', 'Short interest exceeds threshold'],
  ['Utilization', 'Triggered', 'Most lendable shares are borrowed'],
  ['Borrow Fee', 'Triggered', 'Borrowing costs are elevated'],
  ['Shares Available', 'Triggered', 'Inventory is limited'],
  ['Social Sentiment', 'Monitoring', 'Sentiment is improving but not extreme'],
  ['Options Pressure', 'Monitoring', 'Gamma is supportive but not peak'],
];

export default function SqueezeReadinessPage() {
  return (
    <ImportDataPreviewPage
      title="Short Squeeze Readiness"
      description="Detailed squeeze condition matrix and supporting short, lending, options, sentiment, and internal-float data."
      files={['short/short_score.json', 'short/short_interest.json', 'short/borrow_fee.json', 'options/gamma_exposure.json', 'sentiment/social_mentions.json', 'internal_float/float_adjustments.json']}
    >
      <div className="research-module-grid">
        <div className="research-hero-card"><span>Readiness Model</span><strong>Condition Matrix</strong><p>The executive dashboard shows the summarized readiness score. This page preserves the detailed condition-level research view.</p></div>
        {conditions.map(([name, status, note]) => (
          <div className="research-mini-card" key={name}><span>{name}</span><strong>{status}</strong><small>{note}</small></div>
        ))}
      </div>
    </ImportDataPreviewPage>
  );
}

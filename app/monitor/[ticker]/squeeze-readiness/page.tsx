import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

const conditions = [
  {
    name: 'Short Interest',
    current: '22.4%',
    threshold: '15%',
    status: 'TRIGGERED',
    source: 'Ortex / FINRA',
    note: 'Short interest is above the elevated-risk threshold.',
  },
  {
    name: 'Utilization',
    current: '73.6%',
    threshold: '60%',
    status: 'TRIGGERED',
    source: 'shortAvailabilityPct',
    note: 'Availability percentage indicates meaningful borrow-side pressure in the current MVP mapping.',
  },
  {
    name: 'Borrow Fee',
    current: '30.8%',
    threshold: '25%',
    status: 'TRIGGERED',
    source: 'Ortex',
    note: 'Borrowing costs are elevated enough to pressure short sellers.',
  },
  {
    name: 'Shares Available',
    current: '2.5M',
    threshold: '< 3.0M',
    status: 'TRIGGERED',
    source: 'Ortex',
    note: 'Available borrow inventory is being monitored for further decline.',
  },
  {
    name: 'Short Interest Trend',
    current: '-20.4%',
    threshold: 'Positive growth',
    status: 'NOT ACTIVE',
    source: 'FINRA',
    note: 'Recent short interest sample declined, so this condition is not currently active.',
  },
  {
    name: 'Social Sentiment',
    current: '60 / 100',
    threshold: '80 / 100',
    status: 'MONITORING',
    source: 'Social Media Engine',
    note: 'Narrative is constructive but not yet at a peak trigger level.',
  },
  {
    name: 'Options Pressure',
    current: 'Gamma 78',
    threshold: 'Gamma > 80',
    status: 'MONITORING',
    source: 'Ortex',
    note: 'Options positioning is supportive but still below the trigger threshold.',
  },
  {
    name: 'Internal Float Adjustment',
    current: '48.1%',
    threshold: '20%',
    status: 'TRIGGERED',
    source: 'Internal Float Intelligence',
    note: 'Management-adjusted float suggests tighter tradable supply than public data alone.',
  },
] as const;

export default function SqueezeReadinessPage() {
  const triggered = conditions.filter(condition => condition.status === 'TRIGGERED');
  const monitoring = conditions.filter(condition => condition.status === 'MONITORING');
  const notActive = conditions.filter(condition => condition.status === 'NOT ACTIVE');
  const readinessScore = Math.round(((triggered.length + monitoring.length * 0.5) / conditions.length) * 100);
  const readinessLevel = readinessScore >= 81 ? 'Extreme' : readinessScore >= 61 ? 'High' : readinessScore >= 31 ? 'Moderate' : 'Low';
  const readinessTone = readinessLevel.toLowerCase();
  const activePercent = Math.round((triggered.length / conditions.length) * 100);

  return (
    <ImportDataPreviewPage
      title="Short Squeeze Readiness"
      description="Detailed squeeze condition matrix and supporting short, lending, options, sentiment, and internal-float data."
      files={['short/short_score.json', 'short/short_interest.json', 'short/borrow_fee.json', 'options/gamma_exposure.json', 'sentiment/social_mentions.json', 'internal_float/float_adjustments.json']}
    >
      <section className="readiness-workspace">
        <div className="readiness-hero-grid">
          <div className={`readiness-hero-card ${readinessTone}`}>
            <span>Readiness Score</span>
            <strong>{readinessScore} / 100</strong>
            <em>{readinessLevel}</em>
            <small>{triggered.length} triggered · {monitoring.length} monitoring · {notActive.length} not active</small>
            <div className="readiness-status-block">
              <p>This checklist shows which squeeze conditions are currently active and which still need confirmation. It is a decision-support view, not a trading signal.</p>
            </div>
          </div>
          <div className="triggered-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${activePercent}%, #e8eef7 ${activePercent}% 100%)` }}>
              <div><strong>{triggered.length} / {conditions.length}</strong><span>triggered</span></div>
            </div>
            <p>{activePercent}% of monitored conditions are currently triggered.</p>
          </div>
        </div>

        <div className="readiness-summary-strip">
          <div><span>Triggered</span><strong>{triggered.length}</strong></div>
          <div><span>Monitoring</span><strong>{monitoring.length}</strong></div>
          <div><span>Not Active</span><strong>{notActive.length}</strong></div>
          <div><span>Primary Driver</span><strong>Float + Borrow</strong></div>
        </div>

        <div className="readiness-checklist-grid">
          {conditions.map(condition => (
            <article className={`readiness-check-card ${condition.status.toLowerCase().replaceAll(' ', '-')}`} key={condition.name}>
              <div className="readiness-check-card__head">
                <div>
                  <span>{condition.name}</span>
                  <strong>{condition.current}</strong>
                </div>
                <em className={`condition-status ${condition.status.toLowerCase().replaceAll(' ', '-')}`}>{condition.status}</em>
              </div>
              <div className="readiness-check-meta">
                <div><span>Threshold</span><strong>{condition.threshold}</strong></div>
                <div className="dev-source-inline"><span>Source</span><strong>{condition.source}</strong></div>
              </div>
              <p>{condition.note}</p>
            </article>
          ))}
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}

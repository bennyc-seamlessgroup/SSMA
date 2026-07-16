import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

const scenarios = [
  ['Base Case', '60%', '$5.20', '+30%', 'Normal appreciation without significant squeeze activity.'],
  ['Moderate Squeeze', '25%', '$8.40', '+110%', 'Partial short covering and increased retail participation.'],
  ['High Squeeze', '10%', '$14.70', '+267%', 'Broad short covering with elevated borrow costs and reduced float.'],
  ['Extreme Squeeze', '5%', '$25.00', '+525%', 'Forced covering under severe borrow constraints.'],
];

export default function PriceScenarioPage() {
  return (
    <div className="page">
      <section className="panel">
        <div className="research-module-grid">
          <div className="research-hero-card"><span>Current Price</span><strong>$4.00</strong><p>Scenario engine estimates where the stock could trade if market pressure, catalysts, and positioning change.</p></div>
          {scenarios.map(([name, probability, target, upside, description]) => (
            <div className="research-mini-card" key={name}><span>{name}</span><strong>{target}</strong><small>{probability} probability · {upside} return · {description}</small></div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2 className="panel__title">Scenario Drivers</h2>
        <div className="grid cols-5">
          {['Short Interest', 'Borrow Fee', 'Effective Float', 'Sentiment', 'Options Activity'].map(driver => <div className="section" key={driver}>{driver}</div>)}
        </div>
      </section>
      <PageDisclaimerNotice noticeKey="scenarios" disclaimerKey="forecast" />
    </div>
  );
}

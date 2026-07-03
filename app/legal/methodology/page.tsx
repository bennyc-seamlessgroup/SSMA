import { methodologyContent } from '@/lib/legal/disclaimers';

export default function MethodologyPage() {
  return (
    <div className="legal-page">
      <header className="legal-page__header">
        <span>Methodology</span>
        <h1>Methodology &amp; Data Sources</h1>
        <p>How Currenc Intelligence uses available market data, public filings, third-party information, user inputs, and proprietary analytical models.</p>
      </header>

      <div className="legal-methodology-grid">
        <section className="legal-content-card" id="data-sources">
          <h2>Data Sources</h2>
          <p>Platform metrics may be calculated from the following source categories:</p>
          <ul>{methodologyContent.dataSources.map(source => <li key={source}>{source}</li>)}</ul>
        </section>
        <section className="legal-content-card">
          <h2>Update Frequency</h2>
          <p>{methodologyContent.updateFrequency}</p>
        </section>
        <section className="legal-content-card">
          <h2>Proprietary Calculations</h2>
          <p>{methodologyContent.proprietaryCalculations}</p>
        </section>
        <section className="legal-content-card">
          <h2>AI Usage</h2>
          <p>{methodologyContent.aiUsage}</p>
        </section>
      </div>
    </div>
  );
}

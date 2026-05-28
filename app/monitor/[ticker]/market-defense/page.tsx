export default function MarketDefensePage() {
  return (
    <div className="page">
      <div className="page__header"><div><h1 className="page__title">Market Defense Center</h1><p className="page__desc">Executive workflow for monitoring market pressure, preparing responses, and preserving evidence for board and IR review.</p></div></div>
      <section className="grid cols-3">
        <div className="panel"><h2 className="panel__title">IR Response Package</h2><p className="page__desc">Prepare Q&A, disclosure language, rumor response, and stakeholder messaging.</p></div>
        <div className="panel"><h2 className="panel__title">Board Briefing Pack</h2><p className="page__desc">Summarize risk drivers, alerts, evidence trail, and recommended management actions.</p></div>
        <div className="panel"><h2 className="panel__title">Advisor Coordination</h2><p className="page__desc">Route high-priority alerts to legal, IR, capital markets, and executive teams.</p></div>
      </section>
      <section className="panel">
        <h2 className="panel__title">Market Defense Checklist</h2>
        <div className="section-list">
          {['Monitor borrow fee daily', 'Review upcoming catalysts', 'Document unusual sentiment spikes', 'Preserve report archive', 'Escalate material short-pressure alerts'].map(item => <div className="section" key={item}>{item}</div>)}
        </div>
      </section>
    </div>
  );
}

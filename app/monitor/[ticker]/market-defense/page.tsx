export default function MarketDefensePage() {
  const displayPanels = [
    { title: 'IR Response Package', description: 'Prepare Q&A, disclosure language, rumor response, and stakeholder messaging.' },
    { title: 'Board Briefing Pack', description: 'Summarize risk drivers, alerts, evidence trail, and recommended management actions.' },
    { title: 'Advisor Coordination', description: 'Route high-priority alerts to legal, IR, capital markets, and executive teams.' },
  ];
  const checklist = ['Monitor borrow fee daily', 'Review upcoming catalysts', 'Document unusual sentiment spikes', 'Preserve report archive', 'Escalate material short-pressure alerts'];

  return (
    <div className="page">
      <div className="page__header"><div><h1 className="page__title">Market Defense Center</h1><p className="page__desc">Executive workflow for monitoring market pressure, preparing responses, and preserving evidence for board and IR review.</p></div></div>
      <section className="grid cols-3">
        {displayPanels.map(panel => <div className="panel" key={String(panel.title)}><h2 className="panel__title">{String(panel.title)}</h2><p className="page__desc">{String(panel.description)}</p></div>)}
      </section>
      <section className="panel">
        <h2 className="panel__title">Market Defense Checklist</h2>
        <div className="section-list">
          {checklist.map(item => <div className="section" key={item}>{item}</div>)}
        </div>
      </section>
    </div>
  );
}

export default function PremiumIntelligencePage() {
  return (
    <div className="page">
      <div className="page__header"><div><h1 className="page__title">Premium Intelligence</h1><p className="page__desc">Future institutional-grade intelligence modules requiring premium vendor coverage or internal research workflows.</p></div></div>
      <section className="grid cols-3">
        <div className="panel"><h2 className="panel__title">Institutional Short Concentration</h2><p className="page__desc">Future premium provider required. Institutional short positions are generally not fully public.</p></div>
        <div className="panel"><h2 className="panel__title">Real Short Position Model</h2><p className="page__desc">Future modeling for synthetic exposure, OTC exposure, and non-public borrow concentration.</p></div>
        <div className="panel"><h2 className="panel__title">Global Lending Pool Analysis</h2><p className="page__desc">Potential future sources include EquiLend, DataLend, Hazeltree, and S&P Global Securities Finance.</p></div>
      </section>
      <section className="panel">
        <h2 className="panel__title">Premium Data Roadmap</h2>
        <div className="grid cols-4">
          {['Prime broker lending inventory', 'Global securities finance data', 'Dealer positioning', 'Institutional borrow concentration'].map(item => <div className="section" key={item}>{item}</div>)}
        </div>
      </section>
    </div>
  );
}

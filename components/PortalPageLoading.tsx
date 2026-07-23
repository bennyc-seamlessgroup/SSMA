export type PortalLoadingVariant =
  | 'generic'
  | 'dashboard'
  | 'ownership'
  | 'shortInterest'
  | 'lendingPressure'
  | 'squeezeReadiness'
  | 'internalFloat'
  | 'sentiment'
  | 'secFilings'
  | 'reports'
  | 'profile'
  | 'alertRules';

function Kpis({
  count = 5,
  layout,
}: {
  count?: number;
  layout?: 'dashboard' | 'compact';
}) {
  return (
    <div className={`portal-loading-kpis${layout ? ` is-${layout}` : ''}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="portal-loading-card" key={index}>
          <span />
          <strong />
          <small />
          {layout === 'dashboard' ? <Chart spark /> : null}
        </div>
      ))}
    </div>
  );
}

function PanelHead({ controls = false }: { controls?: boolean }) {
  return (
    <div className="portal-loading-panel__head">
      <span />
      {controls ? <i /> : null}
    </div>
  );
}

function Toolbar({ items = 5, wide = false }: { items?: number; wide?: boolean }) {
  return (
    <div className={`portal-loading-toolbar${wide ? ' is-wide' : ''}`}>
      {Array.from({ length: items }, (_, index) => <span key={index} />)}
    </div>
  );
}

function Chart({
  compact = false,
  tall = false,
  spark = false,
}: {
  compact?: boolean;
  tall?: boolean;
  spark?: boolean;
}) {
  return (
    <div className={`portal-loading-chart${compact ? ' is-compact' : ''}${tall ? ' is-tall' : ''}${spark ? ' is-spark' : ''}`}>
      <svg viewBox="0 0 520 170" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 132 C42 120 68 136 105 112 S178 83 230 94 304 64 362 48 452 54 520 28" />
        {!spark ? <path d="M0 150 C70 142 108 152 164 133 S278 118 330 108 430 92 520 82" /> : null}
      </svg>
    </div>
  );
}

function List({ rows = 6, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div className={`portal-loading-list${compact ? ' is-compact' : ''}`}>
      {Array.from({ length: rows }, (_, index) => <b key={index} />)}
    </div>
  );
}

function MetricTiles({ count = 6 }: { count?: number }) {
  return (
    <div className="portal-loading-metric-tiles" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <span />
          <strong />
          <small />
        </div>
      ))}
    </div>
  );
}

function Donut({ compact = false }: { compact?: boolean }) {
  return <div className={`portal-loading-donut${compact ? ' is-compact' : ''}`} aria-hidden="true" />;
}

function Table({
  rows = 8,
  columns = 4,
  toolbar = false,
}: {
  rows?: number;
  columns?: number;
  toolbar?: boolean;
}) {
  return (
    <section className="portal-loading-panel portal-loading-table">
      <PanelHead controls />
      {toolbar ? <Toolbar items={3} wide /> : null}
      <div className="portal-loading-table__body">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            className="portal-loading-table-row"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            key={rowIndex}
          >
            {Array.from({ length: columns }, (_, columnIndex) => <span key={columnIndex} />)}
          </div>
        ))}
      </div>
      <div className="portal-loading-pagination"><span /><span /><span /></div>
    </section>
  );
}

function ChartPanel({ compact = false, tall = false }: { compact?: boolean; tall?: boolean }) {
  return (
    <section className="portal-loading-panel portal-loading-chart-panel">
      <div className="portal-loading-chart-head">
        <PanelHead />
        <Toolbar items={6} />
      </div>
      <Chart compact={compact} tall={tall} />
    </section>
  );
}

function GenericLoading() {
  return (
    <section className="portal-loading-panel portal-loading-generic" aria-hidden="true">
      <PanelHead controls />
      <List rows={7} />
    </section>
  );
}

function DashboardLoading() {
  return (
    <>
      <section className="portal-loading-block portal-loading-dashboard-overview">
        <div className="portal-loading-block__head">
          <span />
          <Toolbar items={6} />
        </div>
        <Kpis count={7} layout="dashboard" />
      </section>
      <section className="portal-loading-panel portal-loading-alert-panel">
        <PanelHead controls />
        <List rows={1} compact />
      </section>
      <ChartPanel />
      <ChartPanel />
      <ChartPanel tall />
    </>
  );
}

function OwnershipLoading() {
  return (
    <>
      <Kpis count={5} layout="compact" />
      <div className="portal-loading-ownership-charts" aria-hidden="true">
        <section className="portal-loading-panel">
          <PanelHead />
          <div className="portal-loading-donut-stack">
            <Donut />
            <List rows={4} compact />
          </div>
        </section>
        <section className="portal-loading-panel">
          <PanelHead />
          <List rows={9} />
        </section>
      </div>
      <Table rows={8} columns={5} toolbar />
    </>
  );
}

function ExecutiveOverview({ metrics = 6 }: { metrics?: number }) {
  return (
    <>
      <div className="portal-loading-executive-grid" aria-hidden="true">
        <section className="portal-loading-panel portal-loading-score-card">
          <PanelHead />
          <div>
            <Donut compact />
            <List rows={4} compact />
          </div>
        </section>
        <section className="portal-loading-panel portal-loading-metrics-card">
          <PanelHead />
          <MetricTiles count={metrics} />
        </section>
      </div>
      <section className="portal-loading-panel portal-loading-ai-panel">
        <PanelHead />
        <List rows={2} compact />
      </section>
    </>
  );
}

function ShortInterestLoading() {
  return (
    <>
      <section className="portal-loading-section">
        <PanelHead />
        <ExecutiveOverview metrics={5} />
      </section>
      <section className="portal-loading-section">
        <PanelHead />
        <div className="portal-loading-chart-grid">
          {Array.from({ length: 4 }, (_, index) => <ChartPanel compact key={index} />)}
        </div>
        <ChartPanel compact />
      </section>
      <section className="portal-loading-section">
        <PanelHead />
        <div className="portal-loading-two-column">
          <Table rows={7} columns={4} toolbar />
          <Table rows={7} columns={5} toolbar />
        </div>
      </section>
    </>
  );
}

function LendingPressureLoading() {
  return (
    <>
      <section className="portal-loading-section">
        <PanelHead />
        <ExecutiveOverview metrics={5} />
      </section>
      <section className="portal-loading-section">
        <PanelHead />
        <div className="portal-loading-lending-charts">
          {Array.from({ length: 3 }, (_, index) => <ChartPanel compact key={index} />)}
        </div>
      </section>
    </>
  );
}

function SqueezeReadinessLoading() {
  return (
    <section className="portal-loading-panel portal-loading-status-panel" aria-hidden="true">
      <PanelHead />
      <List rows={2} compact />
    </section>
  );
}

function InternalFloatLoading() {
  return (
    <>
      <section className="portal-loading-section">
        <PanelHead />
        <div className="portal-loading-float-summary-grid">
          <Kpis count={2} layout="compact" />
          <section className="portal-loading-panel"><PanelHead /><List rows={3} compact /></section>
        </div>
      </section>
      <section className="portal-loading-section">
        <PanelHead />
        <div className="portal-loading-two-column">
          <section className="portal-loading-panel"><PanelHead /><div className="portal-loading-donut-row"><Donut /><List rows={4} compact /></div></section>
          <section className="portal-loading-panel"><PanelHead /><div className="portal-loading-donut-row"><Donut /><List rows={4} compact /></div></section>
        </div>
      </section>
      <section className="portal-loading-section portal-loading-waterfall-section">
        <PanelHead />
        <Chart compact />
      </section>
      <section className="portal-loading-section"><PanelHead controls /><List rows={7} /></section>
      <section className="portal-loading-section"><PanelHead controls /><div className="portal-loading-two-column"><section className="portal-loading-panel"><Donut compact /></section><section className="portal-loading-panel"><List rows={6} /></section></div></section>
      <section className="portal-loading-section"><PanelHead controls /><div className="portal-loading-two-column"><section className="portal-loading-panel"><Donut compact /></section><section className="portal-loading-panel"><List rows={6} /></section></div></section>
      <section className="portal-loading-section"><PanelHead /><List rows={7} /></section>
      <section className="portal-loading-section portal-loading-activity-section"><PanelHead /><List rows={10} /></section>
    </>
  );
}

function SentimentLoading() {
  return (
    <>
      <section className="portal-loading-section portal-loading-sentiment-section">
        <div className="portal-loading-block__head"><span /><Toolbar items={5} /></div>
        <div className="portal-loading-sentiment-overview" aria-hidden="true">
          <section className="portal-loading-panel"><PanelHead /><Donut /></section>
          <section className="portal-loading-panel"><PanelHead /><List rows={5} /></section>
          <section className="portal-loading-panel"><PanelHead /><div className="portal-loading-donut-row"><Donut compact /><List rows={3} compact /></div></section>
        </div>
      </section>
      <section className="portal-loading-section portal-loading-sentiment-feed" aria-hidden="true">
        <PanelHead />
        <Toolbar items={6} wide />
        <Chart compact />
        <Toolbar items={3} wide />
        <List rows={7} />
      </section>
    </>
  );
}

function SecFilingsLoading() {
  return (
    <section className="portal-loading-panel portal-loading-sec-filings" aria-hidden="true">
      <Toolbar items={2} wide />
      <span className="portal-loading-count" />
      <div className="portal-loading-filing-list">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index}><span /><span /><span /></div>
        ))}
      </div>
      <div className="portal-loading-pagination"><span /><span /><span /></div>
    </section>
  );
}

function ReportsLoading() {
  return (
    <>
      <section className="portal-loading-panel portal-loading-report-timeline">
        <PanelHead controls />
        <div>{Array.from({ length: 3 }, (_, index) => <span key={index} />)}</div>
      </section>
      <Table rows={6} columns={3} toolbar />
    </>
  );
}

function ProfileLoading() {
  return (
    <div className="portal-loading-profile-grid" aria-hidden="true">
      <section className="portal-loading-panel portal-loading-profile-form"><PanelHead /><List rows={5} /></section>
      <section className="portal-loading-panel portal-loading-profile-meta"><PanelHead /><List rows={4} compact /></section>
    </div>
  );
}

function AlertRulesLoading() {
  return (
    <>
      <div className="portal-loading-settings-head"><span /><Toolbar items={2} /></div>
      {Array.from({ length: 3 }, (_, index) => (
        <section className="portal-loading-panel portal-loading-rule-group" key={index}>
          <PanelHead controls />
          <List rows={index === 0 ? 4 : 3} />
        </section>
      ))}
    </>
  );
}

export function PortalPageLoading({ variant = 'generic' }: { variant?: PortalLoadingVariant }) {
  const content = {
    generic: <GenericLoading />,
    dashboard: <DashboardLoading />,
    ownership: <OwnershipLoading />,
    shortInterest: <ShortInterestLoading />,
    lendingPressure: <LendingPressureLoading />,
    squeezeReadiness: <SqueezeReadinessLoading />,
    internalFloat: <InternalFloatLoading />,
    sentiment: <SentimentLoading />,
    secFilings: <SecFilingsLoading />,
    reports: <ReportsLoading />,
    profile: <ProfileLoading />,
    alertRules: <AlertRulesLoading />,
  }[variant];

  return (
    <div className={`portal-page-loading portal-page-loading--${variant}`} role="status" aria-label="Loading page data">
      {content}
    </div>
  );
}

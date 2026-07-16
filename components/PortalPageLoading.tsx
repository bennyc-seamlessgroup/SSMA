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
  | 'profile';

function Kpis({ count = 5 }: { count?: number }) {
  return (
    <div className="portal-loading-kpis" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="portal-loading-card" key={index}>
          <span />
          <strong />
          <small />
        </div>
      ))}
    </div>
  );
}

function PanelHead() {
  return (
    <div className="portal-loading-panel__head">
      <span />
      <i />
    </div>
  );
}

function Chart({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`portal-loading-chart ${compact ? 'is-compact' : ''}`}>
      <b />
      <b />
      <b />
      <svg viewBox="0 0 520 170" preserveAspectRatio="none">
        <path d="M0 132 C42 120 68 136 105 112 S178 83 230 94 304 64 362 48 452 54 520 28" />
        <path d="M0 150 C70 142 108 152 164 133 S278 118 330 108 430 92 520 82" />
      </svg>
    </div>
  );
}

function List({ rows = 6, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div className={`portal-loading-list ${compact ? 'is-compact' : ''}`}>
      {Array.from({ length: rows }, (_, index) => <b key={index} />)}
    </div>
  );
}

function Donut() {
  return (
    <div className="portal-loading-donut">
      <i />
      <span />
    </div>
  );
}

function Table({ rows = 8 }: { rows?: number }) {
  return (
    <section className="portal-loading-panel portal-loading-table">
      <PanelHead />
      {Array.from({ length: rows }, (_, index) => (
        <div className="portal-loading-table-row" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </section>
  );
}

function GenericLoading() {
  return (
    <>
      <Kpis />
      <div className="portal-loading-grid" aria-hidden="true">
        <section className="portal-loading-panel portal-loading-panel--wide">
          <PanelHead />
          <Chart />
        </section>
        <section className="portal-loading-panel">
          <PanelHead />
          <List rows={5} />
        </section>
        <section className="portal-loading-panel">
          <PanelHead />
          <List rows={6} compact />
        </section>
      </div>
    </>
  );
}

function DashboardLoading() {
  return (
    <>
      <Kpis count={7} />
      <section className="portal-loading-panel portal-loading-panel--wide">
        <PanelHead />
        <div className="portal-loading-toolbar"><span /><span /><span /><span /><span /></div>
        <Chart />
      </section>
    </>
  );
}

function OwnershipLoading() {
  return (
    <>
      <Kpis count={5} />
      <div className="portal-loading-two-column" aria-hidden="true">
        <section className="portal-loading-panel">
          <PanelHead />
          <div className="portal-loading-donut-row">
            <Donut />
            <List rows={4} compact />
          </div>
        </section>
        <section className="portal-loading-panel">
          <PanelHead />
          <List rows={8} />
        </section>
      </div>
      <Table rows={7} />
    </>
  );
}

function PressureLoading() {
  return (
    <>
      <Kpis count={4} />
      <div className="portal-loading-score-row" aria-hidden="true">
        <section className="portal-loading-panel">
          <PanelHead />
          <strong />
          <List rows={2} compact />
        </section>
        <section className="portal-loading-panel">
          <Donut />
        </section>
      </div>
      <div className="portal-loading-chart-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <section className="portal-loading-panel" key={index}>
            <PanelHead />
            <Chart compact />
          </section>
        ))}
      </div>
    </>
  );
}

function InternalFloatLoading() {
  return (
    <>
      <section className="portal-loading-panel portal-loading-float-summary">
        <PanelHead />
        <div><strong /><span /><strong /></div>
      </section>
      <div className="portal-loading-two-column" aria-hidden="true">
        <section className="portal-loading-panel">
          <PanelHead />
          <div className="portal-loading-donut-row">
            <Donut />
            <List rows={4} compact />
          </div>
        </section>
        <section className="portal-loading-panel">
          <PanelHead />
          <div className="portal-loading-donut-row">
            <Donut />
            <List rows={4} compact />
          </div>
        </section>
      </div>
      <div className="portal-loading-two-column" aria-hidden="true">
        <section className="portal-loading-panel"><PanelHead /><List rows={7} /></section>
        <section className="portal-loading-panel"><PanelHead /><List rows={10} compact /></section>
      </div>
    </>
  );
}

function SentimentLoading() {
  return (
    <>
      <div className="portal-loading-sentiment-overview" aria-hidden="true">
        <section className="portal-loading-panel"><PanelHead /><Donut /></section>
        <section className="portal-loading-panel"><PanelHead /><List rows={5} compact /></section>
        <section className="portal-loading-panel"><PanelHead /><Donut /></section>
      </div>
      <div className="portal-loading-sentiment-grid" aria-hidden="true">
        <section className="portal-loading-panel portal-loading-panel--wide">
          <PanelHead />
          <div className="portal-loading-toolbar"><span /><span /><span /><span /><span /></div>
          <Chart compact />
          <List rows={7} />
        </section>
      </div>
    </>
  );
}

function SecFilingsLoading() {
  return (
    <>
      <section className="portal-loading-panel">
        <PanelHead />
        <div className="portal-loading-toolbar is-wide"><span /><span /><span /></div>
      </section>
      <Table rows={10} />
    </>
  );
}

function ReportsLoading() {
  return (
    <>
      <section className="portal-loading-panel portal-loading-report-timeline">
        <PanelHead />
        <div>
          <span />
          <span />
          <span />
        </div>
      </section>
      <Table rows={5} />
    </>
  );
}

function ProfileLoading() {
  return (
    <div className="portal-loading-two-column" aria-hidden="true">
      <section className="portal-loading-panel portal-loading-profile-form">
        <PanelHead />
        <List rows={5} />
      </section>
      <section className="portal-loading-panel portal-loading-profile-meta">
        <PanelHead />
        <List rows={4} compact />
      </section>
    </div>
  );
}

export function PortalPageLoading({ variant = 'generic' }: { variant?: PortalLoadingVariant }) {
  const content = {
    generic: <GenericLoading />,
    dashboard: <DashboardLoading />,
    ownership: <OwnershipLoading />,
    shortInterest: <PressureLoading />,
    lendingPressure: <PressureLoading />,
    squeezeReadiness: <PressureLoading />,
    internalFloat: <InternalFloatLoading />,
    sentiment: <SentimentLoading />,
    secFilings: <SecFilingsLoading />,
    reports: <ReportsLoading />,
    profile: <ProfileLoading />,
  }[variant];

  return (
    <div className={`portal-page-loading portal-page-loading--${variant}`} role="status" aria-label="Loading page data">
      {content}
    </div>
  );
}

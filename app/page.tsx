import Link from 'next/link';

const platformModules = [
  {
    eyebrow: 'Module 01',
    title: 'Real-Time Dashboard',
    text: 'Market overview, KPI movement, and pressure signals summarized for executive review.',
    tone: 'indigo',
    featured: true,
  },
  {
    eyebrow: 'Module 02',
    title: 'Ownership Intelligence',
    text: 'Track institutional ownership, insider filings, public float, and internal float assumptions in one workspace.',
    tone: 'blue',
  },
  {
    eyebrow: 'Module 03',
    title: 'Short Interest Analysis',
    text: 'Monitor short interest, borrow fees, utilization, days to cover, and availability pressure.',
    tone: 'cyan',
  },
  {
    eyebrow: 'Module 04',
    title: 'Squeeze Readiness',
    text: 'Score market pressure conditions across borrow, sentiment, float, options, and catalyst inputs.',
    tone: 'violet',
  },
  {
    eyebrow: 'Module 05',
    title: 'Sentiment & Narrative',
    text: 'Classify market narratives from X, Reddit, Stocktwits, filings, and news into executive-ready signals.',
    tone: 'emerald',
  },
  {
    eyebrow: 'Module 06',
    title: 'Price Scenario Modeling',
    text: 'Model upside, downside, and stress paths with scenario curves built for board discussion.',
    tone: 'amber',
  },
];

const heroStats = [
  ['Short Interest', '940.7K', '+399.8%', 'line'],
  ['Lending Pressure', '92', 'Extreme', 'risk'],
  ['Internal Float', '26.7M', 'Shares active', 'donut'],
  ['Sentiment', 'Bullish 62', '+8 vs yesterday', 'spark'],
];

const trustedWorkflows = [
  ['Corporate IR', 'users'],
  ['Board Reports', 'book'],
  ['Risk Teams', 'shield'],
  ['Capital Markets', 'chart'],
  ['Daily Intelligence', 'pulse'],
] as const;

const reportWindows = [
  ['8:00 AM', 'Pre-Market Brief', 'Opening risk, overnight changes, and early borrow pressure.'],
  ['11:50 AM', 'Midday Flow Report', 'Intraday sentiment, liquidity, and short pressure movement.'],
  ['7:00 PM', 'Post-Market Digest', 'Full-day recap, watch items, and report archive delivery.'],
];

const dataPipeline = [
  ['Data Collection', 'Market, ownership, filing, social, and report inputs.', 'database'],
  ['Normalization', 'Clean schemas, dedupe rules, and issuer-level mapping.', 'layers'],
  ['Intelligence Engine', 'Derived metrics, scoring logic, and daily context.', 'spark'],
  ['Signal Detection', 'Pressure, sentiment, ownership, and filing changes.', 'alert'],
  ['Visualization', 'Dashboards designed for fast executive scanning.', 'eye'],
  ['Actionable Reports', 'Daily briefings and archived PDF outputs.', 'report'],
] as const;

const pricing = [
  ['Basic', 'Single issuer monitoring', ['Dashboard workspace', 'Daily reports', 'Short pressure indicators', 'Report archive']],
  ['Professional', 'IR and management teams', ['Ownership intelligence', 'Narrative command center', 'Squeeze readiness', 'Board-ready PDFs']],
  ['Enterprise', 'Multi-company coverage', ['Custom report templates', 'Team workflow controls', 'Backend operations portal', 'Private integrations']],
];

function Icon({ name }: { name: 'arrow' | 'shield' | 'chart' | 'book' | 'users' | 'pulse' | 'spark' | 'lock' | 'send' | 'search' | 'bell' | 'clock' | 'database' | 'layers' | 'alert' | 'eye' | 'report' | 'scenario' }) {
  const paths = {
    arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
    shield: ['M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z'],
    chart: ['M4 19V5', 'M4 19h16', 'm7-5 3-3 3 2 4-6'],
    book: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H7a3 3 0 0 0-3 3V5.5Z', 'M4 21a3 3 0 0 1 3-3h13'],
    users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    pulse: ['M22 12h-4l-3 8-6-16-3 8H2'],
    spark: ['M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3Z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z'],
    lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5z'],
    send: ['M22 2 11 13', 'm22 2-7 20-4-9-9-4 20-7Z'],
    search: ['M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z', 'm16 16 5 5'],
    bell: ['M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z', 'M10 21h4'],
    clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
    database: ['M4 6c0-2 4-3 8-3s8 1 8 3-4 3-8 3-8-1-8-3Z', 'M4 6v6c0 2 4 3 8 3s8-1 8-3V6', 'M4 12v6c0 2 4 3 8 3s8-1 8-3v-6'],
    layers: ['M12 3 3 8l9 5 9-5-9-5Z', 'm3 13 9 5 9-5', 'm3 18 9 5 9-5'],
    alert: ['M12 9v4', 'M12 17h.01', 'M10.3 3.9 2.1 0 8.6 14.9a2.1 2.1 0 0 1-1.8 3.2H4.8A2.1 2.1 0 0 1 3 18.8L10.3 3.9Z'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
    report: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6'],
    scenario: ['M4 18c4-9 8-9 12-2', 'M4 13c4-5 8-5 12 1', 'M4 8c4 1 8 1 12-3', 'M18 5h2v2', 'M18 14h2v2'],
  }[name];

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths.map(path => <path key={path} d={path} />)}
    </svg>
  );
}

function MiniMetricGraphic({ kind }: { kind: string }) {
  if (kind === 'risk') return <div className="ci-mini-risk"><span /><b /></div>;
  if (kind === 'donut') return <div className="ci-mini-donut"><strong>65%</strong></div>;
  if (kind === 'spark') {
    return (
      <svg className="ci-mini-spark" viewBox="0 0 120 38" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 28 15 24 28 31 42 18 58 21 74 12 88 19 103 8 120 13" />
      </svg>
    );
  }
  return (
    <svg className="ci-mini-spark" viewBox="0 0 120 38" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 12 25 24 27 38 17 50 21 64 12 76 18 90 10 102 15 120 5" />
    </svg>
  );
}

function ModuleGraphic({ tone, title }: { tone: string; title: string }) {
  if (title.includes('Real-Time')) {
    return (
      <div className="ci-card-graphic ci-card-market">
        <span><strong>$18.42</strong><em>+13.43%</em></span>
        <svg viewBox="0 0 180 72" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 58 18 51 34 55 52 36 70 42 88 30 106 34 128 20 148 26 180 10" />
        </svg>
      </div>
    );
  }

  if (title.includes('Ownership')) {
    return (
      <div className="ci-card-graphic ci-card-donut">
        <div><strong>26.7M</strong><span>Internal Float</span></div>
      </div>
    );
  }

  if (title.includes('Squeeze')) {
    return (
      <div className="ci-card-graphic ci-card-gauge">
        <div><strong>78</strong><span>High</span></div>
      </div>
    );
  }

  if (title.includes('Sentiment')) {
    return (
      <div className="ci-card-graphic ci-card-sentiment">
        <span><strong>Bullish 62</strong><em>+8 vs yesterday</em></span>
        <svg viewBox="0 0 180 72" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 54 20 48 38 51 58 42 76 44 96 31 116 34 138 22 158 27 180 16" />
        </svg>
      </div>
    );
  }

  if (title.includes('Price Scenario')) {
    return (
      <div className="ci-card-graphic ci-card-scenario">
        <span>Projection Active</span>
        <svg viewBox="0 0 180 82" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 58 C24 50 42 46 63 39 S105 24 180 12" />
          <path d="M0 58 C30 55 52 51 78 47 S130 39 180 30" />
          <path d="M0 58 C25 62 48 65 74 69 S130 71 180 66" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`ci-card-graphic ci-card-line tone-${tone}`}>
      <svg viewBox="0 0 180 72" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 54 18 44 34 50 52 29 70 39 88 22 106 31 128 16 148 24 180 8" />
        <path d="M0 62 24 57 48 61 72 48 96 52 120 38 144 44 180 31" />
        <path d="M0 66 28 62 52 65 80 58 108 61 132 51 158 55 180 48" />
      </svg>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="ci-landing">
      <header className="ci-landing-nav">
        <Link href="/" className="ci-landing-brand" aria-label="Currenc Intelligence home">
          <img src="/ci_logo01.png" alt="" />
          <span>
            <strong>Currenc Intelligence</strong>
            <small>SHORT MONITORING &amp; ANALYSIS</small>
          </span>
        </Link>

        <nav aria-label="Marketing navigation">
          <a href="#platform">Platform</a>
          <a href="#reports">Reports</a>
          <a href="#solutions">Solutions</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="ci-landing-nav-actions">
          <Link href="/login" className="ci-link-button">Log in</Link>
          <a href="#request" className="ci-primary-button">Request Access <Icon name="arrow" /></a>
        </div>
      </header>

      <section className="ci-hero">
        <div className="ci-wave-layer" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => <span key={index} style={{ ['--i' as string]: index }} />)}
        </div>
        <div className="ci-hero-glow ci-hero-glow-a" />
        <div className="ci-hero-glow ci-hero-glow-b" />

        <div className="ci-hero-inner">
          <div className="ci-hero-copy">
            <div className="ci-pill"><i /> DAILY MARKET INTELLIGENCE</div>
            <h1>See the Market <span>Before It Moves.</span></h1>
            <p>
              Currenc Intelligence turns short pressure, ownership structure, sentiment, filings,
              and daily report data into one executive command center for public-company teams.
            </p>
            <div className="ci-hero-actions">
              <a href="#request" className="ci-primary-button ci-large-button">Request Access <Icon name="arrow" /></a>
              <a href="#platform" className="ci-secondary-button ci-large-button">Explore Platform <Icon name="spark" /></a>
            </div>
            <div className="ci-mini-proof">
              <div><Icon name="book" /><strong>3 reports daily</strong><span>Pre, midday, close</span></div>
              <div><Icon name="shield" /><strong>Executive grade</strong><span>Board-ready outputs</span></div>
              <div><Icon name="pulse" /><strong>Live monitoring</strong><span>Data refresh workflow</span></div>
            </div>
          </div>

          <div className="ci-dashboard-stage" aria-label="Currenc Intelligence dashboard preview">
            <div className="ci-dashboard-halo" />
            <div className="ci-dashboard">
              <div className="ci-dashboard-topbar">
                <div className="ci-window-dots"><i /><i /><i /></div>
                <span>Currenc Intelligence / CURR</span>
                <div className="ci-dashboard-actions">
                  <button type="button" aria-label="Search"><Icon name="search" /></button>
                  <button type="button" aria-label="Notifications"><Icon name="bell" /></button>
                  <strong>BC</strong>
                </div>
              </div>

              <div className="ci-dashboard-body">
                <aside>
                  <span>Analysis Platform</span>
                  <b>Dashboard</b>
                  <b>Ownership</b>
                  <b>Short Interest</b>
                  <b>Lending Pressure</b>
                  <b>Squeeze Readiness</b>
                  <b>Internal Float</b>
                  <b>Narrative</b>
                  <b>Report Archive</b>
                  <em><i /> Daily score</em>
                </aside>

                <div className="ci-dashboard-main">
                  <div className="ci-dashboard-chart">
                    <div>
                      <span>Trend Overview</span>
                      <strong>$18.42 <em>+13.43%</em></strong>
                    </div>
                    <div className="ci-chart-tabs"><b>1D</b><span>1W</span><span>1M</span></div>
                    <svg viewBox="0 0 420 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="ciChartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity=".36" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 122 C42 106 62 118 96 92 S155 74 196 84 251 68 291 44 356 22 420 34 L420 150 L0 150Z" fill="url(#ciChartFill)" />
                      <path d="M0 122 C42 106 62 118 96 92 S155 74 196 84 251 68 291 44 356 22 420 34" />
                      <line x1="305" x2="305" y1="14" y2="138" />
                      <circle cx="305" cy="39" r="5" />
                    </svg>
                  </div>

                  <div className="ci-score-card">
                    <span>Squeeze Readiness</span>
                    <div className="ci-score-ring"><strong>78</strong><small>HIGH</small></div>
                    <em>+12 vs yesterday</em>
                  </div>

                  <div className="ci-dashboard-metrics">
                    {heroStats.map(([label, value, note, kind]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{note}</small>
                        <MiniMetricGraphic kind={kind} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ci-logo-strip" aria-label="Trusted use cases">
        <span>TRUSTED WORKFLOWS FOR INVESTORS, IR TEAMS, AND MANAGEMENT</span>
        <div>
          {trustedWorkflows.map(([label, icon]) => (
            <b key={label}><Icon name={icon} />{label}</b>
          ))}
        </div>
      </section>

      <section id="solutions" className="ci-comparison">
        <article className="ci-problem-card">
          <span><Icon name="pulse" /> THE PROBLEM</span>
          <h2>Information is everywhere. Clarity is not.</h2>
          <p>Signals are scattered across short data, lending desks, SEC filings, social feeds, and internal float assumptions.</p>
          <ul>
            <li>Fragmented data sources</li>
            <li>Delayed executive summaries</li>
            <li>Hard-to-explain short pressure</li>
            <li>No daily report lifecycle view</li>
          </ul>
        </article>

        <div className="ci-orbit" aria-hidden="true">
          <div className="ci-orbit-ring ci-orbit-ring-a" />
          <div className="ci-orbit-ring ci-orbit-ring-b" />
          <div className="ci-orbit-core"><img src="/ci_logo01.png" alt="" /></div>
          <div className="ci-orbit-nodes">
            <i className="ci-orbit-node ci-node-a" title="Data sources"><Icon name="database" /></i>
            <i className="ci-orbit-node ci-node-b" title="Ownership"><Icon name="users" /></i>
            <i className="ci-orbit-node ci-node-c" title="Short interest"><Icon name="chart" /></i>
            <i className="ci-orbit-node ci-node-d" title="Sentiment and narrative"><Icon name="pulse" /></i>
            <i className="ci-orbit-node ci-node-e" title="Reports"><Icon name="report" /></i>
            <i className="ci-orbit-node ci-node-f" title="Price scenarios"><Icon name="scenario" /></i>
          </div>
        </div>

        <article className="ci-solution-card">
          <span><Icon name="shield" /> OUR SOLUTION</span>
          <h2>One platform. Complete visibility.</h2>
          <p>Currenc Intelligence unifies changing market data into page-level dashboards, reports, alerts, and audit-ready archives.</p>
          <ul>
            <li>Structured daily reports</li>
            <li>Ownership and float transparency</li>
            <li>Narrative and sentiment tracking</li>
            <li>Actionable management watch items</li>
          </ul>
        </article>
      </section>

      <section id="platform" className="ci-platform">
        <div className="ci-section-head">
          <span>PLATFORM HIGHLIGHTS</span>
          <h2>Built for Investors. Designed for Impact.</h2>
          <p>Every module is designed to compress noisy market information into a clear operating picture.</p>
        </div>
        <div className="ci-module-grid">
          {platformModules.map(module => (
            <article key={module.title} className={`ci-module-card ${module.featured ? 'is-featured' : ''} tone-${module.tone}`}>
              {module.featured && <em>PRIMARY FEATURE</em>}
              <div>
                <i><Icon name={module.tone === 'blue' ? 'users' : module.tone === 'cyan' ? 'chart' : module.tone === 'amber' ? 'scenario' : module.tone === 'emerald' ? 'pulse' : 'spark'} /></i>
                <span>{module.eyebrow}</span>
              </div>
              <h3>{module.title}</h3>
              <p>{module.text}</p>
              <ModuleGraphic tone={module.tone} title={module.title} />
            </article>
          ))}
        </div>
      </section>

      <section id="reports" className="ci-reports">
        <div className="ci-section-head">
          <span>REPORT LIFECYCLE</span>
          <h2>Three fixed-time intelligence reports every market day.</h2>
        </div>
        <div className="ci-report-timeline">
          {reportWindows.map(([time, title, text], index) => (
            <article key={time}>
              <div>{index + 1}</div>
              <span>{time}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ci-data-section">
        <div>
          <span>DATA STACK</span>
          <h2>Built on a Powerful Data Stack</h2>
          <p>From fragmented market data to executive-ready intelligence.</p>
        </div>
        <div className="ci-data-pipeline">
          {dataPipeline.map(([title, text, icon], index) => (
            <article key={title}>
              <i><Icon name={icon} /></i>
              <strong>{title}</strong>
              <span>{text}</span>
              {index < dataPipeline.length - 1 && <b aria-hidden="true">→</b>}
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="ci-pricing">
        <div className="ci-section-head">
          <span>PACKAGES</span>
          <h2>Coverage for single issuers, management teams, and multi-company workflows.</h2>
        </div>
        <div className="ci-pricing-grid">
          {pricing.map(([name, description, items]) => (
            <article key={name as string} className={name === 'Professional' ? 'is-featured' : ''}>
              <h3>{name}</h3>
              <p>{description as string}</p>
              <strong>Contact us</strong>
              <ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section id="request" className="ci-final-cta">
        <div className="ci-wave-layer" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <span key={index} style={{ ['--i' as string]: index }} />)}
        </div>
        <img src="/ci_logo01.png" alt="" />
        <h2>Ready to see the market clearly?</h2>
        <p>Request access to review how Currenc Intelligence can support short monitoring, ownership intelligence, and daily executive reporting.</p>
        <div>
          <Link href="/login" className="ci-secondary-button ci-large-button">Open Portal</Link>
          <a href="mailto:info@currencintelligence.com?subject=Currenc%20Intelligence%20Access%20Request" className="ci-primary-button ci-large-button">Request Access <Icon name="send" /></a>
        </div>
        <small><Icon name="lock" /> Secure platform · Institutional deployment · Daily report archive</small>
      </section>

      <footer className="ci-footer">
        <div>
          <Link href="/" className="ci-footer-brand">
            <img src="/ci_logo01.png" alt="" />
            <strong>Currenc Intelligence</strong>
          </Link>
          <p>Structured daily market analytics for issuer teams, IR teams, and capital markets workflows.</p>
        </div>
        <nav>
          <a href="#platform">Platform</a>
          <a href="#reports">Reports</a>
          <a href="#solutions">Solutions</a>
          <a href="/login">Portal Login</a>
        </nav>
        <span>© 2026 Currenc Intelligence. All rights reserved.</span>
      </footer>
    </main>
  );
}

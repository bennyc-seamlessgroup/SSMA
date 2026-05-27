import Link from 'next/link';

const heroMetrics = [
  ['Short Interest', '12.8%', '+1.4 pts'],
  ['Borrow Rate', '18.6%', '+320 bps'],
  ['Utilization', '91%', 'High'],
  ['Days to Cover', '5.2', 'Rising'],
  ['Social Sentiment', '67/100', 'Positive'],
  ['Squeeze Risk Level', 'Elevated', 'Watch'],
];

const painPoints = [
  'Short-selling activity is fragmented across multiple sources.',
  'Borrow rate, utilization, and lending supply can shift quickly.',
  'Institutional short behavior is difficult to monitor.',
  'Social media rumors and market narratives move faster than IR teams can respond.',
  'Management teams lack board-ready daily reports and historical archives.',
];

const solutionCards = [
  [
    'Short Pressure Monitoring',
    'Track short interest, utilization, cost to borrow, lending pool changes, and days to cover.',
  ],
  [
    'Institutional Behavior Intelligence',
    'Monitor short-side and long-side movement, ownership changes, SEC filings, and capital flow signals.',
  ],
  [
    'Sentiment & Narrative Tracking',
    'Track social media mentions, sentiment score, abnormal buzz, rumor risk, and original source traceability.',
  ],
  [
    'Board-Ready AI Reports',
    'Generate daily, weekly, and monthly reports designed for CEOs, boards, IR teams, and major shareholders.',
  ],
];

const reportSchedule = [
  [
    '08:00 AM ET',
    'Pre-Market Early Alert',
    'Pre-market short pressure, borrow rate movement, lending pool changes, and opening risk preview.',
  ],
  [
    '11:30 AM ET',
    'Intraday Live Update',
    'Mid-session short volume, utilization changes, abnormal trading signals, and squeeze pressure monitoring.',
  ],
  [
    '07:00 PM ET',
    'Closing Comprehensive Digest',
    'Full-day recap, institutional behavior summary, sentiment movement, and AI-generated defense review.',
  ],
];

const dataStack = [
  'Ortex / short & lending data',
  'Fintel / SEC filings & insider data',
  'FINRA / short volume & ATS data',
  'WhaleWisdom / institutional holdings',
  'Polygon / market data',
  'Social sentiment APIs',
  'StockTwits / community sentiment',
];

const workflow = [
  ['01', 'Create company workspace'],
  ['02', 'Connect licensed data sources'],
  ['03', 'Configure recipients, report schedule, and approval flow'],
  ['04', 'Deliver PDF reports and retain archive history'],
];

const pricingPlans = [
  [
    'Basic',
    'For single-company monitoring teams.',
    ['One stock code', 'Daily reports', 'Core short pressure indicators', 'Weekly summary', 'Basic archive'],
  ],
  [
    'Professional',
    'For active IR and capital markets teams.',
    [
      'Up to 10 stock codes',
      'Institutional tracking',
      'Squeeze pressure analysis',
      'Weekly deep report',
      'Monthly strategic report',
      'PDF board exports',
      'Sentiment scoring',
    ],
  ],
  [
    'Enterprise',
    'For issuers, advisory firms, and multi-company coverage.',
    [
      'Up to 50 stock codes',
      'Custom board reports',
      'Full source traceability',
      'Dedicated account support',
      'Branded templates',
      'Internal system integration support',
    ],
  ],
];

export default function LandingPage() {
  return (
    <main className="marketing-page market-defense-page">
      <nav className="marketing-nav defense-nav">
        <Link href="/" className="brand-lockup defense-brand">
          <span className="brand-mark defense-brand__mark">CI</span>
          <span>Currenc Intelligence</span>
        </Link>
        <div className="marketing-nav__links">
          <a href="#solution">Platform</a>
          <a href="#reports">Reports</a>
          <a href="#data">Data Stack</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="marketing-nav__actions">
          <a className="button secondary light" href="#pricing">Request Demo</a>
          <Link className="button light-primary" href="/login">Open Portal</Link>
        </div>
      </nav>

      <section className="defense-hero">
        <div className="hero-copy defense-hero__copy">
          <div className="eyebrow">Listed-company market defense intelligence</div>
          <h1>AI-Powered Short Squeeze Monitoring & Market Defense for Public Companies</h1>
          <p>
            Monitor short pressure, borrow cost, institutional behavior, and social sentiment -
            then turn fragmented market data into executive-ready reports delivered three times daily.
          </p>
          <div className="hero-actions">
            <a className="button light-primary large" href="#pricing">Request Demo</a>
            <Link className="button secondary light large" href="/monitor/CURR/reports">View Sample Report</Link>
            <Link className="button ghost defense-ghost large" href="/login">Open Portal</Link>
          </div>
          <div className="trust-row defense-trust">
            <span>Not a trader dashboard</span>
            <span>Built for CEOs, boards, and IR teams</span>
            <span>Fixed-time executive reporting</span>
          </div>
        </div>

        <div className="defense-dashboard" aria-label="Short squeeze monitoring dashboard preview">
          <div className="defense-dashboard__topbar">
            <div>
              <span>CURR / NASDAQ</span>
              <strong>Market Defense Workspace</strong>
            </div>
            <em>Executive view</em>
          </div>
          <div className="defense-dashboard__risk">
            <div>
              <span>Squeeze Risk Level</span>
              <strong>Elevated</strong>
              <small>Borrow pressure and sentiment movement under review</small>
            </div>
            <div className="risk-meter" aria-hidden="true">
              <span></span>
            </div>
          </div>
          <div className="defense-metric-grid">
            {heroMetrics.map(([label, value, note]) => (
              <div key={label} className="defense-metric">
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="defense-report-list">
            <div><span>08:00</span><strong>Pre-Market Brief</strong><em>Ready</em></div>
            <div><span>11:30</span><strong>Intraday Update</strong><em>Scheduled</em></div>
            <div><span>19:00</span><strong>Closing Digest</strong><em>Board archive</em></div>
          </div>
        </div>
      </section>

      <section className="defense-section problem-section">
        <div className="section-heading">
          <div className="eyebrow">The problem</div>
          <h2>Public companies are often defending their market value with incomplete information.</h2>
        </div>
        <div className="problem-grid">
          {painPoints.map(point => (
            <div key={point} className="problem-card">
              <span></span>
              <p>{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="solution" className="defense-section">
        <div className="section-heading centered">
          <div className="eyebrow">The solution</div>
          <h2>One platform for short pressure, sentiment risk, and executive reporting.</h2>
        </div>
        <div className="defense-card-grid cols-4">
          {solutionCards.map(([title, desc]) => (
            <article key={title} className="defense-card">
              <div className="defense-card__line"></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="reports" className="defense-section">
        <div className="section-heading centered">
          <div className="eyebrow">Report schedule</div>
          <h2>Three fixed-time intelligence reports every trading day.</h2>
          <p>Designed for repeatable management review across ET, Beijing, and Hong Kong time support.</p>
        </div>
        <div className="schedule-grid">
          {reportSchedule.map(([time, title, desc]) => (
            <article key={time} className="schedule-card">
              <span>{time}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
        <div className="report-note">
          <strong>Extended reporting:</strong> Weekly report every Friday after market close and monthly board-level strategic report on the last trading day of each month.
        </div>
      </section>

      <section id="data" className="defense-split">
        <div className="section-heading">
          <div className="eyebrow">Data stack</div>
          <h2>Built on compliant, multi-source market intelligence.</h2>
          <p>
            Data provider integrations can be configured based on client package and license availability.
            Currenc Intelligence organizes licensed intelligence into company workspaces, reports, alerts, and archive records.
          </p>
        </div>
        <div className="data-stack-panel">
          {dataStack.map(source => (
            <div key={source}>{source}</div>
          ))}
        </div>
      </section>

      <section className="archive-band">
        <div>
          <div className="eyebrow">Permanent archive</div>
          <h2>Permanent intelligence archive for long-term market defense.</h2>
          <p>
            Every company workspace stores daily reports, weekly summaries, monthly board reports,
            short-pressure history, institutional movement records, sentiment records, and alert logs.
            The result is a long-term evidence base for management review, IR strategy, and board governance.
          </p>
        </div>
      </section>

      <section id="workflow" className="defense-section">
        <div className="section-heading centered">
          <div className="eyebrow">Workflow</div>
          <h2>From market monitoring to controlled executive delivery.</h2>
        </div>
        <div className="workflow-grid">
          {workflow.map(([number, title]) => (
            <div key={number} className="workflow-card">
              <span>{number}</span>
              <strong>{title}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="defense-section">
        <div className="section-heading centered">
          <div className="eyebrow">Pricing preview</div>
          <h2>Packages for single issuers, IR teams, and multi-company advisory coverage.</h2>
        </div>
        <div className="pricing-grid">
          {pricingPlans.map(([name, desc, items]) => (
            <article key={name as string} className={`pricing-card ${name === 'Professional' ? 'featured' : ''}`}>
              <h3>{name}</h3>
              <p>{desc as string}</p>
              <strong>Contact us</strong>
              <ul>
                {(items as string[]).map(item => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="compliance-note">
        <h2>Compliance Note</h2>
        <p>
          Currenc Intelligence provides market intelligence, monitoring, and reporting tools for corporate
          governance and investor relations workflows. The platform does not provide investment, trading,
          legal, or financial advice. Data availability depends on licensed third-party providers and client
          subscription configuration.
        </p>
        <div className="hero-actions">
          <a className="button light-primary large" href="#pricing">Request Demo</a>
          <Link className="button secondary light large" href="/monitor/CURR/reports">View Sample Report</Link>
          <Link className="button ghost defense-ghost large" href="/login">Open Portal</Link>
        </div>
      </section>
    </main>
  );
}

import type {
  ApiKeyRecord,
  CompanyRecord,
  DatabaseShape,
  EmailRecipient,
  ExecutiveReport,
  ExecutiveScoreFactor,
  ExecutiveTrendPoint,
  FilingItem,
  InstitutionalHolding,
  MarketSnapshot,
  NewsItem,
  OptionsData,
  ReportRecord,
  ReportSection,
  RiskItem,
  ShortInterestData,
  SentimentPlatformSnapshot,
} from './types';

const now = () => new Date().toISOString();
const makeId = () =>
  typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
const source = { source_type: 'mock' as const, source_label: 'Platform-managed data' };
const pending = (label: string) => ({ source_type: 'pending_api' as const, source_label: `Platform-managed: ${label}` });

const lookup = {
  CURR: {
    company_name: 'CURRENC Group Inc.',
    exchange: 'NASDAQ',
    cik: '0001940021',
    sector: 'Financial Technology',
    industry: 'Digital Banking / Web3 Infrastructure',
  },
};

export function normalizeTicker(input: string) {
  return (input || 'CURR').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '') || 'CURR';
}

export function buildCompany(tickerInput: string): CompanyRecord {
  const ticker = normalizeTicker(tickerInput);
  const meta = lookup[ticker as keyof typeof lookup] ?? {
    company_name: `${ticker} Holdings Corp.`,
    exchange: 'NASDAQ',
    cik: 'Platform-managed',
    sector: 'Platform-managed',
    industry: 'Platform-managed',
  };
  return {
    id: `company-${ticker}`,
    ticker,
    exchange: meta.exchange,
    company_name: meta.company_name,
    cik: meta.cik,
    sector: meta.sector,
    industry: meta.industry,
    created_at: now(),
    ...source,
  };
}

export function buildMarketSnapshot(tickerInput: string): MarketSnapshot {
  const ticker = normalizeTicker(tickerInput);
  const isCurr = ticker === 'CURR';
  return {
    id: `market-${ticker}`,
    company_id: `company-${ticker}`,
    ticker,
    price: isCurr ? 1.84 : 12.46,
    change_percent: isCurr ? 8.2 : 2.4,
    volume: isCurr ? 15234000 : 4621000,
    relative_volume: isCurr ? 3.8 : 1.9,
    market_cap: isCurr ? '$63.4M' : '$1.24B',
    float: isCurr ? '34.4M' : '94.1M',
    timestamp: now(),
    last_close: isCurr ? 1.70 : 12.17,
    pre_market_price: isCurr ? 1.93 : 12.58,
    pre_market_volume: isCurr ? 2860000 : 540000,
    day_high: isCurr ? 1.96 : 12.88,
    day_low: isCurr ? 1.61 : 11.92,
    vwap: isCurr ? 1.79 : 12.31,
    after_hours_price: isCurr ? 1.88 : 12.51,
    ...source,
  };
}

export function buildShortInterestData(tickerInput: string): ShortInterestData {
  const ticker = normalizeTicker(tickerInput);
  const isCurr = ticker === 'CURR';
  return {
    id: `si-${ticker}`,
    company_id: `company-${ticker}`,
    official_short_interest: isCurr ? '18.2% of float' : 'Platform-managed',
    short_percent_float: isCurr ? '18.2%' : 'Platform-managed',
    days_to_cover: isCurr ? '4.7' : 'Platform-managed',
    finra_short_volume: isCurr ? '3.8M' : 'Platform-managed',
    finra_short_volume_ratio: isCurr ? '24.9%' : 'Platform-managed',
    sec_ftd: isCurr ? '92,400' : 'Platform-managed',
    ortex_estimated_si: 'Platform-managed: ORTEX',
    ortex_ctb: 'Platform-managed: ORTEX',
    ortex_utilization: 'Platform-managed: ORTEX',
    ortex_shares_on_loan: 'Platform-managed: ORTEX',
    ortex_borrow_availability: 'Platform-managed: ORTEX',
    ortex_live_trend: 'Platform-managed: ORTEX',
    api_status: isCurr ? 'Core monitoring data available; advanced provider fields managed by account configuration.' : 'Platform-managed',
    ...source,
  };
}

export function buildInstitutionalHoldings(tickerInput: string): InstitutionalHolding[] {
  const ticker = normalizeTicker(tickerInput);
  const rows = ticker === 'CURR'
    ? [
        ['BlackRock', '1.84M', '$3.4M', 'increased', '2026-05-14', 'SEC 13F'],
        ['Vanguard', '1.21M', '$2.2M', 'unchanged', '2026-05-14', 'SEC 13F'],
        ['State Street', '820K', '$1.5M', 'reduced', '2026-05-14', 'SEC 13F'],
        ['Digital Asset Fund', '510K', '$940K', 'new', '2026-05-14', 'SEC 13F'],
      ]
    : [
        ['Sample Capital', '220K', '$1.1M', 'new', '2026-05-14', 'SEC 13F'],
        ['Index Partners', '180K', '$910K', 'increased', '2026-05-14', 'SEC 13F'],
      ];
  return rows.map(([fund_name, shares, market_value, change_type, filing_date, sourceText]) => ({
    id: makeId(),
    company_id: `company-${ticker}`,
    fund_name,
    shares,
    market_value,
    change_type: change_type as InstitutionalHolding['change_type'],
    filing_date,
    source: sourceText,
    ...source,
  }));
}

export function buildOptionsData(tickerInput: string): OptionsData {
  const ticker = normalizeTicker(tickerInput);
  const isCurr = ticker === 'CURR';
  return {
    id: `options-${ticker}`,
    company_id: `company-${ticker}`,
    put_call_ratio: isCurr ? '0.78' : 'Platform-managed',
    option_volume: isCurr ? '12.4K' : 'Platform-managed',
    open_interest: isCurr ? '48.1K' : 'Platform-managed',
    major_expirations: isCurr ? '2026-05-22, 2026-06-19' : 'Platform-managed',
    max_pain: 'Platform-managed: Fintel',
    gamma_exposure: 'Platform-managed: Fintel',
    dealer_gamma_flip: 'Platform-managed: Fintel',
    dealer_positioning: 'Platform-managed: Fintel',
    unusual_flow: 'Platform-managed: Fintel',
    api_status: isCurr ? 'Options metrics available; advanced flow signals managed by account configuration.' : 'Platform-managed',
    ...source,
  };
}

export function buildNewsItems(tickerInput: string): NewsItem[] {
  const ticker = normalizeTicker(tickerInput);
  const isCurr = ticker === 'CURR';
  const rows = isCurr
    ? [
        ['CURRENC Group announces continued focus on digital assets infrastructure', 'Company PR', 'Corporate update', 'High'],
        ['SEC filing highlights recent capital structure disclosures', 'SEC EDGAR', 'Regulatory filing', 'Medium'],
        ['Analyst note flags retail volatility and short interest movement', 'Financial media', 'Market narrative', 'High'],
      ]
    : [
        [`${ticker} releases quarterly update`, 'Company PR', 'Corporate update', 'Medium'],
        [`${ticker} adds new executive disclosure filing`, 'SEC EDGAR', 'Regulatory filing', 'Medium'],
      ];
  return rows.map(([title, sourceText, catalyst_type, importance]) => ({
    id: makeId(),
    company_id: `company-${ticker}`,
    title,
    url: '#',
    source: sourceText,
    published_at: now(),
    ai_summary: isCurr
      ? 'Event may support the AI fintech / tokenization narrative and deserves monitoring.'
      : 'Information may influence market perception and should be monitored.',
    catalyst_type,
    importance_score: importance === 'High' ? 86 : 64,
    ...source,
  }));
}

export function buildFilings(tickerInput: string): FilingItem[] {
  const ticker = normalizeTicker(tickerInput);
  const rows: Array<[string, string, string, string, number]> = ticker === 'CURR'
    ? [
        ['8-K', '2026-05-20', '0001940021-26-000011', 'Material update / corporate announcement', 90],
        ['13D', '2026-05-19', '0001940021-26-000010', 'Beneficial ownership change', 82],
        ['4', '2026-05-18', '0001940021-26-000009', 'Insider transaction', 61],
      ]
    : [['8-K', '2026-05-20', '0000000000-00-000000', 'Filing summary', 70]];
  return rows.map(([form_type, filing_date, accession_number, summary, importance_score]) => ({
    id: makeId(),
    company_id: `company-${ticker}`,
    form_type,
    filing_date,
    accession_number,
    url: '#',
    ai_summary: summary,
    importance_score,
    ...source,
  }));
}

function riskScores(tickerInput: string): RiskItem[] {
  const ticker = normalizeTicker(tickerInput);
  const isCurr = ticker === 'CURR';
  return [
    { label: 'Short Attack Risk', level: isCurr ? 'warn' : 'good', score: isCurr ? 68 : 31, explanation: 'Elevated short pressure may require monitoring.' },
    { label: 'Liquidity Risk', level: isCurr ? 'warn' : 'good', score: isCurr ? 61 : 28, explanation: 'Lower float can amplify moves.' },
    { label: 'Volatility Risk', level: 'warn', score: isCurr ? 74 : 42, explanation: 'Intraday swings may remain above normal.' },
    { label: 'Dilution Sensitivity', level: isCurr ? 'warn' : 'good', score: isCurr ? 58 : 26, explanation: 'Capital structure sensitivity should be tracked.' },
    { label: 'Institutional Confidence', level: isCurr ? 'good' : 'warn', score: isCurr ? 63 : 49, explanation: '13F activity suggests selective accumulation.' },
    { label: 'Retail Momentum', level: isCurr ? 'warn' : 'good', score: isCurr ? 71 : 34, explanation: 'Retail narrative remains active.' },
    { label: 'Catalyst Risk', level: isCurr ? 'warn' : 'good', score: isCurr ? 69 : 36, explanation: 'Filing / PR events may move price sharply.' },
  ];
}

function sectionsForReport(ticker: string, reportType: ReportRecord['report_type']): ReportSection[] {
  const base = ticker === 'CURR' ? [
    { title: 'Free Data', source_label: 'Free Data', type: 'table', items: ['SEC EDGAR filings', 'FINRA short volume history', 'SEC FTD placeholders'] },
    { title: 'AI Interpretation', source_label: 'AI Interpretation', type: 'narrative', items: ['CURR remains a high-volatility fintech / tokenization narrative name with manageable but elevated short pressure.'] },
    { title: 'Platform-managed', source_label: 'Platform-managed: ORTEX/Fintel/WhaleWisdom', type: 'pending', items: ['ORTEX estimated SI', 'Fintel gamma exposure', 'WhaleWisdom smart money movement'] },
  ] : [
    { title: 'Free Data', source_label: 'Free Data', type: 'table', items: ['Market data', 'Filing data', 'Ownership data'] },
    { title: 'AI Interpretation', source_label: 'AI Interpretation', type: 'narrative', items: ['This is a placeholder report for any NASDAQ/NYSE ticker.'] },
    { title: 'Platform-managed', source_label: 'Platform-managed', type: 'pending', items: ['ORTEX / Fintel / WhaleWisdom integrations'] },
  ];
  if (reportType === '1150AM') {
    base[1].items = ['Intraday price action suggests a blend of retail momentum and short-covering pressure.'];
  } else if (reportType === '7PM') {
    base[1].items = ['End-of-day move appears to be a mix of narrative positioning and short-pressure sensitivity.'];
  }
  return base;
}

function executiveBullets(ticker: string, reportType: ReportRecord['report_type']) {
  if (ticker !== 'CURR') {
    return ['Report generated for the selected company.', 'Market, filing, and social signals summarized for review.'];
  }
  if (reportType === '8AM') {
    return [
      'Overnight tone is constructive, with CURR holding the AI fintech / tokenization narrative.',
      'Pre-market price action implies continuing speculative demand ahead of the open.',
      'Short pressure remains visible, but no conclusive evidence of a coordinated event.',
      'Recent filings and PR items may keep volatility elevated into the session.',
      'Management should monitor opening liquidity and retail narrative acceleration.',
      'Potential catalyst sensitivity remains high given the low-float profile.',
    ];
  }
  if (reportType === '1150AM') {
    return [
      'Intraday flow shows above-average participation versus recent norms.',
      'Price action is trading above VWAP, suggesting constructive momentum.',
      'Volume concentration points to an active retail / momentum bid.',
      'Short pressure may be contributing to the move, pending confirmation from ORTEX.',
    ];
  }
  return [
    'CURR closed with a wider-than-average range and meaningful participation.',
    'The session appears to reflect a blend of narrative demand and short-pressure sensitivity.',
    'Institutional ownership signals remain supportive but incomplete without paid data.',
    'The market narrative is still centered on AI fintech, web3, and tokenization themes.',
    'Volatility risk remains elevated enough to justify continued management monitoring.',
  ];
}

function interpretation(ticker: string, reportType: ReportRecord['report_type']) {
  if (ticker !== 'CURR') return 'Monitoring interpretation for the selected company.';
  if (reportType === '8AM') return 'CURR may see continued opening volatility because the float is limited and speculative narrative interest remains active. Management should monitor unusual short activity, liquidity, and any new filing or PR catalyst.';
  if (reportType === '1150AM') return 'The midday tape suggests a possible mix of short covering, retail momentum, and narrative-driven buying. No conclusive evidence points to a single dominant driver, so the name requires monitoring into the close.';
  return 'The day likely reflected a combination of short pressure, retail participation, and tokenization / fintech narrative reinforcement. The setup still warrants management attention, especially if liquidity weakens or additional filings appear tomorrow.';
}

function actions(ticker: string, reportType: ReportRecord['report_type']) {
  if (ticker !== 'CURR') return ['Review provider configuration for expanded coverage.'];
  if (reportType === '8AM') return ['Prepare investor FAQ', 'Monitor opening tape', 'Avoid reactive financing during weak liquidity'];
  if (reportType === '1150AM') return ['Alert IR team', 'Track volume into the close', 'Prepare talking points for after-market questions'];
  return ['Publish clarification PR if needed', 'Prepare shareholder letter', 'Plan next-day IR outreach', 'Escalate legal/compliance review if manipulation indicators emerge'];
}

function reportTemplate(ticker: string, reportType: ReportRecord['report_type'], title: string, report_time: string): ReportRecord {
  return {
    id: `${ticker}-${reportType}-${report_time}`,
    ticker,
    company_name: ticker === 'CURR' ? 'CURRENC Group Inc.' : `${ticker} Holdings Corp.`,
    report_type: reportType,
    report_time,
    report_date: new Date().toISOString().slice(0, 10),
    title,
    generated_at: now(),
    executive_summary: executiveBullets(ticker, reportType),
    market_snapshot: ticker === 'CURR' ? {
      last_close: '$1.70',
      pre_market_price: '$1.93',
      pre_market_change: '+13.5%',
      market_cap: '$63.4M',
      float: '34.4M',
      average_volume: '4.1M',
      relative_volume: '3.8x',
      pre_market_volume: '2.86M',
      high_low: '$1.96 / $1.61',
      beta: 'Platform-managed',
    } : { last_close: 'Platform-managed', pre_market_price: 'Platform-managed' },
    risk_dashboard: riskScores(ticker),
    sections: sectionsForReport(ticker, reportType),
    ai_interpretation: interpretation(ticker, reportType),
    suggested_actions: actions(ticker, reportType),
    pending_api_items: ['ORTEX estimated short interest', 'Fintel gamma exposure', 'WhaleWisdom smart money movement', 'Market data provider live intraday feed'],
    source_notes: ['Free Data', 'Platform-managed data', 'Platform-managed: ORTEX/Fintel/WhaleWisdom'],
    ...source,
  };
}

export function buildReports(tickerInput: string): ReportRecord[] {
  const ticker = normalizeTicker(tickerInput);
  return [
    reportTemplate(ticker, '8AM', '8:00 AM NYT Pre-Market Risk Brief', '08:00 NYT'),
    reportTemplate(ticker, '1150AM', '11:50 AM NYT Midday Flow Report', '11:50 NYT'),
    reportTemplate(ticker, '7PM', '7:00 PM NYT Post-Market Strategic Analysis', '19:00 NYT'),
  ];
}

export function buildDashboard(tickerInput: string) {
  const ticker = normalizeTicker(tickerInput);
  const company = buildCompany(ticker);
  const marketSnapshot = buildMarketSnapshot(ticker);
  const shortInterest = buildShortInterestData(ticker);
  const institutionalHoldings = buildInstitutionalHoldings(ticker);
  const optionsData = buildOptionsData(ticker);
  const newsItems = buildNewsItems(ticker);
  const filings = buildFilings(ticker);
  const reports = buildReports(ticker);
  const narrativeTags = ticker === 'CURR'
    ? ['AI Fintech', 'Web3', 'Tokenization', 'Animoca Reverse Merger', 'Tranglo Divestment', 'Securitize Tokenization', 'Retail Volatility', 'Short Interest Movement', 'Institutional Ownership Changes']
    : ['Narrative signal', 'Platform-managed'];
  return {
    company,
    marketSnapshot,
    shortInterest,
    institutionalHoldings,
    optionsData,
    newsItems,
    filings,
    reports,
    narrativeTags,
    riskDashboard: riskScores(ticker),
    apiStatus: getApiStatus(),
    source_type: 'mock' as const,
    source_label: 'Platform-managed data',
  };
}

export function buildExecutiveReport(tickerInput: string): ExecutiveReport {
  const ticker = normalizeTicker(tickerInput);
  const isCurr = ticker === 'CURR';
  const companyName = isCurr ? 'CURRENC Group Inc.' : `${ticker} Holdings Corp.`;
  const scoreBreakdown: ExecutiveScoreFactor[] = isCurr
    ? [
        { label: 'Short Interest Ratio', score: 28, max: 30 },
        { label: 'Securities Lending Utilization', score: 24, max: 25 },
        { label: 'Short Position Trend', score: 13, max: 15 },
        { label: 'Borrow Rate Pressure', score: 9, max: 10 },
        { label: 'Volume Validation', score: 9, max: 10 },
        { label: 'Institutional Concentration', score: 7, max: 10 },
      ]
    : [
        { label: 'Short Interest Ratio', score: 12, max: 30 },
        { label: 'Securities Lending Utilization', score: 11, max: 25 },
        { label: 'Short Position Trend', score: 7, max: 15 },
        { label: 'Borrow Rate Pressure', score: 4, max: 10 },
        { label: 'Volume Validation', score: 6, max: 10 },
        { label: 'Institutional Concentration', score: 5, max: 10 },
      ];

  const trend: ExecutiveTrendPoint[] = [
    { label: 'Mon', sentiment: 58, squeezeScore: 72 },
    { label: 'Tue', sentiment: 61, squeezeScore: 74 },
    { label: 'Wed', sentiment: 64, squeezeScore: 76 },
    { label: 'Thu', sentiment: 67, squeezeScore: 77 },
    { label: 'Fri', sentiment: 69, squeezeScore: 78 },
    { label: 'Sat', sentiment: 70, squeezeScore: 78 },
    { label: 'Sun', sentiment: 72, squeezeScore: 79 },
  ];

  return {
    title: 'Executive Squeeze Brief',
    date: new Date().toISOString().slice(0, 10),
    companyName,
    ticker,
    squeezeScore: isCurr ? 78 : 54,
    marketAverage: 58,
    rank: isCurr ? 37 : 1482,
    totalListedStocks: 4126,
    percentileLabel: isCurr ? 'Top 1% Most At-Risk / Highest Squeeze Potential' : 'Mid-pack / Monitor for catalysts',
    scoreBreakdown,
    squeezeRankingNote: isCurr
      ? 'Company Score 78/100 vs US Market Average 58/100; rank #37 out of 4,126 US listed stocks.'
      : 'Placeholder ranking shows where the company would sit inside the US market universe.',
    sentiment: {
      totalMentions: isCurr ? 12847 : 842,
      positive: isCurr ? 7965 : 412,
      negative: isCurr ? 2184 : 196,
      neutral: isCurr ? 2698 : 234,
      weekOverWeekPositiveChange: isCurr ? '+18%' : '+4%',
      correlationNote: isCurr ? 'Sentiment ↑ → Squeeze Score ↑ (Strong Positive Correlation)' : 'Sentiment and squeeze score move together mildly.',
      platforms: isCurr
        ? [
            { platform: 'X', posts: 5210, positive: 68, negative: 14, neutral: 18 },
            { platform: 'StockTwits', posts: 4872, positive: 61, negative: 19, neutral: 20 },
            { platform: 'Reddit', posts: 2765, positive: 53, negative: 22, neutral: 25 },
          ]
        : [
            { platform: 'X', posts: 210, positive: 54, negative: 18, neutral: 28 },
            { platform: 'StockTwits', posts: 310, positive: 51, negative: 20, neutral: 29 },
            { platform: 'Reddit', posts: 322, positive: 49, negative: 21, neutral: 30 },
          ],
    },
    positiveComments: isCurr
      ? [
          'Highest short squeeze setup in 2026',
          'Lending pool dry, borrow rate spiking',
          'Retail army accumulating, institutional shorts trapped',
          'Catalyst imminent — breakout above $X',
        ]
      : ['Positive commentary will appear here once social APIs are connected.'],
    negativeComments: isCurr
      ? [
          'Overhyped, low fundamentals',
          'Institutions will crush retail',
          'No real catalyst, just meme stock',
        ]
      : ['Negative commentary will appear here once social APIs are connected.'],
    triggerStages: [
      { stage: 'Stage 1', description: 'Score above 70 and borrow pressure continues to rise.' },
      { stage: 'Stage 2', description: 'Sentiment and volume confirm sustained momentum.' },
      { stage: 'Stage 3', description: 'Rank enters top 1% and lending supply remains tight.' },
    ],
    conclusion: isCurr
      ? 'Monitor as a high-squeeze-potential name; keep messaging simple: score, rank, sentiment, and trigger stages.'
      : 'Placeholder executive conclusion for non-CURR tickers.',
    trend,
    pendingApis: ['X / Twitter', 'StockTwits', 'Reddit', 'ORTEX', 'Fintel', 'WhaleWisdom'],
  };
}

export function getApiStatus() {
  return {
    ORTEX: 'Platform-managed',
    Fintel: 'Platform-managed',
    WhaleWisdom: 'Platform-managed',
    'Market Data': 'Platform-managed',
    'Email Provider': 'Not Configured',
    source_type: 'pending_api' as const,
    source_label: 'Provider status panel',
  };
}

export function buildEmailRecipients(tickerInput: string): EmailRecipient[] {
  const ticker = normalizeTicker(tickerInput);
  return [
    {
      id: `recipient-${ticker}-1`,
      company_id: `company-${ticker}`,
      email: 'ir@example.com',
      receive_8am: true,
      receive_1150am: true,
      receive_7pm: true,
      active: true,
      created_at: now(),
      ...source,
    },
  ];
}

export function buildApiKeys(): ApiKeyRecord[] {
  return [
    {
      id: 'api-1',
      provider: 'ORTEX',
      encrypted_api_key: '',
      active: false,
      created_at: now(),
      ...pending('ORTEX'),
    },
    {
      id: 'api-2',
      provider: 'Fintel',
      encrypted_api_key: '',
      active: false,
      created_at: now(),
      ...pending('Fintel'),
    },
    {
      id: 'api-3',
      provider: 'WhaleWisdom',
      encrypted_api_key: '',
      active: false,
      created_at: now(),
      ...pending('WhaleWisdom'),
    },
  ];
}

export function seedDatabase(): DatabaseShape {
  const company = buildCompany('CURR');
  return {
    companies: [company],
    market_snapshots: [buildMarketSnapshot('CURR')],
    short_interest_data: [buildShortInterestData('CURR')],
    institutional_holdings: buildInstitutionalHoldings('CURR'),
    options_data: [buildOptionsData('CURR')],
    news_items: buildNewsItems('CURR'),
    filings: buildFilings('CURR'),
    reports: buildReports('CURR'),
    email_recipients: buildEmailRecipients('CURR'),
    email_logs: [],
    api_keys: buildApiKeys(),
  };
}

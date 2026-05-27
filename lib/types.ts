export type SourceType = 'mock' | 'pending_api' | 'free_data' | 'fintel';

export type SourceMeta = {
  source_type: SourceType;
  source_label: string;
};

export type CompanyRecord = SourceMeta & {
  id: string;
  ticker: string;
  exchange: string;
  company_name: string;
  cik: string;
  sector: string;
  industry: string;
  created_at: string;
};

export type MarketSnapshot = SourceMeta & {
  id: string;
  company_id: string;
  ticker: string;
  price: number;
  change_percent: number;
  volume: number;
  relative_volume: number;
  market_cap: string;
  float: string;
  timestamp: string;
  last_close: number;
  pre_market_price: number;
  pre_market_volume: number;
  day_high: number;
  day_low: number;
  vwap: number;
  after_hours_price: number;
};

export type ShortInterestData = SourceMeta & {
  id: string;
  company_id: string;
  official_short_interest: string;
  short_percent_float: string;
  days_to_cover: string;
  finra_short_volume: string;
  finra_short_volume_ratio: string;
  sec_ftd: string;
  ortex_estimated_si: string;
  ortex_ctb: string;
  ortex_utilization: string;
  ortex_shares_on_loan: string;
  ortex_borrow_availability: string;
  ortex_live_trend: string;
  api_status: string;
};

export type InstitutionalHolding = SourceMeta & {
  id: string;
  company_id: string;
  fund_name: string;
  shares: string;
  market_value: string;
  change_type: 'new' | 'increased' | 'reduced' | 'exited' | 'unchanged';
  filing_date: string;
  source: string;
  ownership_percent?: string;
  shares_change?: string;
  shares_change_percent?: string;
  value_change?: string;
  value_change_percent?: string;
  form_type?: string;
  effective_date?: string;
  owner_url?: string;
  cost_basis?: string;
};

export type OptionsData = SourceMeta & {
  id: string;
  company_id: string;
  put_call_ratio: string;
  option_volume: string;
  open_interest: string;
  major_expirations: string;
  max_pain: string;
  gamma_exposure: string;
  dealer_gamma_flip: string;
  dealer_positioning: string;
  unusual_flow: string;
  api_status: string;
};

export type NewsItem = SourceMeta & {
  id: string;
  company_id: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  ai_summary: string;
  catalyst_type: string;
  importance_score: number;
};

export type FilingItem = SourceMeta & {
  id: string;
  company_id: string;
  form_type: string;
  filing_date: string;
  accession_number: string;
  url: string;
  ai_summary: string;
  importance_score: number;
};

export type ReportSection = {
  title: string;
  source_label: string;
  type: string;
  items: string[];
};

export type RiskItem = {
  label: string;
  level: 'good' | 'warn' | 'bad';
  score: number;
  explanation: string;
};

export type ReportRecord = SourceMeta & {
  id: string;
  ticker: string;
  company_name: string;
  report_type: '8AM' | '1150AM' | '7PM';
  report_time: string;
  report_date: string;
  title: string;
  generated_at: string;
  executive_summary: string[];
  market_snapshot: Record<string, string | number>;
  risk_dashboard: RiskItem[];
  sections: ReportSection[];
  ai_interpretation: string;
  suggested_actions: string[];
  pending_api_items: string[];
  source_notes: string[];
};

export type EmailRecipient = SourceMeta & {
  id: string;
  company_id: string;
  email: string;
  receive_8am: boolean;
  receive_1150am: boolean;
  receive_7pm: boolean;
  active: boolean;
  created_at: string;
};

export type EmailLog = SourceMeta & {
  id: string;
  report_id: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  error_message: string;
};

export type ApiKeyRecord = SourceMeta & {
  id: string;
  provider: string;
  encrypted_api_key: string;
  active: boolean;
  created_at: string;
};

export type DatabaseShape = {
  companies: CompanyRecord[];
  market_snapshots: MarketSnapshot[];
  short_interest_data: ShortInterestData[];
  institutional_holdings: InstitutionalHolding[];
  options_data: OptionsData[];
  news_items: NewsItem[];
  filings: FilingItem[];
  reports: ReportRecord[];
  email_recipients: EmailRecipient[];
  email_logs: EmailLog[];
  api_keys: ApiKeyRecord[];
};

export type ExecutiveScoreFactor = {
  label: string;
  score: number;
  max: number;
};

export type SentimentPlatformSnapshot = {
  platform: 'X' | 'StockTwits' | 'Reddit';
  posts: number;
  positive: number;
  negative: number;
  neutral: number;
};

export type ExecutiveTrendPoint = {
  label: string;
  sentiment: number;
  squeezeScore: number;
};

export type ExecutiveReport = {
  title: string;
  date: string;
  companyName: string;
  ticker: string;
  squeezeScore: number;
  marketAverage: number;
  rank: number;
  totalListedStocks: number;
  percentileLabel: string;
  scoreBreakdown: ExecutiveScoreFactor[];
  squeezeRankingNote: string;
  sentiment: {
    totalMentions: number;
    positive: number;
    negative: number;
    neutral: number;
    weekOverWeekPositiveChange: string;
    correlationNote: string;
    platforms: SentimentPlatformSnapshot[];
  };
  positiveComments: string[];
  negativeComments: string[];
  triggerStages: Array<{ stage: string; description: string }>;
  conclusion: string;
  trend: ExecutiveTrendPoint[];
  pendingApis: string[];
};

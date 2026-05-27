import { buildDashboard } from '@/lib/mock-data';

export const accountCompanies = ['CURR', 'NOVA', 'ATLAS'].map(ticker => {
  const bundle = buildDashboard(ticker);
  return {
    ticker: bundle.company.ticker,
    name: bundle.company.company_name,
    exchange: bundle.company.exchange,
    plan: ticker === 'CURR' ? 'Pro IR' : 'Starter',
    recipients: ticker === 'CURR' ? 6 : ticker === 'NOVA' ? 4 : 2,
    sendTime: ticker === 'CURR' ? '8AM / 11:50AM / 7PM' : ticker === 'NOVA' ? '8AM / 7PM' : '7PM only',
    status: ticker === 'ATLAS' ? 'Paused' : 'Active',
  };
});

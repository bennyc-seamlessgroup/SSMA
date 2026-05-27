import fs from 'fs';
import path from 'path';
import { getFintelStatusSummary } from '@/lib/fintel-provider';
import { seedDatabase } from '@/lib/mock-data';
import type { DatabaseShape, EmailRecipient, ReportRecord } from '@/lib/types';

const dbPath = process.env.LOCAL_DB_PATH
  ? path.resolve(process.cwd(), process.env.LOCAL_DB_PATH)
  : path.join(process.cwd(), 'data', 'local-db.json');

function ensureDatabaseFile() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(seedDatabase(), null, 2), 'utf8');
  }
}

export function readDB(): DatabaseShape {
  ensureDatabaseFile();
  const raw = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(raw) as DatabaseShape;
}

export function writeDB(db: DatabaseShape) {
  ensureDatabaseFile();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

export function getCompanyByTicker(tickerInput: string) {
  const ticker = tickerInput.trim().toUpperCase();
  const db = readDB();
  return db.companies.find(c => c.ticker === ticker) ?? null;
}

export function getDashboardBundle(tickerInput: string) {
  const ticker = tickerInput.trim().toUpperCase();
  const db = readDB();
  return {
    company: db.companies.find(c => c.ticker === ticker) ?? db.companies[0],
    marketSnapshot: db.market_snapshots.find(r => r.ticker === ticker) ?? db.market_snapshots[0],
    shortInterest: db.short_interest_data.find(r => r.company_id === `company-${ticker}`) ?? db.short_interest_data[0],
    institutionalHoldings: db.institutional_holdings.filter(r => r.company_id === `company-${ticker}`),
    optionsData: db.options_data.find(r => r.company_id === `company-${ticker}`) ?? db.options_data[0],
    newsItems: db.news_items.filter(r => r.company_id === `company-${ticker}`),
    filings: db.filings.filter(r => r.company_id === `company-${ticker}`),
    reports: db.reports.filter(r => r.ticker === ticker),
    emailRecipients: db.email_recipients.filter(r => r.company_id === `company-${ticker}`),
    apiStatus: {
      ORTEX: 'Platform-managed',
      Fintel: getFintelStatusSummary(),
      WhaleWisdom: 'Platform-managed',
      'Market Data': 'Platform-managed',
      'Email Provider': 'Not Configured',
      source_type: 'pending_api' as const,
      source_label: 'Provider status panel',
    },
  };
}

export function getReportsByTicker(tickerInput: string) {
  const ticker = tickerInput.trim().toUpperCase();
  const db = readDB();
  return db.reports.filter(r => r.ticker === ticker);
}

export function upsertReports(tickerInput: string, reports: ReportRecord[]) {
  const ticker = tickerInput.trim().toUpperCase();
  const db = readDB();
  db.reports = db.reports.filter(r => r.ticker !== ticker);
  db.reports.push(...reports);
  writeDB(db);
  return reports;
}

export function getRecipientsByTicker(tickerInput: string) {
  const ticker = tickerInput.trim().toUpperCase();
  const db = readDB();
  return db.email_recipients.filter(r => r.company_id === `company-${ticker}`);
}

export function addRecipient(recipient: EmailRecipient) {
  const db = readDB();
  db.email_recipients.push(recipient);
  writeDB(db);
  return recipient;
}

export function deleteRecipient(id: string) {
  const db = readDB();
  const removed = db.email_recipients.find(recipient => recipient.id === id) ?? null;
  db.email_recipients = db.email_recipients.filter(recipient => recipient.id !== id);
  writeDB(db);
  return removed;
}

export function listApiStatus() {
  return {
    ORTEX: 'Platform-managed',
    Fintel: getFintelStatusSummary(),
    WhaleWisdom: 'Platform-managed',
    'Market Data': 'Platform-managed',
    'Email Provider': 'Not Configured',
  };
}

import { readImportFile } from '@/lib/import-data';
import { SecFilingsList, type SecFilingRow } from './SecFilingsList';

export const dynamic = 'force-dynamic';

type RawSecFiling = {
  title?: unknown;
  formType?: unknown;
  url?: unknown;
  excerpt?: unknown;
  publishDate?: unknown;
  publishAt?: unknown;
  sourcePlatform?: unknown;
};

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeFiling(row: RawSecFiling): SecFilingRow {
  return {
    title: text(row.title),
    formType: text(row.formType),
    url: text(row.url),
    excerpt: text(row.excerpt),
    publishDate: text(row.publishDate),
    publishAt: text(row.publishAt),
    sourcePlatform: text(row.sourcePlatform),
  };
}

export default async function EventCalendarPage() {
  const envelope = await readImportFile<RawSecFiling[]>('news_filings/sec_filings.json');
  const filings = Array.isArray(envelope.data) ? envelope.data.map(normalizeFiling) : [];

  return (
    <div className="page catalysts-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">SEC Filings</h1>
          <p className="page__desc">
            All companies that sell securities in the United States must register with the Securities and Exchange Commission and file reports on a regular basis. This page shows recent SEC filings related to CURRENC Group Inc.
          </p>
        </div>
      </div>

      <SecFilingsList filings={filings} />
    </div>
  );
}

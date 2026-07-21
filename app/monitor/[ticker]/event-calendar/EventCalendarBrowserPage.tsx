'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImportDataTable } from '@/components/ImportDataTable';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import { SecFilingsList, type SecFilingRow } from './SecFilingsList';

type ApiSecFilingRecord = {
  id?: string;
  ticker?: string;
  companyName?: string;
  formType?: string;
  formDescription?: string;
  filingDate?: string;
  reportingDate?: string;
  act?: string;
  filmNumber?: string;
  fileNumber?: string;
  accessionNumber?: string;
  filingsUrl?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
};

const devColumns = [
  'formType',
  'formDescription',
  'filingDate',
  'reportingDate',
  'act',
  'filmNumber',
  'fileNumber',
  'accessionNumber',
  'filingsUrl',
  'createdAt',
  'createdBy',
];

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function recordsFromPayload(payload: unknown): ApiSecFilingRecord[] {
  if (Array.isArray(payload)) return payload as ApiSecFilingRecord[];
  const envelope = payload as { records?: unknown; data?: { records?: unknown } };
  if (Array.isArray(envelope.records)) return envelope.records as ApiSecFilingRecord[];
  if (Array.isArray(envelope.data)) return envelope.data as ApiSecFilingRecord[];
  if (Array.isArray(envelope.data?.records)) return envelope.data.records as ApiSecFilingRecord[];
  return [];
}

function normalizeFiling(row: ApiSecFilingRecord): SecFilingRow {
  return {
    title: text(row.formDescription),
    formType: text(row.formType),
    url: text(row.filingsUrl),
    excerpt: [
      row.formDescription,
      row.reportingDate ? `Reporting date: ${row.reportingDate}` : '',
      row.act ? `Act: ${row.act}` : '',
      row.filmNumber ? `Film number: ${row.filmNumber}` : '',
      row.fileNumber ? `File number: ${row.fileNumber}` : '',
      row.accessionNumber ? `Accession: ${row.accessionNumber}` : '',
    ].filter(Boolean).join(' · '),
    publishDate: text(row.filingDate),
    publishAt: text(row.createdAt),
    sourcePlatform: 'SEC Filings API',
  };
}

function tableValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
}

export function EventCalendarBrowserPage({ ticker }: { ticker: string }) {
  const [records, setRecords] = useState<ApiSecFilingRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    cachedAuthenticatedFetch(`/manual-input/sec-filings?ticker=${encodeURIComponent(ticker)}`)
      .then(payload => {
        if (cancelled) return;
        setRecords(recordsFromPayload(payload));
        setStatus('idle');
      })
      .catch(nextError => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : 'Unable to load SEC filings from API.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const filings = useMemo(() => records.map(normalizeFiling), [records]);
  const devRows = useMemo(() => records.map(record =>
    Object.fromEntries(devColumns.map(column => [column, tableValue(record[column as keyof ApiSecFilingRecord])])),
  ), [records]);

  if (status === 'loading') return <PortalPageLoading variant="secFilings" />;

  return (
    <div className="page catalysts-page">
      <ApiSourceTags sources={[{ endpoint: 'GET /manual-input/sec-filings', label: 'Filing records' }]} />
      {status === 'error' ? <section className="panel"><h2>SEC filings unavailable</h2><p>{error}</p></section> : <SecFilingsList filings={filings} />}
      <PageDisclaimerNotice noticeKey="insider" disclaimerKey="regulatoryFiling" />

      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head">
          <div>
            <span>Development Data</span>
            <h2>SEC Filings API Table</h2>
            <p className="section-subtitle">Records loaded from /manual-input/sec-filings. No local JSON fallback is used.</p>
            <span className="import-file-tag">GET /manual-input/sec-filings?ticker={ticker}</span>
          </div>
        </div>
        <ImportDataTable columns={devColumns} rows={devRows} pageSize={25} />
      </section>
    </div>
  );
}

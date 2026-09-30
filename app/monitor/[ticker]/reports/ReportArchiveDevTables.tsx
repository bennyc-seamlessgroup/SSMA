'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';
import { cachedAuthenticatedFetch, invalidateAuthenticatedFetchCache } from '@/lib/auth-client';
import type { ReportArchiveRecord } from '@/lib/report-archive';
import { reportSentimentDiagnostics } from './daily-report-data';

type SourceResult = {
  data: unknown;
  error: string;
  loading: boolean;
};

const emptySource: SourceResult = { data: null, error: '', loading: false };

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length.toLocaleString()} records`;
  return String(value);
}

function flattenedRows(value: unknown, prefix = ''): Array<{ field: string; value: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => flattenedRows(entry, prefix ? `${prefix}[${index}]` : `[${index}]`));
  }
  if (!value || typeof value !== 'object') {
    return prefix ? [{ field: prefix, value: formatValue(value) }] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (nestedValue && typeof nestedValue === 'object') return flattenedRows(nestedValue, field);
    return [{ field, value: formatValue(nestedValue) }];
  });
}

function sourceStatus(source: SourceResult) {
  if (source.loading) return 'loading';
  if (source.error) return `error: ${source.error}`;
  return source.data === null ? 'not loaded' : 'ready';
}

function sourceCount(source: SourceResult) {
  return flattenedRows(source.data).length;
}

function useDevModeEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setEnabled(root.dataset.devMode === 'true');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-dev-mode'] });
    return () => observer.disconnect();
  }, []);

  return enabled;
}

async function readSource(path: string): Promise<SourceResult> {
  try {
    return { data: await cachedAuthenticatedFetch(path), error: '', loading: false };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unable to load API data.',
      loading: false,
    };
  }
}

const apiMapRows = [
  {
    api: 'GET /market-data/reports?ticker={ticker}&limit=100&page=1',
    purpose: 'Report Archive availability',
    reportData: 'Available report dates and pagination. This response does not supply report-page content.',
  },
  {
    api: 'GET /market-data/reports?ticker={ticker}&date={date}',
    purpose: 'Primary dated report payload',
    reportData: 'Trading snapshot, closing KPIs, short-interest score, seven-day charts, SEC filings, and dated sentiment when supplied.',
  },
  {
    api: 'GET /market-data/ai-report?ticker={ticker}&date={date}',
    purpose: 'Short-interest AI Analysis',
    reportData: 'short_interest_current_interpretation. A missing response produces the report unavailable message.',
  },
  {
    api: 'GET /market-data/history?ticker={ticker}&category=rule-engine-short-score',
    purpose: 'Calculated Short Score history',
    reportData: 'Latest calculated finalScore on or before the selected report date, plus the previous available score for comparison.',
  },
  {
    api: 'GET /market-data/current?ticker={ticker}&category=rule-engine-short-score',
    purpose: 'Latest calculated Short Score candidate',
    reportData: 'Used only when its snapshotDate is on or before the selected report date. It is never copied into an older report.',
  },
];

export function ReportArchiveDevTables({
  ticker,
  reports,
}: {
  ticker: string;
  reports: ReportArchiveRecord[];
}) {
  const devModeEnabled = useDevModeEnabled();
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.reportDate.localeCompare(a.reportDate)),
    [reports],
  );
  const [selectedDate, setSelectedDate] = useState(sortedReports[0]?.reportDate ?? '');
  const [indexSource, setIndexSource] = useState<SourceResult>(emptySource);
  const [reportSource, setReportSource] = useState<SourceResult>(emptySource);
  const [aiSource, setAiSource] = useState<SourceResult>(emptySource);
  const [scoreHistorySource, setScoreHistorySource] = useState<SourceResult>(emptySource);
  const [scoreCurrentSource, setScoreCurrentSource] = useState<SourceResult>(emptySource);

  useEffect(() => {
    if (!sortedReports.some(report => report.reportDate === selectedDate)) {
      setSelectedDate(sortedReports[0]?.reportDate ?? '');
    }
  }, [selectedDate, sortedReports]);

  useEffect(() => {
    if (!devModeEnabled || !selectedDate) return;
    let active = true;
    const encodedTicker = encodeURIComponent(ticker);
    const encodedDate = encodeURIComponent(selectedDate);
    const indexPath = `/market-data/reports?ticker=${encodedTicker}&limit=100&page=1`;
    const reportPath = `/market-data/reports?ticker=${encodedTicker}&date=${encodedDate}`;
    const aiPath = `/market-data/ai-report?ticker=${encodedTicker}&date=${encodedDate}`;
    const scoreHistoryPath = `/market-data/history?ticker=${encodedTicker}&category=rule-engine-short-score`;
    const scoreCurrentPath = `/market-data/current?ticker=${encodedTicker}&category=rule-engine-short-score`;

    // A dated report may be regenerated without changing its URL. The
    // diagnostics must inspect the latest archived payload when the operator
    // changes dates rather than a previously cached response.
    invalidateAuthenticatedFetchCache(reportPath);

    setIndexSource({ data: null, error: '', loading: true });
    setReportSource({ data: null, error: '', loading: true });
    setAiSource({ data: null, error: '', loading: true });
    setScoreHistorySource({ data: null, error: '', loading: true });
    setScoreCurrentSource({ data: null, error: '', loading: true });

    void Promise.all([
      readSource(indexPath),
      readSource(reportPath),
      readSource(aiPath),
      readSource(scoreHistoryPath),
      readSource(scoreCurrentPath),
    ]).then(([index, report, ai, scoreHistory, scoreCurrent]) => {
      if (!active) return;
      setIndexSource(index);
      setReportSource(report);
      setAiSource(ai);
      setScoreHistorySource(scoreHistory);
      setScoreCurrentSource(scoreCurrent);
    });

    return () => {
      active = false;
    };
  }, [devModeEnabled, selectedDate, ticker]);

  const encodedTicker = encodeURIComponent(ticker);
  const encodedDate = encodeURIComponent(selectedDate);
  const sentimentMappingRows = useMemo(
    () => reportSentimentDiagnostics(reportSource.data),
    [reportSource.data],
  );
  const tabs = [
    {
      id: 'api-map',
      title: 'Report API Map',
      file: 'Frontend report composition',
      sourcePlatform: 'Report Archive',
      recordCount: apiMapRows.length,
      status: 'ready',
    },
    {
      id: 'report-index',
      title: 'Report Index',
      file: `GET /market-data/reports?ticker=${encodedTicker}&limit=100&page=1`,
      sourcePlatform: 'API Gateway',
      recordCount: sourceCount(indexSource),
      status: sourceStatus(indexSource),
    },
    {
      id: 'dated-report',
      title: 'Dated Report',
      file: `GET /market-data/reports?ticker=${encodedTicker}&date=${encodedDate}`,
      sourcePlatform: 'API Gateway · Primary report payload',
      recordCount: sourceCount(reportSource),
      status: sourceStatus(reportSource),
    },
    {
      id: 'sentiment-mapping',
      title: 'Sentiment Mapping',
      file: `Normalized from GET /market-data/reports?ticker=${encodedTicker}&date=${encodedDate}`,
      sourcePlatform: 'Report Archive · Dated sentiment candidates',
      recordCount: sentimentMappingRows.length,
      status: reportSource.loading
        ? 'loading'
        : reportSource.error
          ? `error: ${reportSource.error}`
          : sentimentMappingRows.length
            ? 'ready'
            : 'no sentiment candidates found',
    },
    {
      id: 'ai-report',
      title: 'AI Analysis',
      file: `GET /market-data/ai-report?ticker=${encodedTicker}&date=${encodedDate}`,
      sourcePlatform: 'API Gateway · Authenticated user/ticker fallback',
      recordCount: sourceCount(aiSource),
      status: sourceStatus(aiSource),
    },
    {
      id: 'calculated-score-history',
      title: 'Calculated Score History',
      file: `GET /market-data/history?ticker=${encodedTicker}&category=rule-engine-short-score`,
      sourcePlatform: 'API Gateway · Report-date score source',
      recordCount: sourceCount(scoreHistorySource),
      status: sourceStatus(scoreHistorySource),
    },
    {
      id: 'calculated-score-current',
      title: 'Calculated Score Current',
      file: `GET /market-data/current?ticker=${encodedTicker}&category=rule-engine-short-score`,
      sourcePlatform: 'API Gateway · Date-guarded latest candidate',
      recordCount: sourceCount(scoreCurrentSource),
      status: sourceStatus(scoreCurrentSource),
    },
  ];

  return (
    <section className="terminal-section import-data-dev-panel report-archive-dev-panel">
      <div className="terminal-section__head report-archive-dev-panel__head">
        <div>
          <span>Development Data</span>
          <h2>Report Archive API Data</h2>
          <p className="section-subtitle">Each tab shows one uncombined API response used by the archive or report renderer.</p>
        </div>
        <label className="report-archive-dev-panel__date">
          <span>Inspect report date</span>
          <select value={selectedDate} onChange={event => setSelectedDate(event.target.value)}>
            {sortedReports.map(report => (
              <option key={report.id} value={report.reportDate}>{report.reportDate}</option>
            ))}
          </select>
        </label>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ImportDataTable columns={['api', 'purpose', 'reportData']} rows={apiMapRows} pageSize={10} />
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(indexSource.data)} pageSize={25} />
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(reportSource.data)} pageSize={25} />
        <ImportDataTable
          columns={[
            'selectedFor',
            'path',
            'explicit7D',
            'usableForReport',
            'window',
            'windowStart',
            'windowEnd',
            'directMentions',
            'timelineMentions',
            'score',
            'distribution',
            'platformRows',
            'platformMentions',
          ]}
          rows={sentimentMappingRows}
          pageSize={25}
          expandableColumns={['path']}
        />
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(aiSource.data)} pageSize={25} expandableColumns={['value']} />
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(scoreHistorySource.data)} pageSize={25} expandableColumns={['value']} />
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(scoreCurrentSource.data)} pageSize={25} expandableColumns={['value']} />
      </ImportDataTabs>
    </section>
  );
}

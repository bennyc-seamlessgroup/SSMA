export type ReportArchiveRecord = {
  id: string;
  ticker: string;
  reportType: '8AM' | '1150AM' | '7PM';
  reportTime: string;
  reportDate: string;
  title: string;
  generatedAt: string;
  dataKey: string;
  dataUrl: string;
  sizeBytes: number;
};

const reportBucketBase = 'https://data-sync-platform-website-data.s3.us-east-1.amazonaws.com';
const reportListUrl = 'https://data-sync-platform-website-data.s3.amazonaws.com/?list-type=2&prefix=report_data/';

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1]) : '';
}

function formatReportTitle(ticker: string, reportDate: string) {
  return `${ticker} Post-Market Report - ${reportDate}`;
}

export function reportDataUrl(ticker: string, reportDate: string) {
  const normalizedTicker = ticker.toUpperCase();
  return `${reportBucketBase}/report_data/${encodeURIComponent(reportDate)}/${encodeURIComponent(normalizedTicker)}_report_data.json`;
}

export async function listReportArchive(ticker: string): Promise<ReportArchiveRecord[]> {
  const normalizedTicker = ticker.toUpperCase();
  const response = await fetch(reportListUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to list report archive from S3: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const contents = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? [];

  return contents
    .map((item): ReportArchiveRecord | null => {
      const key = tagValue(item, 'Key');
      const lastModified = tagValue(item, 'LastModified');
      const size = Number(tagValue(item, 'Size')) || 0;
      const match = key.match(/^report_data\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]+)_report_data\.json$/);
      if (!match) return null;
      const [, reportDate, fileTicker] = match;
      if (fileTicker.toUpperCase() !== normalizedTicker) return null;

      return {
        id: `${normalizedTicker}-${reportDate}-7PM`,
        ticker: normalizedTicker,
        reportType: '7PM' as const,
        reportTime: '7:00 PM',
        reportDate,
        title: formatReportTitle(normalizedTicker, reportDate),
        generatedAt: lastModified || `${reportDate}T19:00:00Z`,
        dataKey: key,
        dataUrl: `${reportBucketBase}/${key.split('/').map(encodeURIComponent).join('/')}`,
        sizeBytes: size,
      };
    })
    .filter((item): item is ReportArchiveRecord => item !== null)
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
}

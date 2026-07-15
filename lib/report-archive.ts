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

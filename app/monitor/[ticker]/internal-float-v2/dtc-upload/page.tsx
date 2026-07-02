import { normalizeTicker } from '@/lib/ticker-data';
import { DtcReportUploadClient } from './DtcReportUploadClient';

export default async function DtcReportUploadPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page internal-float-page internal-float-v2-page dtc-upload-page">
      <div className="compact-page-header">
        <span>DTC Report Processing</span>
        <p>Upload an authorized position report for managed custody normalization.</p>
      </div>
      <DtcReportUploadClient ticker={normalizedTicker} />
    </div>
  );
}

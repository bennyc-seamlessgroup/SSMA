import { normalizeTicker } from '@/lib/ticker-data';
import { DtcReportUploadClient } from './DtcReportUploadClient';

export default async function DtcReportUploadPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page internal-float-page dtc-upload-page">
      <DtcReportUploadClient ticker={normalizedTicker} />
    </div>
  );
}

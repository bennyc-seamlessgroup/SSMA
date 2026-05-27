import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function ShortInterestPage() {
  return (
    <ImportDataPreviewPage
      title="Short Interest"
      description="Short interest, borrow fee, shares available, short volume, and squeeze risk from the standardized import data pool."
      files={[
        'short/short_interest.json',
        'short/borrow_fee.json',
        'short/shares_available.json',
        'short/short_volume.json',
        'short/short_score.json',
      ]}
    />
  );
}

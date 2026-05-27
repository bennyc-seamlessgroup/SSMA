import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function OptionsPage() {
  return (
    <ImportDataPreviewPage
      title="Options / Gamma"
      description="Options summary, put/call ratios, open interest, gamma exposure, and expiration wall records from import_data."
      files={[
        'options/options_summary.json',
        'options/put_call_ratio.json',
        'options/open_interest.json',
        'options/gamma_exposure.json',
        'options/expiration_wall.json',
      ]}
    />
  );
}

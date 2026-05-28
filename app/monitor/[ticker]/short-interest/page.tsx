import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function ShortInterestPage() {
  return (
    <ImportDataPreviewPage
      title="Short Interest Intelligence"
      description="Short interest, borrow fee, shares available, short volume, and squeeze risk from the standardized import data pool."
      files={[
        'short/short_interest.json',
        'short/borrow_fee.json',
        'short/shares_available.json',
        'short/short_volume.json',
        'short/short_score.json',
      ]}
    >
      <div className="research-module-grid">
        <div className="research-hero-card"><span>Research Focus</span><strong>Short-side positioning</strong><p>Detailed short interest history, public short-volume inputs, and imported squeeze-risk fields remain available below for analyst review.</p></div>
        <div className="research-mini-card"><span>Primary Question</span><strong>Is short exposure rising?</strong><small>Use the tables below to validate current positioning and history.</small></div>
      </div>
    </ImportDataPreviewPage>
  );
}

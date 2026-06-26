import { OperationsShell } from '../OperationsShell';
import { NarrativeSocialUploadClient } from './NarrativeSocialUploadClient';

export default function OperationsNarrativeSocialPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Narrative Intelligence</span>
          <h1>Narrative Social Upload</h1>
          <p>Upload the latest X, Reddit, and Stocktwits CSV exports. Each upload replaces the local JSON set used by the Narrative page.</p>
        </div>
      </div>

      <NarrativeSocialUploadClient />
    </OperationsShell>
  );
}

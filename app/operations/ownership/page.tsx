import { OperationsShell } from '../OperationsShell';

export default function OperationsOwnershipPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Ownership</span>
          <h1>Ownership Data Operations</h1>
          <p>This workspace is reserved for ownership data tools. We can add the next workflow here after the SEC filing entry flow is confirmed.</p>
        </div>
      </div>

      <section className="ops-panel ops-empty-panel">
        <h2>Coming next</h2>
        <p>Placeholder for institutional ownership, insider ownership, or manual float data operations.</p>
      </section>
    </OperationsShell>
  );
}

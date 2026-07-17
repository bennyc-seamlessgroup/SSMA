import { sampleTraditionalCustodyRows } from '@/lib/internal-float-demo';

export function TraditionalCustodyOperationsClient() {
  const totalShares = sampleTraditionalCustodyRows.reduce((sum, row) => sum + row.shares, 0);

  return (
    <section className="ops-panel ops-wide-panel ops-custody-input-panel">
      <div className="ops-panel-head">
        <div>
          <div className="ops-custody-input-heading">
            <h2>Traditional Custody Breakdown</h2>
            <span>Pending for implementation</span>
          </div>
          <p>Planned Operations workspace for maintaining broker and custodian positions shown on the Internal Float page.</p>
        </div>
        <span className="ops-record-count">Sample preview · {totalShares.toLocaleString('en-US')} shares</span>
      </div>

      <div className="ops-custody-pending-note" role="note">
        <strong>UI preview only</strong>
        <span>Backend storage and publishing are not connected yet. The rows below are sample data and cannot be edited.</span>
      </div>

      <div className="ops-table-wrap">
        <table className="ops-table ops-custody-input-table">
          <thead>
            <tr><th>Broker / Custodian</th><th>Shares</th><th>Action</th></tr>
          </thead>
          <tbody>
            {sampleTraditionalCustodyRows.map(row => (
              <tr key={row.id}>
                <td><input value={row.name} aria-label="Sample broker or custodian name" disabled readOnly /></td>
                <td><input value={row.shares.toLocaleString('en-US')} aria-label={`Sample shares held by ${row.name}`} disabled readOnly /></td>
                <td><button className="ops-danger-button" type="button" disabled>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ops-custody-input-actions">
        <button type="button" disabled>Add Custodian</button>
        <button className="ops-primary-button" type="button" disabled>Publish Custody Data</button>
      </div>
    </section>
  );
}

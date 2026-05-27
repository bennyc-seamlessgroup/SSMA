import { PendingApiBadge } from '@/components/PendingApiBadge';

function badgeClass(value: string) {
  if (value === 'Available') return 'badge good';
  if (value === 'Error') return 'badge bad';
  if (value === 'Configured') return 'badge blue';
  return 'badge pending';
}

export function ApiStatusPanel({ status }: { status: Record<string, string> }) {
  return (
    <div className="grid cols-2">
      {Object.entries(status).filter(([key]) => key !== 'source_type' && key !== 'source_label').map(([key, value]) => (
        <div key={key} className="section">
          <div className="section__head">
            <h3 className="section__title">{key}</h3>
            {value.includes('Pending') ? <PendingApiBadge label={value} /> : <span className={badgeClass(value)}>{value}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

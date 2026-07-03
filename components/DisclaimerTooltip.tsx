import { disclaimerCopy, type DisclaimerKey } from '@/lib/legal/disclaimers';

export function DisclaimerTooltip({
  disclaimerKey,
  label = 'View disclaimer',
}: {
  disclaimerKey: DisclaimerKey;
  label?: string;
}) {
  return (
    <span className="disclaimer-tooltip">
      <button type="button" aria-label={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      </button>
      <span role="tooltip">{disclaimerCopy[disclaimerKey]}</span>
    </span>
  );
}

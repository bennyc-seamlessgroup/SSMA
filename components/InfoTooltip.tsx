export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={text}>
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 8.6v5.1" />
        <path d="M10 6.1h.01" />
      </svg>
      <span className="info-tooltip__bubble">{text}</span>
    </span>
  );
}

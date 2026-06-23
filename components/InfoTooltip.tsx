export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={text}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 17v-6" />
        <path d="M12 7h.01" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <span className="info-tooltip__bubble">{text}</span>
    </span>
  );
}

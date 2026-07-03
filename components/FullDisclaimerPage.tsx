import {
  disclaimerCopy,
  finalDisclaimerAcknowledgement,
  fullDisclaimerSections,
} from '@/lib/legal/disclaimers';

export function FullDisclaimerPage() {
  return (
    <div className="legal-page">
      <header className="legal-page__header">
        <span>Legal & Compliance</span>
        <h1>Disclaimers</h1>
        <p>Important information about market data, AI-assisted analysis, proprietary scores, alerts, and reports.</p>
      </header>

      <div className="legal-disclaimer-list">
        {fullDisclaimerSections.map((section, index) => (
          <details className="legal-disclaimer-card" open={index === 0} key={section.id}>
            <summary>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{section.title}</strong>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
            </summary>
            <p>{disclaimerCopy[section.disclaimerKey]}</p>
          </details>
        ))}
      </div>

      <aside className="legal-acknowledgement">{finalDisclaimerAcknowledgement}</aside>
    </div>
  );
}

import { PortalTimeZoneSelect } from '@/components/PortalTimeZoneSelect';

const languageOptions = [
  ['English', 'Active'],
  ['Traditional Chinese', 'Coming soon'],
  ['Simplified Chinese', 'Coming soon'],
];

export default function SettingsPage() {
  return (
    <div className="page settings-page settings-general-page">
      <div className="settings-general-grid">
        <section className="settings-panel" id="language-preferences">
          <div className="settings-panel__head">
            <div>
              <span>Display</span>
              <h2>Language</h2>
            </div>
            <span className="badge blue">English</span>
          </div>
          <div className="language-switch">
            {languageOptions.map(([label, status]) => (
              <button className={status === 'Active' ? 'active' : ''} type="button" key={label}>
                <strong>{label}</strong>
                <span>{status}</span>
              </button>
            ))}
          </div>
          <p className="settings-note">Additional portal languages will become available after translation review.</p>
        </section>

        <section className="settings-panel" id="date-time-preferences">
          <div className="settings-panel__head">
            <div>
              <span>Display</span>
              <h2>Date &amp; Time</h2>
            </div>
            <span className="badge blue">Active</span>
          </div>
          <PortalTimeZoneSelect />
          <p className="settings-note">Controls timestamps, report dates, update times, and timeline labels in this browser.</p>
        </section>
      </div>
    </div>
  );
}

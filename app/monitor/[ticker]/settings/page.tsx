import { PortalTimeZoneSelect } from '@/components/PortalTimeZoneSelect';

const languageOptions = [
  ['en', 'English'],
  ['zh-Hant', 'Traditional Chinese'],
  ['zh-Hans', 'Simplified Chinese'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
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
          </div>
          <div className="settings-control-card">
            <label className="settings-select-control">
              <span>Portal language</span>
              <select defaultValue="en">
                {languageOptions.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
            <p>Controls navigation, dashboard labels, settings pages, and report interface text.</p>
          </div>
        </section>

        <section className="settings-panel" id="date-time-preferences">
          <div className="settings-panel__head">
            <div>
              <span>Display</span>
              <h2>Date &amp; Time</h2>
            </div>
          </div>
          <div className="settings-control-card">
            <PortalTimeZoneSelect />
            <p>Controls timestamps, report dates, update times, report archive dates, and timeline labels in this browser.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

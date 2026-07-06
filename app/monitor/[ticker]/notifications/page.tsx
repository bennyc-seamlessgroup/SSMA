import { SettingsBackLink } from '@/components/SettingsBackLink';
import { NotificationHotkeysClient } from './NotificationHotkeysClient';

export default async function NotificationsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker.trim().toUpperCase();

  return (
    <div className="page settings-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Notifications</h1>
          <p className="page__desc">View the KWatch notification hotkeys mapped to the {normalizedTicker} workspace.</p>
        </div>
        <SettingsBackLink ticker={normalizedTicker} />
      </div>

      <NotificationHotkeysClient ticker={normalizedTicker} />
    </div>
  );
}

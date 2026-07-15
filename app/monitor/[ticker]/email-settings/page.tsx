import { SettingsBackLink } from '@/components/SettingsBackLink';
import { normalizeTicker } from '@/lib/ticker-data';

export default async function DeliverySettingsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  return (
    <div className="page settings-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Delivery Settings</h1>
          <p className="page__desc">Report delivery settings for the {normalizedTicker} workspace.</p>
        </div>
        <SettingsBackLink ticker={normalizedTicker} />
      </div>
      <section className="panel">
        <h2 className="panel__title">Delivery API required</h2>
        <p className="page__desc">Recipient and schedule controls are unavailable until a centralized delivery-settings API is connected. No local recipient data is used.</p>
      </section>
    </div>
  );
}

export default async function DeliverySettingsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  await params;
  return (
    <div className="page settings-page">
      <section className="panel">
        <h2 className="panel__title">Delivery API required</h2>
        <p className="page__desc">Recipient and schedule controls are unavailable until a centralized delivery-settings API is connected. No local recipient data is used.</p>
      </section>
    </div>
  );
}

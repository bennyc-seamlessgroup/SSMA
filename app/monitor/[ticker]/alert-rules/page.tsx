import { normalizeTicker } from '@/lib/ticker-data';
import { CustomAlertSettingsClient } from '../settings/alerts/CustomAlertSettingsClient';

export default async function AlertRulesPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <CustomAlertSettingsClient ticker={normalizeTicker(ticker)} />;
}

import { normalizeTicker } from '@/lib/ticker-data';
import { GeneralSettingsClient } from './GeneralSettingsClient';

export default async function SettingsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <GeneralSettingsClient ticker={normalizeTicker(ticker)} />;
}

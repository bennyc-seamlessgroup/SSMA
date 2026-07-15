import { normalizeTicker } from '@/lib/ticker-data';
import { EventCalendarBrowserPage } from './EventCalendarBrowserPage';

export const dynamic = 'force-dynamic';

export default async function EventCalendarPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  return <EventCalendarBrowserPage ticker={normalizedTicker} />;
}

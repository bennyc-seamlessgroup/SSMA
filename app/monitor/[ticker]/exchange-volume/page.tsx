import { ExchangeVolumeBrowserPage } from './ExchangeVolumeBrowserPage';

export default async function ExchangeVolumePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <ExchangeVolumeBrowserPage ticker={ticker} />;
}

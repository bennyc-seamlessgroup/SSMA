import { SentimentBrowserPage } from './SentimentBrowserPage';

export default async function SentimentPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <SentimentBrowserPage ticker={ticker} />;
}

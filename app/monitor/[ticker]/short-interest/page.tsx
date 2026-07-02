import { ShortInterestBrowserPage } from './ShortInterestBrowserPage';

export default async function ShortInterestPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <ShortInterestBrowserPage ticker={ticker} />;
}

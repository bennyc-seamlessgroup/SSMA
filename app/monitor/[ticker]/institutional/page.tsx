import { InstitutionalBrowserPage } from './InstitutionalBrowserPage';

export default async function InstitutionalPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <InstitutionalBrowserPage ticker={ticker} />;
}

import { LendingPressureBrowserPage } from './LendingPressureBrowserPage';

export default async function LendingPressurePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  return <LendingPressureBrowserPage ticker={ticker} />;
}

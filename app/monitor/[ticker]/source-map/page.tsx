import { redirect } from 'next/navigation';

export default async function SourceMapPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${ticker}/import-data`);
}

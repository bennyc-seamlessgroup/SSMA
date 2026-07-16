import { redirect } from 'next/navigation';

export default async function DtcUploadCompatibilityPage({
  params,
}: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${encodeURIComponent(ticker)}/internal-float/dtc-upload`);
}

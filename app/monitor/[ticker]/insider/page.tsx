import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function InsiderActivityPage() {
  return (
    <ImportDataPreviewPage
      title="Insider Activity"
      description="Insider transactions, Form 3/4/5 activity, option exercises, and net insider activity from the import data pool."
      files={['insider/insider_transactions.json', 'insider/net_insider_activity.json']}
    />
  );
}

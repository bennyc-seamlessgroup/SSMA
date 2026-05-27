import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';

export default function PeerComparisonPage() {
  return (
    <ImportDataPreviewPage
      title="Peer Comparison"
      description="Peer companies, market performance, valuation placeholders, and comparative intelligence."
      files={['peer_analysis/peers.json', 'peer_analysis/peer_comparison.json']}
    />
  );
}

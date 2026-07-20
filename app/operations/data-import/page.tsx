import { OperationsShell } from '../OperationsShell';
import { ManualDataImportClient } from './ManualDataImportClient';

export default function OperationsDataImportPage() {
  return (
    <OperationsShell>
      <ManualDataImportClient />
    </OperationsShell>
  );
}

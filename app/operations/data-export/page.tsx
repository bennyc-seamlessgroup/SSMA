import { OperationsShell } from '../OperationsShell';
import { DataExportClient } from './DataExportClient';

export default function OperationsDataExportPage() {
  return (
    <OperationsShell>
      <DataExportClient />
    </OperationsShell>
  );
}

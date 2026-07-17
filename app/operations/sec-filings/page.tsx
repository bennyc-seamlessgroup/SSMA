import { OperationsShell } from '../OperationsShell';
import { SecFilingsOperationsClient } from './SecFilingsOperationsClient';

export default function OperationsSecFilingsPage() {
  return (
    <OperationsShell>
      <SecFilingsOperationsClient />
    </OperationsShell>
  );
}

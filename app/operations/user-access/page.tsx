import { OperationsShell } from '../OperationsShell';
import { UserAccessOperationsClient } from './UserAccessOperationsClient';

export default function OperationsUserAccessPage() {
  return (
    <OperationsShell>
      <UserAccessOperationsClient />
    </OperationsShell>
  );
}

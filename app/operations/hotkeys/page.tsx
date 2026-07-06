import { OperationsShell } from '../OperationsShell';
import { HotkeyWorkspace } from './HotkeyWorkspace';

export default function OperationsHotkeysPage() {
  return (
    <OperationsShell>
      <div className="ops-page-header">
        <div>
          <span className="ops-eyebrow">Notification Operations</span>
          <h1>Notification Hotkeys</h1>
          <p>Create, review, and remove KWatch notification mappings by company ticker.</p>
        </div>
      </div>
      <HotkeyWorkspace />
    </OperationsShell>
  );
}

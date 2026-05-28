import Link from 'next/link';

export function SettingsBackLink({ ticker }: { ticker: string }) {
  return (
    <Link className="settings-back-link" href={`/monitor/${ticker}/settings` as any}>
      <span aria-hidden="true">←</span>
      Back to Settings
    </Link>
  );
}

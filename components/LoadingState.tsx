export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <div className="panel"><div className="pill">{label}</div></div>;
}

export type ApiSourceDescriptor = {
  endpoint: string;
  label?: string;
};

export function ApiSourceTags({ sources }: { sources: ApiSourceDescriptor[] }) {
  if (!sources.length) return null;

  return (
    <div className="api-source-tags dev-source-inline" aria-label="Development API sources">
      {sources.map(source => (
        <span className="source-chip ready api-source-tag" key={`${source.endpoint}-${source.label ?? ''}`}>
          <code>{source.endpoint}</code>
          {source.label ? <em>{source.label}</em> : null}
        </span>
      ))}
    </div>
  );
}

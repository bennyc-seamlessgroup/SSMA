export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="panel"><div className="badge pending">Placeholder</div><h3 className="panel__title" style={{ marginTop: 10 }}>{title}</h3><p className="page__desc" style={{ margin: 0 }}>{description}</p></div>;
}

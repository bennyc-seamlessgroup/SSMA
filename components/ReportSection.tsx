import type { ReactNode } from 'react';
export function ReportSection({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) { return <section className="section"><div className="section__head"><h3 className="section__title">{title}</h3>{right}</div>{children}</section>; }

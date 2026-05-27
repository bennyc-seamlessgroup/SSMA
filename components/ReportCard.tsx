import type { ReportRecord } from '@/lib/types';
import { SourceBadge } from '@/components/SourceBadge';
export function ReportCard({ report }: { report: ReportRecord }) { return <div className="section"><div className="section__head"><div><h3 className="section__title">{report.title}</h3><div className="page__desc" style={{ margin: '6px 0 0' }}>{report.generated_at}</div></div><SourceBadge label={report.source_label} /></div><p className="page__desc" style={{ margin: 0 }}>{report.ai_interpretation}</p></div>; }

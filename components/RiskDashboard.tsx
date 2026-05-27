import { RiskBadge } from '@/components/RiskBadge';
import type { RiskItem } from '@/lib/types';
export function RiskDashboard({ risks }: { risks: RiskItem[] }) { return <div className="grid cols-2">{risks.map(r => <div key={r.label} className="panel"><div style={{ display:'flex', justifyContent:'space-between', gap: 8, alignItems:'center' }}><h3 className="panel__title" style={{ margin: 0 }}>{r.label}</h3><RiskBadge level={r.level} score={r.score} /></div><p className="page__desc" style={{ margin: '10px 0 0' }}>{r.explanation}</p></div>)}</div>; }

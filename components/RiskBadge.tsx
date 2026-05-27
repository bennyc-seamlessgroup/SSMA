export function RiskBadge({ level, score }: { level: 'good' | 'warn' | 'bad'; score: number }) { return <span className={`badge ${level}`}>{score}</span>; }

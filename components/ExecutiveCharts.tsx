import type { ExecutiveScoreFactor, ExecutiveTrendPoint, SentimentPlatformSnapshot } from '@/lib/types';

function percent(value: number, max: number) {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
}

export function ScoreBars({ factors }: { factors: ExecutiveScoreFactor[] }) {
  return (
    <div className="chart-stack">
      {factors.map(factor => (
        <div key={factor.label} className="chart-row">
          <div className="chart-row__meta">
            <span>{factor.label}</span>
            <strong>{factor.score}/{factor.max}</strong>
          </div>
          <div className="chart-bar">
            <div className="chart-bar__fill" style={{ width: percent(factor.score, factor.max) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlatformBars({ platforms }: { platforms: SentimentPlatformSnapshot[] }) {
  return (
    <div className="chart-stack">
      {platforms.map(platform => (
        <div key={platform.platform} className="chart-row">
          <div className="chart-row__meta">
            <span>{platform.platform}</span>
            <strong>{platform.posts.toLocaleString()} posts</strong>
          </div>
          <div className="mini-stats">
            <span className="badge good">+{platform.positive}%</span>
            <span className="badge warn">-{platform.negative}%</span>
            <span className="badge blue">{platform.neutral}% neutral</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SentimentDonut({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  const total = positive + negative + neutral || 1;
  const p = (positive / total) * 100;
  const n = (negative / total) * 100;
  const u = 100 - p - n;
  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{
          background: `conic-gradient(var(--good) 0 ${p}%, var(--bad) ${p}% ${p + n}%, var(--blue) ${p + n}% 100%)`,
        }}
      >
        <div className="donut__center">
          <strong>{Math.round(p)}%</strong>
          <span>positive</span>
        </div>
      </div>
      <div className="donut-legend">
        <div><span className="dot good" />Positive {positive.toLocaleString()}</div>
        <div><span className="dot bad" />Negative {negative.toLocaleString()}</div>
        <div><span className="dot blue" />Neutral {neutral.toLocaleString()}</div>
        <div className="page__desc">Mix: {Math.round(u)}% neutral remainder</div>
      </div>
    </div>
  );
}

export function TrendChart({ points }: { points: ExecutiveTrendPoint[] }) {
  const width = 560;
  const height = 180;
  const padding = 20;
  const maxSentiment = Math.max(...points.map(p => p.sentiment), 1);
  const maxScore = Math.max(...points.map(p => p.squeezeScore), 1);
  const sentimentPath = points.map((p, i) => {
    const x = padding + (i * (width - padding * 2)) / (points.length - 1 || 1);
    const y = height - padding - ((p.sentiment / maxSentiment) * (height - padding * 2));
    return `${x},${y}`;
  }).join(' ');
  const scorePath = points.map((p, i) => {
    const x = padding + (i * (width - padding * 2)) / (points.length - 1 || 1);
    const y = height - padding - ((p.squeezeScore / maxScore) * (height - padding * 2));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="trend-chart panel-soft">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sentiment and squeeze trend chart">
        <polyline points={sentimentPath} fill="none" stroke="var(--good)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={scorePath} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        {points.map((p, i) => {
          const x = padding + (i * (width - padding * 2)) / (points.length - 1 || 1);
          const y1 = height - padding - ((p.sentiment / maxSentiment) * (height - padding * 2));
          const y2 = height - padding - ((p.squeezeScore / maxScore) * (height - padding * 2));
          return (
            <g key={p.label}>
              <circle cx={x} cy={y1} r="4" fill="var(--good)" />
              <circle cx={x} cy={y2} r="4" fill="var(--accent)" />
            </g>
          );
        })}
      </svg>
      <div className="trend-chart__labels">
        {points.map(point => <span key={point.label}>{point.label}</span>)}
      </div>
      <div className="trend-chart__legend">
        <span><i className="swatch good" />Sentiment</span>
        <span><i className="swatch accent" />Squeeze Score</span>
      </div>
    </div>
  );
}

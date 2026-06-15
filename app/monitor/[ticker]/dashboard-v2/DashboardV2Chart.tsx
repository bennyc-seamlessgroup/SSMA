'use client';

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { PeriodKey } from './DashboardV2Kpis';

type SeriesKey = 'price' | 'feeRate' | 'tradeVolume' | 'shortableShares' | 'daysToCover' | 'utilization';

type DataPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
};

type ChartPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
};

type CompanyEvent = {
  id: string;
  date: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
};

type SeriesConfig = {
  label: string;
  axisTitle: string;
  color: string;
  formatter: (value: number) => string;
};

const defaultMetric: SeriesKey = 'price';

const seriesOrder: SeriesKey[] = ['price', 'feeRate', 'tradeVolume', 'shortableShares', 'daysToCover', 'utilization'];
const bottomMetrics = new Set<SeriesKey>(['tradeVolume', 'shortableShares']);

const seriesConfig: Record<SeriesKey, SeriesConfig> = {
  price: {
    label: 'Price',
    axisTitle: 'Price',
    color: '#72b3e8',
    formatter: value => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
  },
  feeRate: {
    label: 'Borrow Fee',
    axisTitle: 'Borrow Fee',
    color: '#e04f45',
    formatter: value => `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`,
  },
  tradeVolume: {
    label: 'Trade Volume',
    axisTitle: 'Trade Volume',
    color: '#cfcfcf',
    formatter: value => formatCompact(value),
  },
  shortableShares: {
    label: 'Shortable shares',
    axisTitle: 'Shortable shares',
    color: '#ff9f12',
    formatter: value => formatCompact(value),
  },
  daysToCover: {
    label: 'Days to Cover',
    axisTitle: 'Days to Cover',
    color: '#6f7bd9',
    formatter: value => `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}d`,
  },
  utilization: {
    label: 'Utilization',
    axisTitle: 'Utilization %',
    color: '#15a67a',
    formatter: value => `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`,
  },
};

function scale(value: number, min: number, max: number, start: number, end: number) {
  if (max === min) return (start + end) / 2;
  return end - ((value - min) / (max - min)) * (end - start);
}

function pathFor(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function formatCompact(value: number) {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatMonth(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function formatFullDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function domainFor(values: number[]) {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.08, 1);
  return {
    min: Math.max(0, rawMin - spread * 0.12),
    max: rawMax + spread * 0.12,
  };
}

function ticksFor(min: number, max: number) {
  const range = max - min;
  return [max, max - range * 0.25, max - range * 0.5, max - range * 0.75, min];
}

function panelForMetric(metric: SeriesKey) {
  return bottomMetrics.has(metric) ? 'bottom' : 'top';
}

function dataCountForPeriod(period: PeriodKey, allData: DataPoint[]) {
  if (period === '1D') return 2;
  if (period === '5D') return 6;
  if (period === '1M') return 30;
  if (period === '3M') return 90;
  if (period === 'YTD') {
    const latest = allData[allData.length - 1];
    if (!latest) return allData.length;
    const year = latest.date.slice(0, 4);
    return allData.filter(point => point.date.slice(0, 4) === year).length || allData.length;
  }
  return allData.length;
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasMetricValue(points: ChartPoint[], key: SeriesKey) {
  return points.some(point => point[key] !== null);
}

function fillMissingPrice(points: ChartPoint[]): ChartPoint[] {
  if (!hasMetricValue(points, 'price')) return points;
  const nextValidPrices = points.map(point => point.price);
  let nextValid: number | null = null;
  for (let index = nextValidPrices.length - 1; index >= 0; index -= 1) {
    if (nextValidPrices[index] !== null && nextValidPrices[index]! > 0) {
      nextValid = nextValidPrices[index];
    } else {
      nextValidPrices[index] = nextValid;
    }
  }

  let lastValid: number | null = null;
  return points.map((point, index) => {
    const validPrice = point.price !== null && point.price > 0 ? point.price : null;
    const price = validPrice ?? lastValid ?? nextValidPrices[index] ?? null;
    if (validPrice !== null) lastValid = validPrice;
    return { ...point, price };
  });
}

export function DashboardV2Chart({ data: sourceData, events: sourceEvents, period }: { data: DataPoint[]; events: CompanyEvent[]; period: PeriodKey }) {
  const [enabledMetrics, setEnabledMetrics] = useState<Record<SeriesKey, boolean>>({
    price: true,
    feeRate: true,
    tradeVolume: true,
    shortableShares: true,
    daysToCover: true,
    utilization: true,
  });
  const [hoveredMetric, setHoveredMetric] = useState<SeriesKey | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CompanyEvent | null>(null);

  const allData = useMemo(() => {
    const clean = sourceData
      .filter(point => point && typeof point.date === 'string')
      .map(point => ({
        date: point.date,
        price: numericOrNull(point.price),
        feeRate: numericOrNull(point.feeRate),
        tradeVolume: numericOrNull(point.tradeVolume),
        shortableShares: numericOrNull(point.shortableShares),
        daysToCover: numericOrNull(point.daysToCover) ?? 0,
        utilization: numericOrNull(point.utilization) ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return fillMissingPrice(clean);
  }, [sourceData]);
  const data = useMemo(() => {
    const count = dataCountForPeriod(period, allData);
    return allData.slice(-count);
  }, [allData, period]);
  const visibleEvents = useMemo(() => {
    const firstDate = data[0]?.date;
    const lastDate = data[data.length - 1]?.date;
    if (!firstDate || !lastDate) return [];
    return sourceEvents
      .filter(event => event?.date >= firstDate && event.date <= lastDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, sourceEvents]);

  const availableMetrics = useMemo(() => seriesOrder.filter(key => key === 'daysToCover' || key === 'utilization' || hasMetricValue(allData, key)), [allData]);
  const enabledKeys = availableMetrics.filter(key => enabledMetrics[key]);
  const activeMetric = hoveredMetric && enabledKeys.includes(hoveredMetric)
    ? hoveredMetric
    : enabledKeys.includes(defaultMetric)
      ? defaultMetric
      : enabledKeys[0] ?? defaultMetric;

  const chart = useMemo(() => {
    const width = 1120;
    const height = 560;
    const left = 72;
    const right = 100;
    const topPanelTop = 52;
    const topPanelBottom = 326;
    const bottomPanelTop = 366;
    const bottomPanelBottom = 488;
    const plotWidth = width - left - right;
    const xFor = (index: number) => left + (data.length === 1 ? 0 : (index / (data.length - 1)) * plotWidth);
    const indexForDate = (date: string) => {
      const exact = data.findIndex(point => point.date === date);
      if (exact >= 0) return exact;
      const target = new Date(`${date}T00:00:00Z`).getTime();
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      data.forEach((point, index) => {
        const distance = Math.abs(new Date(`${point.date}T00:00:00Z`).getTime() - target);
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      });
      return nearest;
    };
    const domains = Object.fromEntries(availableMetrics.map(key => [key, domainFor(data.map(point => point[key]).filter((value): value is number => value !== null))])) as Partial<Record<SeriesKey, { min: number; max: number }>>;
    const paths = Object.fromEntries(availableMetrics.map(key => {
      const domain = domains[key];
      if (!domain) return [key, { path: '', points: [] }];
      const panelTop = panelForMetric(key) === 'bottom' ? bottomPanelTop : topPanelTop;
      const panelBottom = panelForMetric(key) === 'bottom' ? bottomPanelBottom : topPanelBottom;
      const points = data.map((point, index) => {
        const value = point[key];
        return value === null ? null : {
          x: xFor(index),
          y: scale(value, domain.min, domain.max, panelTop, panelBottom),
        };
      });
      const visiblePoints = points.filter((point): point is { x: number; y: number } => point !== null);
      return [key, { path: pathFor(visiblePoints), points }];
    })) as Partial<Record<SeriesKey, { path: string; points: Array<{ x: number; y: number } | null> }>>;

    const rawXTicks = data
      .map((point, index) => ({ point, index }))
      .filter(({ point, index }) => {
        if (index === 0 || index === data.length - 1) return true;
        if (period === '1D' || period === '5D') return true;
        if (period === '1M') return index % 7 === 0;
        if (period === '3M') return index % 14 === 0;
        return point.date.slice(5, 7) !== data[index - 1]?.date.slice(5, 7);
      })
      .map(({ point, index }, tickIndex) => ({
        x: xFor(index),
        label: period === '1Y' || period === 'YTD'
          ? formatMonth(point.date)
          : point.date.slice(5),
      }));
    const xTicks = rawXTicks
      .filter((tick, index, ticks) => {
        const next = ticks[index + 1];
        const isPenultimate = index === ticks.length - 2;
        return !(isPenultimate && next && next.x - tick.x < 72);
      })
      .map((tick, index, ticks) => {
        const next = ticks[index + 1];
        const nextAfter = ticks[index + 2];
        const monthSpacing = next && nextAfter ? nextAfter.x - next.x : 72;
        const shouldRepositionFirst = (period === '1Y' || period === 'YTD') && index === 0 && next && next.x - tick.x < monthSpacing * 0.8;
        return {
          ...tick,
          x: shouldRepositionFirst ? Math.max(12, next.x - monthSpacing) : tick.x,
          textAnchor: (index === ticks.length - 1 ? 'end' : 'middle') as 'start' | 'middle' | 'end',
        };
      });

    return {
      width,
      height,
      left,
      right,
      topPanelTop,
      topPanelBottom,
      bottomPanelTop,
      bottomPanelBottom,
      plotWidth,
      domains,
      paths,
      xTicks,
      eventMarkers: visibleEvents.map(event => ({
        event,
        x: xFor(indexForDate(event.date)),
        y: topPanelBottom + 20,
      })),
    };
  }, [availableMetrics, data, period, visibleEvents]);

  const activeDomain = chart.domains[activeMetric] ?? domainFor([0]);
  const activeTicks = ticksFor(activeDomain.min, activeDomain.max);
  const activeConfig = seriesConfig[activeMetric];
  const activePanel = panelForMetric(activeMetric);
  const activePanelTop = activePanel === 'bottom' ? chart.bottomPanelTop : chart.topPanelTop;
  const activePanelBottom = activePanel === 'bottom' ? chart.bottomPanelBottom : chart.topPanelBottom;
  const hoveredPoint = hoverIndex === null ? null : data[hoverIndex] ?? null;
  const tooltipMetricOrder = activeMetric
    ? [activeMetric, ...enabledKeys.filter(key => key !== activeMetric)]
    : enabledKeys;

  const setHoverPosition = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chart.width;
    const rawIndex = Math.round(((x - chart.left) / chart.plotWidth) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, rawIndex)));
  };

  const clearHover = () => {
    setHoveredMetric(null);
    setHoverIndex(null);
    setHoveredEvent(null);
  };

  const toggle = (key: SeriesKey) => {
    setEnabledMetrics(current => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="dashboard-v2-chart-card">
      <div className="dashboard-v2-chart-head">
        <div>
          <span>Trend Overview</span>
        </div>
        <div className="dashboard-v2-legend" aria-label="Chart series toggles">
          {seriesOrder.map(key => (
            !availableMetrics.includes(key) ? null : (
            <button
              type="button"
              className={`${!enabledMetrics[key] ? 'is-muted' : ''} ${activeMetric === key ? 'is-focused' : ''}`}
              key={key}
              onClick={() => toggle(key)}
              onMouseEnter={() => enabledMetrics[key] && setHoveredMetric(key)}
              onMouseLeave={() => setHoveredMetric(null)}
              onFocus={() => enabledMetrics[key] && setHoveredMetric(key)}
              onBlur={() => setHoveredMetric(null)}
              aria-pressed={enabledMetrics[key]}
            >
              <i style={{ background: seriesConfig[key].color }} />
              {seriesConfig[key].label}
            </button>
            )
          ))}
        </div>
      </div>

      {!data.length || !enabledKeys.length ? (
        <div className="dashboard-v2-empty-chart">
          <strong>No chart data available</strong>
          <span>The consolidated JSON does not include chartable values for the selected metrics.</span>
        </div>
      ) : (
      <div className="dashboard-v2-chart-shell">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-label="Borrow market multi-series chart"
          onMouseMove={setHoverPosition}
          onMouseLeave={clearHover}
        >
          <text
            className="dashboard-v2-axis-title active-axis-title"
            x={chart.width - 34}
            y={activePanel === 'bottom' ? chart.bottomPanelTop - 14 : 25}
            textAnchor="end"
            style={{ fill: activeConfig.color }}
          >
            {activeConfig.axisTitle}
          </text>

          {activeTicks.map(tick => {
            const y = scale(tick, activeDomain.min, activeDomain.max, activePanelTop, activePanelBottom);
            return (
              <g key={`active-${tick}`}>
                <line className="dashboard-v2-grid-line" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
                <text className="dashboard-v2-axis-value active-axis-tick" x={chart.width - 32} y={y + 4} textAnchor="end" style={{ fill: activeConfig.color }}>
                  {activeConfig.formatter(tick)}
                </text>
              </g>
            );
          })}

          {chart.xTicks.map(tick => (
            <g key={`${tick.label}-${tick.x}`}>
              <line className="dashboard-v2-month-line" x1={tick.x} x2={tick.x} y1={chart.topPanelTop} y2={chart.bottomPanelBottom} />
              <text className="dashboard-v2-x-label" x={tick.x} y={chart.bottomPanelBottom + 28} textAnchor={tick.textAnchor}>{tick.label}</text>
            </g>
          ))}

          <line className="dashboard-v2-zero-line" x1={chart.left} x2={chart.width - chart.right} y1={chart.topPanelBottom} y2={chart.topPanelBottom} />
          <line className="dashboard-v2-zero-line" x1={chart.left} x2={chart.width - chart.right} y1={chart.bottomPanelBottom} y2={chart.bottomPanelBottom} />

          {chart.eventMarkers.map(marker => (
            <g
              className="dashboard-v2-event-marker"
              key={marker.event.id}
              role="button"
              tabIndex={0}
              aria-label={`${marker.event.type}: ${marker.event.title}`}
              onMouseEnter={() => setHoveredEvent(marker.event)}
              onMouseLeave={() => setHoveredEvent(null)}
              onFocus={() => setHoveredEvent(marker.event)}
              onBlur={() => setHoveredEvent(null)}
            >
              <line x1={marker.x} x2={marker.x} y1={chart.topPanelTop} y2={chart.bottomPanelBottom} />
              <circle cx={marker.x} cy={marker.y} r="5.5" />
              <text x={marker.x} y={marker.y + 3} textAnchor="middle">{marker.event.type.charAt(0)}</text>
            </g>
          ))}

          {enabledKeys.map(key => {
            const isFocused = activeMetric === key;
            const isDimmed = Boolean(hoveredMetric) && !isFocused;
            return (
              <g key={key}>
                <path
                  className={`dashboard-v2-line ${isFocused ? 'is-focused' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                  d={chart.paths[key]?.path ?? ''}
                  style={{ stroke: seriesConfig[key].color }}
                />
                <path
                  className="dashboard-v2-line-hit"
                  d={chart.paths[key]?.path ?? ''}
                  onMouseEnter={() => setHoveredMetric(key)}
                  onFocus={() => setHoveredMetric(key)}
                />
              </g>
            );
          })}

          {hoveredPoint && (
            <g className="dashboard-v2-hover-layer">
              <line
                className="dashboard-v2-hover-line"
                x1={chart.paths[activeMetric]?.points[hoverIndex ?? 0]?.x}
                x2={chart.paths[activeMetric]?.points[hoverIndex ?? 0]?.x}
                y1={chart.topPanelTop}
                y2={chart.bottomPanelBottom}
              />
              {enabledKeys.map(key => {
                const point = chart.paths[key]?.points[hoverIndex ?? 0];
                if (!point) return null;
                return (
                  <circle
                    key={`marker-${key}`}
                    className={`dashboard-v2-hover-dot ${activeMetric === key ? 'is-focused' : ''}`}
                    cx={point.x}
                    cy={point.y}
                    r={activeMetric === key ? 4.2 : 3}
                    fill={seriesConfig[key].color}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {hoveredPoint && (
          <div className="dashboard-v2-tooltip">
            <strong>{formatFullDate(hoveredPoint.date)}</strong>
            {tooltipMetricOrder.map(key => (
              hoveredPoint[key] === null ? null : (
              <span className={key === activeMetric ? 'is-focused' : ''} key={key}>
                <i style={{ background: seriesConfig[key].color }} />
                <em>{seriesConfig[key].label}</em>
                <b>{seriesConfig[key].formatter(hoveredPoint[key])}</b>
              </span>
              )
            ))}
          </div>
        )}

        {hoveredEvent && (
          <div className="dashboard-v2-event-tooltip">
            <span>{hoveredEvent.type} · {formatFullDate(hoveredEvent.date)}</span>
            <strong>{hoveredEvent.title}</strong>
            <p>{hoveredEvent.summary}</p>
            {hoveredEvent.source && <em>{hoveredEvent.source}</em>}
          </div>
        )}
      </div>
      )}
    </section>
  );
}

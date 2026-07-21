'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { dashboardPeriods, type PeriodKey } from './DashboardKpis';
import { ApiSourceTags, type ApiSourceDescriptor } from '@/components/ApiSourceTags';

export type DashboardSeriesKey = 'price' | 'feeRate' | 'tradeVolume' | 'shortableShares' | 'daysToCover' | 'utilization' | 'averageDuration';
type SeriesKey = DashboardSeriesKey;

type DataPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
  averageDuration: number | null;
};

type ChartPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
  averageDuration: number | null;
};

type CompanyEvent = {
  id: string;
  date: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
  url?: string;
};

type EventGroup = {
  id: string;
  date: string;
  type: string;
  events: CompanyEvent[];
  x?: number;
  y?: number;
};

type SeriesConfig = {
  label: string;
  axisTitle: string;
  color: string;
  formatter: (value: number) => string;
};

export type DashboardFixedAxis = {
  metric: DashboardSeriesKey;
  side: 'left' | 'right';
};

const defaultMetric: SeriesKey = 'price';

const seriesOrder: SeriesKey[] = ['price', 'feeRate', 'tradeVolume', 'shortableShares', 'daysToCover', 'utilization', 'averageDuration'];
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
  averageDuration: {
    label: 'Average Duration',
    axisTitle: 'Average Duration (Days)',
    color: '#8b5cf6',
    formatter: value => `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}d`,
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

export function DashboardChart({
  title,
  series,
  fixedAxes,
  data: sourceData,
  events: sourceEvents,
  sourceEndpoints = [],
  period,
  onPeriodChange,
}: {
  title: string;
  series: DashboardSeriesKey[];
  fixedAxes?: DashboardFixedAxis[];
  data: DataPoint[];
  events: CompanyEvent[];
  sourceEndpoints?: ApiSourceDescriptor[];
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  const [enabledMetrics, setEnabledMetrics] = useState<Record<SeriesKey, boolean>>({
    price: true,
    feeRate: true,
    tradeVolume: true,
    shortableShares: true,
    daysToCover: true,
    utilization: true,
    averageDuration: true,
  });
  const [hoveredMetric, setHoveredMetric] = useState<SeriesKey | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoveredEventGroup, setHoveredEventGroup] = useState<EventGroup | null>(null);
  const [pinnedEventGroup, setPinnedEventGroup] = useState<EventGroup | null>(null);

  useEffect(() => {
    if (!pinnedEventGroup) return undefined;

    function closePinnedPopover(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.dashboard-event-tooltip') || target.closest('.dashboard-event-marker')) return;
      setPinnedEventGroup(null);
    }

    document.addEventListener('pointerdown', closePinnedPopover);
    return () => document.removeEventListener('pointerdown', closePinnedPopover);
  }, [pinnedEventGroup]);

  const allData = useMemo(() => {
    const clean = sourceData
      .filter(point => point && typeof point.date === 'string')
      .map(point => ({
        date: point.date,
        price: numericOrNull(point.price),
        feeRate: numericOrNull(point.feeRate),
        tradeVolume: numericOrNull(point.tradeVolume),
        shortableShares: numericOrNull(point.shortableShares),
        daysToCover: numericOrNull(point.daysToCover),
        utilization: numericOrNull(point.utilization),
        averageDuration: numericOrNull(point.averageDuration),
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
  const visibleEventGroups = useMemo(() => {
    const groups = new Map<string, EventGroup>();
    visibleEvents.forEach(event => {
      const key = `${event.date}:${event.type}`;
      const group = groups.get(key);
      if (group) {
        group.events.push(event);
      } else {
        groups.set(key, {
          id: key,
          date: event.date,
          type: event.type,
          events: [event],
        });
      }
    });
    return Array.from(groups.values()).sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
  }, [visibleEvents]);

  const availableMetrics = useMemo(() => seriesOrder.filter(key => series.includes(key)), [series]);
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
    const hasBottomPanel = availableMetrics.some(key => bottomMetrics.has(key));
    const topPanelTop = 52;
    const topPanelBottom = hasBottomPanel ? 326 : 488;
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
    const domains = Object.fromEntries(availableMetrics.map(key => {
      const values = data.map(point => point[key]).filter((value): value is number => value !== null);
      return [key, domainFor(values.length ? values : [0])];
    })) as Partial<Record<SeriesKey, { min: number; max: number }>>;
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
      hasBottomPanel,
      domains,
      paths,
      xTicks,
      eventMarkers: visibleEventGroups.map((eventGroup, eventIndex) => {
        const sameDateIndex = visibleEventGroups.slice(0, eventIndex).filter(item => item.date === eventGroup.date).length;
        const x = xFor(indexForDate(eventGroup.date));
        const y = topPanelBottom + 18 + (sameDateIndex % 3) * 16;
        return {
          eventGroup: { ...eventGroup, x, y },
          x,
          y,
        };
      }),
    };
  }, [availableMetrics, data, period, visibleEventGroups]);

  const activeDomain = chart.domains[activeMetric] ?? domainFor([0]);
  const activeTicks = ticksFor(activeDomain.min, activeDomain.max);
  const activeConfig = seriesConfig[activeMetric];
  const activePanel = panelForMetric(activeMetric);
  const activePanelTop = activePanel === 'bottom' ? chart.bottomPanelTop : chart.topPanelTop;
  const activePanelBottom = activePanel === 'bottom' ? chart.bottomPanelBottom : chart.topPanelBottom;
  const visibleFixedAxes = (fixedAxes ?? []).filter(axis => enabledKeys.includes(axis.metric));
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
    setHoveredEventGroup(null);
  };

  const toggle = (key: SeriesKey) => {
    setEnabledMetrics(current => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="dashboard-chart-card">
      <div className="dashboard-chart-head">
        <h2>{title}</h2>
        <ApiSourceTags sources={sourceEndpoints} />
        <div className="dashboard-legend" aria-label="Chart series toggles">
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
        <div className="dashboard-period-control" aria-label={`${title} timeframe`}>
          {dashboardPeriods.map(item => (
            <button
              type="button"
              key={item}
              className={period === item ? 'active' : ''}
              onClick={() => onPeriodChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {!data.length || !enabledKeys.length ? (
        <div className="dashboard-empty-chart">
          <strong>No chart data available</strong>
          <span>The market data API does not include chartable values for the selected metrics.</span>
        </div>
      ) : (
      <div className="dashboard-chart-shell">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-label="Borrow market multi-series chart"
          onMouseMove={setHoverPosition}
          onMouseLeave={clearHover}
          onClick={() => setPinnedEventGroup(null)}
        >
          {visibleFixedAxes.length ? visibleFixedAxes.map(axis => {
            const config = seriesConfig[axis.metric];
            const domain = chart.domains[axis.metric] ?? domainFor([0]);
            const panel = panelForMetric(axis.metric);
            const panelTop = panel === 'bottom' ? chart.bottomPanelTop : chart.topPanelTop;
            const panelBottom = panel === 'bottom' ? chart.bottomPanelBottom : chart.topPanelBottom;
            const panelAxes = visibleFixedAxes.filter(item => panelForMetric(item.metric) === panel);
            const showGrid = panelAxes[0]?.metric === axis.metric;
            const titleX = axis.side === 'left' ? chart.left : chart.width - chart.right;
            const tickX = axis.side === 'left' ? chart.left - 12 : chart.width - chart.right + 12;
            const anchor = axis.side === 'left' ? 'end' : 'start';
            return (
              <g key={`${axis.metric}-${axis.side}`}>
                <text
                  className="dashboard-axis-title active-axis-title"
                  x={titleX}
                  y={panel === 'bottom' ? chart.bottomPanelTop - 14 : 25}
                  textAnchor={axis.side === 'left' ? 'start' : 'end'}
                  style={{ fill: config.color }}
                >
                  {config.axisTitle}
                </text>
                {ticksFor(domain.min, domain.max).map(tick => {
                  const y = scale(tick, domain.min, domain.max, panelTop, panelBottom);
                  return (
                    <g key={`${axis.metric}-${tick}`}>
                      {showGrid && <line className="dashboard-grid-line" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />}
                      <text className="dashboard-axis-value active-axis-tick" x={tickX} y={y + 4} textAnchor={anchor} style={{ fill: config.color }}>
                        {config.formatter(tick)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          }) : (
            <>
              <text
                className="dashboard-axis-title active-axis-title"
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
                    <line className="dashboard-grid-line" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
                    <text className="dashboard-axis-value active-axis-tick" x={chart.width - 32} y={y + 4} textAnchor="end" style={{ fill: activeConfig.color }}>
                      {activeConfig.formatter(tick)}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {chart.xTicks.map(tick => (
            <g key={`${tick.label}-${tick.x}`}>
              <line className="dashboard-month-line" x1={tick.x} x2={tick.x} y1={chart.topPanelTop} y2={chart.bottomPanelBottom} />
              <text className="dashboard-x-label" x={tick.x} y={chart.bottomPanelBottom + 28} textAnchor={tick.textAnchor}>{tick.label}</text>
            </g>
          ))}

          <line className="dashboard-zero-line" x1={chart.left} x2={chart.width - chart.right} y1={chart.topPanelBottom} y2={chart.topPanelBottom} />
          {chart.hasBottomPanel && (
            <line className="dashboard-zero-line" x1={chart.left} x2={chart.width - chart.right} y1={chart.bottomPanelBottom} y2={chart.bottomPanelBottom} />
          )}

          {chart.eventMarkers.map(marker => (
            <g
              className="dashboard-event-marker"
              key={marker.eventGroup.id}
              role="button"
              tabIndex={0}
              aria-label={`${marker.eventGroup.type}: ${marker.eventGroup.events.length} event${marker.eventGroup.events.length === 1 ? '' : 's'}`}
              onMouseEnter={() => setHoveredEventGroup(marker.eventGroup)}
              onMouseLeave={() => setHoveredEventGroup(null)}
              onMouseMove={event => event.stopPropagation()}
              onClick={event => {
                event.stopPropagation();
                setPinnedEventGroup(current => current?.id === marker.eventGroup.id ? null : marker.eventGroup);
              }}
              onFocus={() => setHoveredEventGroup(marker.eventGroup)}
              onBlur={() => setHoveredEventGroup(null)}
            >
              <rect className="dashboard-event-hitbox" x={marker.x - 16} y={marker.y - 16} width="32" height="32" rx="8" />
              <line x1={marker.x} x2={marker.x} y1={chart.topPanelTop} y2={chart.bottomPanelBottom} />
              {marker.eventGroup.type === 'SEC' ? (
                <>
                  <rect x={marker.x - 7} y={marker.y - 8} width="14" height="16" rx="3" />
                  <path d={`M ${marker.x - 3.5} ${marker.y - 3.8} H ${marker.x + 3.8} M ${marker.x - 3.5} ${marker.y} H ${marker.x + 3.8} M ${marker.x - 3.5} ${marker.y + 3.8} H ${marker.x + 1.8}`} />
                  {marker.eventGroup.events.length > 1 && (
                    <>
                      <circle className="dashboard-event-count" cx={marker.x + 7} cy={marker.y - 8} r="6" />
                      <text className="dashboard-event-count-label" x={marker.x + 7} y={marker.y - 5.6} textAnchor="middle">
                        {marker.eventGroup.events.length > 9 ? '9+' : marker.eventGroup.events.length}
                      </text>
                    </>
                  )}
                </>
              ) : (
                <>
                  <circle cx={marker.x} cy={marker.y} r="5.5" />
                  <text x={marker.x} y={marker.y + 3} textAnchor="middle">{marker.eventGroup.type.charAt(0)}</text>
                </>
              )}
            </g>
          ))}

          {enabledKeys.map(key => {
            const isFocused = activeMetric === key;
            const isDimmed = Boolean(hoveredMetric) && !isFocused;
            return (
              <g key={key}>
                <path
                  className={`dashboard-line dashboard-line--${key} ${isFocused ? 'is-focused' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                  d={chart.paths[key]?.path ?? ''}
                  style={{ stroke: seriesConfig[key].color }}
                />
                <path
                  className="dashboard-line-hit"
                  d={chart.paths[key]?.path ?? ''}
                  onMouseEnter={() => setHoveredMetric(key)}
                  onFocus={() => setHoveredMetric(key)}
                />
              </g>
            );
          })}

          {hoveredPoint && (
            <g className="dashboard-hover-layer">
              <line
                className="dashboard-hover-line"
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
                    className={`dashboard-hover-dot ${activeMetric === key ? 'is-focused' : ''}`}
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
          <div className="dashboard-tooltip">
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

        {(pinnedEventGroup ?? hoveredEventGroup) && (
          <div
            className={`dashboard-event-tooltip${pinnedEventGroup ? ' is-pinned' : ''}`}
            style={{
              left: `${Math.min(Math.max(((pinnedEventGroup ?? hoveredEventGroup)?.x ?? chart.left) / chart.width * 100, 12), 82)}%`,
              top: `${Math.min((((pinnedEventGroup ?? hoveredEventGroup)?.y ?? chart.topPanelBottom) + 18) / chart.height * 100, 78)}%`,
            }}
            onClick={event => event.stopPropagation()}
          >
            <span>{(pinnedEventGroup ?? hoveredEventGroup)!.type} · {formatFullDate((pinnedEventGroup ?? hoveredEventGroup)!.date)} · {(pinnedEventGroup ?? hoveredEventGroup)!.events.length} event{(pinnedEventGroup ?? hoveredEventGroup)!.events.length === 1 ? '' : 's'}</span>
            <div className="dashboard-event-list">
              {(pinnedEventGroup ?? hoveredEventGroup)!.events.map(event => (
                <article key={event.id}>
                  <strong>{event.title}</strong>
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noreferrer">
                      Open filing
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </section>
  );
}

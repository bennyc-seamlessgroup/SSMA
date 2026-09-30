type Row = Record<string, unknown>;

export type RuleEngineShortScoreSnapshot = {
  finalScore: number | null;
  riskFactor: string;
  snapshotDate: string;
  generatedAt: string;
  status: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function categoryPayload(payload: unknown) {
  const root = record(payload);
  const direct = record(root['rule-engine-short-score']);
  if (Object.keys(direct).length) return direct;

  const data = record(root.data);
  const nested = record(data['rule-engine-short-score']);
  if (Object.keys(nested).length) return nested;
  if (Object.keys(data).length) return data;

  return root;
}

function categoryRecords(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  const source = categoryPayload(payload);
  if (Array.isArray(source.records)) return source.records;
  if (Array.isArray(source.data)) return source.data;
  const data = record(source.data);
  return Array.isArray(data.records) ? data.records : [];
}

export function normalizeRuleEngineShortScore(payload: unknown): RuleEngineShortScoreSnapshot {
  const source = categoryPayload(payload);
  const context = record(source.context);
  const finalScore = numeric(source.finalScore) ?? numeric(context.finalScore);

  return {
    finalScore,
    riskFactor: String(source.riskFactor ?? context.riskFactor ?? '').trim(),
    snapshotDate: String(source.snapshotDate ?? source.date ?? source.tradeDate ?? '').trim().slice(0, 10),
    generatedAt: String(source.generatedAt ?? '').trim(),
    status: String(source.status ?? '').trim(),
  };
}

export type RuleEngineShortScoreSelection = {
  current: RuleEngineShortScoreSnapshot | null;
  previous: RuleEngineShortScoreSnapshot | null;
};

export function ruleEngineShortScoreHistory(payload: unknown) {
  return categoryRecords(payload)
    .map(normalizeRuleEngineShortScore)
    .filter(snapshot => snapshot.finalScore !== null && /^\d{4}-\d{2}-\d{2}$/.test(snapshot.snapshotDate))
    .sort((a, b) => (
      a.snapshotDate.localeCompare(b.snapshotDate)
      || a.generatedAt.localeCompare(b.generatedAt)
    ));
}

export function selectRuleEngineShortScoreAsOf(
  historyPayload: unknown,
  currentPayload: unknown,
  reportDate: string,
): RuleEngineShortScoreSelection {
  const candidates = ruleEngineShortScoreHistory(historyPayload);
  const currentSnapshot = normalizeRuleEngineShortScore(currentPayload);
  if (currentSnapshot.finalScore !== null && /^\d{4}-\d{2}-\d{2}$/.test(currentSnapshot.snapshotDate)) {
    candidates.push(currentSnapshot);
  }

  const byDate = new Map<string, RuleEngineShortScoreSnapshot>();
  candidates
    .filter(snapshot => snapshot.snapshotDate <= reportDate)
    .forEach(snapshot => byDate.set(snapshot.snapshotDate, snapshot));
  const available = Array.from(byDate.values())
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));

  return {
    current: available.at(-1) ?? null,
    previous: available.at(-2) ?? null,
  };
}

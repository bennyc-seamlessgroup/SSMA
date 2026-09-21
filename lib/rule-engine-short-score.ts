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

export function normalizeRuleEngineShortScore(payload: unknown): RuleEngineShortScoreSnapshot {
  const source = categoryPayload(payload);
  const context = record(source.context);
  const finalScore = numeric(source.finalScore) ?? numeric(context.finalScore);

  return {
    finalScore,
    riskFactor: String(source.riskFactor ?? context.riskFactor ?? '').trim(),
    snapshotDate: String(source.snapshotDate ?? '').trim().slice(0, 10),
    generatedAt: String(source.generatedAt ?? '').trim(),
    status: String(source.status ?? '').trim(),
  };
}

import type { InternalFloatAuditEntry, ManagementSuggestionDecision } from './internal-float-types';

const DECISION_MESSAGE_PREFIX = 'Management suggestion decision: ';

function isManagementSuggestionDecision(value: unknown): value is ManagementSuggestionDecision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string'
    && typeof record.suggestionId === 'string'
    && typeof record.suggestionVersion === 'string'
    && (record.decision === 'applied' || record.decision === 'discarded')
    && typeof record.decidedAt === 'string'
  );
}

function decisionKey(decision: ManagementSuggestionDecision) {
  return `${decision.suggestionId}\u0000${decision.suggestionVersion}`;
}

function decisionFromAuditEntry(entry: InternalFloatAuditEntry) {
  if (typeof entry.message !== 'string' || !entry.message.startsWith(DECISION_MESSAGE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(entry.message.slice(DECISION_MESSAGE_PREFIX.length));
    return isManagementSuggestionDecision(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function decisionAuditEntry(decision: ManagementSuggestionDecision): InternalFloatAuditEntry {
  return {
    id: decision.id,
    action: 'updated',
    section: 'managementStrategicHoldings',
    recordId: decision.suggestionId,
    message: `${DECISION_MESSAGE_PREFIX}${JSON.stringify(decision)}`,
    createdAt: decision.decidedAt,
  };
}

export function mergeManagementSuggestionDecisions(
  ...groups: Array<ManagementSuggestionDecision[] | null | undefined>
) {
  const merged = new Map<string, ManagementSuggestionDecision>();
  groups.forEach(group => group?.forEach(decision => {
    if (isManagementSuggestionDecision(decision)) merged.set(decisionKey(decision), decision);
  }));
  return [...merged.values()];
}

export function managementSuggestionDecisionsFromAuditLog(
  auditLog: InternalFloatAuditEntry[] | null | undefined,
) {
  return mergeManagementSuggestionDecisions(
    (auditLog ?? []).map(decisionFromAuditEntry).filter(
      (decision): decision is ManagementSuggestionDecision => decision !== null,
    ),
  );
}

export function auditLogWithManagementSuggestionDecisions(
  auditLog: InternalFloatAuditEntry[] | null | undefined,
  decisions: ManagementSuggestionDecision[],
) {
  return [
    ...(auditLog ?? []).filter(entry => decisionFromAuditEntry(entry) === null),
    ...mergeManagementSuggestionDecisions(decisions).map(decisionAuditEntry),
  ];
}

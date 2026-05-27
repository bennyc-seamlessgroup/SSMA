import { NextResponse } from 'next/server';
import { calculateFloatAdjustments, demoManualHoldings, saveInternalFloatInputs, type ManualHolding } from '@/lib/internal-float';

function sanitizeHoldings(value: unknown): ManualHolding[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id || `manual-${Date.now()}-${index}`),
        holderName: String(row.holderName || 'Custom Holder'),
        holderType: String(row.holderType || 'Other'),
        accountType: String(row.accountType || 'Other'),
        brokerCustodian: String(row.brokerCustodian || ''),
        numberOfShares: Number(row.numberOfShares) || 0,
        tradabilityStatus: String(row.tradabilityStatus || 'Freely Tradable'),
        lendingAvailability: String(row.lendingAvailability || 'Unknown'),
        tokenizationStatus: String(row.tokenizationStatus || 'Not Tokenized'),
        lockUpStatus: String(row.lockUpStatus || 'No Lock-up'),
        confidenceLevel: String(row.confidenceLevel || 'Medium'),
        sourceType: String(row.sourceType || 'Internal Estimate'),
        notes: String(row.notes || ''),
      };
    });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const holdings = body?.action === 'reset' ? demoManualHoldings() : sanitizeHoldings(body?.holdings);
  const adjustments = saveInternalFloatInputs(holdings);

  return NextResponse.json({
    status: 'ok',
    holdings,
    adjustments,
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const holdings = sanitizeHoldings(body?.holdings);

  return NextResponse.json({
    status: 'preview',
    adjustments: calculateFloatAdjustments(holdings),
  });
}

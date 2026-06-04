import { InternalFloatClient } from './InternalFloatClient';
import { readImportFile } from '@/lib/import-data';
import { calculateFloatAdjustments, readInternalFloatInputs, type FloatAdjustments } from '@/lib/internal-float';

type AnalysisData = {
  summary?: string;
  riskNotes?: string[];
  analysisParagraphs?: string[];
  riskDisclaimer?: string;
  estimateDisclaimer?: string;
};

export default async function InternalFloatPage() {
  const holdingsEnvelope = await readInternalFloatInputs();
  const holdings = holdingsEnvelope.data;
  const analysisEnvelope = await readImportFile<AnalysisData>('internal_float/internal_float_analysis.json');
  const adjustments = await calculateFloatAdjustments(holdings) as FloatAdjustments;

  return (
    <div className="page dashboard-page internal-float-page">
      <div className="page__header dashboard-command-header">
        <div>
          <div className="terminal-eyebrow">Private Internal Input</div>
          <h1 className="page__title">Internal Float Intelligence</h1>
          <p className="page__desc">Private management inputs for adjusted float, lending availability, tokenized shares, and internal squeeze risk analysis.</p>
        </div>
      </div>

      <InternalFloatClient
        initialHoldings={holdings}
        initialAdjustments={adjustments}
        analysisSummary={analysisEnvelope.data.summary ?? 'Based on management-provided internal inputs, the estimated real tradable float may be lower than the official free float.'}
        riskNotes={analysisEnvelope.data.riskNotes ?? []}
        analysisParagraphs={analysisEnvelope.data.analysisParagraphs ?? []}
        riskDisclaimer={analysisEnvelope.data.riskDisclaimer}
        estimateDisclaimer={analysisEnvelope.data.estimateDisclaimer}
      />
    </div>
  );
}

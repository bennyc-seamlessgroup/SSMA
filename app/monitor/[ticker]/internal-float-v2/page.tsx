import { ImportDataTable } from '@/components/ImportDataTable';
import { readImportFile } from '@/lib/import-data';
import { calculateFloatAdjustments, internalFloatV2UserInputPaths, readInternalFloatInputs, readInternalFloatV2UserInputs, type FloatAdjustments, type InternalFloatV2UserInput } from '@/lib/internal-float';
import { formatImportDataUpdatedAt, getImportFilesVersion } from '@/lib/import-data-version';
import { pageDataSources } from '@/lib/page-data-sources';
import { getServerPortalTimeZone } from '@/lib/server-timezone';
import { InternalFloatV2Client, type InstitutionalOwnershipOverview } from './InternalFloatV2Client';

function formatTableValue(value: unknown) {
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value ?? '');
}

function buildUserInputRows(userInputs: InternalFloatV2UserInput) {
  const rows: Array<Record<string, string>> = [];
  const pushRows = (section: string, sourceRows: Array<Record<string, unknown>>) => {
    sourceRows.forEach(row => {
      rows.push({
        section,
        id: formatTableValue(row.id),
        label: formatTableValue(row.holderName ?? row.name ?? row.chain ?? row.provider ?? row.protocol),
        shares: formatTableValue(row.shares),
        category: formatTableValue(row.category),
        provider: formatTableValue(row.provider),
        protocol: formatTableValue(row.protocol),
        included: formatTableValue(row.includeInDeduction),
        notes: formatTableValue(row.notes),
      });
    });
  };

  pushRows('Management / Strategic Holdings', userInputs.privateHoldings);
  pushRows('Traditional Custody Rows', userInputs.custodyRows);
  pushRows('Tokenized Chains & Providers', userInputs.tokenChains);
  pushRows('Collateralized Chains & Protocols', userInputs.collateralChains);
  return rows;
}

export default async function InternalFloatV2Page({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker.toUpperCase();
  const timeZone = await getServerPortalTimeZone();
  const holdingsEnvelope = await readInternalFloatInputs();
  const holdings = holdingsEnvelope.data;
  const pageDataSource = pageDataSources['internal-float-v2'];
  const pageImportFiles = pageDataSource.type === 'import-files'
    ? ['institutional_ownership_CURR_consolidated_4_web.json', internalFloatV2UserInputPaths(normalizedTicker)[0]]
    : [];
  const [adjustments, v2UserInputs, importDataVersion, institutionalOwnershipEnvelope] = await Promise.all([
    calculateFloatAdjustments(holdings) as Promise<FloatAdjustments>,
    readInternalFloatV2UserInputs('demo-user', normalizedTicker),
    getImportFilesVersion(pageImportFiles),
    readImportFile<{ overview?: InstitutionalOwnershipOverview }>('institutional_ownership_CURR_consolidated_4_web.json'),
  ]);
  const devRows = buildUserInputRows(v2UserInputs);

  return (
    <div className="page dashboard-page internal-float-page internal-float-v2-page">
      <div className="page__header dashboard-command-header">
        <div>
          <div className="terminal-eyebrow internal-float-v2-eyebrow">
            <span>Private Internal Input</span>
            <span className="page-header-import-status" aria-label="Latest import data update">
              <span>Latest import data update</span>
              <strong>{formatImportDataUpdatedAt(importDataVersion.updatedAt, timeZone)}</strong>
            </span>
          </div>
          <h1 className="page__title">Share Allocation &amp; Tradable Float Intelligence</h1>
          <p className="page__desc">Analyze ownership structure, public float composition, tokenized shares, collateralized shares, and estimated real tradable float.</p>
        </div>
      </div>

      <section className="internal-float-v2-tips" aria-label="Internal float usage tips">
        <strong><span aria-hidden="true">💡</span> Tips</strong>
        <ul>
          <li>Start with official shares outstanding and public float.</li>
          <li>Add management / strategic holdings, tokenized shares, and collateralized shares.</li>
          <li>Use each section&apos;s Edit button to test assumptions and update real tradable float instantly.</li>
        </ul>
      </section>

      <InternalFloatV2Client
        initialHoldings={holdings}
        initialAdjustments={adjustments}
        initialUserInputs={v2UserInputs}
        institutionalOverview={institutionalOwnershipEnvelope.data.overview}
      />

      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head">
          <div>
            <span>Development Data</span>
            <h2>Internal Float V2 User Input JSON</h2>
            <p className="section-subtitle">Rows from import_data/{internalFloatV2UserInputPaths(normalizedTicker)[0]}.</p>
          </div>
        </div>
        <ImportDataTable
          columns={['section', 'id', 'label', 'shares', 'category', 'provider', 'protocol', 'included', 'notes']}
          rows={devRows}
          pageSize={25}
        />
      </section>
    </div>
  );
}

import { buildDashboard, normalizeTicker } from '@/lib/mock-data';
import type { CompanyRecord, InstitutionalHolding, OptionsData, ShortInterestData, SourceMeta } from '@/lib/types';

type DashboardBundle = ReturnType<typeof buildDashboard>;
type FintelFetchResult = { ok: true; data: unknown } | { ok: false; status: number; statusText: string };
type FintelStatus = 'Not Configured' | 'Configured' | 'Available' | 'Error';

type FintelContext = {
  configured: boolean;
  status: FintelStatus;
  hadResponse: boolean;
  hadError: boolean;
  fetchJson: (path: string) => Promise<FintelFetchResult>;
};

const FINTEL_BASE_URL = 'https://api.fintel.io';
const FINTEL_SOURCE: SourceMeta = { source_type: 'fintel', source_label: 'fintel' };
const REQUEST_TIMEOUT_MS = 8000;

function getFintelApiKey() {
  return process.env.FINTEL_API_KEY?.trim() ?? '';
}

export function getFintelStatusSummary(): FintelStatus {
  return getFintelApiKey() ? 'Configured' : 'Not Configured';
}

function fintelStatusFromContext(context: FintelContext): FintelStatus {
  if (!context.configured) return 'Not Configured';
  if (context.hadResponse) return 'Available';
  if (context.hadError) return 'Error';
  return 'Configured';
}

function makeFintelContext(): FintelContext {
  const apiKey = getFintelApiKey();
  const context: FintelContext = {
    configured: Boolean(apiKey),
    status: apiKey ? 'Configured' : 'Not Configured',
    hadResponse: false,
    hadError: false,
    fetchJson: async (path: string) => {
      if (!apiKey) return { ok: false, status: 401, statusText: 'Not Configured' };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${FINTEL_BASE_URL}${path}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-API-Key': apiKey,
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          context.hadError = true;
          return { ok: false, status: response.status, statusText: response.statusText };
        }
        context.hadResponse = true;
        return { ok: true, data: await response.json() };
      } catch {
        context.hadError = true;
        return { ok: false, status: 0, statusText: 'Network Error' };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
  return context;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstPayloadRecord(value: unknown): Record<string, unknown> | null {
  const direct = asRecord(value);
  if (!direct) return null;
  for (const key of ['data', 'result', 'company', 'security']) {
    const nested = asRecord(direct[key]);
    if (nested) return nested;
  }
  return direct;
}

function payloadArray(value: unknown, keys: string[]): Record<string, unknown>[] {
  const direct = Array.isArray(value) ? value : null;
  if (direct) return direct.filter(asRecord) as Record<string, unknown>[];

  const root = asRecord(value);
  if (!root) return [];
  for (const key of keys) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate.filter(asRecord) as Record<string, unknown>[];
    const nested = asRecord(candidate);
    if (nested) {
      for (const nestedKey of keys) {
        const nestedCandidate = nested[nestedKey];
        if (Array.isArray(nestedCandidate)) return nestedCandidate.filter(asRecord) as Record<string, unknown>[];
      }
    }
  }
  const nestedData = asRecord(root.data);
  if (nestedData) {
    for (const key of keys) {
      const candidate = nestedData[key];
      if (Array.isArray(candidate)) return candidate.filter(asRecord) as Record<string, unknown>[];
    }
  }
  return [];
}

function pick(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString('en-US');
  }
  return undefined;
}

function mergeCompany(company: CompanyRecord, payload: unknown): CompanyRecord {
  const record = firstPayloadRecord(payload);
  const companyName = pick(record, ['company_name', 'companyName', 'name', 'issuerName']);
  const exchange = pick(record, ['exchange', 'market', 'primaryExchange']);
  const cik = pick(record, ['cik', 'CIK']);
  const sector = pick(record, ['sector']);
  const industry = pick(record, ['industry']);
  if (!companyName && !exchange && !cik && !sector && !industry) return company;
  return {
    ...company,
    company_name: companyName ?? company.company_name,
    exchange: exchange ?? company.exchange,
    cik: cik ?? company.cik,
    sector: sector ?? company.sector,
    industry: industry ?? company.industry,
    ...FINTEL_SOURCE,
  };
}

function mergeShortInterest(current: ShortInterestData, payload: unknown): ShortInterestData {
  const latestShortVolume = payloadArray(payload, ['data', 'results', 'shortVolume']).at(0) ?? null;
  const record = latestShortVolume ?? firstPayloadRecord(payload);
  const officialShortInterest = pick(record, ['official_short_interest', 'shortInterest', 'short_interest', 'sharesShort']);
  const shortPercentFloat = pick(record, ['short_percent_float', 'shortPercentFloat', 'shortFloat', 'short_float_percent']);
  const daysToCover = pick(record, ['days_to_cover', 'daysToCover']);
  const shortVolume = pick(record, ['finra_short_volume', 'shortVolume', 'finraShortVolume']);
  const shortVolumeRatio = pick(record, ['finra_short_volume_ratio', 'shortVolumeRatio', 'finraShortVolumeRatio']);
  const ftd = pick(record, ['sec_ftd', 'failuresToDeliver', 'ftd']);
  if (!officialShortInterest && !shortPercentFloat && !daysToCover && !shortVolume && !shortVolumeRatio && !ftd) return current;
  return {
    ...current,
    official_short_interest: officialShortInterest ?? current.official_short_interest,
    short_percent_float: shortPercentFloat ?? current.short_percent_float,
    days_to_cover: daysToCover ?? current.days_to_cover,
    finra_short_volume: shortVolume ?? current.finra_short_volume,
    finra_short_volume_ratio: shortVolumeRatio ?? current.finra_short_volume_ratio,
    sec_ftd: ftd ?? current.sec_ftd,
    api_status: latestShortVolume ? `Fintel short-volume data returned for ${pick(latestShortVolume, ['marketDate']) ?? 'latest session'}` : 'Fintel HTTP data returned',
    ...FINTEL_SOURCE,
  };
}

function normalizeChangeType(value: string | undefined, absoluteChange?: string | number | null): InstitutionalHolding['change_type'] {
  const lower = value?.toLowerCase() ?? '';
  if (lower.includes('exit')) return 'exited';
  if (lower.includes('reduc') || lower.includes('decreas')) return 'reduced';
  if (lower.includes('increas') || lower.includes('add')) return 'increased';
  if (lower.includes('new')) return 'new';

  if (typeof absoluteChange === 'number' && Number.isFinite(absoluteChange)) {
    if (absoluteChange > 0) return 'increased';
    if (absoluteChange < 0) return 'reduced';
  }
  if (typeof absoluteChange === 'string' && absoluteChange.trim()) {
    const numeric = Number(absoluteChange.replace(/,/g, ''));
    if (Number.isFinite(numeric)) {
      if (numeric > 0) return 'increased';
      if (numeric < 0) return 'reduced';
    }
  }
  return 'unchanged';
}

function formatNumeric(value: string | number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (Number.isFinite(numeric)) return numeric.toLocaleString('en-US', options);
  return String(value);
}

function formatPercentValue(value: string | number | null | undefined) {
  const formatted = formatNumeric(value, { maximumFractionDigits: 2 });
  return formatted ? `${formatted}%` : undefined;
}

function formatThousands(value: string | number | null | undefined) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return undefined;
  return (numeric / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function normalizeOwnershipRows(payload: unknown): Record<string, unknown>[] {
  return payloadArray(payload, ['owners', 'holdings', 'institutionalHoldings', 'institutional_ownership', 'data', 'results']);
}

function mergeInstitutionalHoldings(current: InstitutionalHolding[], ticker: string, payload: unknown): InstitutionalHolding[] {
  const rows = normalizeOwnershipRows(payload);
  const normalized: InstitutionalHolding[] = [];
  rows.forEach((row, index) => {
    const fundName = pick(row, ['fund_name', 'fundName', 'ownerName', 'investorName', 'holder', 'name']);
    if (!fundName) return;
    const sharesChangeRaw = row.sharesChange ?? row.shares_change ?? row.change;
    normalized.push({
      id: `fintel-holding-${ticker}-${index}`,
      company_id: `company-${ticker}`,
      fund_name: fundName,
      shares: formatThousands(row.shares as string | number | null | undefined) ?? formatNumeric(row.shares as string | number | null | undefined) ?? pick(row, ['sharesHeld', 'position']) ?? 'Fintel returned',
      market_value: formatThousands(row.value as string | number | null | undefined) ?? formatNumeric(row.value as string | number | null | undefined) ?? pick(row, ['market_value', 'marketValue']) ?? 'Fintel returned',
      change_type: normalizeChangeType(pick(row, ['change_type', 'changeType']), sharesChangeRaw as string | number | null | undefined),
      filing_date: pick(row, ['fileDate', 'filing_date', 'filingDate', 'reportDate', 'date']) ?? new Date().toISOString().slice(0, 10),
      source: pick(row, ['formType']) ?? 'fintel',
      ownership_percent: formatPercentValue(row.ownershipPercent as string | number | null | undefined),
      shares_change: formatNumeric(sharesChangeRaw as string | number | null | undefined),
      shares_change_percent: formatPercentValue((row.sharesPercentChange ?? row.shares_percent_change) as string | number | null | undefined),
      value_change: formatNumeric((row.valueChange ?? row.value_change) as string | number | null | undefined),
      value_change_percent: formatPercentValue((row.valuePercentChange ?? row.value_percent_change) as string | number | null | undefined),
      form_type: pick(row, ['formType']),
      effective_date: pick(row, ['effectiveDate']),
      owner_url: pick(row, ['url']),
      cost_basis: formatThousands((row.costBasis ?? row.cost_basis) as string | number | null | undefined) ?? 'N/A',
      ...FINTEL_SOURCE,
    });
  });
  return normalized.length > 0 ? normalized : current;
}

function mergeOptionsData(current: OptionsData, payload: unknown): OptionsData {
  const record = firstPayloadRecord(payload);
  const putCallRatio = pick(record, ['put_call_ratio', 'putCallRatio']);
  const optionVolume = pick(record, ['option_volume', 'optionVolume', 'volume']);
  const openInterest = pick(record, ['open_interest', 'openInterest']);
  const expirations = pick(record, ['major_expirations', 'majorExpirations', 'expiration', 'expirations']);
  const maxPain = pick(record, ['max_pain', 'maxPain']);
  const gammaExposure = pick(record, ['gamma_exposure', 'gammaExposure', 'gex']);
  const gammaFlip = pick(record, ['dealer_gamma_flip', 'gammaFlip', 'dealerGammaFlip']);
  const dealerPositioning = pick(record, ['dealer_positioning', 'dealerPositioning']);
  const unusualFlow = pick(record, ['unusual_flow', 'unusualFlow']);
  if (!putCallRatio && !optionVolume && !openInterest && !expirations && !maxPain && !gammaExposure && !gammaFlip && !dealerPositioning && !unusualFlow) return current;
  return {
    ...current,
    put_call_ratio: putCallRatio ?? current.put_call_ratio,
    option_volume: optionVolume ?? current.option_volume,
    open_interest: openInterest ?? current.open_interest,
    major_expirations: expirations ?? current.major_expirations,
    max_pain: maxPain ?? current.max_pain,
    gamma_exposure: gammaExposure ?? current.gamma_exposure,
    dealer_gamma_flip: gammaFlip ?? current.dealer_gamma_flip,
    dealer_positioning: dealerPositioning ?? current.dealer_positioning,
    unusual_flow: unusualFlow ?? current.unusual_flow,
    api_status: 'Fintel HTTP data returned',
    ...FINTEL_SOURCE,
  };
}

async function firstSuccessfulJson(context: FintelContext, paths: string[]) {
  for (const path of paths) {
    const response = await context.fetchJson(path);
    if (response.ok) return response.data;
  }
  return null;
}

export async function buildDashboardWithFintel(tickerInput: string): Promise<DashboardBundle> {
  const ticker = normalizeTicker(tickerInput);
  const dashboard = buildDashboard(ticker);
  const context = makeFintelContext();

  if (!context.configured) {
    return {
      ...dashboard,
      apiStatus: { ...dashboard.apiStatus, Fintel: 'Not Configured' },
    };
  }

  const lowerTicker = ticker.toLowerCase();
  const [companyPayload, shortPayload, institutionalPayload, optionsPayload] = await Promise.all([
    firstSuccessfulJson(context, [`/web/v/0.0/so/us/${lowerTicker}`, `/data/v/0.0/so/us/${lowerTicker}`, `/data/v/0.0/so/${lowerTicker}`]),
    firstSuccessfulJson(context, [`/web/v/0.0/ss/us/${lowerTicker}`]),
    firstSuccessfulJson(context, [`/web/v/0.0/so/us/${lowerTicker}`, `/data/v/0.0/so/us/${lowerTicker}`, `/data/v/0.0/so/${lowerTicker}`]),
    firstSuccessfulJson(context, [`/data/v/0.0/options/us/${lowerTicker}`, `/data/v/0.0/option/us/${lowerTicker}`, `/data/v/0.0/op/us/${lowerTicker}`]),
  ]);

  const apiStatus = { ...dashboard.apiStatus, Fintel: fintelStatusFromContext(context) };
  return {
    ...dashboard,
    company: companyPayload ? mergeCompany(dashboard.company, companyPayload) : dashboard.company,
    shortInterest: shortPayload ? mergeShortInterest(dashboard.shortInterest, shortPayload) : dashboard.shortInterest,
    institutionalHoldings: institutionalPayload ? mergeInstitutionalHoldings(dashboard.institutionalHoldings, ticker, institutionalPayload) : dashboard.institutionalHoldings,
    optionsData: optionsPayload ? mergeOptionsData(dashboard.optionsData, optionsPayload) : dashboard.optionsData,
    apiStatus,
  };
}

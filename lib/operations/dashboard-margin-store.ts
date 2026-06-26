import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type DashboardMarginRecord = {
  id: string;
  ticker: string;
  date: string;
  initialMargin: number;
  maintenanceMargin: number;
  averageDurationDays: number;
  updatedAt: string;
  updatedBy: string;
};

export type DashboardMarginFile = {
  source: 'operations_manual_input';
  schemaVersion: 1;
  updatedAt: string;
  s3Key: string;
  records: DashboardMarginRecord[];
};

const localStorePath = path.join(process.cwd(), 'import_data', 'dashboard', 'CURR_margin_inputs.json');
const defaultS3Key = 'dashboard/CURR_margin_inputs.json';

function s3Key() {
  return process.env.OPERATIONS_DASHBOARD_MARGIN_S3_KEY?.trim() || defaultS3Key;
}

function shouldUseS3() {
  return process.env.IMPORT_DATA_SOURCE === 's3' && Boolean(process.env.AWS_S3_BUCKET_NAME);
}

function blankFile(): DashboardMarginFile {
  return {
    source: 'operations_manual_input',
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    s3Key: s3Key(),
    records: [],
  };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[%,$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: unknown) {
  const raw = normalizeText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function stableRecordId(ticker: string, date: string) {
  return crypto.createHash('sha256').update(`${ticker.toUpperCase()}|${date}`).digest('hex').slice(0, 16);
}

function normalizeRecord(input: Partial<DashboardMarginRecord>): DashboardMarginRecord {
  const ticker = normalizeText(input.ticker || 'CURR').toUpperCase();
  const date = normalizeDate(input.date);
  return {
    id: input.id || stableRecordId(ticker, date),
    ticker,
    date,
    initialMargin: numeric(input.initialMargin),
    maintenanceMargin: numeric(input.maintenanceMargin),
    averageDurationDays: numeric(input.averageDurationDays),
    updatedAt: normalizeText(input.updatedAt) || new Date().toISOString(),
    updatedBy: normalizeText(input.updatedBy || 'operations'),
  };
}

function normalizeFile(parsed: Partial<DashboardMarginFile>): DashboardMarginFile {
  return {
    ...blankFile(),
    ...parsed,
    source: 'operations_manual_input',
    schemaVersion: 1,
    s3Key: parsed.s3Key || s3Key(),
    records: Array.isArray(parsed.records) ? parsed.records.map(normalizeRecord) : [],
  };
}

function localRead(): DashboardMarginFile {
  if (!fs.existsSync(localStorePath)) return blankFile();
  return normalizeFile(JSON.parse(fs.readFileSync(localStorePath, 'utf8')) as Partial<DashboardMarginFile>);
}

function localWrite(file: DashboardMarginFile) {
  fs.mkdirSync(path.dirname(localStorePath), { recursive: true });
  fs.writeFileSync(localStorePath, `${JSON.stringify(file, null, 2)}\n`);
}

function s3Config() {
  const region = process.env.AWS_REGION?.trim() || 'us-east-1';
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 dashboard margin writes require AWS_REGION, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
  }
  return { region, bucket, accessKeyId, secretAccessKey };
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeS3Key(key: string) {
  return key.split('/').map(awsEncode).join('/');
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function hmac(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function signingKey(secretAccessKey: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

async function signedS3Request(method: 'GET' | 'PUT', key: string, body = '') {
  const { region, bucket, accessKeyId, secretAccessKey } = s3Config();
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const canonicalUri = `/${encodeS3Key(key)}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secretAccessKey, dateStamp, region)).update(stringToSign, 'utf8').digest('hex');

  return fetch(`https://${host}${canonicalUri}`, {
    method,
    cache: 'no-store',
    body: method === 'PUT' ? body : undefined,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'content-type': 'application/json',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
}

async function s3Read(): Promise<DashboardMarginFile> {
  const response = await signedS3Request('GET', s3Key());
  if (response.status === 404) return blankFile();
  if (!response.ok) throw new Error(`Unable to read dashboard margin inputs from S3: ${response.status} ${response.statusText}`);
  return normalizeFile(await response.json() as Partial<DashboardMarginFile>);
}

async function s3Write(file: DashboardMarginFile) {
  const response = await signedS3Request('PUT', s3Key(), `${JSON.stringify(file, null, 2)}\n`);
  if (!response.ok) throw new Error(`Unable to write dashboard margin inputs to S3: ${response.status} ${response.statusText}`);
}

export async function readDashboardMargins() {
  if (!shouldUseS3()) return { ...localRead(), storage: 'local' as const };
  try {
    return { ...await s3Read(), storage: 's3' as const };
  } catch (error) {
    if (process.env.IMPORT_DATA_LOCAL_FALLBACK === 'true') return { ...localRead(), storage: 'local' as const };
    throw error;
  }
}

export async function saveDashboardMargin(input: Partial<DashboardMarginRecord>) {
  const current = await readDashboardMargins();
  const now = new Date().toISOString();
  const record = normalizeRecord({ ...input, updatedAt: now });
  const existingIndex = current.records.findIndex(row => row.ticker === record.ticker && row.date === record.date);
  const nextRecords = [...current.records];
  nextRecords[existingIndex >= 0 ? existingIndex : nextRecords.length] = {
    ...record,
    id: existingIndex >= 0 ? nextRecords[existingIndex].id : record.id,
  };
  const nextFile: DashboardMarginFile = {
    source: 'operations_manual_input',
    schemaVersion: 1,
    updatedAt: now,
    s3Key: s3Key(),
    records: nextRecords.sort((a, b) => b.date.localeCompare(a.date)),
  };

  if (shouldUseS3()) await s3Write(nextFile);
  else localWrite(nextFile);

  return { ...nextFile, storage: shouldUseS3() ? 's3' as const : 'local' as const, savedRecord: record };
}

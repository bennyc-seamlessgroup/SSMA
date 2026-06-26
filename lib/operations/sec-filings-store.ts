import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type OperationsSecFilingRecord = {
  id: string;
  ticker: string;
  companyName: string;
  formType: string;
  formDescription: string;
  filingDate: string;
  reportingDate: string;
  act: string;
  filmNumber: string;
  fileNumber: string;
  accessionNumber: string;
  filingsUrl: string;
  notes: string;
  createdAt: string;
  createdBy: string;
};

export type OperationsSecFilingLogEntry = {
  id: string;
  action: 'created' | 'updated';
  recordId: string;
  accessionNumber: string;
  formType: string;
  filingDate: string;
  savedAt: string;
  savedBy: string;
};

export type OperationsSecFilingsFile = {
  source: 'operations_manual_input';
  schemaVersion: 1;
  updatedAt: string;
  s3Key: string;
  records: OperationsSecFilingRecord[];
  log: OperationsSecFilingLogEntry[];
};

type LegacySecFilingRow = {
  title?: unknown;
  formType?: unknown;
  url?: unknown;
  excerpt?: unknown;
  publishDate?: unknown;
  publishAt?: unknown;
  sourcePlatform?: unknown;
};

const localStorePath = path.join(process.cwd(), 'import_data', 'news_filings', 'CURR_sec_filings.json');
const defaultS3Key = 'news_filings/CURR_sec_filings.json';

function s3Key() {
  return process.env.OPERATIONS_SEC_FILINGS_S3_KEY?.trim() || defaultS3Key;
}

function shouldUseS3() {
  return process.env.IMPORT_DATA_SOURCE === 's3' && Boolean(process.env.AWS_S3_BUCKET_NAME);
}

function blankFile(): OperationsSecFilingsFile {
  return {
    source: 'operations_manual_input',
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    s3Key: s3Key(),
    records: [],
    log: [],
  };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function stableRecordId(record: Pick<OperationsSecFilingRecord, 'accessionNumber' | 'formType' | 'filingDate' | 'filingsUrl'>) {
  const source = [
    normalizeText(record.accessionNumber),
    normalizeText(record.formType).toUpperCase(),
    normalizeText(record.filingDate),
    normalizeText(record.filingsUrl),
  ].join('|');
  return crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
}

function normalizeRecord(input: Partial<OperationsSecFilingRecord>): OperationsSecFilingRecord {
  const now = new Date().toISOString();
  const base = {
    ticker: normalizeText(input.ticker || 'CURR').toUpperCase(),
    companyName: normalizeText(input.companyName || 'CURRENC Group Inc.'),
    formType: normalizeText(input.formType),
    formDescription: normalizeText(input.formDescription),
    filingDate: normalizeText(input.filingDate),
    reportingDate: normalizeText(input.reportingDate),
    act: normalizeText(input.act),
    filmNumber: normalizeText(input.filmNumber),
    fileNumber: normalizeText(input.fileNumber),
    accessionNumber: normalizeText(input.accessionNumber),
    filingsUrl: normalizeText(input.filingsUrl),
    notes: normalizeText(input.notes),
    createdAt: input.createdAt || now,
    createdBy: normalizeText(input.createdBy || 'operations'),
  };

  return {
    id: input.id || stableRecordId(base),
    ...base,
  };
}

function stableLogId(input: Partial<OperationsSecFilingLogEntry> & Record<string, unknown>, index: number) {
  const source = [
    normalizeText(input.savedAt || input.timestamp),
    normalizeText(input.action),
    normalizeText(input.recordId),
    normalizeText(input.accessionNumber),
    normalizeText(input.formType),
    String(index),
  ].join('|');
  return crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
}

function normalizeLogEntry(input: Partial<OperationsSecFilingLogEntry> & Record<string, unknown>, index: number): OperationsSecFilingLogEntry {
  const actionText = normalizeText(input.action);
  const action = actionText === 'created' || actionText === 'updated' ? actionText : 'updated';

  return {
    id: normalizeText(input.id) || stableLogId(input, index),
    action,
    recordId: normalizeText(input.recordId) || normalizeText(input.accessionNumber) || 'bulk-update',
    accessionNumber: normalizeText(input.accessionNumber) || normalizeText(input.recordCount ? `${input.recordCount} records` : ''),
    formType: normalizeText(input.formType) || actionText || 'SEC FILINGS',
    filingDate: normalizeText(input.filingDate),
    savedAt: normalizeText(input.savedAt || input.timestamp) || new Date().toISOString(),
    savedBy: normalizeText(input.savedBy) || 'operations',
  };
}

function accessionFromUrl(value: unknown) {
  const url = normalizeText(value);
  const match = url.match(/\/([^/]+)-index\.htm$/);
  return match?.[1] ?? '';
}

function normalizeLegacyRecord(input: LegacySecFilingRow): OperationsSecFilingRecord {
  return normalizeRecord({
    ticker: 'CURR',
    companyName: 'CURRENC Group Inc.',
    formType: normalizeText(input.formType),
    formDescription: normalizeText(input.title || input.excerpt),
    filingDate: normalizeText(input.publishDate),
    reportingDate: '',
    accessionNumber: accessionFromUrl(input.url),
    filingsUrl: normalizeText(input.url),
    notes: normalizeText(input.excerpt),
    createdAt: normalizeText(input.publishAt) || undefined,
    createdBy: normalizeText(input.sourcePlatform) || 'import-data',
  });
}

function normalizeFile(parsed: Partial<OperationsSecFilingsFile> & { data?: unknown }): OperationsSecFilingsFile {
  const records = Array.isArray(parsed.records)
    ? parsed.records.map(normalizeRecord)
    : Array.isArray(parsed.data)
      ? parsed.data.map(row => normalizeLegacyRecord(row as LegacySecFilingRow))
      : [];

  return {
    ...blankFile(),
    ...parsed,
    source: 'operations_manual_input',
    schemaVersion: 1,
    s3Key: parsed.s3Key || s3Key(),
    records,
    log: Array.isArray(parsed.log) ? parsed.log.map((row, index) => normalizeLogEntry(row as Partial<OperationsSecFilingLogEntry> & Record<string, unknown>, index)) : [],
  };
}

function validateRecord(record: OperationsSecFilingRecord) {
  const missing = [
    ['formType', record.formType],
    ['formDescription', record.formDescription],
    ['filingDate', record.filingDate],
    ['accessionNumber', record.accessionNumber],
    ['filingsUrl', record.filingsUrl],
  ].filter(([, value]) => !value).map(([field]) => field);

  if (missing.length) {
    throw new Error(`Missing required SEC filing fields: ${missing.join(', ')}`);
  }
}

function localRead(): OperationsSecFilingsFile {
  if (!fs.existsSync(localStorePath)) return blankFile();
  const parsed = JSON.parse(fs.readFileSync(localStorePath, 'utf8')) as Partial<OperationsSecFilingsFile> & { data?: unknown };
  return normalizeFile(parsed);
}

function localWrite(file: OperationsSecFilingsFile) {
  fs.mkdirSync(path.dirname(localStorePath), { recursive: true });
  fs.writeFileSync(localStorePath, `${JSON.stringify(file, null, 2)}\n`);
}

function s3Config() {
  const region = process.env.AWS_REGION?.trim() || 'us-east-1';
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 write requires AWS_REGION, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
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

function s3SigningKey(secretAccessKey: string, dateStamp: string, region: string) {
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
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = crypto.createHmac('sha256', s3SigningKey(secretAccessKey, dateStamp, region)).update(stringToSign, 'utf8').digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`https://${host}${canonicalUri}`, {
    method,
    cache: 'no-store',
    body: method === 'PUT' ? body : undefined,
    headers: {
      Authorization: authorization,
      'content-type': 'application/json',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
}

async function s3Read(): Promise<OperationsSecFilingsFile> {
  const response = await signedS3Request('GET', s3Key());
  if (response.status === 404) return blankFile();
  if (!response.ok) throw new Error(`Unable to read operations SEC filings from S3: ${response.status} ${response.statusText}`);
  const parsed = await response.json() as Partial<OperationsSecFilingsFile> & { data?: unknown };
  return normalizeFile(parsed);
}

async function s3Write(file: OperationsSecFilingsFile) {
  const response = await signedS3Request('PUT', s3Key(), `${JSON.stringify(file, null, 2)}\n`);
  if (!response.ok) throw new Error(`Unable to write operations SEC filings to S3: ${response.status} ${response.statusText}`);
}

export async function readOperationsSecFilings() {
  if (!shouldUseS3()) return { ...localRead(), storage: 'local' as const };
  return { ...await s3Read(), storage: 's3' as const };
}

export async function saveOperationsSecFiling(input: Partial<OperationsSecFilingRecord>) {
  const current = await readOperationsSecFilings();
  const record = normalizeRecord(input);
  validateRecord(record);

  const existingIndex = current.records.findIndex(row => row.id === record.id || row.accessionNumber === record.accessionNumber);
  const action: OperationsSecFilingLogEntry['action'] = existingIndex >= 0 ? 'updated' : 'created';
  const nextRecords = [...current.records];
  nextRecords[existingIndex >= 0 ? existingIndex : nextRecords.length] = {
    ...record,
    createdAt: existingIndex >= 0 ? nextRecords[existingIndex].createdAt : record.createdAt,
  };

  const logEntry: OperationsSecFilingLogEntry = {
    id: crypto.randomUUID(),
    action,
    recordId: record.id,
    accessionNumber: record.accessionNumber,
    formType: record.formType,
    filingDate: record.filingDate,
    savedAt: new Date().toISOString(),
    savedBy: record.createdBy,
  };

  const nextFile: OperationsSecFilingsFile = {
    source: 'operations_manual_input',
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    s3Key: s3Key(),
    records: nextRecords.sort((a, b) => b.filingDate.localeCompare(a.filingDate) || a.formType.localeCompare(b.formType)),
    log: [logEntry, ...current.log].slice(0, 100),
  };

  if (shouldUseS3()) {
    await s3Write(nextFile);
  } else {
    localWrite(nextFile);
  }

  return { ...nextFile, storage: shouldUseS3() ? 's3' as const : 'local' as const, savedRecord: record, action };
}

export async function replaceOperationsSecFilings(inputs: Array<Partial<OperationsSecFilingRecord>>, savedBy = 'operations-import') {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const records = inputs.map(input => normalizeRecord({
    ...input,
    createdAt: input.createdAt || now,
    createdBy: input.createdBy || savedBy,
  })).filter(record => {
    validateRecord(record);
    const key = record.accessionNumber || record.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.filingDate.localeCompare(a.filingDate) || a.formType.localeCompare(b.formType));

  const logEntry: OperationsSecFilingLogEntry = {
    id: crypto.randomUUID(),
    action: 'updated',
    recordId: 'bulk-replace',
    accessionNumber: `${records.length} records`,
    formType: 'CSV IMPORT',
    filingDate: records[0]?.filingDate ?? '',
    savedAt: now,
    savedBy,
  };

  const nextFile: OperationsSecFilingsFile = {
    source: 'operations_manual_input',
    schemaVersion: 1,
    updatedAt: now,
    s3Key: s3Key(),
    records,
    log: [logEntry],
  };

  if (shouldUseS3()) {
    await s3Write(nextFile);
  } else {
    localWrite(nextFile);
  }

  return { ...nextFile, storage: shouldUseS3() ? 's3' as const : 'local' as const, importedRecords: records.length };
}

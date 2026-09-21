export type SocialCsvValidationIssue = {
  fileName: string;
  row: number;
  value: string;
  reason: string;
};

export type SocialCsvValidationResult = {
  rowCount: number;
  issues: SocialCsvValidationIssue[];
};

const acceptedDateTimeDescription = 'YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, or ISO 8601 such as YYYY-MM-DDTHH:mm:ssZ';

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && character === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (!quoted && (character === '\n' || character === '\r')) {
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      continue;
    }
    field += character;
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function validSocialDateTime(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?)?$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;

  if (match[4] !== undefined) {
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = match[6] === undefined ? 0 : Number(match[6]);
    if (hour > 23 || minute > 59 || second > 59) return false;
  }

  const timeZone = match[8];
  if (timeZone && timeZone !== 'Z') {
    const [offsetHours, offsetMinutes] = timeZone.slice(1).split(':').map(Number);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) return false;
  }
  return true;
}

export function socialCsvDateTimeFormat() {
  return acceptedDateTimeDescription;
}

export async function validateSocialCsvFile(file: File): Promise<SocialCsvValidationResult> {
  let rows: string[][];
  try {
    rows = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
  } catch (error) {
    return {
      rowCount: 0,
      issues: [{
        fileName: file.name,
        row: 1,
        value: '',
        reason: error instanceof Error ? error.message : 'The CSV could not be parsed.',
      }],
    };
  }

  if (!rows.length) {
    return {
      rowCount: 0,
      issues: [{ fileName: file.name, row: 1, value: '', reason: 'The CSV is empty.' }],
    };
  }

  const headers = rows[0].map(value => value.trim().toLowerCase());
  const datetimeIndex = headers.indexOf('datetime');
  if (datetimeIndex < 0) {
    return {
      rowCount: Math.max(0, rows.length - 1),
      issues: [{ fileName: file.name, row: 1, value: '', reason: 'The required datetime column is missing.' }],
    };
  }

  const dataRows = rows.slice(1).filter(row => row.some(value => value.trim()));
  if (!dataRows.length) {
    return {
      rowCount: 0,
      issues: [{ fileName: file.name, row: 1, value: '', reason: 'The CSV has no data rows.' }],
    };
  }

  const issues = dataRows.flatMap((row, index): SocialCsvValidationIssue[] => {
    const value = String(row[datetimeIndex] ?? '').trim();
    if (!value) {
      return [{ fileName: file.name, row: index + 2, value, reason: 'datetime is required.' }];
    }
    if (!validSocialDateTime(value)) {
      return [{
        fileName: file.name,
        row: index + 2,
        value,
        reason: `datetime must use ${acceptedDateTimeDescription}.`,
      }];
    }
    return [];
  });

  return { rowCount: dataRows.length, issues };
}

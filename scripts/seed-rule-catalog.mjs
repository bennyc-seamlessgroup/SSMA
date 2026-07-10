import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const apiBase = process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'https://3flfpju5k8.execute-api.us-east-1.amazonaws.com/dev';
const idToken = process.env.RULE_CATALOG_ID_TOKEN || process.env.ID_TOKEN || process.env.COGNITO_ID_TOKEN;
const payloadPath = process.argv[2] || path.join(process.cwd(), 'scripts', 'rule-catalog-seed.json');

if (!idToken) {
  console.error('Missing operator/admin id token. Set RULE_CATALOG_ID_TOKEN before running this script.');
  console.error('Example: RULE_CATALOG_ID_TOKEN="<id_token>" node scripts/seed-rule-catalog.mjs');
  process.exit(1);
}

const entries = JSON.parse(await fs.readFile(payloadPath, 'utf8'));
if (!Array.isArray(entries)) {
  throw new Error(`Expected an array in ${payloadPath}`);
}

for (const entry of entries) {
  const response = await fetch(`${apiBase}/rule-catalog`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`Failed: ${entry.catalogId} (${response.status} ${response.statusText})`);
    console.error(text);
    process.exit(1);
  }

  console.log(`Seeded: ${entry.catalogId}`);
}

console.log(`Completed ${entries.length} rule catalog entries.`);

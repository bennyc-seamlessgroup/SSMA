import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOwnershipSubmission,
  calculateOwnershipDifference,
  currentHoldersFromRecords,
  parseShareTotal,
  validateOwnershipEntry,
} from './ownership-entry.js';

test('calculates increase, decrease, and no-change states from latest totals', () => {
  assert.deepEqual(calculateOwnershipDifference(1_000, 1_250), {
    previousShares: 1_000,
    latestTotalShares: 1_250,
    signedDifference: 250,
    absoluteDifference: 250,
    state: 'increase',
    action: 'add',
  });
  assert.equal(calculateOwnershipDifference(1_000, 700).signedDifference, -300);
  assert.equal(calculateOwnershipDifference(1_000, 700).state, 'decrease');
  assert.equal(calculateOwnershipDifference(1_000, 1_000).state, 'no-change');
});

test('aggregates current holders from legacy add and deduct records', () => {
  const holders = currentHoldersFromRecords([
    { id: 'one', holderName: 'Example Capital', category: 'Strategic Investor', shares: 1_000, action: 'add', showInOwnership: true, status: 'pending' },
    { id: 'two', holderName: ' example   capital ', category: 'Strategic Investor', shares: 250, action: 'deduct', showInOwnership: true, status: 'applied' },
    { id: 'hidden', holderName: 'Hidden Holder', shares: 500, action: 'add', showInOwnership: false },
  ]);
  assert.equal(holders.length, 1);
  assert.equal(holders[0].priorTotalShares, 750);
});

test('prefers an explicit signed difference while remaining compatible with legacy action fields', () => {
  const holders = currentHoldersFromRecords([
    { id: 'new-base', holderName: 'Example Capital', category: 'Strategic Investor', shares: 1_000, action: 'add' },
    { id: 'new', holderName: 'Example Capital', category: 'Strategic Investor', shares: 999_999, sharesChange: -125, action: 'add' },
    { id: 'legacy-base', holderName: 'Legacy Capital', category: 'Management', shares: 1_000, action: 'add' },
    { id: 'legacy', holderName: 'Legacy Capital', category: 'Management', shares: 250, action: 'deduct' },
  ]);
  assert.equal(holders.find(row => row.holderName === 'Example Capital').priorTotalShares, 875);
  assert.equal(holders.find(row => row.holderName === 'Legacy Capital').priorTotalShares, 750);
});

test('validates existing and new holder flows and numeric edge cases', () => {
  const currentHolders = currentHoldersFromRecords([
    { id: 'one', holderName: 'Example Capital', category: 'Strategic Investor', shares: 1_000, action: 'add' },
  ]);
  assert.equal(validateOwnershipEntry({ mode: 'existing', holderName: '', holderSelection: currentHolders[0].key, latestTotalShares: '0', currentHolders }).valid, true);
  assert.match(validateOwnershipEntry({ mode: 'existing', holderName: '', holderSelection: '', latestTotalShares: '1', currentHolders }).error, /Select/);
  assert.match(validateOwnershipEntry({ mode: 'new', holderName: 'Example Capital', holderSelection: '', latestTotalShares: '10', currentHolders }).error, /already exists/);
  assert.match(validateOwnershipEntry({ mode: 'new', holderName: 'New Holder', holderSelection: '', latestTotalShares: '0', currentHolders }).error, /greater than zero/);
  assert.equal(parseShareTotal('1,250,000').value, 1_250_000);
  assert.equal(parseShareTotal('-1').valid, false);
  assert.equal(parseShareTotal('1.5').valid, false);
  assert.equal(parseShareTotal('12,34').valid, false);
});

test('maps an existing-holder total to a legacy-compatible signed delta payload', () => {
  const payload = buildOwnershipSubmission({
    mode: 'existing',
    holder: { key: 'example', referenceId: 'legacy-1', holderName: 'Example Capital', category: 'Management', priorTotalShares: 1_000, latestEffectiveDate: '', recordCount: 1 },
    holderName: '',
    category: 'Other',
    latestTotalShares: 700,
    effectiveDate: '2026-07-16',
    notes: 'Latest 13/F.',
    showInOwnership: true,
    showAsSuggestion: true,
    autoApply: false,
  });
  assert.equal(payload.shares, 300);
  assert.equal(payload.action, 'deduct');
  assert.equal(payload.holderName, 'Example Capital');
  assert.equal(payload.status, 'pending');
  assert.deepEqual(
    Object.keys(payload).sort(),
    ['action', 'autoApply', 'category', 'effectiveDate', 'holderName', 'notes', 'shares', 'showAsSuggestion', 'showInOwnership', 'source', 'status'].sort(),
  );
});

test('maps a new holder initial total without a prior-change input', () => {
  const payload = buildOwnershipSubmission({
    mode: 'new',
    holderName: 'New Holder',
    category: 'Strategic Investor',
    latestTotalShares: 500,
    effectiveDate: '2026-07-16',
    notes: '',
    showInOwnership: true,
    showAsSuggestion: true,
    autoApply: false,
  });
  assert.equal(payload.shares, 500);
  assert.equal(payload.action, 'add');
  assert.equal(payload.holderName, 'New Holder');
});

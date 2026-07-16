# Ownership latest-total entry compatibility

The operations ownership form now treats the latest total shares from a filing as the operator input. For an existing holder, the portal calculates:

`sharesChange = latestTotalShares - previousShares`

The manual-input API enforces a strict allowlist and uses the legacy `shares` plus `action` transaction model. New submissions therefore send only supported fields:

- `shares` is the absolute calculated difference.
- `action` is `add` for an increase or no change and `deduct` for a decrease.
- `holderName`, `category`, destination flags, dates, status, source, and notes use the existing API schema.
- Ticker remains in the request query string and is not duplicated in the JSON body.

The portal keeps `previousShares`, `latestTotalShares`, and the signed difference in form state for calculation and preview. Existing records remain valid: the portal derives their signed difference from `action` and `shares`, and aggregates those transactions to build the current holder list. Suggested Changes uses the same legacy delta fields.

## Backend migration concern

The current compatibility payload assumes the consolidator continues aggregating legacy `shares` and `action` transactions. To persist latest totals canonically, a future backend schema revision must explicitly add total-share metadata to its allowlist. The backend must also confirm whether `shares: 0` is accepted for no-change filings; the portal validates and represents that state, but the current API behavior is not documented.

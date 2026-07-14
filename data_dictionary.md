# Data Dictionary: Current and History Datasets

This data dictionary describes the JSON structures, field names, data types, descriptions, data provenance details, and derivation logic for both the `current` snapshot datasets and the historical `history` datasets within the AWS Data Downloading Platform.

## Directory Overview

- **Current Snapshots (`/current/` prefix)**: Snapshot files representing the latest state of a ticker's metrics (e.g., market data, public/internal float, ownership, company profile).
- **Historical Data (`/history/` prefix)**: Chronological records of metrics (e.g., FTD, market trends, ownership changes, SEC filings, short volumes) over time.

---

## 1. Current Snapshots (`/current/`)

These files represent the most up-to-date state of a ticker. They are stored under `current/{TICKER}/` (e.g., `current/CURR/`).

### 1.1 `company-profile-current.json`
Provides general information and metadata about the company.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema (e.g., `1`). | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock (e.g., `CURR`). | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Timestamp indicating when the snapshot was generated. | Set to `{date}T23:59:00Z`. |
| `companyName` | String | **20260709001** | Legal name of the company. | Read from `manual-input/profile/{ticker}/profile.json` → `companyName`. Falls back to `"CURRENC Group Inc."` if absent. |
| `stockCode` | String | **20260709002** | Stock code under which the equity is listed (usually same as ticker). | Same as `companyName` source; read from `profile_input`. Falls back to ticker symbol. |
| `_field_provenance` | Object | - | Provenance mapping indicating the ingestion source for each field (e.g., `System Metadata`, `Manual Operations Input`). | Statically defined object in code. |

---

### 1.2 `internal-float-current.json`
Details the breakdown of the share structure, strategic holdings, tokenized/collateralized shares, and the calculated real tradable public float.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Ingestion generation timestamp. | Set to `{date}T23:59:00Z`. |
| `snapshotDate` | String (YYYY-MM-DD) | - | Date representing the snapshot. | Passed in as the target `date` parameter. |
| `sourceWatermarks` | Object | - | Tracks dates/timestamps when the sources were last updated (keys: `operationsInternalFloat`, `operationsManagementHoldings`, `fintelSecurityOwnership`). | `operationsInternalFloat` and `operationsManagementHoldings` = `generatedAt`; `fintelSecurityOwnership` = `date`. |
| `issuedShare` | Integer | **20260709003** | Total issued shares of the company. | Read from `manual-input/issued-share/{ticker}/issued-share.json` → `issuedShare`. Cast to `int`. |
| `institutionalSharesLong` | Integer | **20260709014** | Total shares held long by institutions. | Summed from Fintel `security_ownership_premium` CSV: non-call rows whose `securityName` matches `institutionalOwnerSecurityName`, accumulating `shares` per valid holder. |
| `managementStrategicHoldings` | Object | - | Object enclosing strategic holdings. Details below. | Populated from `manual-input/internal-float-inputs/{ticker}/internal-float-inputs.json` → `managementStrategicHoldings.records`, merged with auto-applied records from `management-holdings` where `autoApply=True`. |
| `managementStrategicHoldings.shares` | Integer | **20260709037** | Calculated sum of shares from approved strategic holdings records. | `sum(r["shares"] for r in deduction_strategic_records if r.get("includeInDeduction", True))`. |
| `managementStrategicHoldings.records` | Array of Objects | - | Individual records of strategic holders. | Records from `internal-float-inputs` merged with auto-applied management holdings; each record enriched with `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `deletedAt` audit metadata. |
| `managementStrategicHoldings.records[].id` | String | - | Unique identifier for the holder record. | Preserved from source input. |
| `managementStrategicHoldings.records[].holderName`| String | **20260709041** | Name of the strategic/management investor. | Preserved from source input. |
| `managementStrategicHoldings.records[].category` | String | **20260709042** | Category type (e.g., `Strategic Investor`). | Preserved from source input. |
| `managementStrategicHoldings.records[].shares` | Integer | **20260709043** | Shares held by this entity. | Preserved from source input. |
| `managementStrategicHoldings.records[].includeInDeduction` | Boolean | - | Whether this holding is deducted to compute real tradable float. | For auto-applied records: `True` if `action == "add"`, else `False`. For internal-float-inputs records: preserved from source. |
| `managementStrategicHoldings.records[].notes` | String | **20260709045** | Explanatory notes. | Preserved from source; auto-applied records default to `"Auto-applied from management holdings"`. |
| `tokenizedShares` | Object | - | Encloses tokenized shares details. | Read from `internal-float-inputs` → `tokenizedShares.records`. |
| `tokenizedShares.shares` | Integer | **20260709035** | Total shares tokenized across blockchain chains. | `sum(r["shares"] for r in tokenized_records)`. |
| `tokenizedShares.records` | Array of Objects | - | Details of tokenized records. | Read from `internal-float-inputs` → `tokenizedShares.records`; each record enriched with audit metadata. |
| `tokenizedShares.records[].chain` | String | **20260709046** | Blockchain chain name (e.g., `Ethereum`). | Preserved from source input. |
| `tokenizedShares.records[].shares` | Integer | **20260709047** | Tokenized shares held. | Preserved from source input. |
| `tokenizedShares.records[].provider` | String | **20260709048** | Tokenization provider (e.g., `Securitize`). | Preserved from source input. |
| `collateralizedShares` | Object | - | Encloses collateralized shares details. | Read from `internal-float-inputs` → `collateralizedShares.records`. |
| `collateralizedShares.shares` | Integer | **20260709039** | Total shares locked as collateral in DeFi protocols. | `sum(r["shares"] for r in collateralized_records)`. |
| `collateralizedShares.records` | Array of Objects | - | Details of collateralized records. | Read from `internal-float-inputs` → `collateralizedShares.records`; each record enriched with audit metadata. |
| `collateralizedShares.records[].chain` | String | **20260709050** | Blockchain network name. | Preserved from source input. |
| `collateralizedShares.records[].shares` | Integer | **20260709051** | Collateralized shares count. | Preserved from source input. |
| `collateralizedShares.records[].protocol` | String | **20260709052** | Protocol name (e.g., `Aave V3`). | Preserved from source input. |
| `realTradableFloat` | Object | - | Summary of computed tradable float. | Derived calculation. |
| `realTradableFloat.shares` | Integer | **20260709030** | Net real tradable shares (computed via formula). | `max(0, issuedShare - institutionalSharesLong - managementStrategicHoldings.shares - tokenizedShares.shares - collateralizedShares.shares)`. |
| `realTradableFloat.percentOfIssuedShare` | Decimal | **20260709031** | Tradable float as a percentage of total issued shares. | `round(realTradableFloat.shares / max(1, issuedShare) * 100, 2)`. |
| `realTradableFloat.formula` | String | - | Representation of formula: `issuedShare - institutionalSharesLong - managementStrategicHoldings - tokenizedShares - collateralizedShares`. | Hardcoded string. |
| `suggestedChanges` | Array of Objects | - | Pending changes proposed by operations or vendor feeds. Details below. | Filtered from `management-holdings` records where `showAsSuggestion=True` AND `status == "pending"`. |
| `suggestedChanges[].holderName` | String | **20260709054** | Name of the suggested strategic investor. | Preserved from management-holdings source. |
| `suggestedChanges[].form` | String | **20260709055** | Form type of the SEC filing (e.g., `13G/A`). | Preserved from management-holdings source. |
| `suggestedChanges[].fileDate` | String | **20260709056** | Date the filing was processed. | Preserved from management-holdings source. |
| `suggestedChanges[].effectiveDate` | String | **20260709057** | Effective date of the suggested changes. | Preserved from management-holdings source. |
| `suggestedChanges[].percentOfShares` | Decimal | **20260709058** | Suggested Ownership percentage. | Preserved from management-holdings source. |
| `suggestedChanges[].shares` | Integer | **20260709060** | Suggested shares count. | Preserved from management-holdings source. |
| `auditLog` | Array of Objects | - | Historical adjustments log auditing additions or edits to the internal float datasets. | Read from `internal-float-inputs` → `auditLog`. Empty array if not provided. |
| `updatedAt` | String (ISO 8601) | - | Timestamp when the record was last modified. | Set to `generatedAt` (`{date}T23:59:00Z`). |
| `_field_provenance` | Object | - | Ingestion provenance mapping for every major metric/calculation. | Statically defined object in code. |

---

### 1.3 `market-current.json`
Aggregates market stats, lending pressure, borrow fees, short interest, utilization, and margin requirements.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `snapshotDate` | String (YYYY-MM-DD) | - | Date representing the snapshot. | Passed in as the target `date` parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`. |
| `sourceWatermarks` | Object | - | Updates timestamps of sources (keys: `chartExchangeBorrowFee`, `chartExchangeShortInterest`, `operationsMarketData`). | `chartExchangeBorrowFee` and `operationsMarketData` = `generatedAt`; `chartExchangeShortInterest` = `date`. |
| `price` | Object | - | Stock price snapshot. | Derived from ChartExchange exchange_volume CSV. |
| `price.value` | Decimal/Null | **20260709214** | Current stock price. | Last row of `chartexchange/{date}/chartexchange_exchange_volume_{ticker}_{date}.csv` → `close` column. Cast to `float`. `null` if CSV is empty or column absent. |
| `price.asOf` | String (ISO 8601) | **20260709213** | Price timestamp. | Hardcoded to `{date}T20:00:00Z` (NYSE market close). |
| `price.source` | String | - | Price source provider. | Hardcoded to `"Chart Exchange"`. |
| `shortInterest` | Object | - | Short interest stats. | Derived from ChartExchange short_interest_daily CSV. |
| `shortInterest.shares` | Integer | **20260709067** | Current shorted shares count. | Last row of `chartexchange_short_interest_daily` CSV → `short_position` column. Cast to `int`. |
| `shortInterest.percent` | Decimal | **20260709072** | Short interest as a percent of float. | Last row of `chartexchange_short_interest_daily` CSV → `short_interest` column. Cast to `float`. |
| `shortInterest.numChange` | Decimal | **20260709068** | Numeric change from previous date. | `shortInterest.shares - prev_market_rec["shortInterestShares"]`. `null` if no previous record exists. |
| `shortInterest.percentChange` | Decimal | **20260709069** | Percentage change from previous date. | `(numChange / prev_value * 100)` rounded to 2 dp. `0.0` if `prev_value == 0`. `null` if no previous record. |
| `shortInterest.riskFactor` | String | - | Risk level indicator. | `"High"` if `percent > 5.0`; `"Moderate"` if `percent > 2.0`; `"Low"` otherwise. `"Low"` if value is `null`. |
| `borrowFee` | Object | - | Stock borrow fee rate metrics. | Derived from ChartExchange borrow_fee_ib CSV. |
| `borrowFee.percent` | Decimal | **20260709075** | Current borrow fee rate percentage. | Last row of `chartexchange_borrow_fee_ib` CSV → `fee` column. Cast to `float`. |
| `borrowFee.numChange` | Decimal | **20260709076** | Numeric change in borrow fee since previous day. | `borrowFee.percent - prev_market_rec["borrowFeePercent"]`. `null` if no previous record. |
| `borrowFee.percentChange` | Decimal | **20260709077** | Percentage change in borrow fee since previous day. | `(numChange / prev_value * 100)` rounded to 2 dp. `null` if no previous record. |
| `borrowFee.riskFactor` | String | **20260709078** | Risk factor classification. | `"Low"` if `< 25.0`; `"Moderate"` if `< 50.0`; `"High"` if `<= 75.0`; `"Extreme"` if `> 75.0`. `"Low"` if value is `null`. |
| `availableShares` | Object | - | Encloses loanable shares counts across brokers. | Merged from ChartExchange CSV and manual operations inputs. |
| `availableShares.chartExchange` | Integer | **20260709083** | Loanable shares count on ChartExchange. | Last row of `chartexchange_borrow_fee_ib` CSV → `available` column. Cast to `int`. |
| `availableShares.ibkr` | Integer | **20260709084** | Loanable shares count on Interactive Brokers (IBKR). | From `manual-input/manual-availability/{ticker}` → `availableSharesIbkr`. Cast to `int`. |
| `availableShares.futu` | Integer | **20260709085** | Loanable shares count on Futu. | From `manual-input/manual-availability/{ticker}` → `availableSharesFutu`. Cast to `int`. |
| `availableShares.value` | Integer | **20260709086** | Consolidated borrowable shares (typically max of available). | `max(availableShares.chartExchange, availableShares.ibkr, availableShares.futu)`, ignoring `null` values (`safe_max`). |
| `availableShares.numChange` | Integer | **20260709087** | Change in available shares since the previous day. | `availableShares.value - prev_market_rec["availableShares"]`. `null` if no previous record. |
| `availableShares.percentChange` | Decimal | **20260709088** | Percentage change in available shares since the previous day. | `(numChange / prev_value * 100)` rounded to 2 dp. `null` if no previous record. |
| `availableShares.riskFactor` | String | **20260709089** | Risk factor classification. | Inherits `borrowFee.riskFactor` (same `bf_risk` value). |
| `utilization` | Object | - | Share utilization percentage metrics. | Sourced from manual operations input. |
| `utilization.percent` | Decimal | **20260709090** | Share utilization percentage. | From `manual-input/utilization/{ticker}` → `utilizationPercent`. Cast to `float`. |
| `utilization.numChange` | Decimal | **20260709091** | Numeric change in utilization rate. | `utilization.percent - prev_market_rec["utilizationPercent"]`. `null` if no previous record. |
| `utilization.percentChange` | Decimal | **20260709092** | Percentage change in utilization rate. | `(numChange / prev_value * 100)` rounded to 2 dp. `null` if no previous record. |
| `utilization.riskFactor` | String | **20260709093** | Risk factor classification. | Inherits `borrowFee.riskFactor` (same `bf_risk` value). |
| `daysToCover` | Object | - | Days to cover metrics. | Derived from ChartExchange short_interest_daily CSV. |
| `daysToCover.value` | Decimal | **20260709079** | Estimated days needed to cover all short positions. | Last row of `chartexchange_short_interest_daily` CSV → `days_to_cover` column. Cast to `float`. |
| `daysToCover.numChange` | Decimal | **20260709080** | Numeric change in days to cover. | `daysToCover.value - prev_market_rec["daysToCover"]`. `null` if no previous record. |
| `daysToCover.percentChange` | Decimal | **20260709081** | Percentage change in days to cover. | `(numChange / prev_value * 100)` rounded to 2 dp. `null` if no previous record. |
| `daysToCover.riskFactor` | String | **20260709082** | Risk factor classification. | `"Low"` if `< 1.0`; `"Moderate"` if `< 3.0`; `"High"` if `<= 7.0`; `"Extreme"` if `> 7.0`. `"Low"` if value is `null`. |
| `margins` | Object | - | Margin requirements for borrowing. | Sourced from `manual-input/margins/{ticker}` manual input. |
| `margins.initialMarginIbkr` | Decimal | **20260709204** | Initial margin requirement percentage at IBKR. | From `margins_input` → `initialMarginIbkr`. Cast to `float`. |
| `margins.initialMarginFutu` | Decimal | **20260709205** | Initial margin requirement percentage at Futu. | From `margins_input` → `initialMarginFutu`. Cast to `float`. |
| `margins.initialMargin` | Decimal | **20260709206** | Max initial margin requirement percentage. | `max(initialMarginIbkr, initialMarginFutu)`, ignoring `null` values (`safe_max`). |
| `margins.maintenanceMarginIbkr`| Decimal | **20260709207** | Maintenance margin requirement percentage at IBKR. | From `margins_input` → `maintenanceMarginIbkr`. Cast to `float`. |
| `margins.maintenanceMarginFutu`| Decimal | **20260709208** | Maintenance margin requirement percentage at Futu. | From `margins_input` → `maintenanceMarginFutu`. Cast to `float`. |
| `margins.maintenanceMargin` | Decimal | **20260709209** | Max maintenance margin requirement percentage. | `max(maintenanceMarginIbkr, maintenanceMarginFutu)`, ignoring `null` values (`safe_max`). |
| `margins.averageDurationDays` | Decimal | **20260709210** | Average duration of borrow contracts in days. | From `margins_input` → `averageDurationDays`. Cast to `float`. |
| `margins.valueFormat` | String | - | Output formatting type (e.g. `decimal_ratio`). | Hardcoded to `"decimal_ratio"`. |
| `margins.displayFormat` | String | - | Display layout styling instruction (e.g. `percent`). | Hardcoded to `"percent"`. |
| `scores` | Object | - | Lending and short risk pressure scoring indicators. | Derived from manual inputs and borrow fee risk. |
| `scores.shortScore` | Object | - | Proprietary short pressure rating. | Sourced from `manual-input/short-score/{ticker}` or fallback from `utilization` input. |
| `scores.shortScore.value` | Decimal | **20260709063** | Short squeeze score value. | From `short-score` manual input → `shortScore`. Falls back to `utilization_input["shortScore"]` if absent. Cast to `float`. |
| `scores.shortScore.numChange` | Decimal | **20260709064** | Short score numeric change. | `shortScore.value - prev_market_rec["shortScore"]`. `null` if no previous record. |
| `scores.shortScore.percentChange` | Decimal | **20260709065** | Short score percentage change. | `(numChange / prev_value * 100)` rounded to 2 dp. `null` if no previous record. |
| `scores.shortScore.riskFactor` | String | **20260709066** | Short score risk level classification. | `"Low"` if `<= 25.0`; `"Moderate"` if `<= 50.0`; `"High"` if `<= 75.0`; `"Extreme"` if `> 75.0`. `"Low"` if value is `null`. |
| `scores.lendingPressureRiskFactor`| String | **20260709094** | Risk factor classification (e.g. `Moderate`). | Inherits `borrowFee.riskFactor` (same `bf_risk` value). |
| `_field_provenance` | Object | - | Source provenance details. | Statically defined object in code. |

---

### 1.4 `ownership-current.json`
Details institutional ownership summary stats and lists major holdings.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`. |
| `snapshotDate` | String (YYYY-MM-DD) | - | Date representing the snapshot. | Passed in as the target `date` parameter. |
| `sourceWatermarks` | Object | - | Watermarks (keys: `fintelSecurityOwnership`, `fintelActivistFilings`, `operationsManagementHoldings`). | `fintelSecurityOwnership` and `fintelActivistFilings` = `date`; `operationsManagementHoldings` = `generatedAt`. |
| `issuedShare` | Integer | **20260709003** | Total issued shares. | From `manual-input/issued-share/{ticker}` → `issuedShare`. Cast to `int`. |
| `institutionalOwners` | Integer | **20260709005** | Total count of unique institutional owners. | Count of valid Fintel `security_ownership_premium` rows where `putCall != "call"`, `securityName` matches filter, holder has a name, and `shares > 0`. |
| `institutionalSharesLong` | Integer | **20260709014** | Total shares held long by institutional entities. | Sum of `shares` from the same Fintel filter as `institutionalOwners`. |
| `institutionalHoldingPercent` | Decimal | **20260709015** | Institutional shares held as a percentage of issued shares. | `round(institutionalSharesLong / max(1, issuedShare) * 100, 2)`. |
| `institutionalValue` | Decimal | **20260709016** | Current value of institutional holdings in thousands. | `round(sum(r["value"]) / 1000.0, 3)` from matching Fintel rows. |
| `strategicEntities` | Object | - | Summarizes strategic/management holders. | Filtered from `management-holdings` where `showInOwnership=True` (defaults to `True`). |
| `strategicEntities.shares` | Integer | **20260709019** | Total shares held by strategic entities. | `sum(r["shares"] for r in strat_records)` where records pass `showInOwnership` filter. |
| `strategicEntities.percent` | Decimal | **20260709020** | Strategic holdings as a percentage of issued shares. | `round(strat_shares_sum / max(1, issuedShare) * 100, 2)`. |
| `strategicEntities.records` | Array of Objects | - | Records of strategic investors. | Filtered from management-holdings; each record enriched with audit metadata (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `deletedAt`). |
| `publicFloat` | Object | - | Calculated public float. | Derived calculation. |
| `publicFloat.shares` | Integer | **20260709021** | Calculated public float shares. | `max(0, issuedShare - strategicEntities.shares - institutionalSharesLong)`. |
| `publicFloat.percent` | Decimal | **20260709022** | Public float as a percent of issued shares. | `round(publicFloat.shares / max(1, issuedShare) * 100, 2)`. |
| `institutionBreakdown` | Array of Objects | - | List of institutional holders and their positions. | Filtered Fintel `security_ownership_premium` rows (non-call, matching security name, name present, shares > 0), sorted descending by `shares`. |
| `institutionBreakdown[].holderName` | String | **20260709007** | Institution name. | Fintel row → `name` column. |
| `institutionBreakdown[].shares` | Integer | **20260709010** | Total shares held by the institution. | Fintel row → `shares` column. Cast to `int`. |
| `institutionBreakdown[].percentOfInstitutionalShares` | Decimal | - | Holder's portion of the institutional share total. | `round(shares / max(1, institutionalSharesLong) * 100, 2)`. |
| `updatedAt` | String (ISO 8601) | - | Timestamp of last file modification. | Set to `generatedAt` (`{date}T23:59:00Z`). |
| `_field_provenance` | Object | - | Field provenance mappings. | Statically defined object in code. |

---

## 2. Historical Records (`/history/`)

These files compile historical series of events and daily status updates. They are stored under `history/{TICKER}/` (e.g., `history/CURR/`).

### 2.1 `ftd-history.json`
Logs historical SEC Failure to Deliver (FTD) events for the stock.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`; updated at the end of each run. |
| `records` | Array of Objects | - | Chronological FTD events. | Upserted per `settlementDate` from ChartExchange `failure_to_deliver` CSV across all discovered dates. Existing records for the same `settlementDate` are replaced. |
| `records[].settlementDate` | String (YYYY-MM-DD) | **20260709197** | Settlement date of the FTD. | CSV column `t` → `settlementDate` → `date` (first non-null). |
| `records[].tradeDate` | String (YYYY-MM-DD) | **20260709200** | Trade date corresponding to the transaction. | CSV column `date` → `tradeDate` → falls back to `settlementDate`. |
| `records[].closingDeadline` | String (YYYY-MM-DD) | **20260709201** | SEC regulatory closing deadline date. | CSV column `t_35` → `closingDeadline` → falls back to `settlementDate`. |
| `records[].shares` | Integer | **20260709198** | Total number of failed-to-deliver shares. | CSV column `fails` → `shares`. `int(value)` if not NaN, else `0`. |
| `records[].price` | Decimal | **20260709199** | Stock price on the settlement date. | CSV column `price`. `float(value)` if not NaN, else `0.0`. |
| `records[].value` | Decimal | **20260709202** | Monetary value of the FTD (shares * price). | CSV column `noti` → `value`. `float(value)` if not NaN, else `0.0`. |
| `records[].change` | Integer | **20260709203** | Change in FTD shares count compared to the previous record. | CSV column `change`. Included only if not NaN. Cast to `int`. |
| `_field_provenance` | Object | - | Source provenance mappings. | Statically defined; set at history file initialization. |
| `sourceWatermarks` | Object | - | Tracks the source update dates (keys: `chartExchangeFailureToDeliver`). | `chartExchangeFailureToDeliver` = target `date` parameter. |

---

### 2.2 `market-history.json`
Chronological daily records tracking borrow rates, loan volume, and margins over time.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`; updated at the end of each run. |
| `records` | Array of Objects | - | Chronological daily market snapshots. | Upserted per `tradeDate` across all discovered historical dates. Sorted ascending by `tradeDate` at the end of each run. |
| `records[].tradeDate` | String (YYYY-MM-DD) | - | Date of the market records. | The loop's current `d_str` date value. |
| `records[].issuedShare` | Integer | **20260709003** | Total issued shares on this date. | From `issued-share` manual input for `d_str` → `issuedShare`. Cast to `int`. |
| `records[].price` | Decimal/Null | **20260709214** | Closing stock price. | Last row of `chartexchange_exchange_volume` CSV for `d_str` → `close`. |
| `records[].borrowFeePercent` | Decimal | **20260709075** | Borrow fee percentage rate. | Last row of `chartexchange_borrow_fee_ib` CSV for `d_str` → `fee`. Cast to `float`. |
| `records[].availableSharesChartExchange` | Integer | **20260709083** | Available shares to borrow from ChartExchange. | Last row of `chartexchange_borrow_fee_ib` CSV for `d_str` → `available`. Cast to `int`. |
| `records[].availableSharesIbkr` | Integer | **20260709084** | Available shares to borrow from IBKR. | From `manual-availability` input for `d_str` → `availableSharesIbkr`. Cast to `int`. |
| `records[].availableSharesFutu` | Integer | **20260709085** | Available shares to borrow from Futu. | From `manual-availability` input for `d_str` → `availableSharesFutu`. Cast to `int`. |
| `records[].availableShares` | Integer | **20260709086** | Consolidated borrowable shares. | `max(availableSharesChartExchange, availableSharesIbkr, availableSharesFutu)`, ignoring `null` values (`safe_max`). |
| `records[].utilizationPercent` | Decimal | **20260709090** | Utilization percentage on this date. | From `utilization` manual input for `d_str` → `utilizationPercent`. Cast to `float`. |
| `records[].daysToCover` | Decimal | **20260709079** | Days to cover value. | Last row of `chartexchange_short_interest_daily` CSV for `d_str` → `days_to_cover`. Cast to `float`. |
| `records[].shortInterestShares` | Integer | **20260709067** | Shorted shares count. | Last row of `chartexchange_short_interest_daily` CSV for `d_str` → `short_position`. Cast to `int`. |
| `records[].shortInterestPercent` | Decimal | **20260709072** | Short interest percentage. | Last row of `chartexchange_short_interest_daily` CSV for `d_str` → `short_interest`. Cast to `float`. |
| `records[].shortScore` | Decimal | **20260709063** | Proprietary short pressure score. | From `short-score` manual input for `d_str` → `shortScore`. Falls back to `utilization_input["shortScore"]`. Cast to `float`. |
| `records[].initialMarginIbkr` | Decimal | **20260709204** | Initial margin requirement rate at IBKR. | From `margins` manual input for `d_str` → `initialMarginIbkr`. Cast to `float`. |
| `records[].initialMarginFutu` | Decimal | **20260709205** | Initial margin requirement rate at Futu. | From `margins` manual input for `d_str` → `initialMarginFutu`. Cast to `float`. |
| `records[].initialMargin` | Decimal | **20260709206** | Max initial margin requirement rate. | `max(initialMarginIbkr, initialMarginFutu)`, ignoring `null` values (`safe_max`). |
| `records[].maintenanceMarginIbkr` | Decimal | **20260709207** | Maintenance margin requirement rate at IBKR. | From `margins` manual input for `d_str` → `maintenanceMarginIbkr`. Cast to `float`. |
| `records[].maintenanceMarginFutu` | Decimal | **20260709208** | Maintenance margin requirement rate at Futu. | From `margins` manual input for `d_str` → `maintenanceMarginFutu`. Cast to `float`. |
| `records[].maintenanceMargin` | Decimal | **20260709209** | Max maintenance margin requirement rate. | `max(maintenanceMarginIbkr, maintenanceMarginFutu)`, ignoring `null` values (`safe_max`). |
| `records[].averageDurationDays` | Decimal | **20260709210** | Average duration of borrow contracts in days. | From `margins` manual input for `d_str` → `averageDurationDays`. Cast to `float`. |
| `records[].valueFormat` | String | - | Value formatting type code. | Hardcoded to `"decimal_ratio"`. |
| `records[].displayFormat` | String | - | Display format instruction code. | Hardcoded to `"percent"`. |
| `_field_provenance` | Object | - | Ingestion provenance mapping. | Statically defined; set at history file initialization. |
| `sourceWatermarks` | Object | - | Watermarks (keys: `chartExchangeBorrowFee`, `chartExchangeShortInterest`, `operationsMarketData`). | Copied from `market-current.json` → `sourceWatermarks` at the end of the run. |

---

### 2.3 `ownership-history.json`
Maintains records of filings submitted by institutional and strategic investors.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`; updated at the end of each run. |
| `records` | Array of Objects | - | Historical filing records. | Upserted per `(holderName, formType, sourceType)` composite key from Fintel `security_ownership_premium` and `activist_filings_premium` CSVs. Sorted descending by `fileDate`. |
| `records[].holderName` | String | **20260709007** | Name of the institutional or strategic holder. | Fintel row → `name` column. |
| `records[].formType` | String | **20260709006** | Filing form name (e.g., `13F-HR`, `SCHEDULE 13G`). | Fintel row → `formType`. Defaults to `"13F-HR"` for security ownership, `"SCHEDULE 13G"` for activist filings. |
| `records[].fileDate` | String (YYYY-MM-DD) | **20260709008** | Date the filing was processed. | Fintel row → `fileDate`. Falls back to `d_str`. |
| `records[].effectiveDate` | String (YYYY-MM-DD) | **20260709009** | Effective date of the holdings. | Fintel row → `effectiveDate`. Falls back to `d_str`. |
| `records[].sourceType` | String | - | Ingestion vendor feed name (e.g., `Fintel Security Ownership`). | Hardcoded to `"Fintel Security Ownership"` or `"Fintel Activist Filings"` depending on source CSV. |
| `records[].shares` | Integer | **20260709010** | Number of shares reported in the filing. | Fintel row → `shares`. Cast to `int`. |
| `records[].value` | Decimal/Null | **20260709011** | Monetary value of the shares held. | Fintel security ownership row → `value`. Cast to `float`. `null` for activist filings rows. |
| `records[].percentChange` | Decimal/Null | **20260709012** | Percent change in shares count compared to the holder's previous filing. | Fintel row → `percentChange`. Cast to `float`, defaults to `0.0`. `null` for activist filing rows (or `0.0` if available). |
| `records[].percentValueChange` | Decimal/Null | **20260709013** | Percent change in position value compared to the holder's previous filing. | Fintel security ownership row → `percentValueChange`. Cast to `float`, defaults to `0.0`. `null` for activist filings rows. |
| `_field_provenance` | Object | - | Field provenance details. | Statically defined; set at history file initialization. |
| `sourceWatermarks` | Object | - | Source watermarks (keys: `fintelSecurityOwnership`, `fintelActivistFilings`, `operationsManagementHoldings`). | Copied from `ownership-current.json` → `sourceWatermarks` at the end of the run. |

---

### 2.4 `sec-filings-history.json`
Contains a historical index of company filings from the SEC.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`; updated at the end of each run. |
| `records` | Array of Objects | - | Chronological SEC filings. | Upserted per `accessionNumber` from `manual-input/sec-filings/{ticker}` manual input. Sorted descending by `filingDate`. |
| `records[].id` | String | - | Unique identifier of the filing. | From `sec_filings_input` → `id`. Falls back to `f"sec-{accessionNumber}"`. |
| `records[].ticker` | String | - | Stock ticker. | From source → `ticker`. Defaults to runtime `ticker` parameter. |
| `records[].companyName` | String | - | Company name. | From source → `companyName`. Defaults to `"CURRENC Group Inc."`. |
| `records[].formType` | String | **20260709147** | SEC form code (e.g., `10-Q`, `8-K`). | From source → `formType`. |
| `records[].formDescription`| String | **20260709148** | Description of the form type. | From source → `formDescription` → `description`. |
| `records[].description` | String | - | Brief context summary. | Same value as `formDescription`. |
| `records[].filingDate` | String (YYYY-MM-DD) | **20260709149** | Date filed with the SEC. | From source → `filingDate`. |
| `records[].reportingDate` | String (YYYY-MM-DD) | **20260709150** | Reporting period ending date. | From source → `reportingDate`. |
| `records[].act` | String | **20260709151** | Regulatory act identifier. | From source → `act`. |
| `records[].filmNumber` | String | **20260709152** | Film number. | From source → `filmNumber`. |
| `records[].fileNumber` | String | **20260709153** | File number. | From source → `fileNumber`. |
| `records[].accessionNumber`| String | **20260709154** | SEC accession number. | From source → `accessionNumber`. Used as the upsert key. |
| `records[].filingsUrl` | String | **20260709155** | SEC Edgar website URL link to the filing document. | From source → `filingsUrl`. |
| `records[].notes` | String | - | Operational notes. | From source → `notes`. Defaults to `""`. |
| `records[].createdBy` | String | - | Email/identifier of the user who entered/verified it. | From source → `createdBy`. Defaults to `"operations"`. |
| `records[].createdAt` | String (ISO 8601) | - | Record insertion timestamp. | From source → `createdAt`. Defaults to `generatedAt`. |
| `records[].updatedBy` | String | - | Email/identifier of the user who last updated it. | From source → `updatedBy`. Defaults to `"operations"`. |
| `records[].updatedAt` | String (ISO 8601) | - | Record last update timestamp. | From source → `updatedAt`. Defaults to `generatedAt`. |
| `_field_provenance` | Object | - | Provenance map. | Statically defined; set at history file initialization. |
| `sourceWatermarks` | Object | - | Watermarks (keys: `operationsSecFilings`). | `operationsSecFilings` = `generatedAt`. |

---

### 2.5 `short-volume-history.json`
Logs historical long, short, and exchange-specific daily transactional volume.

| Field Name | Type | Master Table ID | Description | Logic |
| :--- | :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | - | Version of the JSON schema. | Hardcoded to `1`. |
| `ticker` | String | - | Ticker symbol of the stock. | Passed in as a runtime parameter. |
| `generatedAt` | String (ISO 8601) | - | Generation timestamp. | Set to `{date}T23:59:00Z`; updated at the end of each run. |
| `records` | Array of Objects | - | Chronological daily transaction records. | Upserted per `date` from ChartExchange `short_volume` CSV across all discovered historical dates. Sorted ascending by `date`. |
| `records[].date` | String (YYYY-MM-DD) | **20260709180** | Transaction date. | CSV row → `date` column. Skipped if empty. |
| `records[].totalVolumeReported` | Decimal | **20260709181** | Total share volume reported. | CSV → `totalVolumeReported` falling back to `rt`. Cast to `float`. |
| `records[].totalShortVolumeReported` | Decimal | **20260709182** | Total short transaction volume reported. | CSV → `totalShortVolumeReported` falling back to `st`. Cast to `float`. |
| `records[].totalLongVolumeReported` | Decimal | **20260709183** | Total long transaction volume reported. | CSV → `totalLongVolumeReported` falling back to `lt`. Cast to `float`. |
| `records[].offExchangeNonExempt` | Decimal | **20260709184** | Off-exchange non-exempt volume. | CSV → `offExchangeNonExempt` falling back to `fs`. Cast to `float`. |
| `records[].offExchangeExempt` | Decimal | **20260709185** | Off-exchange exempt volume. | CSV → `offExchangeExempt` falling back to `fse`. Cast to `float`. |
| `records[].nasdaqBx` | Decimal | **20260709186** | Transaction volume on NASDAQ BX. | CSV → `nasdaqBx` falling back to `xnas`. Cast to `float`. |
| `records[].nasdaqPhlx` | Decimal | **20260709187** | Transaction volume on NASDAQ PHLX. | CSV → `nasdaqPhlx` falling back to `xphl`. Cast to `float`. |
| `records[].nyse` | Decimal | **20260709188** | Transaction volume on NYSE. | CSV → `nyse` falling back to `xnys`. Cast to `float`. |
| `records[].nyseArca` | Decimal | **20260709189** | Transaction volume on NYSE Arca. | CSV → `nyseArca` falling back to `arcx`. Cast to `float`. |
| `records[].nyseNational` | Decimal | **20260709190** | Transaction volume on NYSE National. | CSV → `nyseNational` falling back to `xcis`. Cast to `float`. |
| `records[].nyseAmerican` | Decimal | **20260709191** | Transaction volume on NYSE American. | CSV → `nyseAmerican` falling back to `xase`. Cast to `float`. |
| `records[].chx` | Decimal | **20260709192** | Transaction volume on CHX (Chicago Stock Exchange). | CSV → `chx` falling back to `xchi`. Cast to `float`. |
| `records[].cboeEdgx` | Decimal | **20260709193** | Transaction volume on CBOE EDGX. | CSV → `cboeEdgx` falling back to `edgx`. Cast to `float`. |
| `records[].cboeBzx` | Decimal | **20260709194** | Transaction volume on CBOE BZX. | CSV → `cboeBzx` falling back to `bats`. Cast to `float`. |
| `records[].cboeEdga` | Decimal | **20260709195** | Transaction volume on CBOE EDGA. | CSV → `cboeEdga` falling back to `edga`. Cast to `float`. |
| `records[].cboeByx` | Decimal | **20260709196** | Transaction volume on CBOE BYX. | CSV → `cboeByx` falling back to `baty`. Cast to `float`. |
| `records[]._source_values` | Object | - | Raw, un-normalized source API response volumes. Details below. | All numeric columns from the CSV row (excluding `date` and `ticker`) preserved as-is, each cast to `float`. |
| `records[]._source_values.rt`| Decimal | **20260709181** | Raw Total volume. | Direct CSV column value. |
| `records[]._source_values.st`| Decimal | **20260709182** | Raw Short volume. | Direct CSV column value. |
| `records[]._source_values.lt`| Decimal | **20260709183** | Raw Long volume. | Direct CSV column value. |
| `records[]._source_values.fs`| Decimal | **20260709184** | Raw Off-exchange volume. | Direct CSV column value. |
| `records[]._source_values.fse`| Decimal | **20260709185** | Raw Off-exchange exempt volume. | Direct CSV column value. |
| `records[]._source_values.xnas`| Decimal | **20260709186** | Raw NASDAQ BX volume. | Direct CSV column value. |
| `records[]._source_values.xphl`| Decimal | **20260709187** | Raw NASDAQ PHLX volume. | Direct CSV column value. |
| `records[]._source_values.xnys`| Decimal | **20260709188** | Raw NYSE volume. | Direct CSV column value. |
| `records[]._source_values.arcx`| Decimal | **20260709189** | Raw NYSE Arca volume. | Direct CSV column value. |
| `records[]._source_values.xcis`| Decimal | **20260709190** | Raw NYSE National volume. | Direct CSV column value. |
| `records[]._source_values.xase`| Decimal | **20260709191** | Raw NYSE American volume. | Direct CSV column value. |
| `records[]._source_values.xchi`| Decimal | **20260709192** | Raw CHX volume. | Direct CSV column value. |
| `records[]._source_values.edgx`| Decimal | **20260709193** | Raw CBOE EDGX volume. | Direct CSV column value. |
| `records[]._source_values.bats`| Decimal | **20260709194** | Raw CBOE BZX volume. | Direct CSV column value. |
| `records[]._source_values.edga`| Decimal | **20260709195** | Raw CBOE EDGA volume. | Direct CSV column value. |
| `records[]._source_values.baty`| Decimal | **20260709196** | Raw CBOE BYX volume. | Direct CSV column value. |
| `_field_provenance` | Object | - | Ingestion provenance mapping. | Statically defined; set at history file initialization. |
| `sourceWatermarks` | Object | - | Source watermark dates (keys: `chartExchangeShortVolume`). | `chartExchangeShortVolume` = target `date` parameter. |

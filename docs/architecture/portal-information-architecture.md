# Portal Information Architecture

This structure separates account-level management from company-specific work.

## Account Portal

Routes:
- `/portal`
- `/portal/companies`
- `/portal/billing`

Purpose:
- Manage the client account, all issuer workspaces, and subscription settings.
- This level can mention multiple companies.
- This level owns adding/removing companies.

Navigation labels:
- Account Overview
- Companies
- Billing

Page content:
- `/portal`: account command center and company workspace table.
- `/portal/companies`: add/manage issuer workspaces, statuses, recipients summary, open selected workspace.
- `/portal/billing`: subscription plan, invoice settings, retention, seats, account controls.

Not shown to users:
- API connection pages.
- Integration setup pages.
- Provider credential management.

Those are handled behind the scenes by the platform team, not by portal users.

## Company Workspace

Routes:
- `/monitor/[ticker]`
- `/monitor/[ticker]/email-settings`
- `/monitor/[ticker]/reports`
- `/monitor/[ticker]/news`
- `/monitor/[ticker]/sentiment`
- `/monitor/[ticker]/short-interest`
- `/monitor/[ticker]/options`
- `/monitor/[ticker]/institutional`

Purpose:
- Manage and review one selected company only.
- This level must not manage other companies.
- It can link back to `/portal/companies` with wording like “Switch company”.

Navigation labels:
- Company Overview
- Delivery Settings
- Report Archive
- News & Filings
- Sentiment
- Short Interest
- Options / Gamma
- Institutional Ownership

Removed from company-level navigation:
- Companies / Manage workspace
- Billing / Account plan
- API / Integrations / Company Data Setup
- Any table that lists unrelated issuers as if managed inside the selected company page

## Legacy route handling

Existing routes that are potentially confusing:
- `/monitor/[ticker]/companies` shows a bridge explaining companies moved to Account Portal.
- `/monitor/[ticker]/billing` shows a bridge explaining billing moved to Account Portal.
- `/portal/integrations` and `/monitor/[ticker]/api-settings` are removed from the user-facing portal.

## Design rules

- Account pages use an Account sidebar and speak in account language.
- Company pages use a Company sidebar and speak only about the selected ticker.
- No sidebar menu item should show extra small helper text.
- No tooltip/helper card should repeat navigation concepts.
- API/provider setup is not exposed to users.

# Portal Sitemap and Content Plan

Goal: keep the portal simple by separating account-level management from company-specific work.

Design direction:
- Light fintech SaaS style.
- Account pages manage the whole customer account.
- Company pages manage one selected ticker only.
- Provider/API setup is not shown to users; data sourcing is handled behind the scenes by the platform.

Sitemap:

1. Marketing site
   - `/`
   - Purpose: public SaaS landing page.
   - Primary CTA: open `/portal`.

2. Account portal
   - `/portal`
   - Purpose: account-level command center.
   - Content: company workspace table, account stats, clean navigation to Companies and Billing.

3. Account companies
   - `/portal/companies`
   - Purpose: manage issuer workspaces under one account.
   - Content: company list, add-company form, open selected ticker workspace.

4. Account billing
   - `/portal/billing`
   - Purpose: subscription, invoice, retention, and account controls.
   - Content: current plan, seats, retention, invoice email, available plans.

5. Company workspace
   - `/monitor/[ticker]`
   - Purpose: selected-company overview.
   - Content: ticker summary, delivery windows, archive count, company-specific next actions.

6. Company delivery settings
   - `/monitor/[ticker]/email-settings`
   - Purpose: recipients, schedules, timezone, test email.
   - Content: schedule controls, recipient form, recipient table, status messaging.

7. Company report archive
   - `/monitor/[ticker]/reports`
   - Purpose: sent-report history and downloads; no inline report reader.
   - Content: report table, archive policy, future additions.

8. News & filings intelligence
   - `/monitor/[ticker]/news`
   - Purpose: SEC filings and company PR monitoring.
   - Content: filing cards, PR cards, coverage policy.

9. Sentiment intelligence
   - `/monitor/[ticker]/sentiment`
   - Purpose: narrative tracking.
   - Content: sentiment cards, narrative tags, platform-managed source notes.

10. Short-interest intelligence
    - `/monitor/[ticker]/short-interest`
    - Purpose: short pressure and borrow context.
    - Content: public short-interest metrics and advanced platform-managed indicators.

11. Options / gamma intelligence
    - `/monitor/[ticker]/options`
    - Purpose: options activity and gamma context.
    - Content: options metrics and advanced platform-managed indicators.

12. Institutional ownership intelligence
    - `/monitor/[ticker]/institutional`
    - Purpose: ownership and institutional monitoring.
    - Content: ownership records and advanced platform-managed indicators.

Removed from user-facing portal:
- `/portal/integrations`
- `/monitor/[ticker]/api-settings`
- Sidebar small helper texts
- Repetitive tooltip/helper cards
- User-facing API/provider setup controls

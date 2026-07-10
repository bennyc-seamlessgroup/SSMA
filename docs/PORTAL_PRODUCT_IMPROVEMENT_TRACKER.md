# Portal Product Improvement Tracker

This tracker is used to improve the portal one task at a time. After each completed task, update the status here before moving to the next task.

## Priority Order

- [x] 0. Create product improvement tracker and prioritized backlog.
- [x] 1. Improve General Settings into a more complete SaaS preferences page.
- [ ] 2. Add localization plan and UI groundwork for English, Traditional Chinese, and Simplified Chinese across portal and marketing page.
- [ ] 3. Role-gate user/admin pages so normal users do not see admin-only controls.
- [ ] 4. Refine Company Management into an admin-facing team/workspace access page.
- [ ] 5. Refine Delivery Settings into an admin/IR report delivery control page.
- [ ] 6. Improve Alert Rules into a clearer user threshold configuration workflow.
- [ ] 7. Add or improve audit logs for user-input workflows.
- [ ] 8. Standardize empty, loading, and error states across user-facing pages.
- [ ] 9. Improve data freshness, last-update, and source visibility behavior across all pages.
- [ ] 10. Review production navigation and remove or hide remaining prototype/demo surfaces.

## Task Details

### 1. Improve General Settings

Current state:

- Language selector
- Timezone selector

Suggested additions:

- Default landing page
- Default workspace/company
- Theme preference: light, dark, system
- Number/date formatting preferences
- Report display preferences
- Session/privacy preferences

### 2. Localization Groundwork

Scope:

- Portal UI
- Marketing page
- English
- Traditional Chinese
- Simplified Chinese

Suggested approach:

- Add language preference persistence.
- Create a small translation dictionary structure first.
- Start with navigation, settings, major page headers, buttons, and marketing page copy.
- Avoid translating raw market data, ticker symbols, company names, or JSON source values.

### 3. Role-Gated Settings

Normal user:

- General
- User Profile
- Alert Rules

Admin / IR admin:

- General
- User Profile
- Company Management
- Delivery Settings
- Alert Rules

Operator / development:

- Connectors
- Notifications
- Security Policy
- Billing & Plan
- Data Sources

### 4. Company Management

Improve:

- Assigned company list
- User access list
- Invite status
- Role editing
- Remove access
- Access audit trail

### 5. Delivery Settings

Improve:

- Recipient groups
- Report delivery windows
- Approval workflow
- Delivery history
- Failed delivery state
- Preview/test email behavior

### 6. Alert Rules

Improve:

- Personal vs workspace alert rules
- Alert delivery channels
- Alert history
- Last triggered time
- Test alert action
- Clear save/cancel behavior

### 7. Audit Logs

Add/standardize audit history for:

- Internal Float
- SEC filings operations input
- Dashboard manual market inputs
- Stocktwits/manual social uploads
- Alert rule changes
- Report delivery settings

### 8. Empty, Loading, Error States

Standardize:

- No data
- Data loading
- Data source unavailable
- Permission denied
- API/S3 unavailable
- Demo mode placeholder

### 9. Data Freshness

Improve:

- Page-specific update timestamps
- Content-hash update detection
- Red-dot behavior
- Hide source details outside dev mode
- Make source status user-safe in production

### 10. Production Navigation Review

Review:

- Workspace pages
- Settings pages
- Development-only pages
- Operations portal links
- Demo-only surfaces

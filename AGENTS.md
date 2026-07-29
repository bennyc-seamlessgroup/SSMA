# Project Change-Safety Instructions

Before changing existing behavior:

1. Read `docs/CODEX_CHANGE_LOG.md`.
2. Check the relevant API contract in `docs/INTEGRATION (7).md`.
3. Preserve the previously accepted behavior documented in the change log unless
   the user explicitly asks to replace it.
4. Keep unrelated user changes intact.
5. After implementation, update `docs/CODEX_CHANGE_LOG.md` with:
   - the affected page and API;
   - the reported problem and root cause;
   - the intended behavior and invariants;
   - the files changed;
   - verification performed;
   - any remaining backend dependency or limitation.

For regressions, explicitly record which earlier behavior must remain intact.

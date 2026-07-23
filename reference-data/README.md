# Reference Data

This directory contains non-runtime data retained for backend coordination, migration validation, and historical reference. The frontend does not load these files.

| Directory | Purpose |
|---|---|
| `centralized-v2/` | Current centralized data-pipeline fixture used for contract and value validation |
| `data-point-catalog/` | Master portal data-point inventory and field mapping |
| `legacy-samples/` | Historical vendor samples, consolidated JSON examples, and derived-field notes |
| `legacy-vendor-json/` | Earlier raw vendor JSON examples |
| `legacy-data-mappings/` | Superseded page-by-page CSV mapping references |
| `legacy-json-templates/` | Superseded production JSON templates |
| `import-templates/` | Retained CSV template bundles not used by the portal runtime |

Files under a `legacy-` directory should be removed from the repository after the backend team confirms they are no longer required.

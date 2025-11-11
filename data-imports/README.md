# Resource Data Imports

This directory is for importing resource data from JSON files created by AI agents (especially Claude Web).

## Workflow

### For Claude Web Agents:

1. Research resources following Command Center instructions
2. Save resources to JSON file: `[city]-[state]-resources.json`
3. Place file in this directory (`data-imports/`)
4. Run import script: `npm run import:resources`
5. Files are processed and moved to `archived/`

### For Admins:

1. Check for new files in `data-imports/`
2. Run: `npm run import:resources`
3. Review imported suggestions in [Command Center](http://localhost:3003/admin/command-center)
4. Processed files are automatically archived

## File Format

```json
{
  "resources": [
    {
      "name": "Organization Name",
      "address": "123 Main St",
      "city": "Oakland",
      "state": "CA",
      "phone": "(510) 555-1234",
      "website": "https://example.org",
      "description": "What they do...",
      "primary_category": "employment",
      "services_offered": ["Service 1", "Service 2"],
      "source": "google_search",
      "source_url": "https://example.org"
    }
  ],
  "submitter": "claude_web",
  "notes": "Optional notes about this batch"
}
```

## Import Script

The import script (`scripts/import-resource-files.mjs`):

1. Scans `data-imports/*.json`
2. Validates JSON format
3. Posts to `/api/resources/suggest-batch` endpoint
4. Moves processed files to `archived/` with timestamp
5. Reports results (accepted, rejected, errors)

## Archived Files

Processed files are moved to `data-imports/archived/` with format:

- `YYYYMMDD-HHMMSS-original-filename.json`

This preserves a complete audit trail of all imports.

# Bulk Import Data Files

This directory stores data files for bulk imports from government data sources.

## Directory Structure

```
data-imports/
├── raw/              # Original downloaded files (CSV, Excel, JSON, etc.)
├── processed/        # Processed/normalized files ready for import
└── archived/         # Completed imports (with timestamps)
```

## Usage

### 1. Download Source Data

**CareerOneStop (Priority #1):**
Visit: https://www.careeronestop.org/Developers/Data/
Save CSV to: data-imports/raw/careeronestop-ajc.csv

**SAMHSA Treatment Locator:**
Visit: https://www.samhsa.gov/data/report/2024-national-directory-drug-and-alcohol-use-treatment
Save Excel to: data-imports/raw/samhsa-2024-directory.xlsx

### 2. Run Import Scripts

```bash
# CareerOneStop (nationwide or specific state)
npm run import:careeronestop
npm run import:careeronestop -- --state=CA

# SAMHSA
npm run import:samhsa

# HUD Exchange
npm run import:hud
```

## Notes

- Files in raw/ and processed/ are ignored by git (too large)
- Always backup raw files before processing
- See main docs/BULK_IMPORT_RECOMMENDATIONS.md for detailed guides

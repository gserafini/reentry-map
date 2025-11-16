#!/bin/bash
# Download HUD Data for Bulk Import
# Uses pyesridump for ArcGIS data and curl for HUD USER CSV files

set -e

echo "🏠 HUD Data Download Script"
echo "============================"
echo ""

# Create output directory
mkdir -p data/hud-import
cd data/hud-import

echo "📥 Step 1: Downloading HUD USER CSV files..."
echo ""

# Download 2024 Housing Inventory Count (HIC) CSV
echo "  → 2024 HIC Counts by State..."
curl -L -o 2024-HIC-Counts-by-State.csv \
  "https://www.huduser.gov/portal/sites/default/files/xls/2024-HIC-Counts-by-State.csv" \
  || echo "  ⚠️  HIC download may be blocked (try manual download)"

# Download 2007-2024 PIT Counts by CoC Excel
echo "  → 2007-2024 PIT Counts by CoC..."
curl -L -o 2007-2024-PIT-Counts-by-CoC.xlsb \
  "https://www.huduser.gov/portal/sites/default/files/xls/2007-2024-PIT-Counts-by-CoC.xlsb" \
  || echo "  ⚠️  PIT download may be blocked (try manual download)"

echo ""
echo "📥 Step 2: Checking for pyesridump..."
echo ""

if ! command -v esri2geojson &> /dev/null; then
    echo "  ⚠️  pyesridump not found. Install with:"
    echo "      pip install pyesridump"
    echo ""
    echo "  Skipping ArcGIS downloads for now."
    echo ""
else
    echo "  ✅ pyesridump found!"
    echo ""
    echo "📥 Step 3: Downloading ArcGIS data..."
    echo ""

    # Download Public Housing Developments (California)
    echo "  → Public Housing Developments (CA)..."
    esri2geojson \
      "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0" \
      ca_public_housing_developments.geojson \
      --where "STATE='CA'" \
      || echo "  ⚠️  Download failed"

    # Download Public Housing Authorities (California)
    echo "  → Public Housing Authorities (CA)..."
    esri2geojson \
      "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Authorities/FeatureServer/0" \
      ca_public_housing_authorities.geojson \
      --where "STATE='CA'" \
      || echo "  ⚠️  Download failed"

    # Download ESG Areas (California)
    echo "  → Emergency Solutions Grant Areas (CA)..."
    esri2geojson \
      "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Emergency_Solutions_Grantee_ESG_Areas/FeatureServer/4" \
      ca_esg_areas.geojson \
      --where "STATE='CA'" \
      || echo "  ⚠️  Download failed"
fi

echo ""
echo "📊 Step 4: Summary of downloads..."
echo ""

# List downloaded files with sizes
ls -lh *.csv *.xlsb *.geojson 2>/dev/null || echo "  No files downloaded yet"

echo ""
echo "✅ Download complete!"
echo ""
echo "📂 Files saved to: $(pwd)"
echo ""
echo "📖 Next steps:"
echo "   1. Parse CSV files to extract CA CoC data"
echo "   2. Convert GeoJSON to PostgreSQL/PostGIS format"
echo "   3. Map HUD fields to 'resources' table schema"
echo "   4. Run data quality checks"
echo "   5. Import to Supabase"
echo ""
echo "🔗 For manual downloads, visit:"
echo "   - HUD USER: https://www.huduser.gov/portal/datasets/ahar.html"
echo "   - Data.gov: https://catalog.data.gov/organization/hud-gov"
echo ""

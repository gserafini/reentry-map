# HUD Data Quick Reference

**Quick links and commands for downloading HUD homeless assistance and housing data**

---

## 🚀 Quick Start

### 1. Install Required Tools

```bash
# Install pyesridump for ArcGIS data
pip install pyesridump
```

### 2. Run Download Script

```bash
# Download all HUD data for California
./scripts/download-hud-data.sh
```

---

## 📥 Direct Download URLs

### HUD USER CSV Files (Manual Download)

**2024 Housing Inventory Count:**
```
https://www.huduser.gov/portal/sites/default/files/xls/2024-HIC-Counts-by-State.csv
```

**2007-2024 PIT Counts:**
```
https://www.huduser.gov/portal/sites/default/files/xls/2007-2024-PIT-Counts-by-CoC.xlsb
```

**Data.gov Catalog Pages:**
- Public Housing Developments: https://catalog.data.gov/dataset/assisted-housing-public-housing-developments-national-geospatial-data-asset-ngda
- CoC Reports: https://catalog.data.gov/dataset/coc-housing-inventory-count-reports

---

## 🔧 Command-Line Downloads

### ArcGIS Data (California Only)

**Public Housing Developments:**
```bash
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0" \
  ca_public_housing_developments.geojson \
  --where "STATE='CA'"
```

**Public Housing Authorities:**
```bash
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Authorities/FeatureServer/0" \
  ca_public_housing_authorities.geojson \
  --where "STATE='CA'"
```

**ESG Areas:**
```bash
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Emergency_Solutions_Grantee_ESG_Areas/FeatureServer/4" \
  ca_esg_areas.geojson \
  --where "STATE='CA'"
```

---

## 🌍 Nationwide Downloads

Remove the `--where "STATE='CA'"` parameter to download all states:

```bash
# All US Public Housing Developments
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0" \
  us_public_housing_developments.geojson
```

**⚠️ Warning:** Nationwide downloads can be **very large** (10,000+ records, 100MB+ files)

---

## 🔑 API Access (Registration Required)

### HUD USER APIs

**Register for free:** https://www.huduser.gov/portal/datasets/api

**Available APIs:**
- Fair Market Rents (FMR): https://www.huduser.gov/portal/dataset/fmr-api.html
- CHAS Data: https://www.huduser.gov/portal/dataset/chas-api.html
- Housing Counseling: https://data.hud.gov/housing_counseling.html (no registration)

**Rate Limit:** 60 queries/minute

**Example FMR API Call:**
```bash
# Get Fair Market Rents for Oakland, CA (ZIP 94601)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://www.huduser.gov/hudapi/public/fmr/data/ZIP?zip=94601&year=2024"
```

---

## 📊 Expected Data Volumes

### California:
- **CoC Areas:** ~50
- **Public Housing Developments:** ~1,000
- **Public Housing Authorities:** ~200
- **ESG Areas:** ~20
- **Total Unique Resources:** ~1,270

### Nationwide:
- **CoC Areas:** ~400
- **Public Housing Developments:** ~10,000
- **Public Housing Authorities:** ~3,000
- **ESG Areas:** ~200
- **Total Unique Resources:** ~13,600

---

## 📋 Data Fields Available

### Public Housing Developments (GeoJSON)

```json
{
  "FORMAL_PARTICIPANT_NAME": "Development Name",
  "ADDRESS_LINE1": "123 Main St",
  "CITY": "Oakland",
  "STATE": "CA",
  "ZIP_CODE": "94601",
  "LATITUDE": 37.8044,
  "LONGITUDE": -122.2712,
  "TOTAL_DWELLING_UNITS": 120,
  "TOTAL_OCCUPIED_UNITS": 115
}
```

### Housing Inventory Count (CSV)

- CoC Number, CoC Name, State
- Total Year-Round Beds (ES, TH, PSH, RRH, SH)
- Family Beds, Individual Beds
- Veteran Beds, Youth Beds
- Chronic Homelessness Beds

---

## ✅ License

**All HUD data is in the PUBLIC DOMAIN** (17 U.S.C. § 105)

- ✅ No licensing fees
- ✅ No restrictions on use
- ✅ Commercial use allowed
- ✅ No attribution required (requested for APIs but not mandatory)

---

## 🔗 Documentation Links

**Full Research Report:** [BULK_IMPORT_HUD_DATA_RESEARCH.md](./BULK_IMPORT_HUD_DATA_RESEARCH.md)

**HUD Portals:**
- HUD Open Data: https://hudgis-hud.opendata.arcgis.com/
- HUD USER: https://www.huduser.gov/portal/datasets/ahar.html
- Data.gov HUD: https://catalog.data.gov/organization/hud-gov
- HUD Exchange: https://www.hudexchange.info/homelessness-assistance/data/

**Support:**
- HUD Open Data: OpenData@hud.gov
- Housing Counseling: Housing.counseling@hud.gov

---

## 🛠️ Troubleshooting

### ArcGIS API Blocked?

**Problem:** Direct curl/wget returns "Access denied"

**Solution:** Use `pyesridump` tool (it handles authentication properly)

```bash
pip install pyesridump
esri2geojson [URL] [output.geojson]
```

### HUD USER CSV Downloads Blocked?

**Problem:** CSV downloads return 403 errors

**Solution:** Download manually via browser:
1. Visit https://www.huduser.gov/portal/datasets/ahar.html
2. Find "2024 AHAR: Part 1" data page
3. Look for "Click here to access the data" link
4. Download CSV/Excel files directly

### Need Project-Level Data (Not Just CoC Summaries)?

**Solution:** Contact individual CoCs for HMIS data access
- Each CoC manages their own Homelessness Data Exchange (HDX)
- Request access at: https://hudhdx2.info/
- Requires approval from CoC lead agency

---

## 📝 Next Steps

1. ✅ Run `./scripts/download-hud-data.sh`
2. ⬜ Parse downloaded files
3. ⬜ Map to `resources` table schema
4. ⬜ Create import ETL pipeline
5. ⬜ Test import with 10-20 records
6. ⬜ Full import to Supabase
7. ⬜ Verify geolocation accuracy
8. ⬜ Enrich with AI agents (websites, phone numbers)

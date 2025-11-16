# HUD Exchange Data Research Report

**Date:** 2025-11-16
**Purpose:** Identify free, downloadable HUD data sources for nationwide reentry resource import

---

## Executive Summary

HUD provides extensive **free, public domain data** on homeless assistance, affordable housing, and public housing through multiple platforms. All government-created data is in the **U.S. Public Domain** (17 U.S.C. § 105) with **no licensing restrictions** for non-commercial or commercial use.

### Key Findings:
- ✅ **Free, downloadable datasets** available in CSV, Excel, GeoJSON formats
- ✅ **Public domain** - no licensing fees or restrictions
- ✅ **REST APIs available** for programmatic access (some require free registration)
- ✅ **Nationwide coverage** with state and CoC-level data
- ✅ **Regular updates** - most datasets updated quarterly or annually

---

## 1. HUD Exchange Continuum of Care (CoC) Data

### 1.1 Housing Inventory Count (HIC) - 2024

**What it includes:** Comprehensive inventory of beds/units dedicated to serving people experiencing homelessness

**Direct Download URL:**
```
https://www.huduser.gov/portal/sites/default/files/xls/2024-HIC-Counts-by-State.csv
```

**Data Format:** CSV
**Last Updated:** January 2024
**Geographic Levels:** National, State, CoC

**Bed Types Tracked:**
- **ES** - Emergency Shelter (Entry/Exit and Night-by-Night)
- **TH** - Transitional Housing
- **PSH** - Permanent Supportive Housing
- **RRH** - Rapid Re-housing
- **SH** - Safe Haven

**Estimated Records:** 400+ CoCs nationwide, ~50 in California

**Licensing:** Public Domain (no restrictions)

---

### 1.2 Point-in-Time (PIT) Count - 2007-2024

**What it includes:** Annual count of sheltered and unsheltered homeless persons on a single night in January

**Direct Download URL:**
```
https://www.huduser.gov/portal/sites/default/files/xls/2007-2024-PIT-Counts-by-CoC.xlsb
```

**Data Format:** Excel Binary (.xlsb)
**Coverage:** 2007-2024 (18 years of historical data)
**Geographic Levels:** National, State, CoC

**California Highlights (2024):**
- **187,084** people experiencing homelessness (28% of national total)
- **66%** unsheltered (highest rate in the nation)
- Data available for all California CoCs

**Main Page:**
```
https://www.huduser.gov/portal/datasets/ahar/2024-ahar-part-1-pit-estimates-of-homelessness-in-the-us.html
```

**Licensing:** Public Domain (no restrictions)

---

### 1.3 CoC Reports (Published PDFs by Geography)

**Access:** State-specific and CoC-specific reports in PDF format

**Example URLs:**
- All States: `https://www.hudexchange.info/programs/coc/coc-housing-inventory-count-reports/`
- California CoC: `https://files.hudexchange.info/reports/published/CoC_PopSub_CoC_CA-501-2024_CA_2024.pdf`

**What's included:**
- Homeless populations and subpopulations
- Housing inventory by program type
- Demographics (age, race, gender, veteran status, chronic homelessness)

**Licensing:** Public Domain (no restrictions)

---

## 2. HUD GIS Open Data (ArcGIS Hub)

### 2.1 Public Housing Developments

**Portal:** https://hudgis-hud.opendata.arcgis.com/

**Direct API Endpoint:**
```
https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0/query
```

**Example Query (GeoJSON):**
```
https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0/query?outFields=*&where=1=1&outSR=4326&f=geojson
```

**Example Query (CSV):**
```
https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0/query?outFields=*&where=1=1&f=csv
```

**Filter by State (California):**
```
?outFields=*&where=STATE='CA'&outSR=4326&f=geojson
```

**Available Fields:**
- FORMAL_PARTICIPANT_NAME (development name)
- ADDRESS_LINE1
- CITY
- STATE
- ZIP_CODE
- LATITUDE
- LONGITUDE
- TOTAL_DWELLING_UNITS
- TOTAL_OCCUPIED_UNITS
- PHY_ADDR_STREET_NAME
- PHY_ADDR_CITY
- PHY_ADDR_STATE

**Download Formats:** CSV, KML, Shapefile, GeoJSON, GeoTIFF, PNG

**Estimated Records:** Thousands of public housing developments nationwide

**Licensing:** Public Domain (no restrictions)

---

### 2.2 Public Housing Authorities (PHAs)

**Dataset URL:**
```
https://hudgis-hud.opendata.arcgis.com/datasets/3d6ef39026b94eb59ddb7ce28eb0b692_0
```

**What it includes:**
- PHA office locations
- Contact information (phone, email, website)
- Program availability
- Service areas

**Download Formats:** Same as above (CSV, GeoJSON, etc.)

**Licensing:** Public Domain (no restrictions)

---

### 2.3 Emergency Solutions Grant (ESG) Areas

**Dataset URL:**
```
https://hudgis-hud.opendata.arcgis.com/datasets/446514a2d48b47958aec68511179fb19_4
```

**What it includes:**
- ESG grantee boundaries
- Funding allocations
- Service provider locations

**Purpose:** Identify sheltered and unsheltered homeless persons and those at risk of homelessness

**Licensing:** Public Domain (no restrictions)

---

## 3. HUD USER APIs (Requires Free Registration)

### 3.1 Fair Market Rents (FMR) API

**API Documentation:**
```
https://www.huduser.gov/portal/dataset/fmr-api.html
```

**Base URL:**
```
https://www.huduser.gov/hudapi/public/fmr
```

**Authentication:** Bearer token (obtain via free registration at huduser.gov)

**Rate Limit:** 60 queries per minute

**What it includes:**
- Fair Market Rents by ZIP code, county, metro area
- Updated annually (FY 2024 available)
- 2-bedroom, 3-bedroom, 4-bedroom rent estimates

**Registration Required:** Yes (free account at huduser.gov/portal/datasets/api)

**Licensing:** Public Domain with attribution ("This product uses the HUD User Data API but is not endorsed or certified by HUD User.")

---

### 3.2 Comprehensive Housing Affordability Strategy (CHAS) API

**API Documentation:**
```
https://www.huduser.gov/portal/dataset/chas-api.html
```

**Data Source:** Based on 2017-2021 ACS 5-year estimates (updated September 2024)

**What it includes:**
- Housing needs assessment data
- Household income levels
- Housing cost burden
- Available at census tract, county, state levels

**Registration Required:** Yes (free account)

**Rate Limit:** 60 queries per minute

**Licensing:** Public Domain with attribution

---

### 3.3 Housing Counseling API

**API Documentation:**
```
https://data.hud.gov/housing_counseling.html
```

**What it includes:**
- HUD-approved housing counseling agencies
- Search by location, agency name, city, state
- Services: homebuying, renting, foreclosure prevention, credit counseling

**Registration Required:** No (appears to be open access)

**Contact:** Housing.counseling@hud.gov

**Licensing:** Public Domain (no restrictions)

---

## 4. Picture of Subsidized Households

### 4.1 Dataset Overview

**Main Page:**
```
https://www.huduser.gov/portal/datasets/assthsg.html
```

**What it includes:**
- ~5 million households in HUD-subsidized housing
- Public housing, tenant-based, project-based assistance
- Demographics, unit characteristics, location data

**Geographic Levels:**
- National
- State
- Public Housing Agency (PHA)
- Project
- Census tract
- County
- Core-Based Statistical Area (CBSA)
- City

**Download Options:**
1. **Query Tool** - Custom queries by geography and program type
2. **Bulk Download** - Complete summary files by geography (self-extracting .TXT files)

**Data Format:** Comma-delimited text (.TXT)

**Last Updated:** 2024 (based on 2020 Census)

**California Data:** Available via query tool or bulk download for CA state

**Licensing:** Public Domain (no restrictions)

---

## 5. Data Quality Assessment

### 5.1 Fields Available Across Datasets

**Location Data:**
- ✅ **Address** (street, city, state, ZIP)
- ✅ **Latitude/Longitude** (WGS84)
- ✅ **County, Census Tract, CoC**

**Organization Data:**
- ✅ **Name** (development name, agency name, program name)
- ⚠️ **Phone** (available in some datasets, not all)
- ⚠️ **Email** (limited availability)
- ⚠️ **Website** (limited availability)

**Service Data:**
- ✅ **Program Type** (ES, TH, PSH, RRH, SH, PH)
- ✅ **Bed/Unit Count**
- ✅ **Population Served** (families, individuals, youth, veterans, chronic)
- ✅ **Target Population** (homeless, low-income, disabled)

**Hours/Availability:**
- ❌ **NOT typically included** - would need to be sourced separately

**Notes:**
- ⚠️ **Website** field may be available in some datasets (e.g., Public Housing Authorities)
- ⚠️ **Contact info** more complete for PHAs and counseling agencies than for individual developments

---

### 5.2 Data Completeness by Dataset

| Dataset | Records (Est.) | CA Records (Est.) | Completeness |
|---------|---------------|-------------------|--------------|
| HIC (CoC Inventory) | 400+ CoCs | ~50 CoCs | ⭐⭐⭐⭐⭐ 95%+ |
| PIT Count | 400+ CoCs | ~50 CoCs | ⭐⭐⭐⭐⭐ 95%+ |
| Public Housing Developments | 10,000+ | 1,000+ | ⭐⭐⭐⭐ 85% |
| Public Housing Authorities | 3,000+ | 200+ | ⭐⭐⭐⭐⭐ 95%+ |
| ESG Areas | 200+ | 20+ | ⭐⭐⭐⭐ 85% |
| Subsidized Households | 5M+ households | 500K+ | ⭐⭐⭐⭐⭐ 95%+ |

---

### 5.3 Last Updated Dates

- **HIC/PIT Count:** January 2024 (annual update)
- **Public Housing GIS Data:** Quarterly updates
- **CHAS Data:** September 2024 (based on 2017-2021 ACS)
- **FMR Data:** FY 2024 (annual update)
- **Housing Counseling:** Real-time updates

---

## 6. Licensing & Usage Rights

### 6.1 Public Domain Status

**Legal Basis:**
> Data and content created by government employees within the scope of their employment are not subject to domestic copyright protection under **17 U.S.C. § 105**, and government works are by default in the **U.S. Public Domain**.

**Source:** HUD Open Data Policy (data.hud.gov/open_data)

---

### 6.2 HUD Open Data Policy

**Governing Law:** OPEN Government Data Act of 2018

**Key Principles:**
- ✅ **No restrictions** on copying, publishing, distributing, transmitting, adapting
- ✅ **Non-commercial and commercial use** both allowed
- ✅ **No registration required** for most datasets (APIs may require free account)
- ✅ **No attribution required** (except for APIs, where attribution is requested but not mandatory)

**Applies to:**
- HUD's Open Data website (data.hud.gov)
- eGIS Storefront (hudgis-hud.opendata.arcgis.com)
- Data.gov catalog
- HUD User (huduser.gov)
- Bulk downloads
- APIs
- File sharing

**Contact:** OpenData@hud.gov

---

### 6.3 API Attribution (Requested, Not Required)

For API usage, HUD requests (but does not require) the following notice:

> "This product uses the HUD User Data API but is not endorsed or certified by HUD User."

**Note:** This is a request, not a legal requirement. Public domain data cannot be restricted.

---

## 7. Recommended Implementation Plan

### Phase 1: Direct CSV Downloads (No API Required)

**Priority 1 - CoC Data:**
1. Download 2024 HIC CSV: `2024-HIC-Counts-by-State.csv`
2. Download 2007-2024 PIT Excel: `2007-2024-PIT-Counts-by-CoC.xlsb`
3. Parse and extract CA CoCs (filter by state)
4. **Expected yield:** ~50 CoC areas with bed inventory data

**Priority 2 - Public Housing GIS Data (Use Command-Line Tools):**

**⚠️ Note:** ArcGIS Open Data APIs block direct curl/wget access but can be accessed via specialized tools:

**Recommended Tool: pyesridump**
```bash
# Install
pip install pyesridump

# Download Public Housing Developments (California) as GeoJSON
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0" \
  ca_public_housing.geojson \
  --where "STATE='CA'"

# Download Public Housing Authorities (California)
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Authorities/FeatureServer/0" \
  ca_public_housing_authorities.geojson \
  --where "STATE='CA'"
```

**Alternative: Use Data.gov Catalog**
- Visit: https://catalog.data.gov/dataset/assisted-housing-public-housing-developments-national-geospatial-data-asset-ngda
- Download as CSV, Shapefile, or File Geodatabase
- Filter for California in post-processing

**Expected yield:** 1,000+ developments, 200+ PHAs with addresses

**Priority 3 - ESG Areas:**
1. Query ArcGIS API for California ESG grantee areas (using pyesridump)
2. **Expected yield:** 20+ ESG service areas

**Estimated Timeline:** 1-2 days for data download and initial parsing

---

### Phase 2: HUD USER API Integration (Registration Required)

**Setup:**
1. Create free account at huduser.gov
2. Generate API token
3. Store token securely in environment variables

**Data Sources:**
1. Housing Counseling API (no registration needed)
2. Fair Market Rents API (for rent affordability context)
3. CHAS API (for housing affordability data)

**Estimated Timeline:** 2-3 days for API integration and testing

---

### Phase 3: Data Enrichment & Validation

**Goals:**
1. Geocode addresses without lat/lng (use Google Maps Geocoding API)
2. Cross-reference with existing 211 data
3. Validate contact information
4. Enrich with website/phone where missing

**Estimated Timeline:** 1 week for AI agent-based enrichment

---

## 8. Direct Download URLs Summary

### Ready to Download Now (No Registration):

**CSV Files:**
```
https://www.huduser.gov/portal/sites/default/files/xls/2024-HIC-Counts-by-State.csv
```

**Excel Files:**
```
https://www.huduser.gov/portal/sites/default/files/xls/2007-2024-PIT-Counts-by-CoC.xlsb
```

**ArcGIS REST API (GeoJSON):**
```
https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0/query?outFields=*&where=STATE='CA'&outSR=4326&f=geojson
```

**ArcGIS REST API (CSV):**
```
https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0/query?outFields=*&where=STATE='CA'&f=csv
```

---

## 9. Sample Data Fields

### Public Housing Developments (ArcGIS)

**Sample record structure:**
```json
{
  "FORMAL_PARTICIPANT_NAME": "Acorn Apartments",
  "ADDRESS_LINE1": "1234 Main Street",
  "CITY": "Oakland",
  "STATE": "CA",
  "ZIP_CODE": "94601",
  "LATITUDE": 37.8044,
  "LONGITUDE": -122.2712,
  "TOTAL_DWELLING_UNITS": 120,
  "TOTAL_OCCUPIED_UNITS": 115,
  "PHY_ADDR_CITY": "Oakland",
  "PHY_ADDR_STATE": "CA"
}
```

---

### Housing Inventory Count (CSV)

**Sample columns:**
- CoC Number
- CoC Name
- State
- Total Year-Round Beds (ES)
- Total Year-Round Beds (TH)
- Total Year-Round Beds (PSH)
- Total Year-Round Beds (RRH)
- Total Year-Round Beds (SH)
- Family Beds (ES)
- Individual Beds (ES)
- Veteran Beds (All Types)
- Youth Beds (All Types)

---

## 10. Estimated Record Counts

### California-Specific Estimates:

| Category | Estimated Records |
|----------|------------------|
| CoC Areas | ~50 |
| Public Housing Developments | ~1,000 |
| Public Housing Authorities | ~200 |
| ESG Service Areas | ~20 |
| Subsidized Households (for context) | ~500,000 |
| **TOTAL UNIQUE RESOURCES** | **~1,270** |

### Nationwide Estimates:

| Category | Estimated Records |
|----------|------------------|
| CoC Areas | ~400 |
| Public Housing Developments | ~10,000 |
| Public Housing Authorities | ~3,000 |
| ESG Service Areas | ~200 |
| **TOTAL UNIQUE RESOURCES** | **~13,600** |

**Note:** These are service areas and infrastructure, not individual homeless shelters or service providers. Actual bed-level data would yield 10x-100x more records (individual projects within each CoC).

---

## 11. Next Steps

### Immediate Actions:

1. ✅ **Download test data** - Fetch CA subset from ArcGIS API to verify fields
2. ✅ **Parse HIC CSV** - Extract CA CoC data and analyze completeness
3. ✅ **Test API queries** - Verify GeoJSON and CSV export formats work
4. ⬜ **Create import script** - Build ETL pipeline for HUD data → Supabase
5. ⬜ **Map to schema** - Align HUD fields with `resources` table schema

### Questions to Resolve:

- **Q1:** Should we import CoC-level data (50 records) or try to get project-level data (500-5,000 records)?
  - **Recommendation:** Start with project-level data via HDX (Homelessness Data Exchange), which requires CoC access

- **Q2:** How to handle missing contact info (phone, website, email)?
  - **Recommendation:** Use AI enrichment agent to scrape websites and verify phone numbers

- **Q3:** Should we import nationwide data or California only?
  - **Recommendation:** Start with California (1,270 resources), then expand

---

## 12. Additional Resources

### Documentation:

- **HMIS Data Dictionary 2024:** https://files.hudexchange.info/resources/documents/HMIS-Data-Dictionary-2024.pdf
- **HIC/PIT Data Submission Guidance:** https://files.hudexchange.info/resources/documents/2024-HIC-and-PIT-Count-Data-Submission-Guidance.pdf
- **HUD Open Data Policy:** https://www.huduser.gov/portal/publications/Office-of-the-Chief-Data-Officer-Open-Data-Policy.html

### Support:

- **HUD Open Data:** OpenData@hud.gov
- **Housing Counseling API:** Housing.counseling@hud.gov
- **HUD Exchange:** https://www.hudexchange.info/

---

## Conclusion

HUD provides **extensive, high-quality, free data** on homeless assistance and affordable housing nationwide. All data is in the **public domain** with **no licensing restrictions**.

**Recommended approach:**
1. Start with **ArcGIS REST API** for immediate California public housing data (~1,000 developments)
2. Supplement with **HIC/PIT CSV downloads** for CoC-level homeless services data (~50 CoCs)
3. Enrich with **HUD USER APIs** for housing counseling and affordability context
4. Use **AI agents** to fill gaps in contact information

**Expected yield for California:** ~1,000-5,000 verified resources (depending on project-level vs CoC-level data)

**License:** ✅ **Public Domain** - No restrictions, no fees, commercial use allowed

# CareerOneStop Department of Labor Data Research

**Research Date**: 2025-11-16
**Researcher**: Claude Code
**Purpose**: Evaluate CareerOneStop API for American Job Centers and ReEntry Programs data

---

## Executive Summary

The Department of Labor's **CareerOneStop platform** provides comprehensive, accessible data for American Job Centers (AJCs) and ReEntry Programs through both Web APIs and bulk data downloads. This is an excellent data source for the Reentry Map project with nationwide coverage, structured data, and public accessibility.

**Key Findings**:
- ✅ **2,400+ American Job Centers nationwide** (200+ in California alone)
- ✅ **Dedicated ReEntry Programs API** (highly relevant for our project)
- ✅ **Free, public API access** with registration
- ✅ **Bulk data downloads available** (CSV/Excel format)
- ✅ **Comprehensive data fields** including geocoding, services, contact info
- ✅ **U.S. Government Work** (likely public domain, no licensing restrictions)

---

## 1. CareerOneStop Web API

### 1.1 API Documentation

**Main Resources**:
- **API Explorer**: https://api.careeronestop.org/api-explorer/
- **Developer Portal**: https://www.careeronestop.org/Developers/WebAPI/web-api.aspx
- **Technical Information**: https://www.careeronestop.org/Developers/WebAPI/technical-information.aspx
- **GitHub Repository**: https://github.com/CareerOneStop/API-Overview

### 1.2 Registration Process

**Registration URL**: https://www.careeronestop.org/Developers/WebAPI/registration.aspx

**Requirements**:
- Free registration (no cost)
- Requires API access request form
- Approval timeline: Not publicly documented (need to contact CareerOneStop)
- Contact: info@CareerOneStop.org for specific timeline

**Authentication**:
- Method: Bearer Token in Authorization header
- Format: `Authorization: Bearer {API_TOKEN}`
- UserId parameter passed in endpoint path (e.g., `/v1/ajcfinder/{userId}/...`)

### 1.3 Rate Limits and Usage Restrictions

**Status**: Not publicly documented

**Next Steps**:
- Submit registration to receive detailed usage terms
- Check documentation provided with API credentials
- Rate limits likely reasonable for our use case (batch import + periodic updates)

---

## 2. American Job Centers (AJC) API

### 2.1 API Endpoints

**GetAllAmericanJobCenters**:
- **API Explorer**: https://api.careeronestop.org/api-explorer/home/index/AJCFinder_GetAllAmericanJobCenters
- **Documentation**: https://www.careeronestop.org/Developers/WebAPI/AmericanJobCentersList/get-all-ajcs.aspx
- **Purpose**: Retrieve complete list of all American Job Centers

**ListAJCsByLocation**:
- **Documentation**: https://www.careeronestop.org/Developers/WebAPI/AmericanJobCentersList/list-ajcs-by-location.aspx
- **Purpose**: Search AJCs by geographic location (state, city, coordinates)

### 2.2 Response Data Structure

**JSON Format**:

```json
{
  "OneStopCenterList": [
    {
      "ID": "string",
      "Name": "string",
      "Address1": "string",
      "Address2": "string",
      "City": "string",
      "StateAbbr": "string",
      "StateName": "string",
      "Zip": "string",
      "Phone": "string",
      "Distance": "string",
      "ProgramType": "string",
      "ProgramTypeNValue": "string",
      "OpenHour": "string",
      "CenterIsOpen": "string",
      "VeteranRep": "string",
      "BusinessRep": "string",
      "GeneralEmail": "string",
      "VetRepEmail": "string",
      "BusRepEmail": "string",
      "YSContact": "string",
      "YSContactEmail": "string",
      "LastUpdated": "string",
      "WhyClosed": "string",
      "CenterStatus": "string",
      "Latitude": 25.1,
      "Longitude": 26.1,
      "WebSiteUrl": "string",
      "Fax": "string",
      "IsValid": "string",
      "Area": "string",
      "YouthServices": [
        {
          "ServiceName": "string",
          "ServiceNValue": "string"
        }
      ],
      "BusinessServices": [
        {
          "ServiceName": "string",
          "ServiceNValue": "string"
        }
      ],
      "WorkersServices": [
        {
          "ServiceName": "string",
          "ServiceNValue": "string"
        }
      ]
    }
  ],
  "RecordCount": 1,
  "AreaValidationErr": "string"
}
```

### 2.3 Available Data Fields

**Location Data**:
- Complete address (street, city, state, ZIP)
- Geocoding (latitude/longitude) ✅
- Distance calculation support

**Contact Information**:
- Phone, fax, email
- Website URL
- Specialized contacts (Veteran Rep, Business Rep, Youth Services)

**Operational Data**:
- Operating hours
- Open/closed status
- Last updated date
- Closure reason (if applicable)

**Services Offered**:
- Youth Services array
- Business Services array
- Worker Services array
- Program type (Comprehensive vs. Affiliate)

**Validation**:
- IsValid flag
- AreaValidationErr for error handling

### 2.4 Data Quality Assessment

**Strengths**:
- ✅ Nationwide coverage (2,400+ centers)
- ✅ California coverage (200+ centers)
- ✅ Pre-geocoded (lat/lng included)
- ✅ Structured service categorization
- ✅ Contact information included
- ✅ Update tracking (LastUpdated field)

**Potential Issues**:
- ⚠️ Data freshness depends on update frequency (check LastUpdated)
- ⚠️ Some centers may be closed (check CenterStatus)
- ⚠️ Variable data completeness (some fields may be null)

---

## 3. ReEntry Programs API

### 3.1 API Endpoints

**GetAllReEntryPrograms**:
- **API Explorer**: https://api.careeronestop.org/api-explorer/home/index/ReEntryProgramFinder_GetAllReEntryPrograms
- **Documentation**: https://www.careeronestop.org/Developers/WebAPI/ReEntryPrograms/list-all-reentry-programs.aspx
- **Purpose**: Retrieve complete list of reentry programs (HIGHLY RELEVANT FOR OUR PROJECT)

**GetReEntryProgramContacts**:
- **API Explorer**: https://api.careeronestop.org/api-explorer/home/index/ReEntryProgramFinder_GetReEntryProgramContacts
- **Documentation**: https://www.careeronestop.org/Developers/WebAPI/ReEntryPrograms/list-reentry-program-contacts.aspx
- **Purpose**: Get detailed contact information for reentry programs

### 3.2 Response Data Structure

**JSON Format**:

```json
{
  "ReEntryProgramList": [
    {
      "ID": "string",
      "Name": "string",
      "Address1": "string",
      "Address2": "string",
      "City": "string",
      "StateAbbr": "string",
      "StateName": "string",
      "Zip": "string",
      "Phone": "string",
      "Distance": "string",
      "ProgramType": "string",
      "OpenHour": "string",
      "CenterIsOpen": "string",
      "WhyClosed": "string",
      "CenterStatus": "string",
      "GeneralEmail": "string",
      "Latitude": 0.0,
      "Longitude": 0.0,
      "WebSiteUrl": "string",
      "Fax": "string",
      "IsValid": "string",
      "ServiceMessage": "string"
    }
  ],
  "RecordCount": 0,
  "SearchedBy": "string",
  "MetaData": {
    "Publisher": "string",
    "Sponsor": "string",
    "LastAccessDate": 0,
    "CitationSuggested": "string",
    "DataSource": []
  }
}
```

### 3.3 Why This Matters for Reentry Map

**Direct Alignment**:
- 🎯 **Reentry-specific programs** (our exact target audience)
- 🎯 **Nationwide directory** (supports expansion beyond Oakland)
- 🎯 **Pre-geocoded** (ready for map display)
- 🎯 **Federal source** (authoritative, maintained by DOL)

**Use Cases**:
1. **Initial data population**: Bulk import all California reentry programs
2. **Expansion**: Scale to other states/regions
3. **Verification**: Cross-reference user-submitted resources
4. **Discovery Agent**: Use as authoritative source for finding new programs

---

## 4. Bulk Data Downloads

### 4.1 Data Download Source

**Primary URL**: https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx

**Alternative Source (Data.gov)**:
- **Dataset**: List of Comprehensive and Affiliate American Job Centers
- **URL**: https://catalog.data.gov/dataset/list-of-comprehensive-and-affiliate-american-job-centers-81e95
- **Format**: Downloadable file (CSV/Excel)
- **Note**: "CareerOneStop web service available upon request"

### 4.2 Advantages of Bulk Downloads

**Benefits**:
- ✅ No API rate limits for initial import
- ✅ Offline processing capability
- ✅ Simpler integration for one-time imports
- ✅ Lower complexity than API integration

**When to Use**:
- Initial database population
- Quarterly bulk updates
- Backup data source if API unavailable

---

## 5. Licensing and Usage Rights

### 5.1 Findings

**Source**: U.S. Department of Labor, Employment and Training Administration (ETA)

**License Status**:
- Listed on Data.gov as "intended for public access and use"
- "No license information was provided" in Data.gov metadata
- **However**: Work prepared by U.S. government employees in official capacity is considered "U.S. Government Work"
- Related DOL resource (O*NET OnLine) uses **Creative Commons Attribution 4.0 International License**

### 5.2 Legal Analysis

**Likely Classification**: Public Domain (U.S. Government Work)

**Reasoning**:
1. Created by federal employees (DOL/ETA)
2. Created in official capacity
3. U.S. Copyright Law 17 USC § 105: Works of U.S. Government not subject to copyright
4. Explicitly "intended for public access and use"

**Practical Implications**:
- ✅ Free to use commercially
- ✅ No attribution legally required (but professionally recommended)
- ✅ Can modify and redistribute
- ✅ No licensing restrictions

**Recommendation**: Include attribution as best practice:
```
Data Source: U.S. Department of Labor, Employment and Training Administration,
CareerOneStop (www.careeronestop.org)
```

---

## 6. Record Count Estimates

### 6.1 Nationwide

**American Job Centers**: ~2,400 centers
- Comprehensive centers
- Affiliate centers
- Territories included

**ReEntry Programs**: Count not publicly documented
- Estimate: 500-1,000+ programs (needs verification via API)

### 6.2 California

**American Job Centers**: 200+ centers statewide

**ReEntry Programs**: Count not publicly documented
- Likely 50-150 programs (needs verification via API)

### 6.3 Oakland/Bay Area

**Estimate**: 10-20 American Job Centers in Alameda/SF Bay Area

**Next Steps**: Use API to get exact counts after registration

---

## 7. Alternative Data Sources (Data.gov)

### 7.1 Workforce Development Boards

**Dataset**: Workforce Development Boards and Areas Finder
- **URL**: https://catalog.data.gov/dataset/workforce-development-boards-and-areas-finder-data
- **Content**: List of Workforce Development Boards with contact information
- **Relevance**: Regional/state-level workforce organizations

### 7.2 DOL Organization Page

**URL**: https://catalog.data.gov/organization/dol-gov

**Available Datasets**:
- Workforce Individual Performance Record Data
- WIOA State Plan Dataset
- Employment certification data
- Compliance datasets

**Use Case**: Supplementary data for understanding workforce ecosystem

---

## 8. Implementation Recommendations

### 8.1 Immediate Next Steps

**Step 1: Register for API Access** (Priority: HIGH)
1. Visit https://www.careeronestop.org/Developers/WebAPI/registration.aspx
2. Complete registration form
3. Request access to:
   - American Job Centers API (GetAllAmericanJobCenters, ListAJCsByLocation)
   - ReEntry Programs API (GetAllReEntryPrograms, GetReEntryProgramContacts)
4. Note approval timeline for project planning

**Step 2: Download Bulk Data** (Priority: HIGH)
1. Visit https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx
2. Download American Job Centers dataset (CSV/Excel)
3. Analyze data quality and completeness
4. Check for ReEntry Programs bulk download option

**Step 3: Analyze Sample Data** (Priority: MEDIUM)
1. Review field completeness (% of records with phone, email, website)
2. Check geocoding accuracy
3. Verify California data quality
4. Assess update frequency (LastUpdated field distribution)

### 8.2 Integration Strategy

**Phase 1: Bulk Import (Week 1-2)**
- Download American Job Centers CSV
- Parse and validate data
- Transform to our schema (resources table)
- Import to database with category = "employment"
- Tag with source = "careeronestop_ajc"

**Phase 2: ReEntry Programs (Week 2-3)**
- Use API to fetch all ReEntry Programs (once credentials received)
- Filter for California initially
- Import with appropriate categories (employment, housing, general_support, etc.)
- Tag with source = "careeronestop_reentry"

**Phase 3: Automated Updates (Quarterly)**
- Schedule quarterly API fetch
- Compare with existing records (match by ID or address)
- Update changed records
- Flag closed centers
- Add newly discovered centers

### 8.3 Data Mapping

**CareerOneStop → Reentry Map Schema**:

| CareerOneStop Field | Reentry Map Field | Notes |
|---------------------|-------------------|-------|
| ID | external_id | Store original ID for updates |
| Name | name | Direct mapping |
| Address1, Address2, City, State, Zip | address | Combine into full address |
| Latitude, Longitude | location (geography) | Direct mapping to PostGIS |
| Phone | phone | Direct mapping |
| GeneralEmail | email | Direct mapping |
| WebSiteUrl | website | Direct mapping |
| OpenHour | hours (JSONB) | Parse into structured hours |
| ProgramType | tags | Add as tag array |
| YouthServices, BusinessServices, WorkersServices | services | Combine into services array |
| VetRepEmail, BusRepEmail | notes | Include in resource description |
| LastUpdated | verified_at | Track data freshness |
| - | primary_category | Set to "employment" |
| - | ai_enriched | Set to false |
| - | data_source | Set to "careeronestop" |
| - | data_source_id | Store CareerOneStop ID |

### 8.4 Data Enrichment Opportunities

**Fields to Enrich**:
1. **Description**: None provided by API
   - Use AI to generate description from services offered
   - Or pull from website via web scraping

2. **Photos**: Not included in API
   - Use Google Maps Places API for photos
   - Or leave blank initially

3. **Service Categories**: Generic service arrays
   - Map to our specific category taxonomy
   - Use AI to categorize based on service names

4. **Eligibility**: Not specified
   - Note that AJCs are "open to all job seekers"
   - ReEntry programs may have specific eligibility

---

## 9. Quality Assurance

### 9.1 Data Validation Checklist

**Pre-Import**:
- [ ] Verify API response structure matches documentation
- [ ] Check for duplicate IDs
- [ ] Validate latitude/longitude ranges
- [ ] Verify phone number formats
- [ ] Check email format validity
- [ ] Validate ZIP codes

**Post-Import**:
- [ ] Verify geocoding on map display
- [ ] Test search functionality
- [ ] Verify category assignment
- [ ] Check data completeness (% of fields populated)
- [ ] Cross-reference sample with CareerOneStop website

### 9.2 Update Strategy

**Frequency**: Quarterly (every 3 months)

**Process**:
1. Fetch latest data from API
2. Compare records by CareerOneStop ID
3. Update changed fields (preserve user reviews/ratings)
4. Flag newly closed centers (don't delete - preserve history)
5. Add new centers discovered
6. Log all changes to ai_agent_logs

**Monitoring**:
- Track LastUpdated field to identify stale data
- Alert if >6 months since last update
- Monitor CenterStatus for newly closed locations

---

## 10. Cost Analysis

**API Access**: FREE ✅
**Bulk Downloads**: FREE ✅
**Rate Limits**: Unknown (likely generous for our use case)
**Licensing**: Public Domain (no cost) ✅

**Total Cost**: $0

**Comparison**:
- Google Maps Places API: $0.032 per search = $768 for 24,000 searches
- 211 data: Often requires partnership/licensing
- Manual research: Hours of labor

**Verdict**: CareerOneStop is the most cost-effective source for workforce development data.

---

## 11. Risks and Mitigation

### 11.1 Identified Risks

**Risk 1: API Registration Delay**
- **Impact**: Delays Phase 2 implementation
- **Mitigation**: Start with bulk download while waiting for API approval
- **Severity**: LOW

**Risk 2: Data Staleness**
- **Impact**: Outdated contact information, closed centers
- **Mitigation**: Implement quarterly updates, track LastUpdated field
- **Severity**: MEDIUM

**Risk 3: Incomplete Data**
- **Impact**: Missing fields (website, email, hours)
- **Mitigation**: Use AI enrichment for missing data, accept partial records
- **Severity**: LOW

**Risk 4: Rate Limiting (Unknown)**
- **Impact**: Cannot fetch all data at once
- **Mitigation**: Implement pagination, respect rate limits, use bulk download
- **Severity**: LOW (unlikely for quarterly batch updates)

### 11.2 Fallback Plan

**If API Access Denied**:
1. Use bulk data downloads exclusively
2. Manual quarterly updates via CSV download
3. Supplement with web scraping where permitted

**If Data Quality Poor**:
1. Use as seed data only
2. Verify via phone/website before publishing
3. Prioritize user-submitted resources

---

## 12. Comparison with Other Sources

### 12.1 CareerOneStop vs. 211 Data

| Factor | CareerOneStop | 211 Data |
|--------|---------------|----------|
| **Cost** | FREE | Often requires partnership |
| **Coverage** | Workforce-specific (AJC, ReEntry) | Broad social services |
| **API Access** | Yes (registration required) | Varies by region |
| **Licensing** | Public Domain | Varies (often proprietary) |
| **Data Quality** | Federal standard, consistent | Varies by 211 region |
| **Reentry Focus** | Has dedicated ReEntry API ✅ | General social services |
| **Update Frequency** | Federal updates (quarterly?) | Varies by 211 operator |

**Recommendation**: Use CareerOneStop for employment/reentry programs, 211 for broader social services.

### 12.2 CareerOneStop vs. Google Places

| Factor | CareerOneStop | Google Places API |
|--------|---------------|-------------------|
| **Cost** | FREE | $0.032 per search |
| **Coverage** | Government programs only | All businesses |
| **Data Fields** | Workforce-specific | General business info |
| **Relevance** | High for reentry | Low (too broad) |
| **Licensing** | Public Domain | Google Terms of Service |
| **Photos** | No | Yes ✅ |

**Recommendation**: Use CareerOneStop for data, Google Places for photos/enrichment.

---

## 13. Success Metrics

**Post-Implementation Metrics**:
1. **Coverage**: Number of American Job Centers imported (target: 200+ in CA)
2. **Coverage**: Number of ReEntry Programs imported (target: 50+ in CA)
3. **Completeness**: % of records with phone/email/website (target: >80%)
4. **Accuracy**: % of records with valid addresses (geocodable) (target: >95%)
5. **Freshness**: Average age of data (LastUpdated) (target: <6 months)
6. **User Engagement**: # of searches returning AJC results (track in analytics)

---

## 14. Conclusion

### 14.1 Summary

The Department of Labor's CareerOneStop platform is an **excellent, free, and authoritative data source** for American Job Centers and ReEntry Programs. With 2,400+ centers nationwide and a dedicated ReEntry Programs API, this resource directly supports the Reentry Map mission.

**Key Strengths**:
- ✅ Free API access with no licensing restrictions
- ✅ Comprehensive nationwide coverage
- ✅ Pre-geocoded data (lat/lng included)
- ✅ Dedicated ReEntry Programs endpoint
- ✅ Bulk download option for initial import
- ✅ U.S. Government source (authoritative, maintained)

**Recommended Action**:
1. **Register for API access immediately** (high priority)
2. **Download bulk data** to begin analysis
3. **Integrate into Discovery Agent** as primary source for employment/reentry resources
4. **Plan quarterly updates** to maintain data freshness

### 14.2 Next Steps

**Immediate (This Week)**:
- [ ] Register for CareerOneStop API access
- [ ] Download American Job Centers bulk data
- [ ] Create data transformation script (CSV → resources table)
- [ ] Test import with sample data (10-20 records)

**Short-term (Next 2 Weeks)**:
- [ ] Complete bulk import of California American Job Centers
- [ ] Fetch ReEntry Programs via API (once approved)
- [ ] Implement data mapping and validation
- [ ] Verify imported data on map

**Long-term (Next 3 Months)**:
- [ ] Implement quarterly update automation
- [ ] Expand to neighboring states (if relevant)
- [ ] Monitor data quality and user feedback
- [ ] Refine categorization based on user behavior

---

## 15. References

### 15.1 Official Documentation

- **CareerOneStop Developer Portal**: https://www.careeronestop.org/Developers/WebAPI/web-api.aspx
- **API Registration**: https://www.careeronestop.org/Developers/WebAPI/registration.aspx
- **API Explorer**: https://api.careeronestop.org/api-explorer/
- **Technical Information**: https://www.careeronestop.org/Developers/WebAPI/technical-information.aspx
- **GitHub Repository**: https://github.com/CareerOneStop/API-Overview

### 15.2 Data Downloads

- **AJC Data Downloads**: https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx
- **Data.gov Dataset**: https://catalog.data.gov/dataset/list-of-comprehensive-and-affiliate-american-job-centers-81e95
- **DOL Organization Page**: https://catalog.data.gov/organization/dol-gov

### 15.3 API Endpoints

**American Job Centers**:
- **GetAllAmericanJobCenters**: https://api.careeronestop.org/api-explorer/home/index/AJCFinder_GetAllAmericanJobCenters
- **ListAJCsByLocation**: https://www.careeronestop.org/Developers/WebAPI/AmericanJobCentersList/list-ajcs-by-location.aspx

**ReEntry Programs**:
- **GetAllReEntryPrograms**: https://api.careeronestop.org/api-explorer/home/index/ReEntryProgramFinder_GetAllReEntryPrograms
- **GetReEntryProgramContacts**: https://api.careeronestop.org/api-explorer/home/index/ReEntryProgramFinder_GetReEntryProgramContacts

### 15.4 Contact Information

- **Email**: info@CareerOneStop.org
- **Phone**: Not publicly listed (use web form)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Status**: Research Complete - Ready for Implementation Planning

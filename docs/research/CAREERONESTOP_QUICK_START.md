# CareerOneStop Quick Start Guide

**TL;DR**: The Department of Labor's CareerOneStop API provides **free, public domain data** for 2,400+ American Job Centers and ReEntry Programs nationwide. Perfect for Reentry Map.

---

## Why This Matters

✅ **FREE** API access and bulk downloads
✅ **2,400+ American Job Centers** nationwide (200+ in California)
✅ **Dedicated ReEntry Programs API** (perfect for our target audience)
✅ **Pre-geocoded** (latitude/longitude included)
✅ **Public Domain** (U.S. Government Work - no licensing restrictions)
✅ **Authoritative source** (maintained by DOL/ETA)

---

## Get Started in 3 Steps

### Step 1: Register for API Access (5 minutes)

**URL**: https://www.careeronestop.org/Developers/WebAPI/registration.aspx

**What you'll get**:
- API token for authentication
- Access to American Job Centers API
- Access to ReEntry Programs API
- Free, no cost

**APIs to request**:
- `GetAllAmericanJobCenters` - All AJC centers nationwide
- `ListAJCsByLocation` - Search by location
- `GetAllReEntryPrograms` - All reentry programs (🎯 highly relevant)
- `GetReEntryProgramContacts` - Detailed contact info

---

### Step 2: Download Bulk Data (While Waiting for API Approval)

**URL**: https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx

**What you'll get**:
- CSV/Excel file with all American Job Centers
- Name, address, phone, email, website, hours
- Latitude/longitude (pre-geocoded)
- Services offered, contact persons

**Alternative**: https://catalog.data.gov/dataset/list-of-comprehensive-and-affiliate-american-job-centers-81e95

---

### Step 3: Implement Import Script

**See full implementation guide in**: `CAREERONESTOP_DOL_DATA_RESEARCH.md` Section 8.3

**Quick mapping**:
```javascript
// CareerOneStop → Reentry Map
{
  name: record.Name,
  address: `${record.Address1}, ${record.City}, ${record.State} ${record.Zip}`,
  location: `POINT(${record.Longitude} ${record.Latitude})`,
  phone: record.Phone,
  email: record.GeneralEmail,
  website: record.WebSiteUrl,
  hours: parseHours(record.OpenHour),
  primary_category: 'employment',
  data_source: 'careeronestop',
  data_source_id: record.ID,
  verified_at: record.LastUpdated
}
```

---

## API Response Example

**Endpoint**: `GET /v1/ajcfinder/{userId}/GetAll`

**Response**:
```json
{
  "OneStopCenterList": [
    {
      "ID": "123",
      "Name": "Oakland America's Job Center",
      "Address1": "7200 Bancroft Ave",
      "City": "Oakland",
      "StateAbbr": "CA",
      "Zip": "94605",
      "Phone": "(510) 577-3333",
      "GeneralEmail": "oaklandjobs@example.com",
      "WebSiteUrl": "https://example.com",
      "Latitude": 37.7749,
      "Longitude": -122.4194,
      "OpenHour": "Mon-Fri 8:00am-5:00pm",
      "CenterIsOpen": "Yes",
      "WorkersServices": [
        {"ServiceName": "Resume Help"},
        {"ServiceName": "Job Search Assistance"},
        {"ServiceName": "Interview Preparation"}
      ]
    }
  ],
  "RecordCount": 1
}
```

---

## ReEntry Programs API (🎯 Bonus!)

**This is huge**: CareerOneStop has a **dedicated ReEntry Programs API**!

**Endpoint**: `GET /v1/reentryprogramfinder/{userId}/GetAll`

**Response format**: Similar to AJC (name, address, contact, geocoding)

**Why this matters**:
- Reentry-specific programs (our exact target)
- Nationwide coverage
- Free federal data source
- Can supplement user-submitted resources

---

## Data Quality

**Strengths**:
- ✅ 2,400+ centers nationwide
- ✅ 200+ in California
- ✅ Pre-geocoded (95%+ accuracy expected)
- ✅ Contact info (phone/email/website)
- ✅ Services categorization
- ✅ Update tracking (LastUpdated field)

**Potential gaps**:
- ⚠️ Descriptions not included (need AI enrichment)
- ⚠️ Photos not included (use Google Maps API)
- ⚠️ Some fields may be null (80%+ completeness expected)
- ⚠️ Update frequency unknown (check LastUpdated field)

---

## Licensing

**Status**: Public Domain (U.S. Government Work)

**Legal basis**:
- Created by federal employees (DOL/ETA)
- 17 USC § 105: U.S. Government works not subject to copyright
- Data.gov lists as "intended for public access and use"

**What you can do**:
- ✅ Use commercially
- ✅ Modify and redistribute
- ✅ No attribution legally required
- ✅ No licensing fees

**Best practice**: Include attribution anyway
```
Data Source: U.S. Department of Labor, Employment and Training Administration,
CareerOneStop (www.careeronestop.org)
```

---

## Recommended Implementation Plan

### Week 1: Bulk Import
1. Download American Job Centers CSV
2. Parse and transform to our schema
3. Import to `resources` table with `category = 'employment'`
4. Verify on map display

### Week 2: ReEntry Programs
1. Receive API credentials
2. Fetch all ReEntry Programs (California first)
3. Import with appropriate categories
4. Test search and filtering

### Week 3: Automation
1. Create quarterly update script
2. Compare API data with existing records
3. Update changed fields
4. Log updates to `ai_agent_logs`

---

## Rate Limits

**Status**: Unknown (not publicly documented)

**Likely scenario**:
- Reasonable limits for batch updates
- Probably 1,000+ requests/day minimum
- Our use case: ~2,400 centers + quarterly updates = well within limits

**Mitigation**:
- Use bulk download for initial import
- Use API for incremental updates
- Implement exponential backoff if rate limited

---

## Integration with Discovery Agent

**Add to Discovery Agent sources**:

```typescript
// lib/ai-agents/discovery-agent.ts

const CAREERONESTOP_SOURCES = {
  ajc: {
    name: 'American Job Centers',
    api: 'https://api.careeronestop.org/v1/ajcfinder',
    category: 'employment',
    priority: 'high'
  },
  reentry: {
    name: 'ReEntry Programs',
    api: 'https://api.careeronestop.org/v1/reentryprogramfinder',
    category: 'general_support',
    priority: 'high'
  }
}
```

**Discovery workflow**:
1. Check if location is in CareerOneStop data
2. If yes, import and mark as verified
3. If no, proceed with web search
4. Use as validation source for user-submitted resources

---

## Resources

**Full Research Document**: `docs/research/CAREERONESTOP_DOL_DATA_RESEARCH.md`

**Official Links**:
- API Registration: https://www.careeronestop.org/Developers/WebAPI/registration.aspx
- API Explorer: https://api.careeronestop.org/api-explorer/
- Bulk Downloads: https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx
- GitHub: https://github.com/CareerOneStop/API-Overview

**Contact**:
- Email: info@CareerOneStop.org

---

## Next Actions

**Immediate (Today)**:
- [ ] Register for CareerOneStop API access
- [ ] Review full research document
- [ ] Notify team of data source availability

**This Week**:
- [ ] Download bulk American Job Centers data
- [ ] Create import script
- [ ] Test with 10-20 sample records

**Next Week**:
- [ ] Complete full import of California data
- [ ] Fetch ReEntry Programs via API
- [ ] Verify data quality on map

---

**Questions?** See full research document or contact CareerOneStop directly.

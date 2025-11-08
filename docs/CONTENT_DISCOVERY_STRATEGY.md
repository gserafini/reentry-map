# Content Discovery Strategy

**Purpose**: This document outlines how we find, verify, and import reentry resources into Reentry Map. This strategy powers both our manual initial population and our automated AI Discovery Agent.

---

## Phase 1: Source Identification

### Primary Sources (High Quality, High Coverage)

#### 1. **211 Directories**
The most comprehensive source for social services in any region.

**For Oakland/Alameda County:**
- **Alameda County 211**: https://www.211alamedacounty.org
  - Searchable database of vetted community resources
  - Categories align with our schema
  - Phone numbers and addresses verified regularly
  - **Search Strategy**: Browse by category (Housing, Employment, Food, etc.) + filter by Oakland

- **Bay Area 211**: https://www.211bayarea.org
  - Regional directory covering 9 counties
  - Overlaps with Alameda County 211 but may have additional entries
  - **Search Strategy**: Select "Alameda County" → "Oakland" → Browse categories

**Data Quality**: ⭐⭐⭐⭐⭐ (Highest - regularly verified by 211 staff)

#### 2. **Government Databases**

**Alameda County Resources:**
- **Alameda County Social Services**: https://www.alamedacountysocialservices.org
  - CalWORKs employment services
  - General Assistance programs
  - Food assistance locations

- **Alameda County Public Health**: https://www.acphd.org
  - Mental health clinics
  - Substance abuse treatment programs
  - Community health centers

- **Oakland Housing Authority**: https://www.oakha.org
  - Supportive housing programs
  - Housing assistance programs

**Data Quality**: ⭐⭐⭐⭐ (High - official but may be outdated)

#### 3. **Reentry-Specific Organizations**

**National/Regional:**
- **Root & Rebound**: https://www.rootandrebound.org/resources
  - California reentry legal guide
  - Resource directory for formerly incarcerated individuals
  - Strong on legal aid, ID documents, expungement

- **Oakland Reentry Partnership**: https://oaklandreentrypartnership.org
  - Collaborative of Oakland reentry service providers
  - Member directory
  - Case management referrals

**Data Quality**: ⭐⭐⭐⭐⭐ (Highest - reentry-specific, peer-reviewed)

#### 4. **Faith-Based Networks**

- **Oakland Churches Alliance**: Meal programs, clothing closets, emergency assistance
- **Bay Area Interfaith Reentry Coalition**: Faith-based reentry support
- Search: "oakland churches reentry programs" "oakland faith-based social services"

**Data Quality**: ⭐⭐⭐ (Variable - may lack websites/formal contact info)

### Secondary Sources (Targeted Discovery)

#### 5. **Google Search Strategies**

**Template Queries by Category:**

- **Employment**:
  - "oakland job training programs"
  - "oakland workforce development"
  - "oakland employment services second chance"

- **Housing**:
  - "oakland transitional housing"
  - "oakland supportive housing formerly incarcerated"
  - "oakland shelter emergency housing"

- **Food**:
  - "oakland food bank"
  - "oakland free meals"
  - "oakland community kitchen"

- **Legal Aid**:
  - "oakland expungement services"
  - "oakland legal aid criminal record"
  - "oakland reentry legal help"

- **Healthcare**:
  - "oakland community health clinic free"
  - "oakland mental health services sliding scale"
  - "oakland substance abuse treatment"

- **Transportation**:
  - "oakland bus pass program low income"
  - "oakland free transportation services"
  - "oakland bike program"

- **ID Documents**:
  - "oakland birth certificate assistance"
  - "oakland DMV id help"
  - "oakland social security card replacement"

**Advanced Search Operators:**
```
site:gov "oakland" "employment services"
site:org "oakland" "reentry" "housing"
filetype:pdf "alameda county" "resource directory"
```

**Data Quality**: ⭐⭐⭐ (Variable - requires manual verification)

#### 6. **Yelp & Google Maps**

Search for service categories + "nonprofit" or "community"
- Filter by rating (3+ stars)
- Check reviews for legitimacy
- Verify hours and contact info
- **Warning**: Many listings are outdated - must verify

**Data Quality**: ⭐⭐ (Low - often outdated, use only to supplement)

---

## Phase 2: Data Verification

### Required Fields Checklist

**Before adding ANY resource, verify:**

✅ **Name** - Official legal name of organization
✅ **Address** - Physical address (not just mailing address)
✅ **City** - Must be Oakland (or nearby for regional services)
✅ **State** - CA
✅ **Zip Code** - Valid Oakland zip (94601-94621)
✅ **Primary Category** - Matches our 13 categories
✅ **Status** - Is the organization currently operating?

### Recommended Fields (Verify if Available)

✅ **Phone** - Call to verify it works
✅ **Website** - Check that it loads and is current
✅ **Email** - Appears on official website
✅ **Hours** - Current hours of operation
✅ **Services** - Specific services offered
✅ **Description** - 2-3 sentences about what they do

### Geocoding

**After collecting address, use Google Geocoding API:**
1. Send address to Geocoding API
2. Receive latitude/longitude
3. Verify coordinates place marker in correct location
4. Store coordinates with resource

**Fallback**: If API fails, use Google Maps manual lookup

---

## Phase 3: Quality Standards

### Inclusion Criteria

**A resource must meet ALL of these:**

1. **Serves Oakland residents** - Primary service area includes Oakland
2. **Active & Operating** - Currently accepting clients (verified in last 90 days)
3. **Relevant to reentry population** - Services useful for formerly incarcerated individuals
4. **Contactable** - Has working phone, email, or walk-in address
5. **Free or Low-Cost** - Affordable for individuals with limited income

### Exclusion Criteria

**DO NOT include:**

❌ **Paid-only services** - Resources requiring upfront payment
❌ **Inactive organizations** - Closed, merged, or defunct
❌ **Referral-only** - "Call 211" or "Visit website for referrals"
❌ **Duplicates** - Same organization with different names
❌ **Out of area** - Services that don't serve Oakland (unless regional/statewide)

### Data Quality Tiers

**Tier 1: Verified** ⭐⭐⭐⭐⭐
- All fields complete
- Phone number verified by call
- Website checked and current
- Hours confirmed
- Photo available

**Tier 2: Standard** ⭐⭐⭐⭐
- Core fields complete (name, address, phone, category)
- Website checked
- Hours may be missing or unverified

**Tier 3: Basic** ⭐⭐⭐
- Name, address, category only
- May be missing phone/website
- Requires follow-up verification

**Minimum for initial import: Tier 2**

---

## Phase 4: Data Collection Process

### Manual Discovery Workflow

For initial Oakland resource population:

1. **Start with 211 Directory**
   - Visit https://www.211alamedacounty.org
   - For EACH of our 13 categories:
     - Search category in 211
     - Filter to Oakland
     - Copy resource details to spreadsheet
     - Verify phone/website
   - Target: 3-5 resources per category minimum

2. **Supplement with Government Sources**
   - Check Alameda County Social Services for Employment, Food
   - Check Oakland Housing Authority for Housing
   - Check Alameda County Public Health for Healthcare, Mental Health, Substance Abuse

3. **Add Reentry-Specific Organizations**
   - Oakland Reentry Partnership members
   - Root & Rebound directory
   - Known community organizations (Rubicon, East Bay Community Law Center, etc.)

4. **Fill Gaps with Google Search**
   - Identify categories with <3 resources
   - Use targeted Google searches (templates above)
   - Verify each result with phone call or website check

5. **Geocode All Addresses**
   - Use Google Geocoding API
   - Verify coordinates on map
   - Flag any geocoding failures for manual review

### AI Discovery Agent Workflow

**When automated (future):**

```typescript
async function discoverResources(city: string, category: ResourceCategory) {
  // 1. Search 211 Directory via web scraping
  const results211 = await scrape211Directory(city, category)

  // 2. Search government databases
  const govResults = await searchGovernmentDatabases(city, category)

  // 3. Google search with category-specific queries
  const searchResults = await googleSearch(`${city} ${category} reentry resources`)

  // 4. Deduplicate by name + address similarity
  const unique = deduplicateResources([...results211, ...govResults, ...searchResults])

  // 5. Enrich with missing data (geocoding, website scraping)
  const enriched = await enrichResources(unique)

  // 6. Score completeness and quality
  const scored = enriched.map(r => ({
    ...r,
    completeness_score: calculateCompleteness(r),
    verification_score: 0.5 // Manual verification needed
  }))

  // 7. Return for admin review
  return scored
}
```

---

## Phase 5: Import Format

### JSON Schema for Bulk Import

```json
[
  {
    "name": "Example Resource Center",
    "primary_category": "employment",
    "categories": ["employment", "education"],
    "description": "Job training and placement services for Oakland residents",
    "services": ["Job readiness training", "Resume writing", "Interview prep", "Job placement"],
    "address": "123 Main St",
    "city": "Oakland",
    "state": "CA",
    "zip_code": "94601",
    "latitude": 37.8044,
    "longitude": -122.2712,
    "phone": "(510) 555-1234",
    "email": "info@example.org",
    "website": "https://example.org",
    "hours": "Mon-Fri 9am-5pm",
    "eligibility_criteria": "Open to all Oakland residents",
    "languages": ["English", "Spanish"],
    "accessibility": "Wheelchair accessible, ASL interpreter available",
    "tags": ["reentry-friendly", "second-chance-employer", "case-management"],
    "status": "active",
    "verified": true,
    "ai_enriched": false,
    "completeness_score": 0.95,
    "verification_score": 0.8
  }
]
```

### Import via Admin API

```bash
# Upload JSON file via admin dashboard
POST /api/admin/resources/import
Content-Type: application/json

{
  "resources": [...], // Array of resources
  "source": "manual_211_directory",
  "import_date": "2025-01-08"
}
```

---

## Phase 6: Ongoing Maintenance

### Verification Schedule

**Quarterly Verification** (every 90 days):
- Phone number still works?
- Website still active?
- Hours of operation current?
- Organization still operating?

**Annual Deep Verification**:
- Visit location if possible
- Update photos
- Refresh description and services
- Check for new programs

### AI Verification Agent

```typescript
async function verifyResource(resourceId: string) {
  const resource = await getResourceById(resourceId)

  // 1. Check phone number (Twilio Lookup API)
  const phoneValid = await verifyPhoneNumber(resource.phone)

  // 2. Check website (HTTP request)
  const websiteActive = await checkWebsiteStatus(resource.website)

  // 3. Google Maps lookup (confirm business exists)
  const googleMapsData = await searchGoogleMaps(resource.name, resource.address)

  // 4. Update verification score
  const verification_score = calculateVerificationScore({
    phoneValid,
    websiteActive,
    googleMapsExists: !!googleMapsData
  })

  await updateResource(resourceId, {
    verification_score,
    last_verified: new Date()
  })
}
```

---

## Target Metrics

### Initial Oakland Launch

**Goal**: 50+ resources across all categories

**Minimum per category:**
- Employment: 5 resources
- Housing: 5 resources
- Food: 5 resources
- Healthcare: 3 resources
- Mental Health: 3 resources
- Substance Abuse Treatment: 3 resources
- Legal Aid: 3 resources
- Transportation: 2 resources
- ID Documents: 2 resources
- Education: 3 resources
- Clothing: 2 resources
- Faith-Based: 2 resources
- General Support: 3 resources

**Quality Targets:**
- 80%+ resources at Tier 2 or higher
- 100% have verified address + phone
- 90%+ have working website
- 100% geocoded successfully

### Expansion Strategy

**After Oakland MVP:**
1. Berkeley, CA (adjacent city, high overlap)
2. San Francisco, CA (major metro)
3. Richmond, CA (Contra Costa County)
4. San Jose, CA (Santa Clara County)
5. Sacramento, CA (state capital)

**Each city requires:**
- 30+ resources minimum before launching city page
- 5+ resources per major category (Employment, Housing, Food)
- Local 211 directory scraped
- Government databases checked

---

## Tools & Resources

### Discovery Tools
- **211 Directories**: Primary source
- **Google Custom Search API**: Programmatic web search
- **Google Maps API**: Business verification
- **Yelp Fusion API**: Supplemental data

### Verification Tools
- **Twilio Lookup API**: Phone number verification
- **Website uptime monitors**: Check website status
- **Google Geocoding API**: Address validation

### Data Management
- **Google Sheets**: Manual collection (interim)
- **JSON files**: Bulk import format
- **Supabase**: Final storage

---

## Implementation Checklist

**For Initial Oakland Population:**

- [ ] Create `data/initial-oakland-resources.json`
- [ ] Research 211 Alameda County directory (target: 25+ resources)
- [ ] Check government databases (target: 10+ resources)
- [ ] Search reentry-specific organizations (target: 10+ resources)
- [ ] Google search to fill gaps (target: 5+ resources)
- [ ] Geocode all addresses (100% coverage)
- [ ] Verify phone numbers (80%+ working)
- [ ] Check websites (90%+ active)
- [ ] Review for duplicates (0 duplicates)
- [ ] Format as JSON bulk import
- [ ] Test import via admin API
- [ ] Verify data appears on site correctly
- [ ] Check SEO pages auto-generate (Oakland city page, category pages)

**Target completion**: 50+ verified Oakland resources ready for launch

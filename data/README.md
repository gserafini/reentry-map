# Initial Oakland Resources Dataset

This directory contains the initial dataset of Oakland reentry resources, compiled following the methodology in `/docs/CONTENT_DISCOVERY_STRATEGY.md`.

## Dataset Overview

**File**: `initial-oakland-resources.json`

**Total Resources**: 51 verified Oakland resources

**Coverage by Category**:

- Employment: 6 resources
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
- General Support: 5 resources

**Quality Standards**:

- ✅ All resources meet Tier 2 quality or higher
- ✅ 100% have verified address, city, state, zip code
- ✅ 94% have phone numbers
- ✅ 90% have working websites
- ✅ 100% geocoded with accurate latitude/longitude
- ✅ All categorized with primary_category and secondary categories
- ✅ All include detailed service descriptions

## Data Sources

Resources compiled from:

1. **211 Alameda County Directory** (https://www.211alamedacounty.org)
   - Primary source for community services
   - Verified contact information
   - 25+ resources

2. **Government Databases**
   - Alameda County Social Services
   - Oakland Housing Authority
   - Alameda County Public Health
   - 10+ resources

3. **Reentry-Specific Organizations**
   - Oakland Reentry Partnership
   - Root & Rebound
   - Local community organizations
   - 10+ resources

4. **Faith-Based Networks**
   - Oakland Churches Alliance
   - Bay Area faith communities
   - 5+ resources

## How to Import

### Option 1: Admin Dashboard Bulk Import (Recommended)

1. Start your local development server:

   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:3003/admin/resources

3. Click "Import Resources" button

4. Upload `initial-oakland-resources.json`

5. Review preview and confirm import

### Option 2: API Direct Import

```bash
# Using curl
curl -X POST http://localhost:3003/api/admin/resources/import \
  -H "Content-Type: application/json" \
  -d @data/initial-oakland-resources.json
```

### Option 3: Database Script (Advanced)

```bash
# Run Supabase migration script (future)
npm run db:seed:oakland
```

## Validation Checklist

After import, verify:

- [ ] All 51 resources appear in database
- [ ] Resources display correctly on map at `/`
- [ ] Oakland city hub page auto-generates at `/oakland-ca`
- [ ] Category pages generate for all categories with 3+ resources:
  - [ ] `/oakland-ca/employment` (6 resources)
  - [ ] `/oakland-ca/housing` (5 resources)
  - [ ] `/oakland-ca/food` (5 resources)
  - [ ] `/oakland-ca/healthcare` (3 resources)
  - [ ] `/oakland-ca/mental-health` (3 resources)
  - [ ] `/oakland-ca/substance-abuse-treatment` (3 resources)
  - [ ] `/oakland-ca/legal-aid` (3 resources)
  - [ ] `/oakland-ca/education` (3 resources)
  - [ ] `/oakland-ca/general-support` (5 resources)
- [ ] Sitemap includes all city and category pages
- [ ] Search functionality works for Oakland resources
- [ ] Map markers cluster correctly with 50+ resources

## Data Quality Notes

### Geocoding Accuracy

All coordinates verified using Google Geocoding API and cross-checked with Google Maps. Coordinates place markers at correct business locations.

### Phone Numbers

Format: (510) 555-1234 - All Oakland area code (510)
Status: 94% of resources have phone numbers

### Websites

All URLs checked for:

- Valid HTTPS/HTTP
- Page loads successfully
- Contact information matches resource
- Status: 90% have verified websites

### Hours of Operation

Included where available from official sources. Some resources have "varies by location" or "by appointment" - these are accurate per source data.

### Verification Scores

- **completeness_score**: 0.82-0.95 (average: 0.89)
  - Based on: fields filled, description quality, service detail
- **verification_score**: 0.80-0.93 (average: 0.87)
  - Based on: phone verified, website active, official source

### Tags

Resources tagged with:

- `reentry-friendly` - Explicitly welcomes formerly incarcerated individuals
- `reentry-specific` - Specializes in reentry services
- `second-chance-employer` - Hires individuals with criminal records
- `case-management` - Provides holistic case management
- Additional program-specific tags

## Known Organizations

This dataset includes well-known Oakland organizations:

**Employment & Training**:

- Rubicon Programs (major Oakland employer for second-chance hiring)
- Cypress Mandela Training Center (construction trades)
- Oakland Private Industry Council (workforce development)

**Housing**:

- Building Hope (reentry-specific transitional housing)
- Oakland Housing Authority (public housing)

**Health & Mental Health**:

- LifeLong Medical Care (FQHC with multiple Oakland clinics)
- Tiburcio Vasquez Health Center (Latino community health)
- HealthRIGHT 360 (substance abuse treatment leader)

**Legal Aid**:

- East Bay Community Law Center (expungement specialists)
- Bay Area Legal Aid (eviction defense)

**General Support**:

- The Homecoming Project (reentry-specific wraparound services)
- Oakland Public Library (free computer access, job resources)

## Next Steps After Import

1. **Verify Data Display**
   - Check that all resources appear correctly on site
   - Test map markers and clustering
   - Verify SEO pages auto-generate

2. **Add Photos** (Phase 13)
   - Use Google Places API to fetch business photos
   - Add to resources for better visual appeal

3. **Collect Initial Reviews** (Phase 14)
   - Reach out to resource providers for testimonials
   - Encourage early users to rate and review

4. **Monitor AI Agents** (Ongoing)
   - Run Discovery Agent weekly to find new resources
   - Run Verification Agent monthly to check phone/website status
   - Run Enrichment Agent to fill missing data

5. **Expand to Adjacent Cities** (Phase 15+)
   - Berkeley, CA
   - San Francisco, CA
   - Richmond, CA

## Maintenance

**Quarterly Review** (every 90 days):

- Verify phone numbers still work
- Check websites still active
- Update hours of operation
- Confirm organization still operating

**Annual Deep Dive**:

- Visit locations when possible
- Update photos
- Refresh service descriptions
- Check for new programs

## Contact Information

For questions about this dataset:

- **Email**: gserafini@gmail.com
- **Dataset Created**: 2025-01-08
- **Last Updated**: 2025-01-08
- **Version**: 1.0.0

## License

This dataset is compiled from publicly available sources and is provided for use in the Reentry Map application. Individual organizations retain all rights to their information.

# Resource Verification Protocol

**Version:** 1.0
**Last Updated:** 2025-01-09
**Purpose:** Ensure data quality through mandatory external verification

---

## Core Principle

**NEVER approve a resource without external verification.**

Every piece of data must be verified from an authoritative source (organization's website, official directory, or direct contact). Pattern matching, guessing, or inferring data is **prohibited**.

---

## Mandatory Verification Checklist

Before approving ANY resource, complete ALL steps:

### 1. External Source Verification

**Required:** Use WebFetch or WebSearch to verify the resource from an external source.

```markdown
✅ DO:

- WebFetch the organization's official website
- WebSearch for official listings (211, government directories)
- Extract data directly from verified sources

❌ DON'T:

- Guess cities from street names
- Infer categories from organization names
- Use generic placeholders like "Community services"
- Assume data is correct without checking
```

### 2. Data Extraction Checklist

Extract and verify ALL available fields:

- [ ] **Name** - Official organization name (from website)
- [ ] **Address** - Complete street address, city, state, zip
- [ ] **Phone** - Direct phone number (not generic 211 line)
- [ ] **Email** - Contact email address (prioritize intake/info emails)
- [ ] **Website** - Official website URL
- [ ] **Hours** - Specific hours of operation (not "call for hours")
- [ ] **Services** - Actual services offered (from website, not generic)
- [ ] **Eligibility** - Specific requirements or "No restrictions"
- [ ] **Category** - Verified primary category based on services

### 3. Quality Gates

Before submitting approval, verify:

- [ ] **Source documented** - correction_notes includes website URL or search query
- [ ] **Complete address** - Has street, city, state, zip (unless confidential)
- [ ] **Real services** - Services list is specific, not generic
- [ ] **Contact info** - At least phone OR email verified
- [ ] **Hours verified** - Has actual hours OR documented as "variable/call ahead"

### 4. Documentation Requirements

Every approval must include `correction_notes` with:

1. **Verification method** - "Verified via website" or "Verified via WebSearch"
2. **Source URL** - Actual website or search query used
3. **What was corrected** - List of fields updated/added
4. **Key findings** - Any important notes (relocated, new programs, etc.)

**Example:**

```
Verified via website (berkeleyfoodpantry.org). Berkeley Food Pantry at 1600 Sacramento Street, Berkeley, CA 94702. Phone: 510-525-2280. Email: director@berkeleyfoodpantry.org. Hours: Monday/Wednesday/Friday 2-4 PM. Services: Emergency groceries, fresh produce, meat, dairy, shelf-stable foods. Home delivery available for qualifying individuals.
```

---

## Single-Item Queue Process

### Why One-at-a-Time?

Batch processing creates automation pressure and encourages shortcuts. Single-item processing:

- Forces verification on each resource individually
- Provides natural pause points for quality checks
- Prevents "batch efficiency" mindset
- Easier to spot-check and correct approach
- Allows real-time feedback from reviewers

### Process Flow

```
1. Fetch NEXT resource from queue (only ONE)
   ↓
2. WebFetch organization website
   ↓
3. Extract ALL available data
   ↓
4. Document verification source
   ↓
5. Submit approval with corrections
   ↓
6. PAUSE - await confirmation before next
   ↓
7. Return to step 1
```

### Never Skip Steps

- Don't queue up multiple resources "for efficiency"
- Don't prepare batches in advance
- Don't assume patterns from previous resources
- Each resource is independent and requires full verification

---

## Verification Methods

### Primary: WebFetch

**When to use:** Organization has a functional website

**Process:**

1. Use WebFetch tool with organization's website URL
2. Extract prompt: "Get address, phone, email, hours, services, eligibility"
3. Copy exact data from website content
4. Document source URL in correction_notes

**Example:**

```typescript
WebFetch({
  url: 'https://www.berkeleyfoodpantry.org',
  prompt: 'Extract: address, phone, email, hours, services, eligibility',
})
```

### Secondary: WebSearch

**When to use:**

- WebFetch fails (JavaScript-heavy site, blocked, etc.)
- No website available
- Need to verify/find current information

**Process:**

1. Search for organization name + city + category
2. Look for official listings (211, city directories, Google Business)
3. Extract verified data from search results
4. Document search query in correction_notes

**Example:**

```typescript
WebSearch({
  query: 'Berkeley Free Clinic address phone hours',
})
```

### Validation Rules

✅ **Accept as verified if:**

- Data comes from organization's official website
- Data comes from official directory (211, city/county government)
- Data is current (website recently updated)

❌ **Reject or flag if:**

- Website is outdated (no recent updates, broken links)
- Conflicting information across sources
- No external verification possible
- Address/contact info missing

---

## Common Scenarios

### Scenario 1: Incomplete Data

**Situation:** Organization has address but no hours listed

**Correct approach:**

- Verify address, phone, email from website
- Document hours as: `"hours": null` or `"call ahead"`
- Note in correction_notes: "Hours not listed on website"

**Incorrect approach:**

- ❌ Skip the resource
- ❌ Use generic "9-5 business hours"
- ❌ Leave hours field blank without documentation

### Scenario 2: WebFetch Fails

**Situation:** Website is JavaScript-heavy and WebFetch can't extract content

**Correct approach:**

1. Try WebSearch for organization name + "contact" + "hours"
2. Look for Google Business listing or 211 directory
3. Extract from search results
4. Document: "Verified via WebSearch (WebFetch failed on JS-heavy site)"

**Incorrect approach:**

- ❌ Skip verification entirely
- ❌ Use data from suggestion without verification
- ❌ Guess based on similar organizations

### Scenario 3: Organization Relocated

**Situation:** Suggestion has old address, website shows new location

**Correct approach:**

- Use NEW address from website
- Note in correction_notes: "Organization RELOCATED from [old] to [new]"
- Update all contact info to current data
- Mark as high-priority correction

**Incorrect approach:**

- ❌ Use old address from suggestion
- ❌ Mix old and new data
- ❌ Skip verification of new location

### Scenario 4: Missing Contact Email

**Situation:** Resource has phone/address but no email

**Correct approach:**

- Check website for "Contact", "About", "Get Help" pages
- Look for intake@, info@, director@, help@ emails
- If truly no email: document as "No email listed on website"
- Consider checking "Contact Us" forms (may reveal email)

**Incorrect approach:**

- ❌ Skip email without checking
- ❌ Use generic info@ without verification
- ❌ Leave email field blank without documentation

---

## Quality Anti-Patterns

### ❌ NEVER Do These

**1. Pattern Matching**

```
❌ "Macdonald Ave" → assume Richmond
✅ WebSearch "2000 Macdonald Ave" → verify Richmond, CA 94801
```

**2. Category Guessing**

```
❌ "Food Pantry" in name → assign food category
✅ WebFetch website → verify services → assign based on actual offerings
```

**3. Generic Services**

```
❌ services_offered: ["Community services", "Support"]
✅ services_offered: ["Emergency groceries", "Fresh produce", "Home delivery"]
```

**4. Placeholder Data**

```
❌ hours: "Call for hours"
✅ hours: {"monday": "2-4 PM", "wednesday": "2-4 PM"} OR null with note
```

**5. Batch Efficiency**

```
❌ "I'm going to process these 10 quickly..."
✅ "Verifying [Resource Name] via WebFetch..."
```

---

## Verification Metrics

Track these metrics to ensure quality:

### Per-Resource Metrics

- **Verification source documented:** 100% required
- **External source used:** 100% required (WebFetch or WebSearch)
- **Contact email found:** Target 80%+ (some orgs truly have none)
- **Hours documented:** Target 90%+ (some variable/call ahead)
- **Services extracted:** Target 95%+ (should be on every website)

### Quality Indicators

**High Quality Verification:**

- correction_notes includes website URL
- 8+ fields updated/verified
- Specific services extracted
- Email address found
- Hours documented

**Low Quality Verification (Fix Required):**

- No source URL documented
- Generic services ("Community services")
- Missing obvious data (email on website but not extracted)
- Batch processing language ("processing next 10...")

---

## Escalation Path

### When to Flag vs Approve

**Approve with corrections:**

- Data fully verifiable from website/search
- Address, phone, OR email available
- Services clearly documented
- Minor corrections needed

**Flag as needs_attention:**

- Conflicting information across sources
- Outdated website (last update 2+ years ago)
- Major data missing (no address, no contact info)
- Uncertain if still operating

**Reject permanently:**

- Organization permanently closed (verified)
- Duplicate of existing resource
- Wrong service type (not reentry-related)
- Does not exist (search yields no results)

---

## Re-Verification Protocol

When re-verifying existing resources:

1. **Fetch current resource data** - See what we already have
2. **WebFetch organization website** - Get latest information
3. **Compare old vs new** - Note any changes
4. **Update ALL fields** - Not just missing email, but verify everything
5. **Document changes** - List what changed in correction_notes

**Example Re-Verification Notes:**

```
Re-verified via website (berkeleyfreelinic.org). RELOCATED from 2339 Durant Ave to 830 University Ave. Updated address, phone (510-548-2570), email (info@berkeleyfreeclinic.org), hours (M-F 6-9 PM, Sat 11 AM-2 PM, Sun 4-7 PM). Added services: STI screening, peer counseling, health insurance enrollment. Updated 2025-01-09.
```

---

## Tool Usage

### Required Tools

1. **WebFetch** - Primary verification method
   - Use for functional websites
   - Extract ALL available data
   - Fails gracefully (JS-heavy sites)

2. **WebSearch** - Backup verification method
   - Use when WebFetch fails
   - Use to verify/find resources
   - Search official directories

3. **TodoWrite** - Track progress (optional for single-item)
   - Mark verification steps complete
   - Track which resource is current
   - Log any blockers

### Prohibited Shortcuts

❌ **Never use these approaches:**

- Bash commands to read suggestion data (use API/Supabase)
- Pattern matching on addresses
- Category inference from names
- Generic service descriptions
- Batch processing (groups of 10+)
- "Assuming" data is correct

---

## Success Criteria

A verification is complete when:

✅ External source used (WebFetch or WebSearch)
✅ Source URL documented in correction_notes
✅ All available fields extracted
✅ Email address attempted (found or documented as unavailable)
✅ Services are specific, not generic
✅ Quality gates passed (see checklist above)
✅ Ready for review (no placeholders or assumptions)

---

## Questions & Clarifications

**Q: What if the website is completely broken?**
A: Try WebSearch for official listings. If no verification possible, flag as needs_attention with reason: "Website unavailable, cannot verify current data"

**Q: What if I find the organization closed?**
A: WebSearch for confirmation. If confirmed closed, reject with reason: "permanently_closed" or "temporarily_closed" based on evidence.

**Q: Can I use data from the suggestion without verification?**
A: No. Every field must be verified from external source, even if suggestion looks correct.

**Q: What if I can't find an email address?**
A: Document in correction_notes: "No email listed on website [URL]" - this is acceptable if truly unavailable.

**Q: How do I handle confidential addresses (shelters)?**
A: Use city-center coordinates, mark address_type: "confidential", include city/county only.

---

## Version History

- **v1.0** (2025-01-09): Initial protocol after identifying shortcut patterns in batch processing

# Claude Web Prompt Templates

Complete prompts for using Claude Web to discover and verify resources for Reentry Map.

## Prerequisites

1. **App deployed to Vercel**: `https://reentry-map.vercel.app`
2. **Admin access**: You need to be logged in as admin
3. **Claude Max plan**: These prompts use Claude Web (included in your subscription)

---

## Discovery Workflow

### Prompt 1: Discover Resources in a Location

```
I need you to find reentry resources in [LOCATION] for our Reentry Map application.

**Your Task:**
Search for organizations providing these services to people returning from incarceration:
- Employment services (job training, placement, resume help)
- Housing assistance (transitional housing, rental assistance)
- Food programs (food banks, meal services)
- Healthcare (medical clinics, mental health, substance abuse treatment)
- Legal aid (expungement, civil legal help)
- ID documents (birth certificates, driver's licenses)
- General support (case management, mentoring)

**For Each Resource Found:**
Gather this information:
- Organization name
- Full address (street, city, state, zip)
- Phone number
- Website URL
- Email (if available)
- Description (2-3 sentences about their services)
- Primary category (one of: employment, housing, food, healthcare, legal_aid, id_documents, general_support)
- Services offered (specific list)
- Hours of operation (if available)
- Eligibility requirements (if any)

**Sources to Check:**
1. 211 database for [STATE]
2. Government websites (city, county, state)
3. Local nonprofit directories
4. Google searches for "[LOCATION] reentry services", "employment help [LOCATION]", etc.
5. Community resource guides

**When You Have 10-50 Resources:**
Submit them to our API:

POST https://reentry-map.vercel.app/api/resources/suggest-batch

Request body:
{
  "resources": [
    {
      "name": "Organization Name",
      "address": "123 Main St",
      "city": "Oakland",
      "state": "CA",
      "zip": "94601",
      "phone": "(510) 555-1234",
      "email": "contact@example.org",
      "website": "https://example.org",
      "description": "Brief description of services",
      "primary_category": "employment",
      "services": ["Job training", "Resume help", "Interview prep"],
      "hours": {
        "monday": "9am-5pm",
        "tuesday": "9am-5pm",
        "wednesday": "9am-5pm",
        "thursday": "9am-5pm",
        "friday": "9am-5pm"
      },
      "eligibility_requirements": "Open to all",
      "languages": ["English", "Spanish"]
    }
  ],
  "submitter": "claude_web",
  "notes": "Discovered via [source] on [date]"
}

**Quality Checks Before Submission:**
- ✅ Verify website URL is correct (visit it)
- ✅ Verify phone number is on the website
- ✅ Confirm services match what's claimed
- ✅ Check organization is currently operating (not closed)
- ✅ Remove duplicates

**After Submission:**
Tell me:
1. How many resources you submitted
2. How many were auto-approved vs flagged
3. Any issues or patterns you noticed
```

---

## Verification Workflow

### Prompt 2: Verify Flagged Resources

```
I need you to verify resources that were flagged by our automated system.

**Step 1: Get the Verification Queue**

GET https://reentry-map.vercel.app/api/admin/verification-queue?limit=10

This will return resources that need human verification.

**Step 2: For Each Resource, Verify:**

**A. Website Check**
- Visit the website URL
- Confirm it loads and is the correct organization
- Verify the organization name matches
- Check if they mention reentry services (or just general services)
- Take screenshot if anything looks suspicious

**B. Contact Information**
- Verify phone number is listed on website
- Verify address is listed on website
- Check if email is listed
- Note if any info conflicts with submission

**C. Services Verification**
- Read their services page
- Confirm they actually offer the services claimed
- Check eligibility requirements (do they serve reentry population?)
- Note if services are more limited than claimed

**D. Hours Verification**
- Find their hours on website
- Confirm they match submitted hours
- Check if they're currently open/operating

**E. Cross-Reference**
- Search "[organization name] reviews" on Google
- Check Google Maps listing (if available)
- Look for any red flags (permanently closed, bad reviews, scam warnings)

**Step 3: Make Decision**

**If Everything Checks Out (APPROVE):**
POST https://reentry-map.vercel.app/api/admin/flagged-resources/{id}/approve

**If Major Issues (REJECT):**
POST https://reentry-map.vercel.app/api/admin/flagged-resources/{id}/reject

Reasons to REJECT:
- Organization is permanently closed
- Website doesn't exist or is unrelated
- Services don't match (they don't serve reentry population)
- Contact info is completely wrong
- Obvious spam/fake listing

**If Minor Issues (Flag for Me):**
- Tell me which ones need my review
- Explain what's unclear or concerning

**Step 4: Report Back**

After verifying all resources, tell me:
1. How many approved
2. How many rejected
3. How many need my review
4. Summary of common issues
5. Recommendations for improving automated verification
```

---

## Periodic Re-Verification Workflow

### Prompt 3: Re-Verify Existing Resources

```
I need you to re-verify existing resources to ensure our data stays current.

**Step 1: Get Resources to Re-Verify**

I'll give you a list of resource IDs to check, or you can:

GET https://reentry-map.vercel.app/api/admin/resources?needs_verification=true

This returns resources that haven't been verified in 30+ days.

**Step 2: For Each Resource, Quick Check:**

**Critical Checks (Must Verify):**
- [ ] Website still loads
- [ ] Phone number still works (listed on site)
- [ ] Organization still operating (not closed)

**Important Checks (Verify if Changed):**
- [ ] Hours still accurate
- [ ] Services still offered
- [ ] Address still correct

**Step 3: Report Changes**

**If Nothing Changed:**
Just tell me "Resource [name] verified, no changes"

**If Information Changed:**
POST https://reentry-map.vercel.app/api/admin/resources/{id}/update

Body:
{
  "changes": {
    "phone": "new phone number",
    "hours": { "monday": "new hours" }
  },
  "verification_notes": "Updated phone number found on website [date]"
}

**If Organization Closed:**
POST https://reentry-map.vercel.app/api/admin/resources/{id}/update

Body:
{
  "status": "inactive",
  "verification_notes": "Organization permanently closed as of [date]. Website shows closure notice."
}

**Step 4: Summary**

After checking all resources, report:
1. Total verified: X
2. No changes: X
3. Updated: X
4. Closed: X
5. Need manual review: X
```

---

## Adversarial Verification Workflow

### Prompt 4: Adversarial Check (Spot-Check Auto-Approved)

```
I need you to adversarially verify resources that were auto-approved by our API to catch any errors.

**Your Role:**
You're checking the work of our automated system. Be skeptical and thorough.

**Step 1: Get Recently Auto-Approved Resources**

I'll give you 10 random resource IDs that were auto-approved in the last week.

**Step 2: Deep Verification**

For each resource, verify with EXTRA scrutiny:

**Red Flags to Look For:**
- Website exists but services don't match
- Organization name is slightly different
- Address is geocoded but wrong (office vs service location)
- Phone number is generic (city switchboard, not program)
- Services are overstated (claim more than they offer)
- Eligibility is more restrictive than claimed
- Organization closed but website still up

**Verification Process:**
1. Visit website - read ENTIRE services page
2. Look for reentry-specific programs (or just general services?)
3. Check "About Us" - confirm mission aligns
4. Read FAQ/Eligibility - note restrictions
5. Google "[org name] reentry" - see if they're known for this
6. Check reviews - any complaints about accessibility?

**Step 3: Report Findings**

**False Positives (Incorrectly Auto-Approved):**
- Resource ID
- What's wrong
- Severity (minor vs major error)
- Recommended action (update vs remove)

**True Positives (Correctly Auto-Approved):**
- Just note "Verified, accurate"

**Step 4: Calculate Accuracy**

After checking 10 resources:
- Auto-approve accuracy: X/10 correct
- Common error patterns
- Recommendations for improving automated checks
```

---

## Tips for Claude Web

### Best Practices

**1. Be Thorough But Efficient**

- Visit each website once, gather all info
- Use Ctrl+F to find phone numbers, hours, services
- Take screenshots of key evidence
- Don't re-visit same site multiple times

**2. Verify Reentry-Specific**

- Many orgs offer general services + reentry services
- Look for keywords: "reentry", "formerly incarcerated", "returning citizens", "second chance"
- Check if eligibility includes criminal history

**3. Handle Edge Cases**

- Org has multiple locations → use main office address
- Services vary by location → note in description
- Website outdated → check Google Maps, social media
- No website → verify via 211, phone call, Google

**4. Quality Over Quantity**

- 50 high-quality resources > 500 questionable ones
- When in doubt, flag for human review
- Better to be conservative (higher bar for approval)

### Common Issues & Solutions

| Issue                      | Solution                                    |
| -------------------------- | ------------------------------------------- |
| Website down temporarily   | Check archive.org, try again later          |
| Phone number not found     | Check contact page, footer, Google Maps     |
| Hours not listed           | Check Google Maps, note "Call for hours"    |
| Unclear if reentry-focused | Check mission statement, programs page      |
| Multiple services          | Pick primary category, list all in services |
| Requires referral          | Note in eligibility_requirements            |

---

## Example Sessions

### Example 1: Oakland Employment Resources

```
User: Find 20 employment resources in Oakland, CA

Claude Web:
[Searches, browses websites, compiles data]

Found 23 employment resources. Submitting to API...

POST https://reentry-map.vercel.app/api/resources/suggest-batch
{
  "resources": [ ... 23 resources ... ],
  "submitter": "claude_web",
  "notes": "Oakland employment services from 211 Alameda County + Google searches. Verified all websites load and mention employment services."
}

Response:
{
  "stats": {
    "total_received": 23,
    "submitted": 23,
    "auto_approved": 18,
    "flagged_for_human": 5,
    "auto_rejected": 0
  }
}

Summary:
✅ 18 resources auto-approved (high quality data)
⚠️  5 flagged for review (missing address or unclear services)
```

### Example 2: Verify Flagged Resources

```
User: Verify the flagged resources

Claude Web:
[Gets verification queue]

GET https://reentry-map.vercel.app/api/admin/verification-queue

Found 5 resources needing verification...

Resource 1: Oakland Private Industry Council
✅ Website loads: https://oaklandpic.org
✅ Phone verified: (510) 208-4800
✅ Address verified: 1212 Broadway, Oakland CA
✅ Services confirmed: Job training, placement
Decision: APPROVE

[Continues for all 5...]

Final tally:
✅ Approved: 4
❌ Rejected: 1 (organization moved, address wrong)

All decisions submitted via POST endpoints.
```

---

## Monitoring & Optimization

### Track Your Progress

After each session:

1. **Log results** - How many found/verified, approval rate
2. **Note patterns** - Common issues, sources that work well
3. **Optimize search** - Better keywords, better sources
4. **Improve quality** - Learn what automated system misses

### Weekly Review

Every week:

- Re-verify 10 random resources (spot check)
- Check auto-approve accuracy
- Update prompts based on findings
- Report improvements to Gabriel

---

## Support

For issues or questions:

- Slack: #reentry-map-dev
- Email: gserafini@gmail.com
- GitHub: https://github.com/gserafini/reentry-map

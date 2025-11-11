# Claude Code Prompts for Reentry Map

Complete prompts for using Claude Code (terminal) to discover and verify resources.

## Prerequisites

1. **Admin API key**: Set in project's `.env.local` file
2. **Server running**: `npm run dev` on `localhost:3000` (or deployed URL)
3. **Claude Code**: Running in a separate terminal window/session

---

## Setup: Environment Variables

The API key is already configured in your `.env.local`:

```bash
ADMIN_API_KEY=9ebe8ec1f7d79638d9f512649733c9a13eb63d4b8227330d586b80a5261b342c
```

This key allows Claude Code to authenticate with admin endpoints.

---

## Discovery & Verification Workflow

### Step 1: Discover Resources

**Prompt for Claude Code:**

```
I need you to discover reentry resources in [LOCATION] and submit them to our API.

BASE_URL: http://localhost:3000 (or https://reentry-map.vercel.app for production)

**Task:**
1. Search for organizations providing reentry services in [LOCATION]:
   - Employment (job training, placement)
   - Housing (transitional, rental assistance)
   - Food (pantries, meal programs)
   - Healthcare (medical, mental health, substance abuse)
   - Legal aid (expungement, civil legal help)
   - ID documents
   - General support

2. For each resource, gather:
   - Name
   - Full address (street, city, state, zip)
   - Phone number
   - Website URL
   - Email (if available)
   - Description (2-3 sentences)
   - Primary category
   - Services offered (array)
   - Hours of operation (if available)
   - Eligibility requirements (if any)

3. Submit to API:

POST {BASE_URL}/api/resources/suggest-batch
Content-Type: application/json

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
      "services": ["Job training", "Resume help"],
      "hours": {
        "monday": "9am-5pm",
        "tuesday": "9am-5pm"
      },
      "eligibility_requirements": "Open to all"
    }
  ],
  "submitter": "claude_code",
  "notes": "Discovered via [source]"
}

**Sources to check:**
- 211 database for [STATE]
- Government websites
- Google searches
- Nonprofit directories

**Report back:**
- How many resources submitted
- How many auto-approved vs flagged
- Any issues encountered
```

---

### Step 2: Verify Flagged Resources

**Prompt for Claude Code:**

```
I need you to verify resources that were flagged by our automated system.

BASE_URL: http://localhost:3000 (or production URL)
API_KEY: 9ebe8ec1f7d79638d9f512649733c9a13eb63d4b8227330d586b80a5261b342c

**Step 1: Get Verification Queue**

GET {BASE_URL}/api/admin/verification-queue?limit=10
Headers:
  x-admin-api-key: {API_KEY}

This returns resources needing verification with:
- Resource details
- Verification log (what checks failed)
- Checks needed

**Step 2: For Each Resource, Verify:**

**A. Website Check**
- Use WebFetch to visit the website
- Confirm organization name matches
- Check if they mention reentry services
- Verify contact information is listed

**B. Services Verification**
- Read services page
- Confirm they offer claimed services
- Check eligibility requirements

**C. Cross-Reference**
- Search Google for "[organization name] reviews"
- Look for red flags (closed, scam warnings)

**Step 3: Make Decision**

**If Checks Pass (APPROVE):**
POST {BASE_URL}/api/admin/flagged-resources/{id}/approve
Headers:
  x-admin-api-key: {API_KEY}
  Content-Type: application/json

**If Issues Found (REJECT):**
POST {BASE_URL}/api/admin/flagged-resources/{id}/reject
Headers:
  x-admin-api-key: {API_KEY}
  Content-Type: application/json

**Reasons to REJECT:**
- Organization permanently closed
- Website doesn't exist
- Services don't match claims
- Contact info completely wrong
- Obvious spam/fake

**Step 4: Report Back**

Tell me:
- How many approved
- How many rejected
- Common issues found
- Recommendations
```

---

## Example: Complete Discovery Session

```
User: Find 10 employment resources in Oakland, CA

Claude Code:
[Uses WebSearch and WebFetch to find resources]
[Compiles data into proper format]

Found 12 employment resources. Submitting to API...

curl -X POST http://localhost:3000/api/resources/suggest-batch \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [
      {
        "name": "Oakland Private Industry Council",
        "address": "1212 Broadway",
        "city": "Oakland",
        "state": "CA",
        "zip": "94612",
        "phone": "(510) 208-4800",
        "website": "https://oaklandpic.org",
        "description": "Free job training and placement services",
        "primary_category": "employment",
        "services": ["Job training", "Resume help", "Interview prep"]
      }
    ],
    "submitter": "claude_code",
    "notes": "Oakland employment resources from 211 + Google"
  }'

Response:
{
  "success": true,
  "stats": {
    "total_received": 12,
    "auto_approved": 9,
    "flagged_for_human": 3
  }
}

Summary:
✅ 9 resources auto-approved
⚠️  3 resources flagged for review
```

---

## Example: Complete Verification Session

```
User: Verify the flagged resources

Claude Code:
Getting verification queue...

curl -X GET "http://localhost:3000/api/admin/verification-queue?limit=10" \
  -H "x-admin-api-key: 9ebe8ec1f7d79638d9f512649733c9a13eb63d4b8227330d586b80a5261b342c"

Found 3 resources needing verification...

Resource 1: Oakland Job Center
- Visiting website: https://www.oaklandca.gov
- ✅ Website loads
- ✅ Phone number verified: (510) 208-4800
- ✅ Services confirmed
Decision: APPROVE

curl -X POST http://localhost:3000/api/admin/flagged-resources/{id}/approve \
  -H "x-admin-api-key: 9ebe8ec1f7d79638d9f512649733c9a13eb63d4b8227330d586b80a5261b342c"

Resource 2: Bay Area Services
- Visiting website: https://bayareaservices.org
- ❌ Website does not load (404)
- ❌ Organization not found in Google
Decision: REJECT

curl -X POST http://localhost:3000/api/admin/flagged-resources/{id}/reject \
  -H "x-admin-api-key: 9ebe8ec1f7d79638d9f512649733c9a13eb63d4b8227330d586b80a5261b342c"

Final Results:
✅ Approved: 2
❌ Rejected: 1
```

---

## Tips for Claude Code

### Best Practices

1. **Use WebFetch for verification**: Actual website browsing is more accurate
2. **Batch operations**: Submit 10-50 resources at once for efficiency
3. **Be thorough**: Check website, phone, services before approving
4. **Conservative approach**: When in doubt, reject (admin can review)

### Common Issues

| Issue                         | Solution                                 |
| ----------------------------- | ---------------------------------------- |
| API key not working           | Check .env.local has ADMIN_API_KEY set   |
| Unauthorized error            | Ensure `x-admin-api-key` header included |
| Website unreachable           | Use WebFetch with longer timeout         |
| Can't determine if legitimate | Reject and let human review              |

### Performance

- **Discovery**: ~5-10 resources per minute (with verification)
- **Verification**: ~30 seconds per resource (with web browsing)
- **Batch size**: Aim for 10-20 resources per batch

---

## API Reference

### Endpoints

**Submit Resources:**

- `POST /api/resources/suggest-batch`
- Auth: None required (public endpoint)
- Body: `{ resources: [], submitter, notes }`

**Get Verification Queue:**

- `GET /api/admin/verification-queue?limit=10`
- Auth: `x-admin-api-key` header
- Returns: Array of flagged resources

**Approve Resource:**

- `POST /api/admin/flagged-resources/{id}/approve`
- Auth: `x-admin-api-key` header
- Creates resource and marks suggestion approved

**Reject Resource:**

- `POST /api/admin/flagged-resources/{id}/reject`
- Auth: `x-admin-api-key` header
- Marks suggestion rejected

---

## Comparison: Claude Web vs Claude Code

| Feature          | Claude Web                               | Claude Code                       |
| ---------------- | ---------------------------------------- | --------------------------------- |
| **Auth**         | Browser session (automatic)              | API key (manual header)           |
| **Discovery**    | Manual browsing + POST                   | Automated search + POST           |
| **Verification** | Visual website inspection                | WebFetch + API calls              |
| **Speed**        | Slower (human-paced)                     | Faster (automated)                |
| **Accuracy**     | Higher (visual verification)             | Good (text-based)                 |
| **Best for**     | Initial discovery, thorough verification | Batch operations, re-verification |

---

## Security Notes

**API Key Safety:**

- ✅ Stored in `.env.local` (git-ignored)
- ✅ Never expose in code or documentation
- ✅ Server-side only (never client-side)
- ✅ Rotate if compromised

**Headers Required:**

```bash
# Always include when calling admin endpoints
x-admin-api-key: your-key-here
```

---

## Support

For issues or questions:

- GitHub: https://github.com/gserafini/reentry-map
- Email: gserafini@gmail.com

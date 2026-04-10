import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { resources } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

/**
 * GET /api/admin/prompt-generator?city=Oakland&state=CA
 * Returns existing resources for a city (for Claude Web to avoid duplicates)
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const city = searchParams.get('city')
  const state = searchParams.get('state')

  if (!city || !state) {
    return NextResponse.json({ error: 'Missing city or state parameter' }, { status: 400 })
  }

  try {
    // Fetch existing resources for this city
    const resourceList = await db
      .select({
        name: resources.name,
        address: resources.address,
        city: resources.city,
        state: resources.state,
        zip: resources.zip,
        primaryCategory: resources.primaryCategory,
      })
      .from(resources)
      .where(and(eq(resources.city, city), eq(resources.state, state)))
      .orderBy(resources.name)

    return NextResponse.json({
      city,
      state,
      count: resourceList?.length || 0,
      resources:
        resourceList?.map((r) => ({
          name: r.name,
          address: r.address,
          city: r.city,
          state: r.state,
          zip: r.zip,
          primary_category: r.primaryCategory,
        })) || [],
    })
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }
}

/**
 * POST /api/admin/prompt-generator
 * Generates Claude Web prompts for resource discovery in new cities
 * Public endpoint - no authentication required (community can help!)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      city: string
      state: string
      targetCount: number
      categories?: string[]
      existingCoverage?: string
      batchNumber?: number
    }

    const { city, state, targetCount, categories, existingCoverage, batchNumber = 2 } = body

    if (!city || !state || !targetCount) {
      return NextResponse.json(
        { error: 'Missing required fields: city, state, targetCount' },
        { status: 400 }
      )
    }

    // Get existing resources for the city
    const existingResources = await db
      .select({
        name: resources.name,
        address: resources.address,
        city: resources.city,
        state: resources.state,
        zip: resources.zip,
        primaryCategory: resources.primaryCategory,
      })
      .from(resources)
      .where(and(eq(resources.city, city), eq(resources.state, state)))
      .orderBy(resources.name)

    const [countResult] = await db
      .select({ value: count() })
      .from(resources)
      .where(and(eq(resources.city, city), eq(resources.state, state)))

    const currentCount = countResult?.value || 0

    const categoriesList =
      categories && categories.length > 0
        ? categories.join(', ')
        : 'employment, housing, food, healthcare, legal-aid, mental-health, substance-abuse, education, transportation, clothing, id-documents, faith-based, general-support'

    // Build "already found" list
    const alreadyFoundList =
      existingResources && existingResources.length > 0
        ? `\n## ⚠️ Already Found (Skip These)\nDo NOT include these resources - they're already in the database:\n\n${existingResources.map((r) => `- **${r.name}** - ${r.address}, ${r.city}, ${r.state} ${r.zip} (${r.primaryCategory})`).join('\n')}\n`
        : ''

    const prompt = `# Reentry Resource Discovery: ${city}, ${state}

I need you to find **${targetCount} NEW verified reentry resources** in **${city}, ${state}** for individuals navigating reentry.

## Current Coverage
${existingCoverage || `Currently ${currentCount || 0} resources in database for this city.`}
${alreadyFoundList}

## Target Categories
Focus on these categories: **${categoriesList}**

## Research Sources
**Use your WebSearch tool** to find resources from:
1. **211 databases** (e.g., 211${state.toLowerCase()}.org, 211info.org)
2. **County government websites** (probation, health & human services, workforce development)
3. **State reentry programs** (Department of Corrections, Parole & Probation)
4. **Local nonprofit directories**
5. **Web searches** (terms like "${city} reentry services", "${city} halfway house", "${city} food bank", etc.)

## ⚡ Efficiency: Check for Duplicates BEFORE Researching

**IMPORTANT**: Before spending time researching a resource, check if it already exists using our fast lookup API:

\`\`\`
GET https://reentrymap.org/api/resources/check-duplicate?name=Resource+Name&address=123+Main+St&city=${city}&state=${state}
\`\`\`

**Parameters**:
- \`name\` - Resource name (URL-encoded)
- \`address\` - Street address (URL-encoded)
- \`city\` - City name
- \`state\` - State code (${state})

**Response**:
\`\`\`json
{
  "isDuplicate": true,
  "matchCount": 1,
  "matches": [{"id": "...", "name": "...", "address": "..."}],
  "message": "Found 1 potential duplicate(s)"
}
\`\`\`

**Workflow**:
1. Find a potential resource via web search
2. **Check duplicate API first** before deep research
3. If \`isDuplicate: true\` → **Skip it** (already in database)
4. If \`isDuplicate: false\` → Proceed with full research

This saves time and avoids duplicate work!

## Required Information
For each resource, collect:

### Basic Info (Required)
- **name**: Full organization name
- **description**: 2-3 thorough sentences explaining what the organization actually does, who it serves, and why it is relevant for reentry
- **primary_category**: Most relevant category (one of: employment, housing, food, healthcare, legal-aid, mental-health, substance-abuse, education, transportation, clothing, id-documents, faith-based, general-support)
- **categories**: Array of all applicable categories
- **tags**: Relevant tags (e.g., ["reentry-specific", "no-cost", "walk-in-welcome"])

### Contact (Required)
- **address**: When a real street address exists, include it with a street number
- **city**: "${city}"
- **state**: "${state}"
- **zip**: ZIP code
- **phone**: Phone number (format: "555-123-4567")
- **website**: Website URL. Required effort: if they have a website, include it. In web research, website is usually the easiest field to capture
- **email**: Email address. Required effort: check contact page, footer, About page, staff directory, and referral/intake pages before leaving blank
- **address_type**: "physical" | "confidential" | "regional" | "online" | "mobile"
- **Confidential example**: use \`"address_type": "confidential"\` when the organization is real but intentionally withholds its street address for safety/privacy
- **service_area**: Required for "regional", "online", and "mobile" resources. Format: {"type": "city|county|statewide|region|nationwide", "values": ["Lubbock", "Lubbock County"]}

### Additional Details (If Available)
- **hours**: Hours of operation (object format: {"Monday": "9:00 AM - 5:00 PM", ...})
- **services_offered**: Array of specific services. Do NOT just repeat the category name
- **eligibility_requirements**: Array of eligibility criteria
- **fees**: Fee structure (or "free")
- **languages**: Array of languages spoken
- **accessibility_features**: Array of accessibility features

### Provenance (CRITICAL - Track Your Research)
For **EVERY resource**, include a \`source\` object documenting where/how you found it:

\`\`\`json
"source": {
  "name": "211 Alameda County",
  "url": "https://www.211alamedacounty.org/resource-detail/12345",
  "accessed_date": "${new Date().toISOString().split('T')[0]}",
  "research_method": "211_database",
  "discovered_by": "claude_web",
  "notes": "Found via 211 database search for '${city} employment services'"
}
\`\`\`

**Research Methods**:
- \`211_database\` - Found via 211 directory
- \`government_website\` - Found on county/state website
- \`web_search\` - Found via Google/web search
- \`nonprofit_directory\` - Found in nonprofit directory
- \`verification_call\` - Verified by phone call

## Non-Negotiable Data Quality Rules
- **Email is required effort**: actively look for email on the website before leaving it blank
- **Some legitimate resources do not publish a street address**: shelters, confidential programs, statewide hotlines, online services, and mobile programs are still valid if you capture them honestly
- **Use address_type correctly**: "physical" for normal street-address resources, "confidential" when exact location is intentionally withheld, "regional"/"online"/"mobile" for area-serving resources
- **Use service_area for non-physical coverage**: if a resource serves an area instead of a single public address, define that area explicitly
- **Do not invent street addresses**: if no public street address exists, leave address blank instead of guessing
- **PO Boxes are acceptable as mailing-only info** only when the resource is otherwise clearly real and you still classify it correctly
- **Descriptions must be specific**: write 2-3 thorough sentences, not fragments or category labels
- **services_offered must be concrete**: list actual services like "GED prep", "resume workshops", "transitional housing", "record expungement help"

## Quality Standards
- ✅ **Verify resource is still active** (check website/call if possible)
- ✅ **Confirm address is current**
- ✅ **Prioritize reentry-specific services**
- ✅ **Include diverse service types** (don't just focus on housing)
- ✅ **Get phone, website, and email whenever they can be found**
- ✅ **Include area-serving and confidential-location resources when they are clearly real**
- ✅ **Document your source for EVERY resource**

## Output Format
Save as: **${city.toLowerCase().replace(/\s+/g, '-')}-resources-batch-${batchNumber}.json**

\`\`\`json
[
  {
    "name": "Example Reentry Services",
    "description": "Provides job placement, case management, and life skills training for formerly incarcerated individuals.",
    "primary_category": "employment",
    "categories": ["employment", "general_support"],
    "tags": ["reentry-specific", "case-management", "job-training"],
    "address": "123 Main St",
    "city": "${city}",
    "state": "${state}",
    "zip": "12345",
    "address_type": "physical",
    "phone": "555-123-4567",
    "website": "https://example.org",
    "email": "info@example.org",
    "hours": {
      "Monday": "9:00 AM - 5:00 PM",
      "Tuesday": "9:00 AM - 5:00 PM",
      "Wednesday": "9:00 AM - 5:00 PM",
      "Thursday": "9:00 AM - 5:00 PM",
      "Friday": "9:00 AM - 3:00 PM"
    },
    "services_offered": [
      "Job placement assistance",
      "Resume workshops",
      "Interview preparation",
      "Case management"
    ],
    "eligibility_requirements": [
      "Previously incarcerated individuals",
      "18 years or older"
    ],
    "fees": "Free",
    "languages": ["English", "Spanish"],
    "accessibility_features": ["Wheelchair accessible", "Public transit access"],
    "source": {
      "name": "County Reentry Program Directory",
      "url": "https://county.gov/reentry/services",
      "accessed_date": "${new Date().toISOString().split('T')[0]}",
      "research_method": "government_website",
      "discovered_by": "claude_web",
      "notes": "Listed on county probation department website"
    }
  },
  {
    "name": "Example Statewide Hotline",
    "description": "Provides statewide referrals and navigation support for people returning from incarceration, including resource matching and crisis referrals.",
    "primary_category": "general-support",
    "categories": ["general-support"],
    "tags": ["statewide", "referrals"],
    "address": "",
    "city": "${city}",
    "state": "${state}",
    "zip": "",
    "address_type": "regional",
    "service_area": {
      "type": "statewide",
      "values": ["${state}"]
    },
    "phone": "555-222-3333",
    "website": "https://examplehotline.org",
    "email": "",
    "services_offered": [
      "Resource referrals",
      "Navigation support"
    ],
    "source": {
      "name": "State corrections reentry page",
      "url": "https://state.gov/reentry",
      "accessed_date": "${new Date().toISOString().split('T')[0]}",
      "research_method": "government_website",
      "discovered_by": "claude_web",
      "notes": "Statewide referral resource serving ${state}"
    }
  }
]
\`\`\`

## Success Criteria
- [ ] Found ${targetCount} resources
- [ ] All resources have the strongest contact profile available for their type (website, phone, email, and either address or explicit address_type/service_area)
- [ ] All resources have \`source\` provenance tracking
- [ ] Mix of service categories (not just one type)
- [ ] Verified resources are currently active
- [ ] Saved as ${city.toLowerCase().replace(/\s+/g, '-')}-resources-batch-${batchNumber}.json`

    return NextResponse.json({
      success: true,
      prompt,
      metadata: {
        city,
        state,
        targetCount,
        batchNumber,
        generatedAt: new Date().toISOString(),
        currentCount: currentCount || 0,
      },
    })
  } catch (error) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate prompt',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

# Instructions for Claude Code

This document provides specific instructions for Claude Code to build the Reentry Map MVP.

## Project Context

You are building **Reentry Map**, a web application that helps people navigating reentry
find resources in their community. The app uses Next.js 16, Supabase, and AI agents.

**Owner**: Gabriel Serafini (gserafini@gmail.com)  
**Repository**: github.com/gserafini/reentry-map.git  
**Timeline**: 5 weeks to Phase 1 MVP

## Getting Started

### Initial Setup Command

```bash
npx create-next-app@latest reentry-map --example with-supabase --typescript --tailwind --app
cd reentry-map
```

### Key Files to Reference

- `TECHNICAL_ARCHITECTURE.md` - Full technical spec
- `PRODUCT_REQUIREMENTS.md` - Feature requirements
- `DEVELOPMENT_PLAN.md` - Week-by-week plan
- `SETUP_GUIDE.md` - Environment setup

## Implementation Priorities

### Week 1: Foundation

**Primary Goal**: Users can browse and search resources

**Critical Path**:

1. Database schema (copy from architecture doc)
2. Resource listing page with cards
3. Resource detail page
4. Search and category filtering
5. Deploy to Vercel staging

**Files to Create**:

```
app/
├── page.tsx                     # Home with search
├── resources/
│   ├── page.tsx                 # Resource list
│   └── [id]/page.tsx            # Resource detail
components/
├── resources/
│   ├── ResourceCard.tsx
│   ├── ResourceList.tsx
│   └── ResourceDetail.tsx
├── search/
│   └── SearchBar.tsx
lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
├── types/
│   └── database.ts
```

**Key Requirements**:

- Use Server Components where possible
- Implement loading.tsx for each route
- Add error.tsx for error handling
- Mobile-first responsive design
- Use shadcn/ui components

### Week 2: Location Features

**Primary Goal**: Users can find resources near them

**Critical Path**:

1. Google Maps integration
2. Marker display with clustering
3. User geolocation
4. Distance calculations
5. Map/list view toggle

**Files to Create**:

```
components/
├── map/
│   ├── ResourceMap.tsx
│   ├── MapMarker.tsx
│   └── MapInfoWindow.tsx
lib/
├── hooks/
│   └── useLocation.ts
├── utils/
│   ├── geocoding.ts
│   └── distance.ts
```

**Key Requirements**:

- Use @googlemaps/js-api-loader
- Handle location permission denial gracefully
- Optimize for 100+ markers
- Make markers color-coded by category

### Week 3: Authentication & Favorites

**Primary Goal**: Users can create accounts and save favorites

**Critical Path**:

1. Supabase Auth (phone/SMS)
2. User profile creation
3. Favorites system
4. Rating system
5. Protected routes

**Files to Create**:

```
components/
├── auth/
│   ├── AuthModal.tsx
│   ├── PhoneAuth.tsx
│   └── UserProfile.tsx
├── user/
│   ├── FavoriteButton.tsx
│   └── RatingStars.tsx
app/
├── favorites/
│   └── page.tsx
lib/
├── hooks/
│   ├── useAuth.ts
│   └── useFavorites.ts
```

**Key Requirements**:

- Use Supabase Auth with phone OTP
- Implement Row Level Security
- Handle auth state globally
- Require auth for favorites/ratings

### Week 4: Reviews & AI

**Primary Goal**: Community features and automated enrichment

**Critical Path**:

1. Review submission and display
2. Review helpfulness voting
3. Resource suggestions
4. AI enrichment agent
5. Admin dashboard

**Files to Create**:

```
components/
├── reviews/
│   ├── ReviewForm.tsx
│   ├── ReviewsList.tsx
│   └── ReviewCard.tsx
app/
├── suggest-resource/
│   └── page.tsx
├── admin/
│   ├── page.tsx
│   └── resources/
│       └── page.tsx
├── api/
│   ├── resources/
│   │   └── route.ts
│   ├── reviews/
│   │   └── route.ts
│   └── agents/
│       └── enrich/route.ts
lib/
├── ai-agents/
│   ├── enrichmentAgent.ts
│   └── agentRunner.ts
```

**Key Requirements**:

- Use OpenAI API for enrichment
- Implement admin role checking
- Add moderation queue for suggestions
- Log all AI agent actions

### Week 5: Polish & Launch

**Primary Goal**: Production-ready application

**Critical Path**:

1. PWA configuration
2. Content population (50+ resources)
3. Comprehensive testing
4. Bug fixes
5. Production deployment

**Files to Create**:

```
public/
├── manifest.json
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
next.config.ts (update for PWA)
```

**Key Requirements**:

- Configure @ducanh2912/next-pwa
- Add 50+ real Oakland resources
- Achieve Lighthouse score >90
- Test on iOS and Android

## Code Style Guidelines

### TypeScript

```typescript
// Use explicit types
interface Resource {
  id: string
  name: string
  // ...
}

// Use const for immutable values
const DEFAULT_RADIUS = 25

// Use async/await over promises
async function getResources(): Promise<Resource[]> {
  const { data, error } = await supabase.from('resources').select('*')

  if (error) throw error
  return data
}
```

### React Components

```typescript
// Use function components with TypeScript
interface ResourceCardProps {
  resource: Resource
  onFavorite?: (id: string) => void
}

export function ResourceCard({ resource, onFavorite }: ResourceCardProps) {
  // Component logic
}

// Use Server Components by default
// Add 'use client' only when needed for interactivity
```

### Supabase Queries

```typescript
// Always handle errors
const { data, error } = await supabase.from('resources').select('*').eq('status', 'active')

if (error) {
  console.error('Error fetching resources:', error)
  throw new Error('Failed to fetch resources')
}

// Use type safety
const { data, error } = await supabase.from('resources').select('*').returns<Resource[]>()
```

### API Routes

```typescript
// app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('resources').select('*')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Testing Requirements

### Manual Testing Checklist (Run Before Each Commit)

- [ ] Feature works on Chrome desktop
- [ ] Feature works on mobile (Chrome/Safari)
- [ ] Loading states display correctly
- [ ] Error states handle gracefully
- [ ] No console errors
- [ ] TypeScript compiles without errors
- [ ] Responsive design works (375px to 1920px)

### Performance Requirements

- [ ] Lighthouse Performance > 90
- [ ] First Contentful Paint < 1.8s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3.8s

### Accessibility Requirements

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Color contrast ratio > 4.5:1
- [ ] Alt text on all images
- [ ] ARIA labels where needed
- [ ] Screen reader tested (if possible)

## Common Patterns

### Fetching Data (Server Component)

```typescript
// app/resources/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function ResourcesPage() {
  const supabase = createClient();
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'active')
    .order('name');

  return (
    <div>
      <h1>Resources</h1>
      <ResourceList resources={resources || []} />
    </div>
  );
}
```

### Client-Side Data Fetching

```typescript
// components/ResourceList.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ResourceList() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadResources() {
      const { data } = await supabase
        .from('resources')
        .select('*');
      setResources(data || []);
      setLoading(false);
    }
    loadResources();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="grid gap-4">
      {resources.map(resource => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
```

### Custom Hooks

```typescript
// lib/hooks/useResources.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Resource } from '@/lib/types/database'

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchResources() {
      try {
        const { data, error } = await supabase.from('resources').select('*').eq('status', 'active')

        if (error) throw error
        setResources(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [])

  return { resources, loading, error }
}
```

## Error Handling Patterns

### API Error Handling

```typescript
try {
  const response = await fetch('/api/resources')
  if (!response.ok) {
    throw new Error('Failed to fetch resources')
  }
  const data = await response.json()
  return data
} catch (error) {
  console.error('Error:', error)
  // Show user-friendly error message
  toast.error('Unable to load resources. Please try again.')
  return []
}
```

### Form Validation

```typescript
import { z } from 'zod'

const resourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Invalid phone format'),
  category: z.enum(['employment', 'housing', 'food' /* ... */]),
})

function validateResource(data: unknown) {
  try {
    return resourceSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: error.errors }
    }
    throw error
  }
}
```

## Security Best Practices

### Never Expose Secrets

```typescript
// ❌ WRONG - exposing secret in client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This won't work in client components
})

// ✅ CORRECT - API route with secret
// app/api/ai/route.ts
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Safe in API routes
})
```

### Validate User Input

```typescript
// Always validate and sanitize
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .substring(0, 500) // Limit length
}
```

### Use Row Level Security

```sql
-- Always enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Example policy
CREATE POLICY "Anyone can view active resources"
  ON resources FOR SELECT
  USING (status = 'active');
```

## Debugging Tips

### Check Supabase Logs

```typescript
// Add detailed logging
const { data, error } = await supabase.from('resources').select('*')

console.log('Query result:', { data, error })

if (error) {
  console.error('Supabase error:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
  })
}
```

### Check Network Requests

```typescript
// Use Next.js built-in debugging
export const dynamic = 'force-dynamic' // Force dynamic rendering
export const revalidate = 0 // Disable caching for debugging
```

### Check Build Errors

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## Deployment Checklist

### Before Deploying

- [ ] All environment variables set in Vercel
- [ ] Database migrations run
- [ ] No console.log statements in production code
- [ ] No TODO comments
- [ ] All TypeScript errors resolved
- [ ] Build succeeds locally
- [ ] Manual testing complete

### After Deploying

- [ ] Verify staging environment works
- [ ] Check Vercel logs for errors
- [ ] Test critical user flows
- [ ] Check performance metrics
- [ ] Monitor for errors in first hour

## Questions to Ask

When uncertain about implementation:

1. "What does the PRD say about this feature?"
2. "Is this a Server or Client Component?"
3. "Where should this data be fetched?"
4. "Does this need authentication?"
5. "How should errors be handled?"
6. "Is this mobile-friendly?"
7. "Is this accessible?"
8. "Will this perform well at scale?"

## Getting Unstuck

If blocked:

1. Check the documentation files
2. Review similar existing code
3. Search Supabase/Next.js docs
4. Ask specific questions with context
5. Try simplest solution first
6. Add TODO and move forward if non-critical

## Success Criteria

You'll know you're on track when:

- ✅ Code follows the patterns in this guide
- ✅ Features match the PRD requirements
- ✅ No TypeScript or build errors
- ✅ Components are reusable and well-typed
- ✅ Error handling is comprehensive
- ✅ Mobile experience is smooth
- ✅ Performance is good
- ✅ Progress matches the weekly plan

## Final Notes

**Remember**:

- Quality over speed
- Mobile-first always
- Accessibility matters
- Security is non-negotiable
- User experience is paramount
- Simple solutions are often best

**When in doubt**:

- Refer to PRODUCT_REQUIREMENTS.md
- Check TECHNICAL_ARCHITECTURE.md
- Follow DEVELOPMENT_PLAN.md
- Ask for clarification

Good luck building Reentry Map! 🚀

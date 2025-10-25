# SEO Strategy - Reentry Map

## Overview

This document outlines our comprehensive SEO strategy for Reentry Map, focusing on local search visibility, technical SEO best practices, and hyperlocal landing pages to drive organic traffic.

**Primary SEO Goals:**

- Rank for "reentry resources [city]" and category-specific queries
- Generate 1000+ hyperlocal landing pages for Bay Area cities and neighborhoods
- Achieve featured snippets for common reentry resource queries
- Build local backlinks from government and nonprofit organizations

## Current Implementation

### ✅ What We Have

**1. Next.js 16 App Router Metadata API**

- Static metadata in [app/layout.tsx](app/layout.tsx:13-31)
- Dynamic `generateMetadata()` in category and search pages
- MetadataBase configured for Open Graph and social sharing

**2. SEO-Friendly URLs**

- Implemented in [lib/utils/seo-routes.ts](lib/utils/seo-routes.ts)
- Pattern: `/search/{category}-in-{city}-{state}`
- Examples:
  - `/search/employment-in-oakland-ca`
  - `/search/housing-in-san-francisco-ca`
  - `/search/food-assistance-in-berkeley-ca`

**3. Structured Metadata**

- Title templates with location and category
- Meta descriptions optimized for local search
- Keywords array for each page type

**4. Database SEO Fields**

- Added in migration [20250101000004_add_seo_fields.sql](supabase/migrations/20250101000004_add_seo_fields.sql)
- Stores location-specific content and metadata

---

## Hyperlocal Landing Pages Strategy

### Concept

Generate 1000+ unique, SEO-optimized landing pages targeting specific combinations of:

- **13 resource categories** (Employment, Housing, Food, etc.)
- **100+ Bay Area cities/neighborhoods**
- **Long-tail search queries** like "find housing in Oakland CA"

### URL Structure

```
/search/[category]-in-[city]-[state]
```

**Examples:**

- `/search/employment-in-oakland-ca`
- `/search/housing-in-berkeley-ca`
- `/search/food-assistance-in-san-leandro-ca`
- `/search/mental-health-services-in-alameda-ca`

### Content Generation

Each landing page includes:

1. **Dynamic Title Tag**

   ```
   Find [Category] in [City], [State] | Reentry Map
   Example: "Find Employment in Oakland, CA | Reentry Map"
   ```

2. **Unique Meta Description**

   ```
   [Category-specific intro]. Find verified resources in [City], [State].
   Browse ratings, hours, and contact info. Updated daily.
   ```

3. **Hero Section**
   - Location-specific headline
   - Localized intro text from [seo-routes.ts](lib/utils/seo-routes.ts:116-143)
   - Search box pre-filled with location

4. **Resource Results**
   - Filtered by category and geo-location
   - Sorted by distance from city center
   - Shows 20 results with pagination

5. **Local Context**
   - Number of resources in area
   - Popular categories for that city
   - Related nearby cities

### Implementation Status

**✅ Completed:**

- SEO URL routing and parsing
- Category phrase generation
- Intro text templates for all 13 categories

**🚧 To Do:**

- Generate canonical city list for Bay Area (100+ cities)
- Create sitemap.ts with all landing page URLs
- Add breadcrumb structured data
- Implement city-specific H1/H2 content

### Target Cities (Bay Area)

**Phase 1: Major Cities (13 pages × 13 categories = 169 pages)**

- Oakland, San Francisco, San Jose, Berkeley, Alameda, Hayward, Fremont, Richmond, Concord, Vallejo, Fairfield, Antioch, Pittsburg

**Phase 2: Medium Cities (30+ cities)**

- San Leandro, Dublin, Pleasanton, Livermore, Union City, Newark, Milpitas, Santa Clara, Sunnyvale, Mountain View, Palo Alto, Redwood City, San Mateo, Daly City, South San Francisco, San Bruno, Pacifica, Half Moon Bay, Castro Valley, San Ramon, Danville, Walnut Creek, Martinez, Benicia, Napa, Sonoma, Petaluma, Novato, San Rafael, etc.

**Phase 3: Neighborhoods (50+ locations)**

- East Oakland, West Oakland, Downtown Oakland, Fruitvale, Rockridge, Temescal, SOMA, Mission District, Castro, Haight, Richmond District, Sunset, Potrero Hill, etc.

**Total Target: 1000+ unique landing pages**

---

## Technical SEO Best Practices

Based on [Next.js SEO Guide](https://dminhvu.com/post/nextjs-seo) and industry standards.

### 1. Meta Tags Implementation

**Current Status:** ✅ Basic implementation in place

**Enhancements Needed:**

```typescript
// app/search/[slug]/page.tsx - Enhanced metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, city, state } = parseSeoUrl(params.slug)
  const categoryLabel = getCategoryLabel(category)
  const resourceCount = await getResourcesCount({ categories: [category], city })

  return {
    title: `${resourceCount}+ ${categoryLabel} Resources in ${city}, ${state} | Reentry Map`,
    description: `Find verified ${categoryLabel.toLowerCase()} resources in ${city}. Browse ratings, hours, contact info, and directions. Updated ${new Date().toLocaleDateString()}.`,
    keywords: [
      `${categoryLabel} ${city}`,
      `reentry resources ${city}`,
      `${categoryLabel} near me`,
      `${city} ${state} resources`,
      'reentry support',
    ],

    // Open Graph for social sharing
    openGraph: {
      title: `${categoryLabel} Resources in ${city}, ${state}`,
      description: `Find ${resourceCount}+ verified ${categoryLabel.toLowerCase()} resources in ${city}`,
      url: `/search/${params.slug}`,
      siteName: 'Reentry Map',
      images: [
        {
          url: '/og-image.png', // 1200x630px PNG
          width: 1200,
          height: 630,
          alt: `${categoryLabel} Resources in ${city}`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: `${categoryLabel} Resources in ${city}, ${state}`,
      description: `Find ${resourceCount}+ verified resources`,
      images: ['/og-image.png'],
    },

    // Canonical URL
    alternates: {
      canonical: `/search/${params.slug}`,
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}
```

### 2. JSON-LD Structured Data

**Status:** 🚧 Not yet implemented

**Priority Schema Types:**

**LocalBusiness Schema** (for individual resources):

```typescript
// components/resources/ResourceDetail.tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: resource.name,
  description: resource.description,
  address: {
    '@type': 'PostalAddress',
    streetAddress: resource.street_address,
    addressLocality: resource.city,
    addressRegion: resource.state,
    postalCode: resource.zip_code,
    addressCountry: 'US',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: resource.latitude,
    longitude: resource.longitude,
  },
  telephone: resource.phone,
  url: resource.website,
  aggregateRating: resource.rating_average ? {
    '@type': 'AggregateRating',
    ratingValue: resource.rating_average,
    reviewCount: resource.review_count,
  } : undefined,
  openingHoursSpecification: resource.hours, // If structured
}

// In component return:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

**ItemList Schema** (for search results pages):

```typescript
// app/search/[slug]/page.tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: `${categoryLabel} Resources in ${city}, ${state}`,
  description: generateSeoIntro(category, city, state),
  numberOfItems: resources.length,
  itemListElement: resources.map((resource, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'LocalBusiness',
      name: resource.name,
      url: `/resources/${resource.id}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: resource.city,
        addressRegion: resource.state,
      },
    },
  })),
}
```

**BreadcrumbList Schema**:

```typescript
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://reentrymap.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Resources',
      item: 'https://reentrymap.com/resources',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: categoryLabel,
      item: `https://reentrymap.com/resources/category/${category}`,
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: `${city}, ${state}`,
    },
  ],
}
```

### 3. Sitemap Generation

**Status:** 🚧 To be implemented

**Implementation:**

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'
import { getAllCategories } from '@/lib/utils/categories'
import { CANONICAL_SEO_PATTERNS } from '@/lib/utils/seo-routes'
import { BAY_AREA_CITIES } from '@/lib/data/cities'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://reentrymap.com'

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]

  // Category pages
  const categoryPages = getAllCategories().map((category) => ({
    url: `${baseUrl}/resources/category/${category}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Hyperlocal landing pages (1000+)
  const hyperlocalPages = []
  for (const category of getAllCategories()) {
    const categorySlug = CANONICAL_SEO_PATTERNS[category]

    for (const city of BAY_AREA_CITIES) {
      hyperlocalPages.push({
        url: `${baseUrl}/search/${categorySlug}-in-${city.slug}-ca`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }

  return [...staticPages, ...categoryPages, ...hyperlocalPages]
}
```

### 4. Robots.txt Configuration

**Status:** 🚧 To be implemented

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
    ],
    sitemap: 'https://reentrymap.com/sitemap.xml',
  }
}
```

### 5. Performance Optimization

**Next.js Image Optimization:**

- ✅ Using Next.js `<Image>` component
- ✅ Automatic WebP conversion
- 🚧 Consider ImageKit or Cloudinary for CDN

**Script Loading:**

```typescript
// Use Next.js Script component with proper strategy
import Script from 'next/script'

// Google Analytics example
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
  strategy="afterInteractive"
/>
```

---

## Content Strategy for SEO

### 1. Page Content Structure

Each hyperlocal landing page should have:

**H1 Header:**

```html
<h1>Find [Category] Resources in [City], [State]</h1>
```

**Intro Paragraph (150-200 words):**

- Category-specific intro from [seo-routes.ts](lib/utils/seo-routes.ts:116-143)
- Mention city/state 2-3 times naturally
- Include call-to-action
- Example: "Looking for employment resources in Oakland, CA? Connect with local employers, job training programs, and employment services that welcome individuals with records. Our verified directory includes 50+ employment resources in Oakland, helping you find the right opportunities to restart your career."

**Resource Statistics:**

```html
<div class="stats">
  <span>{count} Resources in {city}</span>
  <span>Average Rating: {avgRating} ⭐</span>
  <span>Updated {lastUpdated}</span>
</div>
```

**FAQ Section (for featured snippets):**

- "What [category] resources are available in [city]?"
- "How do I find [category] help in [city]?"
- "Are there free [category] services in [city]?"

### 2. Internal Linking Strategy

**From Hyperlocal Pages:**

- Link to category overview: `/resources/category/employment`
- Link to nearby cities: "Also serving Berkeley, Alameda, San Leandro"
- Link to related categories: "Also need housing? View housing resources"

**From Category Pages:**

- Link to top 10 cities for that category
- "View all [category] resources by city"

**From Homepage:**

- Link to top 20 hyperlocal pages (high-volume searches)
- Link to all 13 category pages

### 3. Location Pages

Create dedicated city landing pages:

```
/locations/oakland-ca
/locations/san-francisco-ca
/locations/berkeley-ca
```

**Content:**

- Overview of all resource types in that city
- Statistics: total resources, categories covered
- Neighborhood breakdowns
- Links to all 13 category pages for that city

---

## Local SEO Tactics

### 1. Google Business Profile (Not applicable - we're a directory)

### 2. Local Citations & Backlinks

**Target Sites:**

- California Department of Corrections and Rehabilitation
- Local reentry nonprofits (Root & Rebound, Center for Employment Opportunities)
- Parole/probation department resource pages
- 211 directories
- City/county government websites
- Legal aid organizations

**Outreach Strategy:**

- Offer free data feed to 211 services
- Submit to reentry resource directories
- Partner with probation departments for official resource

### 3. Local Content

**Create City Guides:**

```
/guides/reentry-resources-oakland-ca
/guides/reentry-resources-san-francisco-ca
```

**Content includes:**

- Overview of reentry services in city
- Transportation info (how to get to resources)
- Success stories from that city
- Local statistics on reentry
- Embed map with all resources

---

## Monitoring & Metrics

### Key SEO Metrics

**Google Search Console:**

- Track impressions and clicks for target keywords
- Monitor ranking positions for hyperlocal pages
- Identify and fix crawl errors
- Track Core Web Vitals

**Target Keywords (by volume):**

1. "reentry resources oakland" (50-100/mo)
2. "employment resources oakland" (100-500/mo)
3. "housing assistance oakland" (500-1k/mo)
4. "find housing oakland" (1k-10k/mo)
5. "[category] near me" (location-based)

**KPIs:**

- 100+ hyperlocal pages indexed within 3 months
- 50+ keywords ranking in top 10
- 10+ featured snippets captured
- 30% of organic traffic from hyperlocal pages
- 5% month-over-month organic growth

### Tools

- Google Search Console (track rankings, clicks, impressions)
- Google Analytics 4 (track user behavior, conversions)
- Ahrefs or SEMrush (competitor analysis, backlink tracking)
- Screaming Frog (technical SEO audits)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Create `app/sitemap.ts` with all hyperlocal URLs
- [ ] Create `app/robots.ts`
- [ ] Add Open Graph images (1200×630 PNG)
- [ ] Enhance metadata on category and search pages
- [ ] Create `lib/data/cities.ts` with 100+ Bay Area cities

### Phase 2: Structured Data (Week 3-4)

- [ ] Implement LocalBusiness JSON-LD for resource detail pages
- [ ] Implement ItemList JSON-LD for search results
- [ ] Implement BreadcrumbList JSON-LD
- [ ] Add FAQ schema to landing pages

### Phase 3: Content & Landing Pages (Week 5-6)

- [ ] Generate hyperlocal page content templates
- [ ] Add statistics and local context to landing pages
- [ ] Create FAQ sections for featured snippets
- [ ] Build city landing pages (`/locations/[city]`)
- [ ] Implement internal linking strategy

### Phase 4: Optimization (Week 7-8)

- [ ] Optimize page load times (target < 2s FCP)
- [ ] Compress and optimize all images
- [ ] Implement lazy loading for resource cards
- [ ] Add breadcrumb UI components
- [ ] Test mobile-friendliness (Google Mobile-Friendly Test)

### Phase 5: Monitoring & Iteration (Ongoing)

- [ ] Set up Google Search Console
- [ ] Configure Google Analytics 4
- [ ] Create SEO dashboard (weekly reporting)
- [ ] Monitor Core Web Vitals
- [ ] A/B test metadata variations

---

## Resources & References

### Official Documentation

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Schema.org LocalBusiness](https://schema.org/LocalBusiness)

### Articles & Guides

- [Next.js SEO Guide](https://dminhvu.com/post/nextjs-seo) - Comprehensive guide we're following
- [Hyperlocal SEO Strategy](https://moz.com/blog/hyperlocal-seo)

### Tools

- [Google Search Console](https://search.google.com/search-console)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema Markup Validator](https://validator.schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)

---

## Notes

- **Image Formats:** Use PNG/JPG for Open Graph images (WebP not supported by all platforms)
- **Canonical URLs:** Always set to prevent duplicate content issues
- **Mobile-First:** Ensure all landing pages are mobile-optimized (critical for local search)
- **Page Speed:** Target 90+ Lighthouse score, < 2s FCP, < 2.5s LCP
- **Content Freshness:** Update "Last updated" dates when resources are modified

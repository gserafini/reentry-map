# Reentry Map - Testing Strategy

## Overview

This document outlines the testing approach for Reentry Map, covering unit tests,
integration tests, E2E tests, and manual testing procedures.

## Testing Philosophy

**Key Principles**:

1. Test user-facing behavior, not implementation details
2. Prioritize integration tests over unit tests
3. Manual testing for UX and accessibility
4. Performance testing for critical paths
5. Security testing for auth and data access

**Coverage Goals**:

- Critical paths: 100% coverage
- API routes: 90% coverage
- Components: 70% coverage
- Utils/helpers: 80% coverage

## Testing Stack

### Framework

- **Vitest 2.x**: Fast, modern test runner (Vite-native)
- **React Testing Library 16.x**: Component testing
- **Playwright**: E2E testing
- **MSW (Mock Service Worker)**: API mocking

### Installation

```bash
npm install -D vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
npm install -D @playwright/test
npm install -D msw
```

### Configuration Files

#### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.next/', 'coverage/', '**/*.config.*', '**/types/*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

#### vitest.setup.ts

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  },
  getDb: vi.fn(() => vi.fn()),
}))

// Mock NextAuth session
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Google Maps
global.google = {
  maps: {
    Map: vi.fn(),
    Marker: vi.fn(),
    InfoWindow: vi.fn(),
    LatLng: vi.fn(),
    // Add other Maps API mocks as needed
  },
} as any
```

#### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Unit Tests

### Testing Components

#### Example: ResourceCard.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceCard } from '@/components/resources/ResourceCard';

describe('ResourceCard', () => {
  const mockResource = {
    id: '123',
    name: 'Test Resource',
    description: 'A test resource',
    address: '123 Main St',
    phone: '(555) 123-4567',
    latitude: 37.8044,
    longitude: -122.2712,
    primary_category: 'employment',
    rating_average: 4.5,
    rating_count: 10
  };

  it('renders resource information', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('Test Resource')).toBeInTheDocument();
    expect(screen.getByText('A test resource')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('displays rating correctly', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(10 reviews)')).toBeInTheDocument();
  });

  it('calls onFavorite when favorite button clicked', async () => {
    const onFavorite = vi.fn();
    const user = userEvent.setup();

    render(<ResourceCard resource={mockResource} onFavorite={onFavorite} />);

    const favoriteButton = screen.getByRole('button', { name: /save/i });
    await user.click(favoriteButton);

    expect(onFavorite).toHaveBeenCalledWith('123');
  });

  it('displays distance when userLocation provided', () => {
    render(
      <ResourceCard
        resource={mockResource}
        userLocation={{ lat: 37.8000, lng: -122.2700 }}
      />
    );

    expect(screen.getByText(/mi$/)).toBeInTheDocument();
  });

  it('shows category badge', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('Employment')).toBeInTheDocument();
  });
});
```

### Testing Custom Hooks

#### Example: useResources.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useResources } from '@/lib/hooks/useResources'

// Mock the fetch API (hooks call API routes, not DB directly)
global.fetch = vi.fn()

describe('useResources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches resources successfully', async () => {
    const mockResources = [
      { id: '1', name: 'Resource 1', status: 'active' },
      { id: '2', name: 'Resource 2', status: 'active' },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResources),
    } as Response)

    const { result } = renderHook(() => useResources())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.resources).toEqual(mockResources)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    } as Response)

    const { result } = renderHook(() => useResources())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.resources).toEqual([])
    expect(result.current.error).toBeTruthy()
  })
})
```

### Testing Utility Functions

#### Example: distance.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { calculateDistance, formatDistance } from '@/lib/utils/distance'

describe('distance utilities', () => {
  describe('calculateDistance', () => {
    it('calculates distance between two points correctly', () => {
      const point1 = { lat: 37.8044, lng: -122.2712 } // Oakland
      const point2 = { lat: 37.7749, lng: -122.4194 } // San Francisco

      const distance = calculateDistance(point1, point2)

      // Expect approximately 10 miles
      expect(distance).toBeGreaterThan(9)
      expect(distance).toBeLessThan(11)
    })

    it('returns 0 for same location', () => {
      const point = { lat: 37.8044, lng: -122.2712 }

      const distance = calculateDistance(point, point)

      expect(distance).toBe(0)
    })
  })

  describe('formatDistance', () => {
    it('formats distance in miles', () => {
      expect(formatDistance(5.2)).toBe('5.2 mi')
      expect(formatDistance(0.5)).toBe('0.5 mi')
      expect(formatDistance(15.789)).toBe('15.8 mi')
    })

    it('handles zero distance', () => {
      expect(formatDistance(0)).toBe('0.0 mi')
    })
  })
})
```

## Integration Tests

### Testing API Routes

#### Example: resources.api.test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/resources/route'
import { NextRequest } from 'next/server'

describe('/api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('returns all active resources', async () => {
      const request = new NextRequest('http://localhost:3003/api/resources')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.every((r) => r.status === 'active')).toBe(true)
    })

    it('filters by category', async () => {
      const request = new NextRequest('http://localhost:3003/api/resources?category=employment')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.every((r) => r.primary_category === 'employment')).toBe(true)
    })

    it('handles search query', async () => {
      const request = new NextRequest('http://localhost:3003/api/resources?search=food')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.length).toBeGreaterThan(0)
    })
  })

  describe('POST', () => {
    it('creates new resource (admin only)', async () => {
      const resourceData = {
        name: 'New Resource',
        address: '123 Test St',
        latitude: 37.8044,
        longitude: -122.2712,
        primary_category: 'employment',
      }

      const request = new NextRequest('http://localhost:3003/api/resources', {
        method: 'POST',
        body: JSON.stringify(resourceData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Resource')
      expect(data.id).toBeDefined()
    })

    it('requires authentication', async () => {
      const request = new NextRequest('http://localhost:3003/api/resources', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost:3003/api/resources', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // Missing required fields
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
```

### Testing Database Queries

#### Example: resources.db.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

describe('resources database', () => {
  let testResourceId: string

  beforeEach(async () => {
    // Insert test data using Drizzle
    const [inserted] = await db
      .insert(resources)
      .values({
        name: 'Test Resource',
        address: '123 Test St',
        latitude: 37.8044,
        longitude: -122.2712,
        primary_category: 'employment',
        status: 'active',
      })
      .returning()

    testResourceId = inserted.id
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(resources).where(eq(resources.id, testResourceId))
  })

  it('fetches resource by id', async () => {
    const [data] = await db.select().from(resources).where(eq(resources.id, testResourceId))

    expect(data).toBeDefined()
    expect(data.name).toBe('Test Resource')
  })

  it('updates resource', async () => {
    await db
      .update(resources)
      .set({ name: 'Updated Resource' })
      .where(eq(resources.id, testResourceId))

    const [data] = await db
      .select({ name: resources.name })
      .from(resources)
      .where(eq(resources.id, testResourceId))

    expect(data.name).toBe('Updated Resource')
  })
})
```

## End-to-End Tests

### Testing User Flows

#### Example: search-resources.e2e.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Resource Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('searches for resources by keyword', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'employment')

    // Wait for results
    await page.waitForSelector('[data-testid="resource-card"]')

    // Verify results contain employment resources
    const cards = page.locator('[data-testid="resource-card"]')
    const count = await cards.count()

    expect(count).toBeGreaterThan(0)

    // Check first result contains "employment"
    const firstCard = cards.first()
    await expect(firstCard).toContainText(/employment/i)
  })

  test('filters by category', async ({ page }) => {
    // Click category filter
    await page.click('text=Employment')

    // Wait for filtered results
    await page.waitForSelector('[data-testid="resource-card"]')

    // Verify all results are employment category
    const badges = page.locator('[data-testid="category-badge"]')
    const count = await badges.count()

    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toHaveText('Employment')
    }
  })

  test('combines search and category filter', async ({ page }) => {
    // Enter search term
    await page.fill('input[placeholder*="Search"]', 'downtown')

    // Select category
    await page.click('text=Food')

    // Wait for results
    await page.waitForSelector('[data-testid="resource-card"]')

    // Verify results match both criteria
    const cards = page.locator('[data-testid="resource-card"]')
    await expect(cards.first()).toContainText(/downtown/i)

    const badge = cards.first().locator('[data-testid="category-badge"]')
    await expect(badge).toHaveText('Food')
  })

  test('clears filters', async ({ page }) => {
    // Apply filters
    await page.fill('input[placeholder*="Search"]', 'test')
    await page.click('text=Housing')

    // Click clear button
    await page.click('button:has-text("Clear filters")')

    // Verify search input is empty
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toHaveValue('')

    // Verify category filter is cleared
    const housingFilter = page.locator('button:has-text("Housing")')
    await expect(housingFilter).not.toHaveClass(/active/)
  })
})
```

#### Example: user-authentication.e2e.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Authentication', () => {
  test('signs in with phone number', async ({ page }) => {
    await page.goto('/')

    // Click sign in button
    await page.click('button:has-text("Sign In")')

    // Enter phone number
    await page.fill('input[type="tel"]', '5551234567')

    // Click send code
    await page.click('button:has-text("Send Code")')

    // Should show OTP input
    await expect(page.locator('input[placeholder*="6-digit"]')).toBeVisible()

    // In test mode, use test OTP: 123456
    await page.fill('input[placeholder*="6-digit"]', '123456')

    // Click verify
    await page.click('button:has-text("Verify")')

    // Should be signed in
    await expect(page.locator('text=Profile')).toBeVisible()
  })

  test('shows favorites after sign in', async ({ page }) => {
    // Sign in first
    await test.step('sign in', async () => {
      await page.goto('/')
      await page.click('button:has-text("Sign In")')
      await page.fill('input[type="tel"]', '5551234567')
      await page.click('button:has-text("Send Code")')
      await page.fill('input[placeholder*="6-digit"]', '123456')
      await page.click('button:has-text("Verify")')
    })

    // Navigate to favorites
    await page.click('text=Favorites')

    // Should show favorites page
    await expect(page).toHaveURL(/\/favorites/)
    await expect(page.locator('h1')).toHaveText('My Favorites')
  })

  test('requires auth for protected actions', async ({ page }) => {
    await page.goto('/resources/test-id')

    // Try to favorite without auth
    await page.click('button:has-text("Save")')

    // Should show sign in modal
    await expect(page.locator('text=Sign in to save favorites')).toBeVisible()
  })
})
```

#### Example: resource-detail.e2e.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Resource Detail Page', () => {
  test('displays complete resource information', async ({ page }) => {
    await page.goto('/resources/test-resource-id')

    // Check all sections are present
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Description')).toBeVisible()
    await expect(page.locator('text=Contact Information')).toBeVisible()
    await expect(page.locator('text=Hours')).toBeVisible()
    await expect(page.locator('text=Location')).toBeVisible()
    await expect(page.locator('[data-testid="map"]')).toBeVisible()
  })

  test('can call resource phone number', async ({ page }) => {
    await page.goto('/resources/test-resource-id')

    const callButton = page.locator('a[href^="tel:"]')
    await expect(callButton).toBeVisible()
    await expect(callButton).toHaveAttribute('href', /tel:\+1/)
  })

  test('can get directions', async ({ page }) => {
    await page.goto('/resources/test-resource-id')

    const directionsButton = page.locator('a:has-text("Get Directions")')
    await expect(directionsButton).toBeVisible()

    // Should open Google Maps
    await expect(directionsButton).toHaveAttribute('href', /google\.com\/maps/)
  })

  test('displays reviews', async ({ page }) => {
    await page.goto('/resources/test-resource-id')

    // Scroll to reviews section
    await page.locator('text=Reviews').scrollIntoViewIfNeeded()

    // Should show reviews
    const reviews = page.locator('[data-testid="review-card"]')
    expect(await reviews.count()).toBeGreaterThan(0)
  })

  test('can write a review when authenticated', async ({ page }) => {
    // Sign in first
    await test.step('sign in', async () => {
      await page.goto('/')
      await page.click('button:has-text("Sign In")')
      await page.fill('input[type="tel"]', '5551234567')
      await page.click('button:has-text("Send Code")')
      await page.fill('input[placeholder*="6-digit"]', '123456')
      await page.click('button:has-text("Verify")')
    })

    await page.goto('/resources/test-resource-id')

    // Click write review
    await page.click('button:has-text("Write a Review")')

    // Fill out review form
    await page.click('[data-testid="rating-star-5"]')
    await page.fill('textarea[placeholder*="experience"]', 'Great service!')
    await page.fill('textarea[placeholder*="tips"]', 'Go early in the morning.')

    // Submit review
    await page.click('button:has-text("Submit Review")')

    // Should show success message
    await expect(page.locator('text=Review submitted')).toBeVisible()
  })
})
```

## Performance Testing

### Lighthouse CI Configuration

#### lighthouserc.json

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run build && npm run start",
      "url": [
        "http://localhost:3003",
        "http://localhost:3003/resources",
        "http://localhost:3003/resources/test-id"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["warn", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Load Testing

#### Example: k6-load-test.js

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 50 }, // Spike to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failure rate
  },
}

const BASE_URL = 'https://reentrymap.org'

export default function () {
  // Test homepage
  let res = http.get(`${BASE_URL}/`)
  check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage loads fast': (r) => r.timings.duration < 1000,
  })
  sleep(1)

  // Test resource list
  res = http.get(`${BASE_URL}/api/resources`)
  check(res, {
    'resources API status 200': (r) => r.status === 200,
    'resources API fast': (r) => r.timings.duration < 500,
    'returns array': (r) => Array.isArray(JSON.parse(r.body)),
  })
  sleep(1)

  // Test search
  res = http.get(`${BASE_URL}/api/resources?search=food`)
  check(res, {
    'search API status 200': (r) => r.status === 200,
    'search API fast': (r) => r.timings.duration < 500,
  })
  sleep(2)
}
```

## Accessibility Testing

### Automated Checks

#### Example: accessibility.test.ts

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('homepage meets WCAG AA standards', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('resource detail page meets WCAG AA standards', async ({ page }) => {
    await page.goto('/resources/test-id')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/')

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    // Should be able to activate with Enter/Space
    await page.keyboard.press('Enter')
  })

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze()

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    )

    expect(contrastViolations).toEqual([])
  })
})
```

## Manual Testing Checklist

### Pre-Release Testing Checklist

#### Functionality

- [ ] All features work as specified in PRD
- [ ] Search returns relevant results
- [ ] Filters work correctly
- [ ] Map displays and updates correctly
- [ ] Authentication flow works
- [ ] Favorites save and load
- [ ] Ratings submit correctly
- [ ] Reviews display and submit
- [ ] Admin features work (if applicable)

#### Cross-Browser

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

#### Devices

- [ ] iPhone (latest)
- [ ] iPhone (2-3 years old)
- [ ] Android phone (latest)
- [ ] Android phone (2-3 years old)
- [ ] iPad
- [ ] Desktop 1920x1080
- [ ] Desktop 1366x768
- [ ] Small laptop 1280x720

#### Network Conditions

- [ ] Fast 4G (normal use case)
- [ ] Slow 3G (stress test)
- [ ] Offline (PWA functionality)
- [ ] Intermittent connection

#### Accessibility

- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces content correctly (VoiceOver/NVDA)
- [ ] Focus indicators visible
- [ ] Color contrast sufficient
- [ ] Text resizes to 200% without breaking layout
- [ ] All images have alt text
- [ ] Form errors announced to screen readers

#### Performance

- [ ] Lighthouse score > 90 (all categories)
- [ ] Page loads in < 3 seconds on 3G
- [ ] No layout shift (CLS < 0.1)
- [ ] Smooth scrolling and animations
- [ ] Map loads quickly with 100+ markers

#### Security

- [ ] Cannot access other users' data
- [ ] Admin features hidden from non-admins
- [ ] Authentication required where appropriate
- [ ] No exposed API keys in client code
- [ ] SQL injection prevented
- [ ] XSS prevented

#### Edge Cases

- [ ] Very long resource names display correctly
- [ ] Resources with no reviews display appropriately
- [ ] Empty search results show helpful message
- [ ] Location permission denied handled gracefully
- [ ] Network errors show clear messages
- [ ] Form validation works for all edge cases

#### User Experience

- [ ] Clear error messages (no technical jargon)
- [ ] Loading states prevent confusion
- [ ] Success feedback for actions
- [ ] Buttons have clear labels
- [ ] Navigation is intuitive
- [ ] Mobile UX feels native

#### Content

- [ ] All text free of typos
- [ ] Resource information accurate
- [ ] Categories make sense
- [ ] Help text is helpful
- [ ] Privacy policy accurate
- [ ] Contact information correct

### Bug Severity Classification

**Critical (P0)** - Fix immediately, blocks launch

- App crashes or is completely unusable
- Data loss or corruption
- Security vulnerability
- Authentication completely broken
- No resources display

**High (P1)** - Fix before launch

- Feature doesn't work as specified
- Significant UX issue
- Performance issue affecting all users
- Accessibility violation (WCAG A/AA)
- Error that affects > 10% of users

**Medium (P2)** - Fix soon after launch

- Minor feature issue
- Cosmetic issue
- Performance issue in edge case
- Affects < 10% of users
- Workaround available

**Low (P3)** - Fix when time permits

- Minor cosmetic issue
- Nice-to-have feature
- Affects very few users
- Easy workaround available

## Continuous Integration

### GitHub Actions Workflow

#### .github/workflows/test.yml

```yaml
name: Test

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Build application
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Test Data Management

### Creating Test Data

#### scripts/seed-test-data.ts

```typescript
import { db } from '@/lib/db'
import { resources, resourceReviews } from '@/lib/db/schema'
import { ilike } from 'drizzle-orm'

async function seedTestData() {
  console.log('Seeding test data...')

  // Clear existing test data
  await db.delete(resources).where(ilike(resources.name, 'Test%'))

  // Create test resources
  const inserted = await db
    .insert(resources)
    .values([
      {
        name: 'Test Employment Center',
        address: '123 Test St, Oakland, CA 94612',
        latitude: 37.8044,
        longitude: -122.2712,
        phone: '(555) 123-4567',
        primary_category: 'employment',
        categories: ['employment'],
        description: 'Test employment services',
        status: 'active',
      },
      {
        name: 'Test Housing Services',
        address: '456 Test Ave, Oakland, CA 94601',
        latitude: 37.785,
        longitude: -122.2364,
        phone: '(555) 234-5678',
        primary_category: 'housing',
        categories: ['housing'],
        description: 'Test housing services',
        status: 'active',
      },
    ])
    .returning()

  console.log(`Created ${inserted.length} test resources`)
  console.log('Test data seeded successfully!')
}

seedTestData()
```

### Cleaning Up Test Data

#### scripts/cleanup-test-data.ts

```typescript
import { db } from '@/lib/db'
import { resources, resourceReviews, users } from '@/lib/db/schema'
import { ilike } from 'drizzle-orm'

async function cleanupTestData() {
  console.log('Cleaning up test data...')

  await db.delete(resourceReviews).where(ilike(resourceReviews.reviewText, '%test%'))
  await db.delete(resources).where(ilike(resources.name, 'Test%'))

  console.log('Test data cleaned up!')
}

cleanupTestData()
```

## Package.json Scripts

Add these to your package.json:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:unit && npm run test:e2e",
    "test:watch": "vitest watch",
    "test:seed": "tsx scripts/seed-test-data.ts",
    "test:cleanup": "tsx scripts/cleanup-test-data.ts",
    "lighthouse": "lhci autorun"
  }
}
```

## Testing Best Practices

### General Principles

1. **Test behavior, not implementation**
   - Focus on what users see and do
   - Don't test internal state or methods
   - Test the outcome, not the process

2. **Write maintainable tests**
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Keep tests simple and focused
   - Avoid test interdependence

3. **Balance speed and coverage**
   - Unit tests: Fast, many
   - Integration tests: Medium speed, moderate
   - E2E tests: Slow, few but critical

4. **Test edge cases**
   - Empty states
   - Maximum values
   - Invalid input
   - Network errors
   - Permission denied

### What to Test

✅ **Do Test**:

- User interactions and flows
- API endpoints
- Data validation
- Error handling
- Accessibility
- Performance
- Security

❌ **Don't Test**:

- Third-party libraries
- Framework internals
- Obvious code (getters/setters)
- Implementation details

### Test Naming Convention

```typescript
// Good: Describes behavior
test('displays error when resource not found', async () => {})

// Bad: Describes implementation
test('sets error state to true', async () => {})

// Good: User perspective
test('user can favorite a resource after signing in', async () => {})

// Bad: Technical perspective
test('favoriteResource function is called', async () => {})
```

## Debugging Failed Tests

### Common Issues and Solutions

**Issue**: Tests fail locally but pass in CI

- **Solution**: Check for timing issues, use proper waitFor
- **Solution**: Ensure test data is seeded consistently
- **Solution**: Check environment variables

**Issue**: Flaky tests (pass/fail intermittently)

- **Solution**: Add proper waits instead of arbitrary timeouts
- **Solution**: Mock time-dependent functions
- **Solution**: Isolate tests properly (no shared state)

**Issue**: Tests are too slow

- **Solution**: Use unit tests instead of E2E where possible
- **Solution**: Mock external API calls
- **Solution**: Run tests in parallel
- **Solution**: Use test database with less data

**Issue**: Hard to maintain tests

- **Solution**: Create test utilities and helpers
- **Solution**: Use page object pattern for E2E
- **Solution**: Extract common setup to fixtures

## Reporting

### Coverage Reports

Generate and view coverage:

```bash
npm run test:unit
open coverage/index.html
```

### E2E Test Reports

Generate and view Playwright reports:

```bash
npm run test:e2e
npx playwright show-report
```

### Lighthouse Reports

Generate and view Lighthouse reports:

```bash
npm run lighthouse
open .lighthouseci/
```

## Pre-Deployment Testing

Before deploying to production:

1. **Run full test suite**

```bash
   npm run test:all
```

2. **Check test coverage**
   - Aim for 70%+ overall coverage
   - 90%+ for critical paths

3. **Run Lighthouse audit**
   - All scores > 90
   - No critical accessibility issues

4. **Manual smoke test**
   - Test critical user flows
   - Test on real devices
   - Test on slow network

5. **Security scan**
   - No exposed secrets
   - Dependencies up to date
   - No known vulnerabilities

## Post-Deployment Monitoring

After deployment:

1. **Monitor error rates**
   - Check PM2 logs on dc3-1 (`pm2 logs reentry-map-prod`)
   - Set up alerts for spikes

2. **Monitor performance**
   - Real user monitoring (RUM)
   - Core Web Vitals

3. **User feedback**
   - Monitor support tickets
   - Check user reviews
   - Analyze user behavior

## Conclusion

Testing is continuous:

- Write tests as you build features
- Run tests before committing
- Review test failures carefully
- Update tests as features evolve
- Monitor production for issues

Good testing = confident deployments = happy users! ✅

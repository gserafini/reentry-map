# Test Users for Development

This document describes the test users available for local development and testing.

## Available Test Users

### Regular User (Non-Admin)

- **Email:** `testuser@example.com`
- **Password:** `TestUser123!`
- **Name:** Test User
- **Admin:** No

Use this account for testing regular user features like:

- Viewing resources
- Saving favorites
- Writing reviews
- Editing profile

### Admin User

- **Email:** `admin@example.com`
- **Password:** `AdminUser123!`
- **Name:** Admin User
- **Admin:** Yes

Use this account for testing admin features like:

- Resource management
- User moderation
- Admin dashboard
- Approval workflows

## How to Seed Test Users

The test users are **NOT** included in migrations to prevent them from being pushed to production. Instead, they must be manually seeded in development environments only.

### Option 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the file `supabase/seed_test_users_dev.sql`
4. Copy the entire contents
5. Paste into SQL Editor and run

### Option 2: Using Supabase MCP (if available)

The test users should already be seeded if you're following along with the development session.

## Security Notes

⚠️ **IMPORTANT:**

- These test users are for **development/staging only**
- Never run `seed_test_users_dev.sql` in production
- The file is tracked in git for team convenience but clearly marked as dev-only
- Test user IDs use all-zeros UUIDs to make them easily identifiable

## Using Test Users in E2E Tests

We provide reusable authentication helpers for Playwright tests:

```typescript
import { loginAsTestUser, logout, TEST_USERS } from '@/e2e/helpers/auth'

test('regular user can view profile', async ({ page }) => {
  // Log in as regular user
  await loginAsTestUser(page, 'regular')

  // Navigate to profile
  await page.goto('/profile')

  // Assert profile is visible
  await expect(page.locator('text=Test User')).toBeVisible()
})

test('admin user can access admin dashboard', async ({ page }) => {
  // Log in as admin
  await loginAsTestUser(page, 'admin')

  // Navigate to admin dashboard
  await page.goto('/admin')

  // Assert admin content is visible
  await expect(page.locator('text=Admin Dashboard')).toBeVisible()
})
```

## Checking Console Errors on Protected Routes

Use the provided script to check for console errors on authenticated routes:

```bash
node scripts/check-profile-with-login.mjs
```

This script:

- Logs in as testuser@example.com
- Navigates to /profile
- Captures all console logs and errors
- Reports any network failures
- Exits with error code if issues found

Perfect for CI/CD pipelines or pre-commit checks!

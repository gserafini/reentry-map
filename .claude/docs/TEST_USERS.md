# Test Users for Development

This document describes the test users available for local development and testing.

## Available Test Users

### Regular User (Non-Admin)

- **Email:** `testuser@example.com`
- **Password:** set `E2E_USER_PASSWORD` (not kept in the repository)
- **Name:** Test User
- **Admin:** No

Use this account for testing regular user features like:

- Viewing resources
- Saving favorites
- Writing reviews
- Editing profile

### Admin User

- **Email:** `admin@example.com`
- **Password:** set `E2E_ADMIN_PASSWORD` (not kept in the repository)
- **Name:** Admin User
- **Admin:** Yes

Use this account for testing admin features like:

- Resource management
- User moderation
- Admin dashboard
- Approval workflows

## Creating Test Users

Create them only in a development or staging database, with a password you choose and keep
outside the repository. Hash it with bcrypt (cost 12, as the app does), then insert the row:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.env.E2E_ADMIN_PASSWORD, 12))"
psql -d <dev-or-staging-db> -c "INSERT INTO users (email, name, password_hash, is_admin) VALUES ('admin@example.com', 'Admin User', '<hash>', true)"
```

## Security Notes

⚠️ **IMPORTANT:**

- These test users are for **development/staging only**
- Never create them in production. Until November 2026 production held a copy of the admin
  account whose password was published in this repository; it has been disabled.
- Passwords live outside the repository; the old published ones no longer work anywhere.
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
E2E_USER_PASSWORD=... node scripts/check-profile-with-login.mjs
```

This script:

- Logs in as testuser@example.com
- Navigates to /profile
- Captures all console logs and errors
- Reports any network failures
- Exits with error code if issues found

Perfect for CI/CD pipelines or pre-commit checks!

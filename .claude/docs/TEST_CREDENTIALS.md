# Test User Credentials

Test accounts available in the database for E2E testing and manual verification.

## Admin Users

### Test Admin (Primary)

- **Email**: `admin@example.com`
- **Password**: Available in Supabase Auth dashboard
- **User ID**: `00000000-0000-0000-0000-000000000002`
- **Features**: Full admin access, all dashboard features
- **Usage**: E2E tests, manual admin testing

### Production Admin

- **Email**: `gserafini@gmail.com`
- **User ID**: `c57554f1-fe58-47f9-bcbe-8f0c98b38c6a`
- **Status**: ✅ Admin privileges confirmed
- **Name**: Gabriel Serafini
- **Phone**: 4156405984

## Regular Users

### Test User (Primary)

- **Email**: `testuser@example.com`
- **Password**: Available in Supabase Auth dashboard
- **User ID**: `00000000-0000-0000-0000-000000000001`
- **Features**: Regular user, no admin access
- **Usage**: E2E tests, regular user flows

## Creating Test Users for E2E

Test users are automatically created by E2E test setup. See `e2e/helpers/auth.ts`.

## Verifying Test Users

```sql
-- List all users with admin status
SELECT
  u.id,
  au.email,
  u.first_name,
  u.last_name,
  u.is_admin,
  u.created_at
FROM users u
LEFT JOIN auth.users au ON au.id = u.id
ORDER BY u.created_at;
```

## Security Notes

- Test users have fake/example emails
- Production passwords should never be committed to code
- E2E tests use Playwright's authentication storage
- Service role key required for admin operations in tests

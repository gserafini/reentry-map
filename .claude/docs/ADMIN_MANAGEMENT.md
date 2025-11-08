# Admin User Management

This document describes how to manage admin users in the Reentry Map application.

## Admin Dashboard - User Management

Admins can manage all users via the web interface at `/admin/users`:

- **View all users** with email, name, phone, role, and join date
- **Search users** by name or email
- **Edit users** - update name, phone, and admin status
- **Promote to admin** - toggle admin privileges with confirmation warning
- **Delete users** - remove users from the system (with confirmation)

All operations are protected by Row Level Security (RLS) policies that verify admin status.

## Promoting Users to Admin (Web Interface)

1. Navigate to **Admin Dashboard** → **Users** (`/admin/users`)
2. Find the user you want to promote
3. Click the **Edit** icon (pencil)
4. Toggle **Admin Privileges** switch ON
5. Review the warning message
6. Click **Save Changes**

The user will immediately have admin access and see the "Admin Dashboard" option in their user menu.

## Promoting Users to Admin (SQL Method)

### Method 1: SQL Query (Recommended)

1. **Find the user's ID in Supabase Dashboard:**
   - Go to Authentication → Users
   - Find the user and copy their UUID
   - OR run in SQL Editor:
     ```sql
     SELECT id, email FROM auth.users WHERE email = 'user@example.com';
     ```

2. **Promote to admin:**

   ```sql
   UPDATE users
   SET is_admin = TRUE
   WHERE id = 'USER_UUID_HERE';
   ```

3. **Verify:**
   ```sql
   SELECT u.id, au.email, u.first_name, u.last_name, u.is_admin
   FROM users u
   JOIN auth.users au ON au.id = u.id
   WHERE u.id = 'USER_UUID_HERE';
   ```

### Method 2: MCP Tool (Claude Code)

If using Claude Code with Supabase MCP:

```typescript
// Find user
const result = await mcp__supabase__execute_sql({
  project_id: 'YOUR_PROJECT_ID',
  query: "SELECT id, email FROM auth.users WHERE email = 'user@example.com';",
})

// Promote to admin
await mcp__supabase__execute_sql({
  project_id: 'YOUR_PROJECT_ID',
  query: `
    UPDATE users
    SET is_admin = TRUE
    WHERE id = 'USER_UUID_HERE';
  `,
})
```

## Admin Features

Admin users have access to:

- **Admin Dashboard** (`/admin`) - Overview and quick actions
- **Resource Management** (`/admin/resources`) - CRUD operations for resources
- **Settings** (`/admin/settings`) - Configure SMS authentication and app settings
- **User Management** (`/admin/users`) - Coming soon
- **Review Moderation** (`/admin/reviews`) - Coming soon
- **Resource Suggestions** (`/admin/suggestions`) - Coming soon

## Admin Navigation

Admins see an "Admin Dashboard" menu item in their user dropdown (top-right avatar).

## Revoking Admin Access

To remove admin privileges:

```sql
UPDATE users
SET is_admin = FALSE
WHERE id = 'USER_UUID_HERE';
```

## List All Admins

To view all current admins:

```sql
SELECT u.id, au.email, u.first_name, u.last_name, u.is_admin, u.created_at
FROM users u
JOIN auth.users au ON au.id = u.id
WHERE u.is_admin = TRUE
ORDER BY u.created_at;
```

## Security Notes

- Admin status is controlled by the `is_admin` column in the `users` table
- Row Level Security (RLS) policies protect admin-only operations
- Only admins can access `/admin/*` routes (enforced in `app/admin/layout.tsx`)
- Only admins can update `app_settings` table (enforced by RLS policy)
- There is no "first admin bootstrap" system - first admin must be created manually via SQL

## Future: Environment-Based Bootstrap

For automated admin creation during initial setup, you could add to `lib/env.ts`:

```typescript
// Server-only
ADMIN_BOOTSTRAP_EMAILS: z.string().optional(),
```

Then create a migration or server action that checks `ADMIN_BOOTSTRAP_EMAILS` and promotes those users automatically on first signup. This is not currently implemented.

## Current Admins

As of 2025-10-29:

- Gabriel Serafini (gserafini@gmail.com) - Project owner

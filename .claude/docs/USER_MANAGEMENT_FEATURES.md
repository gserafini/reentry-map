# User Management Features

Complete CRUD operations for managing users in the admin dashboard.

## Overview

Admins can now fully manage users through the web interface at `/admin/users`, including viewing, editing, promoting to admin, and deleting users.

## Features Implemented

### 1. User List View

- **Table display** with sortable columns
- **Real-time search** by name or email
- **Visual role indicators** (admin icon vs. regular user icon)
- **Status chips** showing admin vs. regular user
- **Join date** display
- **Quick action buttons** for edit and delete

### 2. User Editing

- **Modal dialog** for inline editing
- **Editable fields:**
  - First Name
  - Last Name
  - Phone
  - Admin Privileges (toggle switch)
- **Admin promotion warning** when toggling admin on
- **Real-time validation**
- **Optimistic UI updates**

### 3. Admin Promotion

- **One-click toggle** via switch in edit dialog
- **Warning message** explaining admin permissions
- **Immediate effect** - user sees admin menu after next login/refresh
- **Secure** - protected by RLS policies

### 4. User Deletion

- **Confirmation dialog** before deletion
- **Soft delete ready** (can be extended to set inactive flag instead)
- **Cascade handling** - respects foreign key constraints

## Technical Implementation

### Database Components

**RLS Policies** (`supabase/migrations/*_admin_user_management_policies.sql`):

```sql
-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users FOR SELECT ...

-- Admins can update any user (including admin promotion)
CREATE POLICY "Admins can update any user" ON users FOR UPDATE ...

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users FOR DELETE ...
```

**Database Function** (`admin_get_users_with_emails()`):

- Efficiently fetches all users with their email addresses
- Uses `SECURITY DEFINER` to access `auth.users` table
- Returns combined data from `public.users` and `auth.users`
- Protected by admin check at runtime

### Frontend Components

**[app/admin/users/page.tsx](../../app/admin/users/page.tsx)**:

- Main user management interface
- Uses `supabase.rpc('admin_get_users_with_emails')` for data fetching
- Material UI components for consistency
- Client-side search and filtering
- Inline edit dialog with form validation

**[app/api/admin/users/route.ts](../../app/api/admin/users/route.ts)**:

- API endpoint for user operations
- GET: Fetch all users
- PATCH: Update user details
- Protected by admin authentication checks

## Security

✅ **Row Level Security (RLS)** - All operations require admin privileges
✅ **Runtime checks** - Database function verifies admin status
✅ **Client validation** - Forms validate input before submission
✅ **Confirmation dialogs** - Destructive actions require confirmation
✅ **Audit trail ready** - Can be extended with logging

## Usage

### Viewing Users

1. Navigate to `/admin/users`
2. View all registered users in table format
3. Use search bar to filter by name or email

### Promoting a User to Admin

1. Click the **Edit** icon (pencil) next to the user
2. Toggle **Admin Privileges** switch to ON
3. Review the warning message
4. Click **Save Changes**
5. User will see admin menu on next page refresh

### Editing User Details

1. Click the **Edit** icon next to the user
2. Modify first name, last name, or phone
3. Click **Save Changes**

### Deleting a User

1. Click the **Delete** icon (trash) next to the user
2. Confirm deletion in the dialog
3. User is removed from the system

## Future Enhancements

- [ ] Bulk operations (promote multiple users, bulk delete)
- [ ] User activity logs (last login, last action)
- [ ] Email verification status
- [ ] Account status (active, suspended, banned)
- [ ] Password reset functionality
- [ ] User role system (beyond binary admin/user)
- [ ] Export user list to CSV
- [ ] Advanced filtering (by join date, admin status, etc.)

## Related Documentation

- [ADMIN_MANAGEMENT.md](./ADMIN_MANAGEMENT.md) - General admin management guide
- [Database Schema](../../TECHNICAL_ARCHITECTURE.md#user-profile-features) - User table structure
- [RLS Policies](../../supabase/migrations/) - Security implementation

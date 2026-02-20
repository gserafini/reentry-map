# Reentry Map - Setup Guide

This guide will walk you through setting up the Reentry Map development environment
step-by-step.

## Prerequisites

Before you begin, ensure you have:

- Node.js 20.x or later ([download](https://nodejs.org))
- npm 10.x or pnpm 9.x
- Git ([download](https://git-scm.com))
- A code editor (VS Code recommended)
- Access to the self-hosted PostgreSQL database on dc3-1 (or a local PostgreSQL instance)
- A Google Cloud account for Maps API ([sign up](https://console.cloud.google.com))

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/gserafini/reentry-map.git
cd reentry-map

# Install dependencies
npm install
```

## Step 2: Configure Environment Variables

```bash
# Copy environment variables template
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# ============================================================================
# REQUIRED FOR DEVELOPMENT
# ============================================================================

# PostgreSQL connection (self-hosted on dc3-1)
DATABASE_URL=postgresql://reentrymap:yourpassword@dc3-1.serafinihosting.com:5432/reentry_map
DIRECT_DATABASE_URL=postgresql://reentrymap:yourpassword@dc3-1.serafinihosting.com:5432/reentry_map

# NextAuth.js configuration
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-generated-secret

# ============================================================================
# OPTIONAL (Can add later when needed)
# ============================================================================

# Google Maps (for map display and geocoding)
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...your-maps-key
# GOOGLE_MAPS_KEY=AIza...your-maps-key

# Anthropic (for AI verification agents)
# ANTHROPIC_API_KEY=sk-ant-...your-key

# Twilio (for phone OTP authentication)
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# App URL (auto-detects localhost:3003 in development)
# NEXT_PUBLIC_APP_URL=http://localhost:3003
```

### Environment Variable Validation

This project uses [T3 Env](https://env.t3.gg) for type-safe, validated environment variables:

**Benefits**:

- Catches missing or invalid env vars at build time (not runtime)
- TypeScript autocomplete for all env vars
- Prevents accidental exposure of server-only secrets to the client
- Clear error messages when something is misconfigured

**How it works**:

- All env vars are defined in `lib/env.ts` with Zod validation schemas
- Import env vars from `@/lib/env` instead of using `process.env` directly
- Build will fail with helpful error if required vars are missing

**Example usage**:

```typescript
// Don't do this:
const url = process.env.DATABASE_URL

// Do this instead:
import { env } from '@/lib/env'
const url = env.DATABASE_URL // Type-safe, validated
```

**Required vs Optional**:

- `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` are required
- All others are optional and only needed for specific features
- See `.env.example` for complete list and when each is needed

## Step 3: Set Up Database

The database uses PostgreSQL with Drizzle ORM. Migrations are in `lib/db/migrations/`.

If setting up a fresh database:

```bash
# Run migrations (applies schema from lib/db/migrations/)
npx tsx lib/db/migrate.ts
```

The migrations create:

- `resources` - Primary resource directory (76 columns)
- `users` - User profiles with admin flags
- `user_favorites`, `resource_ratings`, `resource_reviews` - User interactions
- `resource_suggestions`, `resource_updates` - Community contributions
- `ai_agent_logs`, `verification_events` - AI agent tracking
- `expansion_priorities`, `county_data`, `coverage_metrics` - Growth tracking

## Step 4: Configure Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: "Reentry Map"
3. Enable APIs:
   - Go to APIs & Services > Library
   - Enable "Maps JavaScript API"
   - Enable "Geocoding API"
   - Enable "Places API"

4. Create API credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - Click "Edit API key"
   - Under "API restrictions", select "Restrict key"
   - Check: Maps JavaScript API, Geocoding API, Places API
   - Under "Application restrictions", select "HTTP referrers"
   - Add: `localhost:3003/*` and your production domain
   - Save

## Step 5: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) in your browser.

You should see the Reentry Map home page with the map and search interface.

## Step 6: Create Admin User

1. Sign up through the app using your phone number
2. Verify with OTP code
3. Connect to the database and promote your user:

```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

4. Refresh the app - you should now see "Admin" in navigation

## Step 7: Verify Installation

Test each feature:

- [ ] Home page loads with map
- [ ] Search bar works
- [ ] Can browse resources
- [ ] Can view resource details
- [ ] Can click "Get Directions" (opens Google Maps)
- [ ] Can sign in with phone number
- [ ] Can favorite a resource (after sign in)
- [ ] Can write a review (after sign in)
- [ ] Admin dashboard accessible (if admin)

## Step 8: Optional - Install Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Troubleshooting

### Database Connection Fails

- Verify `DATABASE_URL` is correct and accessible
- Check that PostgreSQL is running on the target server
- Verify network connectivity (VPN/firewall may block dc3-1)

### Map Doesn't Load

- Verify Google Maps API key is correct
- Check API is enabled in Google Cloud Console
- Check browser console for errors
- Verify HTTP referrer restrictions allow localhost

### Authentication Fails

- Verify `NEXTAUTH_SECRET` is set and at least 16 characters
- Check `NEXTAUTH_URL` matches your dev server URL
- For phone OTP: verify Twilio credentials are correct
- Check you have Twilio SMS credits

### AI Agents Fail

- Verify Anthropic API key is correct
- Check you have API credits
- Check Anthropic API status

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall
- Check Node.js version is 20.x+
- Check all dependencies installed

## Next Steps

Now that your environment is set up:

1. Read through the codebase structure in `TECHNICAL_ARCHITECTURE.md`
2. Review the PRD in `PRODUCT_REQUIREMENTS.md`
3. Start building features following the `DEVELOPMENT_PLAN.md`
4. Test thoroughly using `TESTING_STRATEGY.md`

## Getting Help

- Check existing issues: [GitHub Issues](https://github.com/gserafini/reentry-map/issues)
- Read documentation in `/docs` folder
- Contact: gserafini@gmail.com

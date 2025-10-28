# GeoIP Location Setup

This app uses [geoip-lite](https://www.npmjs.com/package/geoip-lite) to provide automatic location detection based on the user's IP address without requiring browser permission.

## How It Works

1. **No Permission Required**: GeoIP provides approximate location based on IP without requesting browser permissions
2. **Localhost Fallback**: Returns `null` for localhost/private IPs (development mode)
3. **Smart Prioritization**: GeoIP location is lowest priority:
   - **Highest**: Manual location (user-selected address)
   - **Medium**: Geolocation API (browser permission)
   - **Lowest**: GeoIP (automatic, no permission)
4. **Caching**: Locations are cached in localStorage for 2 minutes

## Files

- **`lib/utils/geoip.ts`** - Core GeoIP utilities
  - `getLocationFromIP(ip)` - Get coordinates from IP
  - `getClientIP(headers)` - Extract IP from request headers
- **`app/api/location/ip/route.ts`** - API endpoint serving GeoIP data
- **`lib/hooks/useLocation.ts`** - Integration with location hook (source: 'geoip')

## Updating the GeoIP Database

The GeoIP database should be updated monthly to ensure accurate location data.

### Manual Update

```bash
npm run geoip:update
```

### Automated Update (Recommended)

Set up a monthly cron job on your production server:

```bash
# Open crontab editor
crontab -e

# Add this line to run on the 1st of every month at 2 AM
0 2 1 * * cd /path/to/reentry-map && npm run geoip:update >> /var/log/geoip-update.log 2>&1
```

Replace `/path/to/reentry-map` with your actual project path.

### Vercel / Production Hosting

If hosting on Vercel or similar platforms where cron jobs aren't available, you can:

1. **Use Vercel Cron Jobs** (Pro plan):

   ```json
   // vercel.json
   {
     "crons": [
       {
         "path": "/api/cron/geoip-update",
         "schedule": "0 2 1 * *"
       }
     ]
   }
   ```

2. **External Cron Service**: Use a service like cron-job.org or EasyCron to hit an API endpoint monthly

3. **Manual Updates**: Set a calendar reminder to run `npm run geoip:update` locally and redeploy

## Testing

- **Local Development**: GeoIP returns `null` for localhost (expected behavior)
- **Production**: Test with a deployed version to see actual IP-based location
- **Force Test**: Use a VPN or proxy to test different geographic locations

## Privacy

- No user data is stored
- IP addresses are not logged
- GeoIP database is stored locally (not sent to third parties)
- Location is approximate (city-level, not precise)

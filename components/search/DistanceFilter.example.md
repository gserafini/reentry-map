# DistanceFilter Component - Usage Example

## Overview

The DistanceFilter component provides a Material UI slider for filtering resources by distance from the user's location. It's designed to work seamlessly with the location context and URL search parameters.

## Basic Usage

```tsx
'use client'

import { DistanceFilter } from '@/components/search/DistanceFilter'
import { useUserLocation } from '@/lib/context/LocationContext'

export function SearchFilters() {
  const { coordinates } = useUserLocation()

  return (
    <div>
      {/* Only shows when user has location */}
      <DistanceFilter hasLocation={!!coordinates} defaultDistance={25} />
    </div>
  )
}
```

## Integration in Search Page Sidebar

Here's how to integrate the DistanceFilter into the CategoryFilter sidebar:

```tsx
// app/search/page.tsx or components/search/SearchSidebar.tsx
'use client'

import { Box, Divider } from '@mui/material'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { DistanceFilter } from '@/components/search/DistanceFilter'
import { useUserLocation } from '@/lib/context/LocationContext'

export function SearchSidebar({ categoryCounts }) {
  const { coordinates } = useUserLocation()

  return (
    <Box>
      {/* Distance Filter - appears above categories when location available */}
      {coordinates && (
        <>
          <DistanceFilter hasLocation={!!coordinates} defaultDistance={25} />
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Category Filter */}
      <CategoryFilter categoryCounts={categoryCounts} />
    </Box>
  )
}
```

## Complete Example with Near Me Button

```tsx
'use client'

import { Box, Stack, Divider } from '@mui/material'
import { NearMeButton } from '@/components/search/NearMeButton'
import { DistanceFilter } from '@/components/search/DistanceFilter'
import { CategoryFilter } from '@/components/search/CategoryFilter'
import { SortDropdown } from '@/components/search/SortDropdown'
import { useUserLocation } from '@/lib/context/LocationContext'

export function SearchControls({ categoryCounts }) {
  const { coordinates } = useUserLocation()

  return (
    <Stack spacing={2}>
      {/* Location Controls */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <NearMeButton />
        <SortDropdown showDistanceSort={!!coordinates} />
      </Box>

      {/* Distance Filter - only shows when location available */}
      {coordinates && (
        <>
          <DistanceFilter hasLocation={!!coordinates} defaultDistance={25} />
          <Divider />
        </>
      )}

      {/* Category Filter */}
      <CategoryFilter categoryCounts={categoryCounts} />
    </Stack>
  )
}
```

## Props

```typescript
interface DistanceFilterProps {
  /**
   * Whether user location is available (shows/hides component)
   */
  hasLocation: boolean

  /**
   * Default distance in miles
   * @default 25
   */
  defaultDistance?: number
}
```

## Features

1. **URL Synchronization**: Automatically updates `?distance=X` URL parameter
2. **localStorage Persistence**: Saves user's preferred distance
3. **Debouncing**: URL updates are debounced (500ms) to prevent excessive navigation
4. **Clear Filter**: Button to remove distance filter and reset to default
5. **Responsive Design**: Works on all screen sizes (mobile-first)
6. **Accessibility**: Full keyboard navigation and ARIA labels

## URL Parameters

The component reads/writes the following URL parameter:

- `distance` - Distance in miles (1-50)

Example URLs:

- `/search?distance=15` - Show resources within 15 miles
- `/search?distance=25&category=housing` - 25 miles + housing category
- `/search?q=food&distance=10` - Search with distance filter

## localStorage

The component uses the following localStorage key:

- `preferredDistance` - User's preferred distance filter

## Styling

The component uses Material UI's theming system and will automatically adapt to your app's theme. The slider uses the primary color for the track.

## Testing

The component includes comprehensive tests covering:

- Rendering with/without location
- URL parameter synchronization
- localStorage persistence
- Filter clearing
- Input validation
- Edge cases

Run tests:

```bash
npm run test:run -- __tests__/components/search/DistanceFilter.test.tsx
```

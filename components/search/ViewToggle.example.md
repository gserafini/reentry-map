# ViewToggle Component

A Material UI-based toggle component for switching between list and map views of resources.

## Features

- Material UI ToggleButtonGroup with two buttons (List, Map)
- Icons from @mui/icons-material (ViewList, Map)
- Updates URL search param `view=list` or `view=map`
- Saves preference to localStorage key `preferredView`
- Priority: URL param > localStorage > defaultView
- Preserves all other search params when toggling
- Responsive design (smaller buttons on mobile)
- Exclusive selection (only one active at a time)
- Keyboard accessible

## Usage

### Basic Usage

```tsx
import { ViewToggle } from '@/components/search/ViewToggle'

export default function ResourcesPage() {
  return (
    <div>
      <ViewToggle />
      {/* Your resource list or map component */}
    </div>
  )
}
```

### With Callback

```tsx
import { ViewToggle } from '@/components/search/ViewToggle'
import { useState } from 'react'

export default function ResourcesPage() {
  const [view, setView] = useState<'list' | 'map'>('list')

  return (
    <div>
      <ViewToggle
        defaultView="list"
        onViewChange={(newView) => {
          console.log('View changed to:', newView)
          setView(newView)
        }}
      />

      {view === 'list' ? <ResourceList /> : <ResourceMap />}
    </div>
  )
}
```

### With Custom Default

```tsx
<ViewToggle defaultView="map" />
```

## Props

| Prop           | Type                              | Default  | Description                                          |
| -------------- | --------------------------------- | -------- | ---------------------------------------------------- |
| `defaultView`  | `'list' \| 'map'`                 | `'list'` | Default view when no URL param or localStorage value |
| `onViewChange` | `(view: 'list' \| 'map') => void` | -        | Optional callback when view changes                  |

## URL Parameters

The component reads and writes the `view` URL parameter:

- `?view=list` - List view
- `?view=map` - Map view
- No parameter - Uses localStorage or defaultView

### Example URLs

```
/resources
/resources?view=map
/resources?q=housing&view=list
/resources?category=housing&sort=distance&view=map
```

## localStorage

The component persists the user's preference in localStorage:

- Key: `preferredView`
- Value: `'list'` or `'map'`

## Priority Order

When determining which view to show:

1. **URL parameter** - Takes highest priority
2. **localStorage** - Used if no URL parameter
3. **defaultView prop** - Used if no URL parameter or localStorage

## Styling

The component uses Material UI theming and is responsive:

- **Mobile** (`<600px`): Small size buttons with smaller icons and padding
- **Desktop** (`≥600px`): Medium size buttons with standard icons and padding

### Customizing Styles

You can wrap the component and apply custom styles:

```tsx
<Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
  <ViewToggle />
</Box>
```

## Accessibility

- Proper ARIA labels: `aria-label="view toggle"`, `aria-label="list view"`, `aria-label="map view"`
- Keyboard navigable with Tab and Enter keys
- Material UI's built-in focus indicators
- Screen reader compatible

## Integration Example

Here's a complete example showing integration with resource listing:

```tsx
'use client'

import { ViewToggle, type ViewType } from '@/components/search/ViewToggle'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceMap } from '@/components/resources/ResourceMap'
import { useState } from 'react'
import { Box, Container } from '@mui/material'

export default function ResourcesPage() {
  const [currentView, setCurrentView] = useState<ViewType>('list')

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ViewToggle defaultView="list" onViewChange={setCurrentView} />
      </Box>

      {currentView === 'list' ? (
        <ResourceList resources={resources} />
      ) : (
        <ResourceMap resources={resources} />
      )}
    </Container>
  )
}
```

## Testing

The component has comprehensive tests covering:

- Rendering both buttons
- Toggle functionality
- URL parameter updates
- localStorage persistence
- Priority order (URL > localStorage > default)
- Preserving other search params
- Callback execution
- Accessibility
- Keyboard navigation
- Responsive design

See `__tests__/components/search/ViewToggle.test.tsx` for all test cases.

# Progress Report: 2026-02-26 - Category pages default to distance sort

## Session Summary

Added LocationUrlSync component and updated category page to sort by distance (nearest first) by default when user location is available, instead of alphabetical A-Z.

## What Was Done

- Created LocationUrlSync component to sync user location to URL params
- Updated category page to accept lat/lng/distance params and pass to getResources
- Category page now defaults to distance-asc sort when location available
- SortDropdown shows distance option on category pages with location

## Next Steps

1. [ ] Apply LocationUrlSync to /tag/[tag] and other listing pages for consistent distance sorting
2. [ ] Consider auto-expanding radius when 0 results found within distance (like search page does)

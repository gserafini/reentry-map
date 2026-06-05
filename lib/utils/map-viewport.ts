export interface MapViewportBounds {
  north: number
  south: number
  east: number
  west: number
}

function roundCoord(value: number, precision = 6): number {
  return Number(value.toFixed(precision))
}

export function normalizeViewportBounds(bounds: MapViewportBounds): MapViewportBounds {
  return {
    north: roundCoord(bounds.north),
    south: roundCoord(bounds.south),
    east: roundCoord(bounds.east),
    west: roundCoord(bounds.west),
  }
}

export function parseViewportBounds(
  params:
    | URLSearchParams
    | {
        get: (key: string) => string | null
      }
): MapViewportBounds | null {
  const north = params.get('north')
  const south = params.get('south')
  const east = params.get('east')
  const west = params.get('west')

  if (!north || !south || !east || !west) {
    return null
  }

  const parsed = {
    north: parseFloat(north),
    south: parseFloat(south),
    east: parseFloat(east),
    west: parseFloat(west),
  }

  if (
    !Number.isFinite(parsed.north) ||
    !Number.isFinite(parsed.south) ||
    !Number.isFinite(parsed.east) ||
    !Number.isFinite(parsed.west)
  ) {
    return null
  }

  return parsed
}

export function buildViewportUrl(
  pathname: string,
  existingSearchParams:
    | URLSearchParams
    | {
        toString: () => string
      },
  bounds: MapViewportBounds,
  locationName: string = 'Map view'
): string {
  const params = new URLSearchParams(existingSearchParams.toString())
  const normalized = normalizeViewportBounds(bounds)

  params.set('north', normalized.north.toString())
  params.set('south', normalized.south.toString())
  params.set('east', normalized.east.toString())
  params.set('west', normalized.west.toString())
  params.set('locationName', locationName)

  params.delete('lat')
  params.delete('lng')
  params.delete('distance')
  params.delete('page')

  if (params.get('sort') === 'distance-asc') {
    params.delete('sort')
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

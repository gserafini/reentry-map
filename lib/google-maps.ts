// Singleton state for Google Maps libraries
let placesLibrary: google.maps.PlacesLibrary | null = null
let geocodingLibrary: google.maps.GeocodingLibrary | null = null
let mapsLibrary: google.maps.MapsLibrary | null = null
let markerLibrary: google.maps.MarkerLibrary | null = null
let initializationPromise: Promise<void> | null = null
let scriptLoaded = false

/**
 * Load Google Maps script tag directly into the page
 * This ensures the API key is properly embedded in the script URL
 */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (scriptLoaded) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      scriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding,marker&v=weekly&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      scriptLoaded = true
      resolve()
    }

    script.onerror = (error) => {
      console.error('[google-maps] Error loading script:', error)
      scriptLoaded = false
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })
}

/**
 * Initialize Google Maps API with API key (call once)
 * Subsequent calls will reuse the same initialization
 */
export async function initializeGoogleMaps(): Promise<{
  places: google.maps.PlacesLibrary
  geocoding: google.maps.GeocodingLibrary
  maps: google.maps.MapsLibrary
  marker: google.maps.MarkerLibrary
}> {
  // Use process.env directly - NEXT_PUBLIC_ vars are replaced at build time
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  if (!apiKey) {
    const error = new Error('Google Maps API key not configured in environment variables')
    console.error(error.message)
    throw error
  }

  // If already initialized, return cached libraries
  if (placesLibrary && geocodingLibrary && mapsLibrary && markerLibrary) {
    return {
      places: placesLibrary,
      geocoding: geocodingLibrary,
      maps: mapsLibrary,
      marker: markerLibrary,
    }
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await initializationPromise
    return {
      places: placesLibrary!,
      geocoding: geocodingLibrary!,
      maps: mapsLibrary!,
      marker: markerLibrary!,
    }
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Load the script first
      await loadGoogleMapsScript(apiKey)

      // Wait for google.maps and google.maps.importLibrary to be available
      let attempts = 0
      while ((!window.google?.maps || !google.maps.importLibrary) && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        attempts++
      }

      if (!window.google?.maps) {
        throw new Error('Google Maps failed to load after script injection')
      }

      if (!google.maps.importLibrary) {
        throw new Error(
          'Google Maps importLibrary function not available. API may not be loaded with loading=async parameter.'
        )
      }

      // Now load individual libraries using google.maps.importLibrary
      const [placesLib, geocodingLib, mapsLib, markerLib] = await Promise.all([
        google.maps.importLibrary('places'),
        google.maps.importLibrary('geocoding'),
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
      ])

      placesLibrary = placesLib as google.maps.PlacesLibrary
      geocodingLibrary = geocodingLib as google.maps.GeocodingLibrary
      mapsLibrary = mapsLib as google.maps.MapsLibrary
      markerLibrary = markerLib as google.maps.MarkerLibrary
    } catch (error) {
      console.error('[google-maps] Error loading Google Maps libraries:', error)
      initializationPromise = null // Allow retry
      scriptLoaded = false
      throw error
    }
  })()

  await initializationPromise
  return {
    places: placesLibrary!,
    geocoding: geocodingLibrary!,
    maps: mapsLibrary!,
    marker: markerLibrary!,
  }
}

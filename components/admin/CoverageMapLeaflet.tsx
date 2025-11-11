'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CountyData, CoverageMetrics } from './CoverageMap'

// Fix for default marker icons in Leaflet with Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface CoverageMapLeafletProps {
  counties: CountyData[]
  metrics: Record<string, CoverageMetrics>
  viewMode: 'coverage' | 'resources' | 'priority'
  onCountyClick?: (fips: string) => void
}

export default function CoverageMapLeaflet({
  counties,
  metrics,
  viewMode,
  onCountyClick,
}: CoverageMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map centered on US
    const map = L.map(mapRef.current).setView([37.8, -96], 4)

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      minZoom: 3,
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update map when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !counties.length) return

    const map = mapInstanceRef.current

    // Remove existing layers (except base tiles)
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    // Render choropleth - county polygons colored by coverage score
    counties.forEach((county) => {
      if (!county.geometry) return

      const metric = metrics[county.fips_code]
      const coverageScore = metric?.coverage_score || 0
      const color = getColor(coverageScore, viewMode)

      // Create GeoJSON layer for this county
      const geoJsonLayer = L.geoJSON(county.geometry as GeoJSON.Geometry, {
        style: {
          fillColor: color,
          fillOpacity: 0.7,
          color: '#ffffff',
          weight: 1,
          opacity: 0.5,
        },
        onEachFeature: (_feature, layer) => {
          // Popup content
          const popupContent = `
            <div class="p-2">
              <h3 class="font-bold">${county.county_name}, ${county.state_code}</h3>
              <p class="text-sm">Coverage Score: ${coverageScore.toFixed(1)}%</p>
              ${
                metric
                  ? `
                <p class="text-sm">Resources: ${metric.total_resources}</p>
                <p class="text-sm">Categories: ${metric.categories_covered}/13</p>
                ${metric.verified_resources > 0 ? `<p class="text-sm">Verified: ${metric.verified_resources}</p>` : ''}
              `
                  : '<p class="text-sm text-gray-500">No resources yet</p>'
              }
            </div>
          `

          layer.bindPopup(popupContent)

          // Hover effects
          layer.on({
            mouseover: (e) => {
              const target = e.target
              target.setStyle({
                fillOpacity: 0.9,
                weight: 2,
                opacity: 1,
              })
              target.bringToFront()
            },
            mouseout: (e) => {
              const target = e.target
              target.setStyle({
                fillOpacity: 0.7,
                weight: 1,
                opacity: 0.5,
              })
            },
            click: () => {
              if (onCountyClick) {
                onCountyClick(county.fips_code)
              }
            },
          })
        },
      })

      geoJsonLayer.addTo(map)
    })
  }, [counties, metrics, viewMode, onCountyClick])

  return (
    <div
      ref={mapRef}
      className="h-[600px] w-full rounded-md"
      style={{ minHeight: '600px' }}
      aria-label="Coverage map showing resource distribution across counties"
    />
  )
}

function getColor(score: number, _viewMode: string): string {
  // Color scheme for coverage scores - light green to dark green gradient
  // viewMode parameter reserved for future use (different color schemes per view mode)
  if (score >= 90) return '#14532d' // Green-900 - Darkest green (Excellent)
  if (score >= 70) return '#15803d' // Green-700 - Dark green (Good)
  if (score >= 50) return '#22c55e' // Green-500 - Medium green (Fair)
  if (score >= 30) return '#4ade80' // Green-400 - Light medium green (Poor)
  if (score > 0) return '#86efac' // Green-300 - Light green (Minimal)
  return '#d1d5db' // Gray-300 - No data
}

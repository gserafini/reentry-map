'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CountyData, CoverageMetrics } from './CoverageMap'

// Fix for default marker icons in Leaflet with Next.js
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

export default function CoverageMapLeaflet({ counties, metrics, viewMode, onCountyClick }: CoverageMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map centered on US
    const map = L.map(mapRef.current).setView([37.8, -96], 4)

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    // TODO: In production, load actual county GeoJSON and render choropleth
    // For now, add markers for counties with coverage
    Object.entries(metrics).forEach(([fips, metric]) => {
      const county = counties.find((c) => c.fips_code === fips)

      if (!county || !county.center_lat || !county.center_lng) return

      const color = getColor(metric.coverage_score, viewMode)
      const marker = L.circleMarker([county.center_lat, county.center_lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })

      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold">${metric.geography_name}</h3>
          <p class="text-sm">Coverage Score: ${metric.coverage_score.toFixed(1)}%</p>
          <p class="text-sm">Resources: ${metric.total_resources}</p>
          <p class="text-sm">Categories: ${metric.categories_covered}/13</p>
          ${metric.unique_resources > 0 ? `<p class="text-sm text-green-600">Unique: ${metric.unique_resources}</p>` : ''}
        </div>
      `)

      marker.on('click', () => {
        if (onCountyClick) {
          onCountyClick(fips)
        }
      })

      marker.addTo(map)
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

function getColor(score: number, viewMode: string): string {
  // Color scheme for coverage scores
  if (score >= 90) return '#065f46' // Emerald-700 - Excellent
  if (score >= 70) return '#10b981' // Emerald-500 - Good
  if (score >= 50) return '#fbbf24' // Yellow-400 - Fair
  if (score >= 30) return '#f59e0b' // Orange-500 - Poor
  if (score > 0) return '#dc2626' // Red-600 - Minimal
  return '#d1d5db' // Gray-300 - None
}

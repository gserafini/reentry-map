import { renderToStaticMarkup } from 'react-dom/server'
import { getCategoryIcon, getCategoryColor } from './category-icons'
import type { ResourceCategory } from '@/lib/types/database'

/**
 * Create a custom HTML marker element with category icon
 * Returns an HTML element that can be used with AdvancedMarkerElement
 */
export function createCategoryMarkerElement(
  category: ResourceCategory,
  options?: {
    size?: number
    selected?: boolean
  }
): HTMLElement {
  const { size = 40, selected = false } = options || {}

  const Icon = getCategoryIcon(category)
  const color = getCategoryColor(category)

  // Create container element
  const markerDiv = document.createElement('div')
  markerDiv.style.width = `${size}px`
  markerDiv.style.height = `${size}px`
  markerDiv.style.borderRadius = '50%'
  markerDiv.style.backgroundColor = color
  markerDiv.style.border = selected ? '3px solid white' : '2px solid white'
  markerDiv.style.boxShadow = selected ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)'
  markerDiv.style.display = 'flex'
  markerDiv.style.alignItems = 'center'
  markerDiv.style.justifyContent = 'center'
  markerDiv.style.cursor = 'pointer'
  markerDiv.style.transition = 'transform 0.2s, box-shadow 0.2s'

  // Add hover effect
  markerDiv.addEventListener('mouseenter', () => {
    markerDiv.style.transform = 'scale(1.1)'
    markerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
  })
  markerDiv.addEventListener('mouseleave', () => {
    markerDiv.style.transform = 'scale(1)'
    markerDiv.style.boxShadow = selected
      ? '0 4px 12px rgba(0,0,0,0.4)'
      : '0 2px 6px rgba(0,0,0,0.3)'
  })

  // Render icon as SVG string
  const iconSvg = renderToStaticMarkup(<Icon style={{ fontSize: size * 0.6, color: 'white' }} />)

  // Create a container for the SVG
  const iconContainer = document.createElement('div')
  iconContainer.innerHTML = iconSvg
  iconContainer.style.display = 'flex'
  iconContainer.style.alignItems = 'center'
  iconContainer.style.justifyContent = 'center'
  iconContainer.style.width = '100%'
  iconContainer.style.height = '100%'

  markerDiv.appendChild(iconContainer)

  return markerDiv
}

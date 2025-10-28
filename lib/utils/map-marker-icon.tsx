import { renderToStaticMarkup } from 'react-dom/server'
import { getCategoryIcon, getCategoryColor } from './category-icons'
import type { ResourceCategory } from '@/lib/types/database'

/**
 * Create a custom pin-shaped marker element with category icon
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

  // Create container element for the entire pin
  const pinContainer = document.createElement('div')
  pinContainer.style.position = 'relative'
  pinContainer.style.width = `${size}px`
  pinContainer.style.height = `${size * 1.5}px` // Pin is taller than wide
  pinContainer.style.cursor = 'pointer'
  pinContainer.style.transition = 'transform 0.2s, filter 0.2s'
  pinContainer.style.transform = 'translate(-50%, -100%)' // Center horizontally, anchor at bottom

  // Create SVG pin shape
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 40 60')
  svg.setAttribute('width', `${size}`)
  svg.setAttribute('height', `${size * 1.5}`)
  svg.style.filter = selected
    ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

  // Create pin path (teardrop shape)
  const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  pinPath.setAttribute(
    'd',
    'M20 0 C8.954 0 0 8.954 0 20 C0 20 0 25 5 35 C10 45 15 55 20 60 C25 55 30 45 35 35 C40 25 40 20 40 20 C40 8.954 31.046 0 20 0 Z'
  )
  pinPath.setAttribute('fill', color)
  pinPath.setAttribute('stroke', 'white')
  pinPath.setAttribute('stroke-width', selected ? '2.5' : '2')

  svg.appendChild(pinPath)

  // Render category icon as SVG string
  const iconSvg = renderToStaticMarkup(<Icon style={{ fontSize: size * 0.5, color: 'white' }} />)

  // Create icon container positioned in the circular part of the pin
  const iconContainer = document.createElement('div')
  iconContainer.innerHTML = iconSvg
  iconContainer.style.position = 'absolute'
  iconContainer.style.top = `${size * 0.25}px`
  iconContainer.style.left = '50%'
  iconContainer.style.transform = 'translate(-50%, -50%)'
  iconContainer.style.display = 'flex'
  iconContainer.style.alignItems = 'center'
  iconContainer.style.justifyContent = 'center'
  iconContainer.style.pointerEvents = 'none'

  // Add hover effects
  pinContainer.addEventListener('mouseenter', () => {
    pinContainer.style.transform = 'translate(-50%, -100%) scale(1.1)'
    svg.style.filter = 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))'
  })
  pinContainer.addEventListener('mouseleave', () => {
    pinContainer.style.transform = 'translate(-50%, -100%) scale(1)'
    svg.style.filter = selected
      ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
  })

  // Assemble the pin
  pinContainer.appendChild(svg)
  pinContainer.appendChild(iconContainer)

  return pinContainer
}

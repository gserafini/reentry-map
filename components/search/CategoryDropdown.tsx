'use client'

import { MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { useRouter } from 'next/navigation'
import { getAllCategories, getCategoryLabel } from '@/lib/utils/categories'
import { getCategoryIcon } from '@/lib/utils/category-icons'
import type { ResourceCategory } from '@/lib/types/database'

interface CategoryDropdownProps {
  onHover?: (text: string) => void
  onSelect?: (category: string) => void
  onClose?: () => void
}

/**
 * Category dropdown for \u201CWhat" search box
 * Shows main resource categories
 */
export function CategoryDropdown({ onHover, onSelect, onClose }: CategoryDropdownProps) {
  const router = useRouter()
  const categories = getAllCategories()

  const handleCategoryClick = (category: ResourceCategory) => {
    const label = getCategoryLabel(category)
    onSelect?.(label)
    onClose?.()
    // Navigate to category page
    router.push(`/resources/category/${category}`)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: '-20px',
        right: '-20px',
        zIndex: 1300,
        marginTop: '8px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        maxHeight: '350px',
        overflowY: 'auto',
      }}
    >
      {categories.slice(0, 8).map((category) => {
        const Icon = getCategoryIcon(category)
        const label = getCategoryLabel(category)

        return (
          <MenuItem
            key={category}
            onClick={() => handleCategoryClick(category)}
            onMouseEnter={() => onHover?.(label)}
            sx={{
              py: 1.5,
              px: 2,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                sx: { color: 'text.primary', fontSize: '0.95rem', fontWeight: 500 },
              }}
            />
          </MenuItem>
        )
      })}
    </div>
  )
}

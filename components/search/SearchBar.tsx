'use client'

import React, { useState, useEffect } from 'react'
import { Input, Button } from '@heroui/react'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search resources...',
}: SearchBarProps) {
  const [query, setQuery] = useState<string>(value)

  useEffect(() => {
    const t = setTimeout(() => onChange?.(query), 300)
    return () => clearTimeout(t)
  }, [query, onChange])

  return (
    <div className="flex items-center gap-2" role="search">
      <Input
        aria-label="Search resources"
        placeholder={placeholder}
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      />
      {query && (
        <Button size="sm" variant="flat" onClick={() => setQuery('')} aria-label="Clear search">
          Clear
        </Button>
      )}
    </div>
  )
}

export default SearchBar

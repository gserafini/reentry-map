/**
 * Test script for Drizzle-based resources API
 * Run with: npx tsx scripts/test-resources-drizzle.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  console.log('Testing Drizzle resources API...')
  console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')

  // Import after env is loaded
  const { getResources, getResourceById, getResourcesNear, getResourceCount, getCategoryCounts } =
    await import('../lib/api/resources')

  // Test 1: Get resource count
  console.log('\n1. Testing getResourceCount...')
  const countResult = await getResourceCount()
  if (countResult.error) {
    console.error('  Error:', countResult.error.message)
  } else {
    console.log('  Active resources:', countResult.data)
  }

  // Test 2: Get resources (no filters)
  console.log('\n2. Testing getResources (limit 5)...')
  const resourcesResult = await getResources({ limit: 5 })
  if (resourcesResult.error) {
    console.error('  Error:', resourcesResult.error.message)
  } else {
    console.log('  Returned:', resourcesResult.data?.length, 'resources')
    resourcesResult.data?.forEach((r) => {
      console.log(`    - ${r.name} (${r.city})`)
    })
  }

  // Test 3: Get resources by city
  console.log('\n3. Testing getResources (city=Oakland)...')
  const oaklandResult = await getResources({ city: 'Oakland', limit: 3 })
  if (oaklandResult.error) {
    console.error('  Error:', oaklandResult.error.message)
  } else {
    console.log('  Oakland resources:', oaklandResult.data?.length)
    oaklandResult.data?.forEach((r) => {
      console.log(`    - ${r.name}`)
    })
  }

  // Test 4: Search resources
  console.log('\n4. Testing getResources (search="food")...')
  const searchResult = await getResources({ search: 'food', limit: 3 })
  if (searchResult.error) {
    console.error('  Error:', searchResult.error.message)
  } else {
    console.log('  Food search results:', searchResult.data?.length)
    searchResult.data?.forEach((r) => {
      console.log(`    - ${r.name}`)
    })
  }

  // Test 5: Get resource by ID
  console.log('\n5. Testing getResourceById...')
  if (resourcesResult.data && resourcesResult.data.length > 0) {
    const firstId = resourcesResult.data[0].id
    const byIdResult = await getResourceById(firstId)
    if (byIdResult.error) {
      console.error('  Error:', byIdResult.error.message)
    } else {
      console.log('  Found:', byIdResult.data?.name)
    }
  }

  // Test 6: Get resources near Oakland (37.8044, -122.2712)
  console.log('\n6. Testing getResourcesNear (Oakland area)...')
  const nearResult = await getResourcesNear(37.8044, -122.2712, 5)
  if (nearResult.error) {
    console.error('  Error:', nearResult.error.message)
  } else {
    console.log('  Nearby resources (5 mile radius):', nearResult.data?.length)
    nearResult.data?.slice(0, 3).forEach((r) => {
      console.log(`    - ${r.name}: ${r.distance?.toFixed(2)} miles`)
    })
  }

  // Test 7: Get category counts
  console.log('\n7. Testing getCategoryCounts...')
  const categoryResult = await getCategoryCounts()
  if (categoryResult.error) {
    console.error('  Error:', categoryResult.error.message)
  } else {
    console.log('  Category distribution:')
    const sortedCategories = Object.entries(categoryResult.data || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    sortedCategories.forEach(([cat, count]) => {
      console.log(`    - ${cat}: ${count}`)
    })
  }

  console.log('\n✅ All tests completed!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  parseOldSearchUrl,
  parseOldResourceUrl,
  parseCityStateSlug,
  generateCityUrl,
  generateCategoryInCityUrl,
  generateResourceUrl,
  generateShortResourceUrl,
  generateResourceSlug,
} from '@/lib/utils/urls'
import { env } from '@/lib/env'
import type { ResourceCategory } from '@/lib/types/database'

/**
 * Proxy for URL redirects and authentication
 * Handles:
 * - Legacy URL redirects (301 permanent)
 * - Old city-state format redirects
 * - Supabase session management
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle legacy /search/ URLs
  if (pathname.startsWith('/search/')) {
    const parsed = parseOldSearchUrl(pathname)
    if (parsed) {
      const { category, city, state } = parsed
      // Redirect to new category in city URL
      const newUrl = generateCategoryInCityUrl(city, state, category as ResourceCategory)
      return NextResponse.redirect(new URL(newUrl, request.url), 301)
    }
  }

  // Handle legacy /resources/ URLs
  if (pathname.startsWith('/resources/')) {
    const parsed = parseOldResourceUrl(pathname)
    if (parsed?.id) {
      // Look up resource to get proper URL
      const resource = await fetchResourceById(parsed.id, request)
      if (resource && resource.city && resource.state) {
        const newUrl = generateResourceUrl(resource)
        return NextResponse.redirect(new URL(newUrl, request.url), 301)
      }
      // Fallback to short URL if resource has no location
      const shortUrl = generateShortResourceUrl(parsed.id)
      return NextResponse.redirect(new URL(shortUrl, request.url), 301)
    }
  }

  // Handle old city-state format URLs
  // Pattern: /oakland-ca -> /ca/oakland
  // Pattern: /oakland-ca/employment -> /ca/oakland/category/employment
  // Pattern: /oakland-ca/resource-name -> /ca/oakland/resource-name
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length >= 1 && parts.length <= 3) {
    const firstPart = parts[0]
    // Check if it matches city-state pattern (ends with -xx where xx is 2 letters)
    if (/^.+-[a-z]{2}$/i.test(firstPart)) {
      const parsed = parseCityStateSlug(firstPart)
      if (parsed) {
        const { city, state } = parsed

        if (parts.length === 1) {
          // City hub: /oakland-ca -> /ca/oakland
          const newUrl = generateCityUrl(city, state)
          return NextResponse.redirect(new URL(newUrl, request.url), 301)
        } else if (parts.length === 2) {
          // Could be category or resource
          const secondPart = parts[1]

          // Try to look up as resource first
          const resource = await fetchResourceBySlug(city, state, secondPart, request)

          if (resource) {
            // It's a resource: /oakland-ca/resource-slug -> /ca/oakland/resource-slug
            const newUrl = generateResourceUrl(resource)
            return NextResponse.redirect(new URL(newUrl, request.url), 301)
          } else {
            // Assume it's a category: /oakland-ca/employment -> /ca/oakland/category/employment
            const newUrl = `/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/category/${secondPart}`
            return NextResponse.redirect(new URL(newUrl, request.url), 301)
          }
        }
      }
    }
  }

  // Continue with Supabase session management
  return await updateSession(request)
}

/**
 * Fetch resource by ID for redirects
 */
async function fetchResourceById(id: string, request: NextRequest) {
  try {
    const response = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data } = await supabase
      .from('resources')
      .select('id, name, city, state')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    return data
  } catch (error) {
    console.error('Error fetching resource for redirect:', error)
    return null
  }
}

/**
 * Fetch resource by slug for redirects
 */
async function fetchResourceBySlug(
  city: string,
  state: string,
  slug: string,
  request: NextRequest
) {
  try {
    const response = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: resources } = await supabase
      .from('resources')
      .select('id, name, city, state')
      .eq('city', city)
      .eq('state', state)
      .eq('status', 'active')

    if (!resources) return null

    // Find resource matching the slug
    const resource = resources.find((r) => generateResourceSlug(r.name) === slug.toLowerCase())

    return resource
  } catch (error) {
    console.error('Error fetching resource by slug for redirect:', error)
    return null
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

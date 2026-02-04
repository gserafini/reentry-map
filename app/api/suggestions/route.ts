import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { submitSuggestion, getUserSuggestions, getPendingSuggestions } from '@/lib/api/suggestions'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import type { ResourceSuggestionInsert } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'pending') {
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }
    const result = await getPendingSuggestions()
    return NextResponse.json(result)
  }

  if (type === 'user') {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const result = await getUserSuggestions(session.user.id)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const suggestion = (await request.json()) as ResourceSuggestionInsert
    const result = await submitSuggestion(suggestion)
    return NextResponse.json(result, { status: result.error ? 500 : 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Failed to submit suggestion' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import {
  submitUpdate,
  getPendingUpdates,
  getUserUpdates,
  getResourceUpdates,
} from '@/lib/api/updates'
import { checkAdminAuth } from '@/lib/utils/admin-auth'

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
    const result = await getPendingUpdates()
    return NextResponse.json(result)
  }

  if (type === 'user') {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const result = await getUserUpdates(session.user.id)
    return NextResponse.json(result)
  }

  const resourceId = searchParams.get('resourceId')
  if (resourceId) {
    const result = await getResourceUpdates(resourceId)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Missing type or resourceId parameter' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as {
      resource_id: string
      reported_by?: string
      update_type: string
      old_value?: string
      new_value?: string
      description?: string
      status?: string
    }
    const result = await submitUpdate(update)
    return NextResponse.json(result, { status: result.error ? 500 : 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Failed to submit update' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { updateUpdateStatus } from '@/lib/api/updates'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.error === 'Not authenticated' ? 401 : 403 }
    )
  }

  const { id } = await params
  const body = (await request.json()) as {
    status: 'pending' | 'applied' | 'rejected'
    adminNotes?: string
  }
  const result = await updateUpdateStatus(id, body.status, body.adminNotes)
  return NextResponse.json(result)
}

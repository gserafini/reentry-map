import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { updateAppSettings } from '@/lib/api/settings'

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request)
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.error === 'Not authenticated' ? 401 : 403 }
    )
  }

  try {
    const updates = (await request.json()) as Partial<
      Omit<import('@/lib/types/settings').AppSettings, 'id' | 'created_at' | 'updated_at'>
    >
    const result = await updateAppSettings(updates)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

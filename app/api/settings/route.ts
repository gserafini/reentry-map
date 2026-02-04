import { NextResponse } from 'next/server'
import { getAppSettings, getFeatureFlags, getAISystemStatus } from '@/lib/api/settings'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    if (type === 'flags') {
      const flags = await getFeatureFlags()
      return NextResponse.json(flags)
    }
    if (type === 'ai-status') {
      const status = await getAISystemStatus()
      return NextResponse.json(status)
    }
    // Default: full settings
    const settings = await getAppSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

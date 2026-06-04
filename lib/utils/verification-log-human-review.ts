import { desc, eq } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { verificationLogs } from '@/lib/db/schema'

export async function markVerificationLogHumanReview({
  suggestionId,
  reviewerId,
  decision,
  notes,
}: {
  suggestionId: string
  reviewerId?: string | null
  decision: string
  notes?: string | null
}): Promise<boolean> {
  const [latestLog] = await db
    .select({ id: verificationLogs.id })
    .from(verificationLogs)
    .where(eq(verificationLogs.suggestionId, suggestionId))
    .orderBy(desc(verificationLogs.createdAt))
    .limit(1)

  if (!latestLog) {
    return false
  }

  try {
    const updateData: {
      humanReviewed: boolean
      humanReviewerId: string | null
      humanDecision: string
      humanNotes?: string | null
    } = {
      humanReviewed: true,
      humanReviewerId: reviewerId || null,
      humanDecision: decision,
    }

    if (notes !== undefined) {
      updateData.humanNotes = notes
    }

    await db.update(verificationLogs).set(updateData).where(eq(verificationLogs.id, latestLog.id))
    return true
  } catch (error) {
    console.warn('Failed to mark verification log human review:', {
      suggestionId,
      decision,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

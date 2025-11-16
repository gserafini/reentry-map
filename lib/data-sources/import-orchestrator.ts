/**
 * Import Orchestrator - Coordinates large-scale data imports
 */

import { createClient } from '@/lib/supabase/server'
import { FieldMapper } from './field-mapper'
import { geocodeAddress } from '@/lib/utils/batch-geocoding'
import type {
  ImportJobConfig,
  ImportProgress,
  NormalizedResource,
  DataImportJob,
  BatchSuggestionResponse,
} from './types'

export class ImportOrchestrator {
  private jobId: string | null = null
  private mapper: FieldMapper
  private supabase = createClient()
  private batchSize: number
  private config: ImportJobConfig

  constructor(config: ImportJobConfig) {
    this.config = config
    this.mapper = new FieldMapper(config.sourceName)
    this.batchSize = config.batchSize || 50
  }

  /**
   * Create import job in database
   */
  async createJob(totalRecords: number): Promise<string> {
    const { data, error } = await this.supabase
      .from('data_import_jobs')
      .insert({
        source_name: this.config.sourceName,
        source_url: this.config.sourceUrl,
        source_description: this.config.sourceDescription,
        status: 'pending',
        total_records: totalRecords,
        metadata: {
          filters: this.config.filters,
          verification_level: this.config.verificationLevel || this.mapper.getVerificationLevel(),
          batch_size: this.batchSize,
          skip_geocoding: this.config.skipGeocoding,
        },
      })
      .select('id')
      .single()

    if (error) throw error
    this.jobId = data.id
    return data.id
  }

  /**
   * Get current job details
   */
  async getJobDetails(): Promise<DataImportJob | null> {
    if (!this.jobId) return null

    const { data, error } = await this.supabase
      .from('data_import_jobs')
      .select('*')
      .eq('id', this.jobId)
      .single()

    if (error) {
      console.error('Error fetching job details:', error)
      return null
    }

    return data
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  ): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completed_at = new Date().toISOString()
    } else if (status === 'running') {
      updates.started_at = new Date().toISOString()
    }

    await this.supabase.from('data_import_jobs').update(updates).eq('id', this.jobId)
  }

  /**
   * Update job progress (triggers will auto-calculate from records)
   */
  async updateProgress(progress: Partial<ImportProgress>): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    await this.supabase
      .from('data_import_jobs')
      .update({
        ...progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.jobId)
  }

  /**
   * Store a record in data_import_records
   */
  private async storeRecord(
    raw: Record<string, unknown>,
    normalized: NormalizedResource,
    status: 'pending' | 'processing' | 'error' = 'pending'
  ): Promise<string> {
    if (!this.jobId) throw new Error('Job not created')

    const { data, error} = await this.supabase
      .from('data_import_records')
      .insert({
        job_id: this.jobId,
        source_id: normalized.source.id,
        source_url: normalized.source.url,
        raw_data: raw,
        normalized_data: normalized,
        status,
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  /**
   * Update record status and results
   */
  private async updateRecord(
    recordId: string,
    updates: {
      status?: string
      resource_id?: string
      suggestion_id?: string
      verification_score?: number
      verification_level?: string
      verification_decision?: string
      verification_reason?: string
      error_message?: string
      geocoded_address?: string
      geocoding_success?: boolean
      processing_time_ms?: number
    }
  ): Promise<void> {
    await this.supabase
      .from('data_import_records')
      .update({
        ...updates,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)
  }

  /**
   * Process a batch of raw records
   */
  async processBatch(rawRecords: Record<string, unknown>[]): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    const normalized: NormalizedResource[] = []
    const recordIds: string[] = []

    console.log(`Processing batch of ${rawRecords.length} records...`)

    // Step 1: Normalize all records
    for (const raw of rawRecords) {
      try {
        let normalizedRecord = this.mapper.normalize(raw, this.config.sourceName)

        // Store record as pending
        const recordId = await this.storeRecord(raw, normalizedRecord, 'pending')
        recordIds.push(recordId)

        // Step 2: Geocode if needed
        if (
          this.mapper.requiresGeocoding() &&
          !this.config.skipGeocoding &&
          (!normalizedRecord.latitude || !normalizedRecord.longitude)
        ) {
          await this.supabase
            .from('data_import_records')
            .update({ status: 'geocoding', geocoding_attempted: true })
            .eq('id', recordId)

          const geocodeResult = await geocodeAddress(
            normalizedRecord.address,
            normalizedRecord.city,
            normalizedRecord.state,
            normalizedRecord.zip
          )

          if (geocodeResult.success && geocodeResult.data) {
            normalizedRecord.latitude = geocodeResult.data.latitude
            normalizedRecord.longitude = geocodeResult.data.longitude
            normalizedRecord.formatted_address = geocodeResult.data.formatted_address
            normalizedRecord.place_id = geocodeResult.data.place_id
            normalizedRecord.county = geocodeResult.data.county
            normalizedRecord.neighborhood = geocodeResult.data.neighborhood

            await this.supabase
              .from('data_import_records')
              .update({
                normalized_data: normalizedRecord,
                geocoding_success: true,
                geocoded_address: geocodeResult.data.formatted_address,
                geocoding_confidence: geocodeResult.data.confidence,
              })
              .eq('id', recordId)
          } else {
            console.warn(
              `Geocoding failed for ${normalizedRecord.address}, ${normalizedRecord.city}, ${normalizedRecord.state}: ${geocodeResult.error}`
            )

            await this.supabase
              .from('data_import_records')
              .update({
                geocoding_success: false,
                error_details: { geocoding_error: geocodeResult.error },
              })
              .eq('id', recordId)

            // Continue with import even if geocoding fails
          }
        }

        normalized.push(normalizedRecord)
      } catch (error) {
        console.error('Error normalizing record:', error)

        // Store error in database
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await this.supabase.from('data_import_records').insert({
          job_id: this.jobId,
          source_id: `error-${Date.now()}-${Math.random()}`,
          raw_data: raw,
          status: 'error',
          error_message: errorMessage,
          error_details: { normalization_error: errorMessage },
        })
      }
    }

    if (normalized.length === 0) {
      console.warn('No records were successfully normalized in this batch')
      return
    }

    // Step 3: Submit to batch suggestion API
    console.log(`Submitting ${normalized.length} normalized records to batch API...`)

    try {
      const response = await fetch('/api/resources/suggest-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: normalized,
          submitter: `Bulk Import: ${this.mapper.getDisplayName()}`,
          verification_level:
            this.config.verificationLevel || this.mapper.getVerificationLevel(),
          notes: `Imported from ${this.config.sourceUrl || this.config.sourceName}`,
        }),
      })

      if (!response.ok) {
        throw new Error(`Batch API returned ${response.status}: ${response.statusText}`)
      }

      const result = (await response.json()) as BatchSuggestionResponse

      console.log('Batch API response:', {
        total: result.stats.total,
        approved: result.stats.auto_approved,
        flagged: result.stats.flagged,
        rejected: result.stats.rejected,
      })

      // Step 4: Update record statuses based on API response
      if (result.results) {
        for (let i = 0; i < result.results.length; i++) {
          const apiResult = result.results[i]
          const recordId = recordIds[i]

          if (!recordId) continue

          const updates: Parameters<typeof this.updateRecord>[1] = {
            status: apiResult.status,
            resource_id: apiResult.resource_id,
            suggestion_id: apiResult.suggestion_id,
            verification_score: apiResult.verification_score,
            verification_decision: apiResult.status,
            verification_reason: apiResult.decision_reason,
          }

          if (apiResult.error) {
            updates.error_message = apiResult.error
          }

          await this.updateRecord(recordId, updates)
        }
      }
    } catch (error) {
      console.error('Error submitting batch to API:', error)

      // Mark all records in this batch as errored
      for (const recordId of recordIds) {
        await this.updateRecord(recordId, {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Failed to submit to batch API',
        })
      }

      throw error
    }
  }

  /**
   * Save checkpoint for resume capability
   */
  async saveCheckpoint(lastProcessedIndex: number, batchQueue: NormalizedResource[]): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    await this.supabase
      .from('data_import_jobs')
      .update({
        checkpoint_data: {
          last_processed_index: lastProcessedIndex,
          batch_queue: batchQueue,
          timestamp: new Date().toISOString(),
        },
      })
      .eq('id', this.jobId)
  }

  /**
   * Check if job should pause (status changed to 'paused')
   */
  async shouldPause(): Promise<boolean> {
    if (!this.jobId) return false

    const { data } = await this.supabase
      .from('data_import_jobs')
      .select('status')
      .eq('id', this.jobId)
      .single()

    return data?.status === 'paused'
  }

  /**
   * Run import for all records
   */
  async run(records: Record<string, unknown>[]): Promise<void> {
    try {
      // Create job
      await this.createJob(records.length)
      await this.updateJobStatus('running')

      console.log(`Starting import job ${this.jobId} for ${records.length} records`)

      // Process in batches
      for (let i = 0; i < records.length; i += this.batchSize) {
        // Check if we should pause
        if (await this.shouldPause()) {
          console.log('Import paused by user')
          await this.saveCheckpoint(i, [])
          return
        }

        const batch = records.slice(i, Math.min(i + this.batchSize, records.length))
        const batchNum = Math.floor(i / this.batchSize) + 1
        const totalBatches = Math.ceil(records.length / this.batchSize)

        console.log(`Processing batch ${batchNum}/${totalBatches} (records ${i + 1}-${i + batch.length})`)

        await this.processBatch(batch)

        // Progress is auto-updated by database triggers, but log for visibility
        const processed = Math.min(i + this.batchSize, records.length)
        console.log(`Progress: ${processed}/${records.length} records (${((processed / records.length) * 100).toFixed(1)}%)`)
      }

      await this.updateJobStatus('completed')
      console.log(`Import job ${this.jobId} completed successfully`)
    } catch (error) {
      console.error('Import job failed:', error)
      await this.updateJobStatus('failed')

      // Log error to job
      if (this.jobId) {
        await this.supabase
          .from('data_import_jobs')
          .update({
            error_log: [
              {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
            ],
          })
          .eq('id', this.jobId)
      }

      throw error
    }
  }

  /**
   * Resume import from checkpoint
   */
  async resume(): Promise<void> {
    if (!this.jobId) throw new Error('Job ID not set for resume')

    const job = await this.getJobDetails()
    if (!job) throw new Error('Job not found')

    if (!job.checkpoint_data) {
      throw new Error('No checkpoint data found for this job')
    }

    const checkpoint = job.checkpoint_data as {
      last_processed_index: number
      batch_queue: NormalizedResource[]
    }

    console.log(`Resuming job ${this.jobId} from index ${checkpoint.last_processed_index}`)

    // Get all records for this job (would need to be stored separately in real implementation)
    // For now, throw error as we need the original records list
    throw new Error('Resume functionality requires original records list - not yet implemented')
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const fixture = vi.hoisted(() => ({
  apiPatch: vi.fn(),
  output: vi.fn(),
  error: vi.fn(),
  projectRoot: '',
}))

vi.mock('../../scripts/cli/api.mjs', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: fixture.apiPatch,
  apiDelete: vi.fn(),
}))

vi.mock('../../scripts/cli/output.mjs', () => ({
  table: vi.fn(),
  summary: vi.fn(),
  error: fixture.error,
  output: fixture.output,
  success: vi.fn(),
}))

vi.mock('../../scripts/cli/config.mjs', () => ({ PROJECT_ROOT: '/tmp' }))

import { run } from '../../scripts/cli/commands/resources.mjs'

const resourceId = '11111111-1111-4111-8111-111111111111'
const source = 'https://provider.example/resources'
const notes = 'Confirmed the current phone and intake hours.'

describe('resource review command', () => {
  let directory
  let updatesFile
  let exitSpy

  beforeEach(() => {
    vi.clearAllMocks()
    directory = mkdtempSync(join(tmpdir(), 'resource-review-'))
    updatesFile = join(directory, 'updates.json')
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`)
    })
    fixture.apiPatch.mockResolvedValue({ success: true, updated_fields: ['phone'] })
  })

  afterEach(() => {
    exitSpy.mockRestore()
    rmSync(directory, { recursive: true, force: true })
  })

  it('sends camelCase updates and evidence to the authenticated PATCH client', async () => {
    writeFileSync(updatesFile, JSON.stringify({ phone: '555-0100', primaryCategory: 'healthcare' }))

    await run(['review', resourceId, updatesFile, '--source', source, '--notes', notes, '--json'])

    expect(fixture.apiPatch).toHaveBeenCalledWith(`/api/admin/resources/${resourceId}/update`, {
      updates: { phone: '555-0100', primaryCategory: 'healthcare' },
      verification_source: source,
      verification_notes: notes,
    })
    expect(fixture.output).toHaveBeenCalledWith({ success: true, updated_fields: ['phone'] })
  })

  it('previews compact intended fields without calling the API', async () => {
    writeFileSync(updatesFile, JSON.stringify({ phone: '555-0100', primaryCategory: 'healthcare' }))

    await run([
      'review',
      resourceId,
      updatesFile,
      '--source',
      source,
      '--notes',
      notes,
      '--preview',
      '--json',
    ])

    expect(fixture.apiPatch).not.toHaveBeenCalled()
    expect(fixture.output).toHaveBeenCalledWith({
      preview: true,
      id: resourceId,
      verification_source: source,
      verification_notes: notes,
      updated_fields: ['phone', 'primaryCategory'],
    })
  })

  it.each([
    ['empty object', '{}', /nonempty/i],
    ['array', '[]', /plain JSON object/i],
    ['null', 'null', /plain JSON object/i],
    ['snake_case field', '{"primary_category":"healthcare"}', /camelCase/i],
  ])(
    'rejects an invalid updates file (%s) before calling the API',
    async (_label, contents, message) => {
      writeFileSync(updatesFile, contents)

      await expect(
        run(['review', resourceId, updatesFile, '--source', source, '--notes', notes])
      ).rejects.toThrow('process.exit:1')

      expect(fixture.error).toHaveBeenCalledWith(expect.stringMatching(message))
      expect(fixture.apiPatch).not.toHaveBeenCalled()
    }
  )

  it('requires a UUID and nonempty source and notes', async () => {
    writeFileSync(updatesFile, JSON.stringify({ phone: '555-0100' }))

    await expect(
      run(['review', 'not-a-uuid', updatesFile, '--source', source, '--notes', notes])
    ).rejects.toThrow('process.exit:1')
    await expect(
      run(['review', resourceId, updatesFile, '--source', ' ', '--notes', notes])
    ).rejects.toThrow('process.exit:1')
    await expect(
      run(['review', resourceId, updatesFile, '--source', source, '--notes', ' '])
    ).rejects.toThrow('process.exit:1')
    await expect(
      run(['review', resourceId, updatesFile, '--source', 'not a URL', '--notes', notes])
    ).rejects.toThrow('process.exit:1')

    expect(fixture.error).toHaveBeenCalledWith(expect.stringMatching(/UUID/i))
    expect(fixture.error).toHaveBeenCalledWith(expect.stringMatching(/nonempty --source/i))
    expect(fixture.error).toHaveBeenCalledWith(expect.stringMatching(/source.*HTTP/i))
    expect(fixture.error).toHaveBeenCalledWith(expect.stringMatching(/notes/i))
    expect(fixture.apiPatch).not.toHaveBeenCalled()
  })
})

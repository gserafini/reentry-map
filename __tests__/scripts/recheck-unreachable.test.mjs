import { describe, expect, it } from 'vitest'

import {
  classifyMacRecheckResult,
  parseUnreachableNames,
} from '../../scripts/lib/unreachable-recheck.mjs'

describe('unreachable recheck helpers', () => {
  it('parses unique unreachable names from a batch enrich log', () => {
    const names = parseUnreachableNames(`
[1/10] UNREACHABLE Alpha Center — website down or too little content
[2/10] CURRENT Bravo House — analyzed, already has this data
[3/10] UNREACHABLE Alpha Center — website down or too little content
[4/10] UNREACHABLE Charlie Clinic — website down or too little content
`)

    expect(names).toEqual(['Alpha Center', 'Charlie Clinic'])
  })

  it('classifies mac recheck results into actionable buckets', () => {
    expect(classifyMacRecheckResult({ stdout: 'A'.repeat(120), combinedError: '' })).toMatchObject({
      status: 'reachable_via_mac',
    })
    expect(classifyMacRecheckResult({ stdout: 'short text', combinedError: '' })).toMatchObject({
      status: 'thin_content_via_mac',
    })
    expect(
      classifyMacRecheckResult({
        stdout: '',
        combinedError: 'net::ERR_NAME_NOT_RESOLVED at https://x',
      })
    ).toMatchObject({ status: 'dns_error' })
    expect(
      classifyMacRecheckResult({
        stdout: '',
        combinedError: 'net::ERR_CERT_COMMON_NAME_INVALID at https://x',
      })
    ).toMatchObject({ status: 'tls_error' })
    expect(
      classifyMacRecheckResult({ stdout: '', combinedError: 'Command timed out after 30000ms' })
    ).toMatchObject({
      status: 'timeout',
    })
  })
})

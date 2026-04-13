import { describe, expect, it } from 'vitest'

import {
  MAC_PATCHRIGHT_MODULE,
  buildMacPatchrightFetchCommand,
} from '../../scripts/lib/batch-enrich-fetch.mjs'

describe('batch enrich Mac fallback', () => {
  it('uses the known Patchright install on Gabriel’s Mac instead of bare require resolution', () => {
    const command = buildMacPatchrightFetchCommand('https://example.org/test')

    expect(command).toContain(MAC_PATCHRIGHT_MODULE)
    expect(command).not.toContain("require('patchright')")
    expect(command).toContain('gserafini@100.72.66.60')
  })
})

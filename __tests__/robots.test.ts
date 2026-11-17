import { describe, expect, it } from 'vitest'
import robots from '@/app/robots'

describe('robots.txt', () => {
  it('allows public Next.js render assets while keeping private routes disallowed', () => {
    const rules = robots().rules[0]
    expect(rules.allow).toContain('/_next/static/')
    expect(rules.allow).toContain('/_next/image/')
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        '/api/',
        '/admin/',
        '/auth/',
        '/protected/',
        '/profile/',
        '/my-suggestions/',
      ])
    )
    expect(rules.disallow).not.toContain('/_next/')
  })
})

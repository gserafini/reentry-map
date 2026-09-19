// @vitest-environment node
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { Button } from '@mui/material'
import { expect, it, vi } from 'vitest'
import { Providers } from '@/app/providers'
import { ServerInsertedHTMLContext } from 'next/dist/shared/lib/server-inserted-html.shared-runtime'

// MUI loads Next via CommonJS. Use the real server insertion context so the
// test exercises the production bridge instead of an ESM-only hook mock.
const callbacks: Array<() => ReactNode> = []
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  useTheme: () => ({ theme: 'light', systemTheme: 'light' }),
}))
vi.mock('@/lib/context/LocationContext', () => ({
  LocationProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/lib/context/FavoritesContext', () => ({
  FavoritesProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/components/pwa/PWAWrapper', () => ({ PWAWrapper: () => null }))

it('collects server-generated MUI styles for the document head, outside hydrated content', () => {
  callbacks.length = 0
  const content = renderToString(
    <ServerInsertedHTMLContext.Provider
      value={(callback) => {
        callbacks.push(callback)
      }}
    >
      <Providers>
        <Button variant="contained">Find help</Button>
      </Providers>
    </ServerInsertedHTMLContext.Provider>
  )
  expect(content).toContain('Find help')
  expect(content).not.toContain('<style')
  expect(callbacks.length).toBeGreaterThan(0)
  const styles = callbacks.map((callback) => renderToString(callback())).join('')
  expect(styles).toContain('data-emotion=')
  expect(styles).toContain('MuiButton')
})

/**
 * Test utilities for component testing
 */
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Access the global mock router state set up in vitest.setup.ts
function getMockRouterState() {
  // @ts-expect-error - globalThis type augmentation
  return globalThis.mockRouterState
}

// Helper to reset router mocks between tests
export function resetRouterMocks() {
  const state = getMockRouterState()
  state.push.mockClear()
  state.replace.mockClear()
  state.prefetch.mockClear()
  state.back.mockClear()
  state.pathname = '/'
  state.searchParams = new URLSearchParams()
}

// Helper to update search params for tests
export function setMockSearchParams(params: Record<string, string> | URLSearchParams) {
  const state = getMockRouterState()
  state.searchParams = params instanceof URLSearchParams ? params : new URLSearchParams(params)
}

// Helper to update pathname for tests
export function setMockPathname(pathname: string) {
  const state = getMockRouterState()
  state.pathname = pathname
}

// Helper to get the mock router functions
export function getMockRouter() {
  return getMockRouterState()
}

// Custom render function that can wrap with providers if needed
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, options)
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }

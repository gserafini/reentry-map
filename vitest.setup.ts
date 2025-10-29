import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { vi } from 'vitest'

// Shared mock router state that can be controlled in tests
// @ts-expect-error - globalThis type augmentation
globalThis.mockRouterState = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  pathname: '/',
  searchParams: new URLSearchParams(),
}

// Mock Next.js router with shared state
vi.mock('next/navigation', () => ({
  useRouter() {
    // @ts-expect-error - globalThis type augmentation
    const state = globalThis.mockRouterState
    return {
      push: state.push,
      replace: state.replace,
      prefetch: state.prefetch,
      back: state.back,
      pathname: state.pathname,
      query: {},
      asPath: state.pathname,
    }
  },
  useSearchParams() {
    // @ts-expect-error - globalThis type augmentation
    return globalThis.mockRouterState.searchParams
  },
  usePathname() {
    // @ts-expect-error - globalThis type augmentation
    return globalThis.mockRouterState.pathname
  },
  ReadonlyURLSearchParams: URLSearchParams,
}))

// Mock Next.js image component
vi.mock('next/image', () => ({
  default: (props: any) => createElement('img', props),
}))

/**
 * CLI HTTP Client - fetch wrapper with admin auth headers and error handling.
 */
import { BASE_URL, ADMIN_API_KEY } from './config.mjs'

/**
 * Build full URL from path and optional query params.
 */
function buildUrl(path, params = {}) {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Common headers for all admin API requests.
 */
function headers(contentType = false) {
  const h = { 'x-admin-api-key': ADMIN_API_KEY }
  if (contentType) {
    h['Content-Type'] = 'application/json'
  }
  return h
}

/**
 * Parse response, throwing on non-2xx with useful error message.
 */
async function handleResponse(response) {
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const msg = data?.error || data?.message || `HTTP ${response.status}`
    throw new Error(msg)
  }
  return data
}

/**
 * GET request with optional query params.
 * @param {string} path - API path (e.g., '/api/admin/resources')
 * @param {Record<string, string|number|boolean>} params - Query parameters
 */
export async function apiGet(path, params = {}) {
  const url = buildUrl(path, params)
  const response = await fetch(url, { headers: headers() })
  return handleResponse(response)
}

/**
 * POST request with JSON body.
 * @param {string} path - API path
 * @param {object} body - Request body
 * @param {Record<string, string|number|boolean>} params - Query parameters
 */
export async function apiPost(path, body = {}, params = {}) {
  const url = buildUrl(path, params)
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(body),
  })
  return handleResponse(response)
}

/**
 * PUT request with JSON body.
 * @param {string} path - API path
 * @param {object} body - Request body
 */
export async function apiPut(path, body = {}) {
  const url = buildUrl(path, {})
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(body),
  })
  return handleResponse(response)
}

/**
 * DELETE request.
 * @param {string} path - API path
 */
export async function apiDelete(path) {
  const url = buildUrl(path, {})
  const response = await fetch(url, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(response)
}

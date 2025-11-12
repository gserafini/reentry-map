#!/usr/bin/env node
// Test is-it-up.org API directly

const testUrl = 'https://lifelongmedical.org'
const checkUrl = `https://api.is-it-up.org/api/check?url=${encodeURIComponent(testUrl)}`

console.log(`Testing is-it-up.org with: ${testUrl}\n`)

try {
  const response = await fetch(checkUrl, {
    signal: AbortSignal.timeout(10000),
  })

  console.log(`Response status: ${response.status}`)

  if (response.ok) {
    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
  } else {
    const text = await response.text()
    console.log('Response body:', text.substring(0, 500))
  }
} catch (error) {
  console.log('❌ Error:', error.message)
}

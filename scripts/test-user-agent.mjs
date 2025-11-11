#!/usr/bin/env node
// Test URL with realistic browser headers

const url = 'https://lifelongmedical.org'

console.log(`Testing: ${url}\n`)

try {
  const response = await fetch(url, {
    method: 'GET', // Use GET instead of HEAD
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    signal: AbortSignal.timeout(10000),
  })

  console.log('✅ SUCCESS with realistic browser headers!')
  console.log(`Status: ${response.status} ${response.statusText}`)
  console.log(`Content-Type: ${response.headers.get('content-type')}`)
} catch (error) {
  console.log('❌ FAILED:', error.message)
}

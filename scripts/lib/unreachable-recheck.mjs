export function parseUnreachableNames(logText) {
  const names = []
  const seen = new Set()

  for (const line of String(logText || '').split('\n')) {
    const match = line.match(/^\[\d+\/\d+\] UNREACHABLE (.+) — website down or too little content$/)
    if (!match) continue
    const name = match[1].trim()
    if (seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }

  return names
}

export function classifyMacRecheckResult({ stdout = '', combinedError = '' }) {
  const text = String(stdout || '').trim()
  const detail = String(combinedError || '').trim()

  if (text.length >= 100) {
    return {
      status: 'reachable_via_mac',
      detail: `text_len=${text.length}`,
      preview: text.slice(0, 160).replace(/\s+/g, ' '),
    }
  }

  if (text.length > 0) {
    return {
      status: 'thin_content_via_mac',
      detail: `text_len=${text.length}`,
      preview: text.slice(0, 160).replace(/\s+/g, ' '),
    }
  }

  let status = 'mac_error'
  if (/ERR_NAME_NOT_RESOLVED/.test(detail)) status = 'dns_error'
  else if (/ERR_CERT_|CERT_/.test(detail)) status = 'tls_error'
  else if (/Timeout|timed out/i.test(detail)) status = 'timeout'
  else if (/ERR_CONNECTION_/.test(detail)) status = 'connection_error'

  return { status, detail: detail.slice(0, 300), preview: '' }
}

export function buildStatusCounts(results) {
  return results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})
}

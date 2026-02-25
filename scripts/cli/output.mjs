/**
 * CLI Output Formatting - table display, JSON mode, summary blocks.
 */

// Global JSON mode flag — set by entry point based on --json flag
let jsonMode = false

export function setJsonMode(enabled) {
  jsonMode = enabled
}

export function isJsonMode() {
  return jsonMode
}

/**
 * Print data as JSON (if --json) or formatted table.
 * @param {object} data - Data to display
 */
export function output(data) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(data)
  }
}

/**
 * Print formatted table from array of objects.
 * @param {Array<Record<string, any>>} rows - Array of row objects
 * @param {string[]} columns - Column keys to display (in order)
 * @param {Record<string, string>} [headers] - Optional column header labels
 */
export function table(rows, columns, headers = {}) {
  if (jsonMode) {
    console.log(JSON.stringify(rows, null, 2))
    return
  }

  if (!rows.length) {
    console.log('(no results)')
    return
  }

  // Calculate column widths
  const widths = {}
  for (const col of columns) {
    const header = headers[col] || col
    widths[col] = header.length
    for (const row of rows) {
      const val = String(row[col] ?? '')
      if (val.length > widths[col]) {
        widths[col] = Math.min(val.length, 60)
      }
    }
  }

  // Print header
  const headerLine = columns.map((col) => (headers[col] || col).padEnd(widths[col])).join('  ')
  console.log(headerLine)
  console.log(columns.map((col) => '-'.repeat(widths[col])).join('  '))

  // Print rows
  for (const row of rows) {
    const line = columns
      .map((col) => {
        const val = String(row[col] ?? '')
        return val.substring(0, 60).padEnd(widths[col])
      })
      .join('  ')
    console.log(line)
  }
}

/**
 * Print key-value summary block.
 * @param {string} title - Section title
 * @param {Record<string, any>} stats - Key-value pairs
 */
export function summary(title, stats) {
  if (jsonMode) {
    console.log(JSON.stringify({ title, ...stats }, null, 2))
    return
  }

  console.log(`\n${title}`)
  console.log('='.repeat(title.length))
  const maxKeyLen = Math.max(...Object.keys(stats).map((k) => k.length))
  for (const [key, value] of Object.entries(stats)) {
    console.log(`  ${key.padEnd(maxKeyLen)}  ${value}`)
  }
  console.log()
}

/**
 * Print error message.
 * @param {string} msg - Error message
 */
export function error(msg) {
  if (jsonMode) {
    console.log(JSON.stringify({ error: msg }))
  } else {
    console.error(`Error: ${msg}`)
  }
}

/**
 * Print success message.
 * @param {string} msg - Success message
 */
export function success(msg) {
  if (jsonMode) {
    console.log(JSON.stringify({ success: true, message: msg }))
  } else {
    console.log(msg)
  }
}

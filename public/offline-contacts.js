/* Standalone recovery UI: no framework, session requests, map or external assets. */
;(function () {
  const KEY = 'reentry-map:saved-resources:v1'
  const list = document.getElementById('contacts')
  const feedback = document.getElementById('feedback')
  let resources = []
  try {
    const cache = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (cache && cache.version === 1 && Array.isArray(cache.resources)) {
      const fields = [
        'id',
        'name',
        'description',
        'phone',
        'website',
        'location',
        'eligibility',
        'intake',
        'checked',
        'url',
        'savedAt',
      ]
      const seen = new Set()
      resources = cache.resources
        .filter((row) => {
          if (
            !row ||
            !fields.every((field) => typeof row[field] === 'string' && row[field].length <= 30000)
          )
            return false
          if (!row.id || !row.name || seen.has(row.id)) return false
          try {
            if (
              !row.url.startsWith('/') ||
              new URL(row.url, window.location.origin).origin !== window.location.origin
            )
              return false
          } catch {
            return false
          }
          seen.add(row.id)
          return true
        })
        .slice(0, 100)
    }
  } catch {
    feedback.textContent =
      'Device storage could not be read. Open a downloaded list or reconnect and try again.'
  }

  function text(tag, value, parent) {
    const element = document.createElement(tag)
    element.textContent = typeof value === 'string' ? value : ''
    parent.appendChild(element)
    return element
  }

  function store(next) {
    try {
      if (next.length) localStorage.setItem(KEY, JSON.stringify({ version: 1, resources: next }))
      else localStorage.removeItem(KEY)
      resources = next
      render()
      return true
    } catch {
      feedback.textContent =
        'Your device list could not be changed. Check browser storage settings and try again.'
      return false
    }
  }

  function render() {
    list.replaceChildren()
    document.getElementById('download').disabled = resources.length === 0
    document.getElementById('print').disabled = resources.length === 0
    document.getElementById('clear').disabled = resources.length === 0
    if (!resources.length)
      text(
        'p',
        'No resources saved on this device yet. When online, tap a resource heart to save its contact details.',
        list
      )
    resources.forEach((resource) => {
      const card = document.createElement('article')
      text('h2', resource.name, card)
      text('p', resource.phone ? 'Phone: ' + resource.phone : 'Phone not listed', card)
      const actions = document.createElement('div')
      actions.className = 'actions'
      if (typeof resource.phone === 'string' && resource.phone) {
        const call = text('a', 'Call', actions)
        call.className = 'button primary'
        call.href = 'tel:' + resource.phone.replace(/[^+\d]/g, '')
      }
      if (
        typeof resource.url === 'string' &&
        resource.url.startsWith('/') &&
        !resource.url.startsWith('//')
      ) {
        const details = text('a', 'Try current details', actions)
        details.className = 'button'
        details.href = resource.url
      }
      const remove = text('button', 'Remove', actions)
      remove.className = 'danger'
      remove.type = 'button'
      remove.setAttribute('aria-label', 'Remove ' + resource.name + ' from saved list')
      remove.addEventListener('click', () => {
        store(resources.filter((row) => row.id !== resource.id))
      })
      card.appendChild(actions)
      text('p', resource.description, card)
      text('p', resource.location, card)
      text(
        'p',
        'Who this helps: ' +
          (resource.eligibility || 'Contact the organization to check eligibility.'),
        card
      )
      text(
        'p',
        'Next step: ' +
          (resource.intake || 'Contact the organization for intake, hours and availability.'),
        card
      )
      text(
        'small',
        resource.checked
          ? 'Listing last checked: ' + String(resource.checked).slice(0, 10)
          : 'Check date not listed',
        card
      )
      text(
        'small',
        'Saved copy: ' +
          String(resource.savedAt || '').slice(0, 10) +
          '. Confirm details before visiting.',
        card
      )
      if (typeof resource.website === 'string') {
        try {
          const url = new URL(resource.website)
          if (
            (url.protocol === 'http:' || url.protocol === 'https:') &&
            !url.username &&
            !url.password
          ) {
            const website = text('a', resource.website, card)
            website.href = url.href
            website.rel = 'noopener noreferrer'
          }
        } catch {
          /* Missing or invalid website */
        }
      }
      list.appendChild(card)
    })
  }

  function connection() {
    document.getElementById('connection').textContent = navigator.onLine
      ? 'Connection available. Open the online list to check current details.'
      : 'You are offline. Saved phone numbers and next steps are available below.'
  }
  window.addEventListener('online', connection)
  window.addEventListener('offline', connection)
  document.getElementById('clear').addEventListener('click', () => {
    if (
      window.confirm(
        'Clear all saved resources from this browser? Downloaded files and account favorites are separate.'
      )
    ) {
      if (store([])) feedback.textContent = 'Device list cleared.'
    }
  })
  document.getElementById('print').addEventListener('click', () => window.print())
  document.getElementById('download').addEventListener('click', () => {
    const content = [
      'My support list — Reentry Map',
      'Saved copies may be out of date. Confirm details before visiting.',
      ...resources.map((row) =>
        [
          row.name,
          row.description,
          row.location,
          'Phone: ' + (row.phone || 'Not listed'),
          row.website,
          row.eligibility,
          row.intake,
          row.checked ? 'Listing last checked: ' + row.checked : 'Check date not listed',
          'Saved copy: ' + row.savedAt,
        ]
          .filter(Boolean)
          .join('\n')
      ),
    ].join('\n\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'my-reentry-support-list.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
  connection()
  render()
})()

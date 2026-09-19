import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { snapshotResource, SAVED_RESOURCES_KEY } from '@/lib/utils/saved-resources'

function openOfflinePage() {
  document.body.innerHTML =
    '<p id="connection"></p><p id="feedback"></p><section id="contacts"></section><button id="download"></button><button id="print"></button><button id="clear"></button>'
  vm.runInNewContext(readFileSync(process.cwd() + '/public/offline-contacts.js', 'utf8'), {
    document,
    window,
    localStorage,
    navigator,
    Blob,
    URL,
    setTimeout,
  })
}
describe('offline saved contacts', () => {
  beforeEach(() => localStorage.clear())
  it('reads device copies with phone actions even when offline; treats listing text as text', () => {
    const resource = snapshotResource('one', {
      name: '<img src=x onerror=alert(1)>',
      phone: '555-1234',
      address_type: 'regional',
      state: 'TX',
      service_area: { type: 'statewide', values: ['Texas'] },
    })
    localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify({ version: 1, resources: [resource] }))
    openOfflinePage()
    expect(document.querySelector('img')).toBeNull()
    expect(document.body.textContent).toContain('Serves all of Texas')
    expect(document.querySelector('a[href="tel:5551234"]')).toBeTruthy()
  })
  it('puts phone and actions before long descriptions in the standalone offline page', () => {
    const resource = snapshotResource('one', {
      name: 'Miles of Freedom',
      phone: '555-1234',
      description: 'Long program description. '.repeat(60),
      eligibility_requirements: 'Detailed eligibility. '.repeat(60),
    })
    localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify({ version: 1, resources: [resource] }))
    openOfflinePage()
    const card = document.querySelector('article')!
    const paragraphs = Array.from(card.querySelectorAll('p'))
    const description = paragraphs.find((element) => element.textContent === resource.description)!
    const phone = paragraphs.find((element) => element.textContent === 'Phone: 555-1234')!
    const actions = card.querySelector('.actions')!
    for (const element of [phone, actions]) {
      expect(
        element.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    }
    expect(actions.querySelector('a[href="tel:5551234"]')).toBeTruthy()
    ;(actions.querySelector('button') as HTMLButtonElement).click()
    expect(localStorage.getItem(SAVED_RESOURCES_KEY)).toBeNull()
  })
  it('clears the actual device cache after confirmation', () => {
    localStorage.setItem(
      SAVED_RESOURCES_KEY,
      JSON.stringify({ version: 1, resources: [snapshotResource('one', { name: 'Help' })] })
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    openOfflinePage()
    document.getElementById('clear')?.click()
    expect(localStorage.getItem(SAVED_RESOURCES_KEY)).toBeNull()
    expect(document.getElementById('contacts')?.textContent).toContain('No resources saved')
  })
})

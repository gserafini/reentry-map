import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@/__tests__/test-utils'
import { SavedSupportList } from '@/components/user/SavedSupportList'
import { snapshotResource } from '@/lib/utils/saved-resources'

describe('saved support contact priority', () => {
  it('puts the phone and contact actions before long descriptive content', () => {
    const resource = snapshotResource('one', {
      name: 'Miles of Freedom',
      phone: '555-1234',
      description: 'A detailed program description. '.repeat(60),
      eligibility_requirements: 'Eligibility details. '.repeat(60),
    })
    const remove = vi.fn()
    render(<SavedSupportList resources={[resource]} onRemove={remove} />)
    const description = screen.getByText(resource.description.trim())
    const phone = screen.getByText('Phone: 555-1234')
    const call = screen.getByRole('link', { name: 'Call' })
    const current = screen.getByRole('link', { name: 'Current details' })
    const removeButton = screen.getByRole('button', { name: /Remove Miles of Freedom/ })
    for (const element of [phone, call, current, removeButton]) {
      expect(
        element.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    }
    expect(call).toHaveAttribute('href', 'tel:5551234')
    fireEvent.click(removeButton)
    expect(remove).toHaveBeenCalledWith('one')
  })
})

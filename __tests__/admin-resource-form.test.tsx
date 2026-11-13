import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResourceForm } from '@/components/admin/ResourceForm'
import type { Database } from '@/lib/types/database'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))

type Row = Database['public']['Tables']['resources']['Row']

// The admin edit page loads rows with raw SQL, so the form receives snake_case columns.
const resource = {
  id: 'r-1',
  name: 'Hope House',
  description: 'Transitional housing.',
  primary_category: 'general-support',
  status: 'active',
  phone: '',
  email: '',
  website: 'https://hope.example/',
  address: '1 Main St, Pueblo, CO 81003',
  eligibility_requirements: 'Adults 18+',
  services_offered: ['Shelter', 'Meals'],
  required_documents: ['Photo ID'],
  fees: 'Free',
  record_restrictions: 'The provider’s website says: “No arson convictions.”',
  reentry_focused: false,
} as unknown as Row

function setup() {
  const onSubmit = vi.fn().mockResolvedValue({ success: true })
  render(<ResourceForm resource={resource} onSubmit={onSubmit} onCancel={vi.fn()} />)
  return onSubmit
}

describe('admin ResourceForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the stored eligibility, services, documents and record fields', () => {
    setup()
    expect(screen.getByLabelText(/Eligibility Requirements/i)).toHaveValue('Adults 18+')
    expect(screen.getByLabelText(/Services Offered/i)).toHaveValue('Shelter\nMeals')
    expect(screen.getByLabelText(/Documents Required/i)).toHaveValue('Photo ID')
    expect(screen.getByLabelText(/Record-related restrictions/i)).toHaveValue(
      'The provider’s website says: “No arson convictions.”'
    )
    expect(
      screen.getByRole('checkbox', { name: /Built for people with records/i })
    ).not.toBeChecked()
    // Categories use the stored hyphenated values, so the current one is selected.
    expect(screen.getByText('General Support')).toBeInTheDocument()
  })

  it('sends only the fields that changed, under the API field names', async () => {
    const onSubmit = setup()
    fireEvent.change(screen.getByLabelText(/Eligibility Requirements/i), {
      target: { value: 'Adults 21+' },
    })
    fireEvent.change(screen.getByLabelText(/Services Offered/i), {
      target: { value: 'Shelter\n Meals \n\nCase management' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update Resource/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit).toHaveBeenCalledWith({
      eligibility_requirements: 'Adults 21+',
      services_offered: ['Shelter', 'Meals', 'Case management'],
    })
  })

  it('saves record restrictions and the reentry label', async () => {
    const onSubmit = setup()
    fireEvent.change(screen.getByLabelText(/Record-related restrictions/i), {
      target: { value: '  ' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Built for people with records/i }))
    fireEvent.click(screen.getByRole('button', { name: /Update Resource/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit).toHaveBeenCalledWith({ record_restrictions: null, reentry_focused: true })
  })

  it('returns to the list without a request when nothing changed', async () => {
    const onSubmit = setup()
    fireEvent.click(screen.getByRole('button', { name: /Update Resource/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/resources'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

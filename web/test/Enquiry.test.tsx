import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, product, renderApp } from './helpers.tsx';

const LAPTOP = product('7', 'Laptop');

function mockProductApi(enquiryResponse: { status: number; body?: unknown }) {
  return mockApi((url, init) => {
    if (url === '/api/categories') return { status: 200, body: ['electronics'] };
    if (url === '/api/products/7') return { status: 200, body: LAPTOP };
    if (url === '/api/enquiries' && init?.method === 'POST') return enquiryResponse;
    return { status: 404, body: { error: 'Not found' } };
  });
}

async function openEnquiryForm() {
  renderApp('/products/7');
  await userEvent.click(await screen.findByRole('button', { name: 'Enquire' }));
}

describe('Enquiry', () => {
  it('submits contact details for the product and shows a thank you message', async () => {
    const fetchMock = mockProductApi({ status: 204 });
    await openEnquiryForm();

    await userEvent.type(screen.getByLabelText('Name'), 'Jane Citizen');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Message (optional)'), 'Is this in stock?');
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Thank you');
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/enquiries')!;
    expect(JSON.parse(init!.body as string)).toEqual({
      productId: '7',
      name: 'Jane Citizen',
      email: 'jane@example.com',
      message: 'Is this in stock?',
    });
  });

  it('shows validation errors and does not submit an invalid form', async () => {
    const fetchMock = mockProductApi({ status: 204 });
    await openEnquiryForm();

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('A valid email is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/enquiries', expect.anything());
  });

  it('keeps the form and shows the error when sending fails', async () => {
    mockProductApi({ status: 502, body: { error: 'Could not send enquiry, please try again later' } });
    await openEnquiryForm();

    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not send enquiry');
    expect(screen.getByLabelText('Name')).toHaveValue('Jane');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

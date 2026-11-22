import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  sessionResponse,
  stubApi,
  triggerSessionRecheck,
} from '@/test/api-stub';
import { renderWithProviders } from '@/test/render';

const SESSION = '/api/auth/get-session';
const UPDATE = 'POST /api/auth/update-user';

async function renderForm() {
  vi.resetModules();
  const { AccountForm } = await import('../account-form');
  const view = renderWithProviders(<AccountForm />);
  await vi.waitFor(() => {
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });
  return view;
}

describe('AccountForm', () => {
  it('shows the current name and the email as read-only text', async () => {
    stubApi({
      [SESSION]: () => sessionResponse({ id: 'alice', name: 'Alice' }),
    });
    await renderForm();

    expect(screen.getByText('alice@example.test')).toBeVisible();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('updates the name and reflects the new session data', async () => {
    let name = 'Alice';
    const update = vi.fn((body: unknown) => {
      if (body && typeof body === 'object' && 'name' in body) {
        name = String(body.name);
      }
      return Response.json({ status: true });
    });
    stubApi({
      [SESSION]: () => sessionResponse({ id: 'alice', name }),
      [UPDATE]: update,
    });
    const { user } = await renderForm();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), '  Alicia ');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Name updated.',
    );
    expect(update).toHaveBeenCalledWith({ name: 'Alicia' });
    await vi.waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('Alicia');
    });
  });

  it('rejects an empty name without sending a request', async () => {
    const update = vi.fn(() => Response.json({ status: true }));
    stubApi({
      [SESSION]: () => sessionResponse({ id: 'alice', name: 'Alice' }),
      [UPDATE]: update,
    });
    const { user } = await renderForm();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      'Enter your name.',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('reports a failed update and keeps the edited value', async () => {
    stubApi({
      [SESSION]: () => sessionResponse({ id: 'alice', name: 'Alice' }),
      [UPDATE]: () => Response.json({}, { status: 500 }),
    });
    const { user } = await renderForm();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Alicia');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong on the server.',
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alicia');
  });

  it.each([
    ['unchanged', 'Alice'],
    ['renamed on another device', 'Alicia'],
  ])(
    'keeps an unsaved edit when a background session check finds the name %s',
    async (_case, serverName) => {
      let name = 'Alice';
      const session = vi.fn(() => sessionResponse({ id: 'alice', name }));
      stubApi({ [SESSION]: session });
      const { user } = await renderForm();

      await user.clear(screen.getByLabelText('Name'));
      await user.type(screen.getByLabelText('Name'), 'Ally');
      name = serverName;
      const checks = session.mock.calls.length;
      triggerSessionRecheck();

      await vi.waitFor(() => {
        expect(session.mock.calls.length).toBeGreaterThan(checks);
      });
      await new Promise((resolve) => setTimeout(resolve));
      expect(screen.getByLabelText('Name')).toHaveValue('Ally');
    },
  );

  it('shows a name changed elsewhere while the field is untouched', async () => {
    let name = 'Alice';
    stubApi({ [SESSION]: () => sessionResponse({ id: 'alice', name }) });
    await renderForm();

    name = 'Alicia';
    triggerSessionRecheck();

    await vi.waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('Alicia');
    });
  });
});

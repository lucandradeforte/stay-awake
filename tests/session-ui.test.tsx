// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  inactiveSession,
  type Snapshot,
} from '../packages/contracts/src/index';
import { SessionControls } from '../apps/extension/src/components/session-controls';
import { useSession } from '../apps/extension/src/hooks/useSession';
const initial: Snapshot = {
  session: inactiveSession(Date.now()),
  preferences: DEFAULT_PREFERENCES,
  events: [],
};
function Harness() {
  return <SessionControls {...useSession()} />;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('renders dispatch rejection without an unhandled promise; allows retry', async () => {
  const sendMessage = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, data: initial })
    .mockRejectedValueOnce(new Error('Worker unavailable'))
    .mockResolvedValueOnce({ ok: true, data: initial });
  vi.stubGlobal('chrome', {
    runtime: { sendMessage },
    storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
  });
  render(<Harness />);
  await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: /Iniciar sessão/ }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Worker unavailable'),
  );
  fireEvent.click(screen.getByRole('button', { name: /Iniciar sessão/ }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
it('restarts an unlimited session without silently converting it to 60 minutes', async () => {
  const dispatch = vi.fn().mockResolvedValue(initial);
  const snapshot: Snapshot = {
    ...initial,
    session: { ...initial.session, status: 'active', id: 'unlimited', startedAt: Date.now() },
  };
  render(
    <SessionControls
      snapshot={snapshot}
      pending={false}
      error={null}
      now={Date.now()}
      dispatch={dispatch}
    />,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Reiniciar prazo/ }));
  });
  expect(dispatch).toHaveBeenCalledWith({ type: 'SESSION_UPDATE_DURATION', durationMinutes: null });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useWakeLock } from '../apps/extension/src/features/wake-lock/useWakeLock';
const request = vi.fn();
let visibility: DocumentVisibilityState = 'visible';
function sentinel() {
  const target = new EventTarget();
  return Object.assign(target, {
    released: false,
    release: vi.fn(async () => {
      target.dispatchEvent(new Event('release'));
    }),
  });
}
beforeEach(() => {
  visibility = 'visible';
  request.mockReset();
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
});
afterEach(cleanup);
it('releases a late acquisition after consent was disabled', async () => {
  let resolve!: (value: ReturnType<typeof sentinel>) => void;
  request.mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  const { result } = renderHook(() => useWakeLock(true));
  act(() => result.current.setEnabled(true));
  act(() => result.current.setEnabled(false));
  const old = sentinel();
  await act(async () => resolve(old));
  expect(old.release).toHaveBeenCalledTimes(1);
  expect(result.current.acquired).toBe(false);
});
it('ignores a stale release event after a newer sentinel was acquired', async () => {
  const old = sentinel();
  const current = sentinel();
  request.mockResolvedValueOnce(old).mockResolvedValueOnce(current);
  const { result } = renderHook(() => useWakeLock(true));
  await act(async () => result.current.setEnabled(true));
  await act(async () => result.current.setEnabled(false));
  await act(async () => result.current.setEnabled(true));
  act(() => old.dispatchEvent(new Event('release')));
  expect(result.current.acquired).toBe(true);
  act(() => current.dispatchEvent(new Event('release')));
  expect(result.current.acquired).toBe(false);
  expect(request).toHaveBeenCalledTimes(2);
});
it('reacquires only with consent and an active session when visible again', async () => {
  request.mockImplementation(async () => sentinel());
  const { result, rerender } = renderHook(({ active }) => useWakeLock(active), {
    initialProps: { active: true },
  });
  await act(async () => result.current.setEnabled(true));
  expect(result.current.acquired).toBe(true);
  await act(async () => {
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current.acquired).toBe(false);
  await act(async () => {
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current.acquired).toBe(true);
  rerender({ active: false });
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current.enabled).toBe(false);
  expect(request).toHaveBeenCalledTimes(2);
});
it('handles request and release rejections without unhandled promises', async () => {
  request.mockRejectedValueOnce(new Error('denied'));
  const { result } = renderHook(() => useWakeLock(true));
  await act(async () => result.current.setEnabled(true));
  expect(result.current.message).toContain('recusado');
  const current = sentinel();
  current.release.mockRejectedValueOnce(new Error('release failure'));
  request.mockResolvedValueOnce(current);
  await act(async () => result.current.setEnabled(true));
  await act(async () => result.current.setEnabled(false));
  expect(result.current.acquired).toBe(false);
  expect(result.current.message).toContain('liberação');
});
it('releases a request that completes after unmount', async () => {
  let resolve!: (value: ReturnType<typeof sentinel>) => void;
  request.mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  const { result, unmount } = renderHook(() => useWakeLock(true));
  act(() => result.current.setEnabled(true));
  unmount();
  const late = sentinel();
  await act(async () => resolve(late));
  expect(late.release).toHaveBeenCalledTimes(1);
});

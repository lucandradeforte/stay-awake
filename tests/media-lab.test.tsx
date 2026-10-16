// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoLab } from '../apps/extension/src/features/developer-lab/VideoLab';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tracks: ReturnType<typeof vi.fn>[] = [];
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
let paused = false;
let visibility: DocumentVisibilityState = 'visible';
const play = vi.fn<() => Promise<void>>();
const revoke = vi.fn();
const createUrl = vi.fn(() => 'blob:local-video');
const context = { fillRect: vi.fn(), fillText: vi.fn(), createRadialGradient: () => ({ addColorStop: vi.fn() }) };

beforeEach(() => {
  tracks.length = 0; frames.clear(); frameId = 0; paused = false; visibility = 'visible';
  play.mockReset().mockResolvedValue(); revoke.mockClear(); createUrl.mockClear();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { paused = true; });
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => paused);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => context });
  Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', { configurable: true, value: () => {
    const stop = vi.fn(); tracks.push(stop); return { getTracks: () => [{ stop }] };
  } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const start = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar reprodução' }));
const stop = () => fireEvent.click(screen.getByRole('button', { name: /^Parar$/ }));
const fileMode = () => fireEvent.click(screen.getByRole('button', { name: 'Arquivo local' }));
const generatedMode = () => fireEvent.click(screen.getByRole('button', { name: 'Canvas → vídeo' }));
const selectFile = (file = new File(['video'], 'private-name.webm', { type: 'video/webm' })) => {
  fireEvent.change(screen.getByLabelText(/Escolher vídeo local/), { target: { files: [file] } });
};
async function settle() { await act(async () => {}); }

describe('Media Lab lifecycle', () => {
  it('cleans tracks and drawing when play rejects; sanitizes the error', async () => {
    play.mockRejectedValueOnce(new Error('private-name.webm refused'));
    render(<VideoLab />); start(); await settle();
    expect(screen.getByRole('alert').textContent).not.toContain('private-name');
    expect(screen.getByText('Parado')).toBeTruthy();
    expect(tracks[0]).toHaveBeenCalledTimes(1); expect(frames.size).toBe(0);
  });
  it('ignores a play fulfillment after stop', async () => {
    const pending = deferred(); play.mockReturnValueOnce(pending.promise);
    render(<VideoLab />); start(); stop();
    await act(async () => { pending.resolve(); });
    expect(screen.getByText('Parado')).toBeTruthy(); expect(frames.size).toBe(0);
  });
  it('does not clean a new file when old generated play rejects', async () => {
    const pending = deferred(); play.mockReturnValueOnce(pending.promise);
    render(<VideoLab />); start(); fileMode(); selectFile(); await settle();
    await act(async () => { pending.reject(new Error('old operation')); });
    expect(screen.getByText('Reproduzindo arquivo local')).toBeTruthy();
    expect(revoke).not.toHaveBeenCalled(); expect(tracks[0]).toHaveBeenCalledTimes(1);
  });
  it('preserves generated media after a stale file fulfillment', async () => {
    const pending = deferred(); play.mockReturnValueOnce(pending.promise);
    render(<VideoLab />); fileMode(); selectFile(); generatedMode(); start(); await settle();
    await act(async () => { pending.resolve(); });
    expect(screen.getByText('Reproduzindo vídeo gerado')).toBeTruthy();
    expect(revoke).toHaveBeenCalledTimes(1); expect(tracks[0]).not.toHaveBeenCalled();
  });
  it('unmount cleans the attached element and ignores pending play', async () => {
    const pending = deferred(); play.mockReturnValueOnce(pending.promise);
    const view = render(<VideoLab />); start();
    const video = screen.getByLabelText('Vídeo experimental'); view.unmount();
    await act(async () => { pending.resolve(); });
    expect(tracks[0]).toHaveBeenCalledTimes(1); expect(frames.size).toBe(0);
    expect(video).toHaveProperty('srcObject', null);
  });
  it('hidden stops playback; returning visible requires an explicit start', async () => {
    render(<VideoLab />); start(); await settle(); const calls = play.mock.calls.length;
    visibility = 'hidden'; fireEvent(document, new Event('visibilitychange'));
    visibility = 'visible'; fireEvent(document, new Event('visibilitychange')); await settle();
    expect(screen.getByText('Parado')).toBeTruthy(); expect(play).toHaveBeenCalledTimes(calls);
    expect(tracks[0]).toHaveBeenCalledTimes(1); expect(frames.size).toBe(0);
  });
  it('pausing stops drawing; stale resume rejection cannot stop a new run', async () => {
    render(<VideoLab />); start(); await settle(); paused = false;
    fireEvent.click(screen.getByRole('button', { name: 'Pausar / retomar' }));
    expect(screen.getByText('Pausado')).toBeTruthy(); expect(frames.size).toBe(0);
    const pending = deferred(); play.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar / retomar' })); stop(); start(); await settle();
    await act(async () => { pending.reject(new Error('stale resume')); });
    expect(screen.getByText('Reproduzindo vídeo gerado')).toBeTruthy();
    expect(tracks[1]).not.toHaveBeenCalled();
  });
  it('rejects invalid and oversized files without allocating URLs', () => {
    render(<VideoLab />); fileMode(); selectFile(new File(['x'], 'private.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert').textContent).toContain('vídeo válido');
    const large = new File([], 'large.webm', { type: 'video/webm' });
    Object.defineProperty(large, 'size', { value: 101 * 1024 * 1024 }); selectFile(large);
    expect(screen.getByRole('alert').textContent).toContain('100 MB'); expect(createUrl).not.toHaveBeenCalled();
  });
  it('cleans every resource exactly once over 50 start/pause/stop/source cycles', async () => {
    render(<VideoLab />);
    for (let i = 0; i < 50; i++) {
      start(); await settle(); paused = false;
      fireEvent.click(screen.getByRole('button', { name: 'Pausar / retomar' }));
      fileMode(); selectFile(); await settle(); stop(); stop(); generatedMode();
    }
    expect(tracks).toHaveLength(50); tracks.forEach(track => expect(track).toHaveBeenCalledTimes(1));
    expect(createUrl).toHaveBeenCalledTimes(50); expect(revoke).toHaveBeenCalledTimes(50); expect(frames.size).toBe(0);
  });
});

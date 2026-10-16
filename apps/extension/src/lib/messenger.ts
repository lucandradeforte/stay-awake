import type { Command, Response, Snapshot } from '@stay-awake/contracts';
export async function send(command: Command): Promise<Snapshot> {
  const result: Response = await chrome.runtime.sendMessage(command);
  if (!result?.ok) throw new Error(result?.error ?? 'Não foi possível comunicar com a extensão.');
  return result.data;
}
export function openWorkspace(): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL('workspace.html') });
}
export function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}

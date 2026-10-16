import type { Response } from '@stay-awake/contracts';
import { handleAlarm, reconcile, runCommand, serialized } from './session-controller';

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse: (response: Response) => void) => {
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'Origem não autorizada.' });
      return false;
    }
    void serialized(() => runCommand(message))
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Falha inesperada.',
        }),
      );
    return true;
  },
);
chrome.alarms.onAlarm.addListener((alarm) => {
  void serialized(() => handleAlarm(alarm.name));
});
chrome.runtime.onStartup.addListener(() => {
  void serialized(() => reconcile('browser-startup'));
});
chrome.runtime.onInstalled.addListener((details) => {
  void serialized(() => reconcile(details.reason === 'install' ? 'worker' : 'extension-reload'));
});

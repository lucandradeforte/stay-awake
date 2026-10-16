import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const dist = resolve(import.meta.dirname, '../apps/extension/dist');
const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8'));
const expected = ['power', 'storage', 'alarms'];
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 required');
if (JSON.stringify([...manifest.permissions].sort()) !== JSON.stringify(expected.sort())) throw new Error('Unexpected permissions');
for (const path of ['background.js','popup.html','workspace.html','icons/icon128.png']) {
  if (!existsSync(resolve(dist,path))) throw new Error(`Missing build output: ${path}`);
}
if (!manifest.background?.service_worker || manifest.background?.service_worker !== 'background.js') throw new Error('Worker mismatch');
for (const html of ['popup.html','workspace.html']) {
  const content = readFileSync(resolve(dist,html),'utf8');
  if (!content.includes('assets/')) throw new Error(`Missing bundled entry in ${html}`);
  if (content.includes('http://') || content.includes('https://')) throw new Error(`Unexpected external resource in ${html}`);
}
console.log(`Manifest ${manifest.version}: OK. ${readdirSync(dist).length} root build entries checked.`);

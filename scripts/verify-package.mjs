import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'apps/extension/dist/manifest.json'), 'utf8'));
const version = process.env.RELEASE_VERSION ?? manifest.version;
if (!/^\d+\.\d+\.\d+(?:-rc\.[1-9]\d*)?$/.test(version)) throw new Error('Invalid package version');
const zip = resolve(root, `releases/stay-awake-v${version}-chrome-edge.zip`);
const digest = createHash('sha256').update(readFileSync(zip)).digest('hex');
if (readFileSync(zip + '.sha256', 'utf8') !== `${digest}  ${basename(zip)}\n`) throw new Error('Checksum mismatch');
const python = process.platform === 'win32' ? 'py' : 'python3';
const script = String.raw`import pathlib,sys,zipfile
source,archive,target=sys.argv[1:]
source=pathlib.Path(source)
with zipfile.ZipFile(archive) as z:
 entries=z.namelist()
 expected=sorted(p.relative_to(source).as_posix() for p in source.rglob('*') if p.is_file())
 if sorted(entries)!=expected or len(entries)!=len(set(entries)): raise ValueError('Package inventory mismatch')
 if 'manifest.json' not in entries: raise ValueError('Manifest missing at package root')
 for entry in entries:
  if pathlib.PurePosixPath(entry).is_absolute() or '..' in pathlib.PurePosixPath(entry).parts or '\\' in entry: raise ValueError('Unsafe archive path')
  if z.read(entry)!=(source / entry).read_bytes(): raise ValueError('Package content mismatch')
 target=pathlib.Path(target)
 if target.exists(): raise ValueError('Extraction target already exists; use a new directory')
 target.mkdir(parents=True)
 z.extractall(target)
 print('Checksum, inventory and extracted content verified:',len(entries),'files')
`;
const target = resolve(process.env.EXTENSION_PATH ?? '.playwright/unpacked');
const result = spawnSync(python, [...(process.platform === 'win32' ? ['-3'] : []), '-c', script, resolve(root, 'apps/extension/dist'), zip, target], { encoding: 'utf8' });
if (result.status !== 0) throw new Error(`Package verification failed: ${result.stderr || result.error}`);
console.log(result.stdout.trim());

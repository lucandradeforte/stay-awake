import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'apps/extension/dist');
const releases = resolve(root, 'releases');
if (!existsSync(resolve(source, 'manifest.json')))
  throw new Error('Build missing. Run npm run build:extension first.');
mkdirSync(releases, { recursive: true });
const version = JSON.parse(readFileSync(resolve(source, 'manifest.json'), 'utf8')).version;
const releaseVersion = process.env.RELEASE_VERSION ?? version;
if (!new RegExp(`^${version.replaceAll('.', '\\.')}(-rc\\.[1-9][0-9]*)?$`).test(releaseVersion))
  throw new Error('Release version must match manifest, optionally with -rc.N');
const target = resolve(releases, `stay-awake-v${releaseVersion}-chrome-edge.zip`);
// Python's stdlib zipfile avoids platform dependencies on a zip binary on Windows.
const python = process.platform === 'win32' ? 'py' : 'python3';
const py = String.raw`import os,sys,zipfile
source,target=sys.argv[1:]
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for root,dirs,files in os.walk(source):
  dirs.sort()
  for f in sorted(files):
   p=os.path.join(root,f)
   if os.path.islink(p): raise ValueError('Symlinks are not allowed in extension artifacts')
   entry=zipfile.ZipInfo(os.path.relpath(p,source).replace(os.sep,'/'),date_time=(1980,1,1,0,0,0))
   entry.compress_type=zipfile.ZIP_DEFLATED
   entry.create_system=3
   entry.external_attr=0o100644 << 16
   with open(p,'rb') as asset: z.writestr(entry,asset.read(),compresslevel=9)
`;
const result = spawnSync(
  python,
  [...(process.platform === 'win32' ? ['-3'] : []), '-c', py, source, target],
  { encoding: 'utf8' },
);
if (result.status !== 0) throw new Error(`Could not create zip: ${result.stderr || result.error}`);
const hash = createHash('sha256').update(readFileSync(target)).digest('hex');
writeFileSync(target + '.sha256', `${hash}  ${target.split(/[\\/]/).pop()}\n`);
console.log(`Created ${target}\nSHA256 ${hash}`);

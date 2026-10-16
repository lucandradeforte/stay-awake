import { RiComputerLine, RiExternalLinkLine } from '@remixicon/react';
import { openWorkspace } from '../lib/messenger';
export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><div className="brand-mark"><RiComputerLine size={21} /></div><div>
    <strong>Stay Awake</strong>{!compact && <small>DISPLAY CONTROL</small>}
  </div></div>;
}
export function WorkspaceLink({ label = 'Abrir Workspace' }: { label?: string }) {
  return <button className="text-link" type="button" onClick={openWorkspace}>{label}<RiExternalLinkLine size={15}/></button>;
}

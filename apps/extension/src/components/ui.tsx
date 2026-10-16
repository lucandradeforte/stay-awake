import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';
import * as SwitchPrimitive from '@radix-ui/react-switch';
export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button className={clsx('btn', 'btn-' + variant, className)} {...props} />;
}
export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={clsx('card', className)}>{children}</section>;
}
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-title"><h2>{children}</h2>{action}</div>;
}
export function Toggle({ label, description, checked, disabled, onChange }: {
  label: string; description?: string; checked: boolean; disabled?: boolean; onChange(value: boolean): void;
}) {
  return <div className="toggle-row"><div><div className="control-label">{label}</div>{description && <p className="small muted">{description}</p>}</div>
    <SwitchPrimitive.Root className="switch" aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange}>
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
  </div>;
}
export function NumberInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input type="number" {...props} /></label>;
}
export function StatusPill({ status }: { status: string }) {
  return <span className={clsx('status-pill', ['active'].includes(status) && 'pill-success', status === 'error' && 'pill-error')}>
    <span className="status-dot" />{({ active: 'Solicitação ativa', inactive: 'Inativo', expired: 'Expirada', starting: 'Iniciando', stopping: 'Encerrando', reconciling: 'Reconectando', error: 'Falha' } as Record<string, string>)[status] ?? status}
  </span>;
}
export function InlineError({ message }: { message: string | null }) {
  return message ? <div className="inline-error" role="alert">{message}</div> : null;
}

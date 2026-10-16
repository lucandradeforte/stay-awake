import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RiMoonLine, RiSunLine, RiDashboardLine, RiPulseLine, RiFlaskLine,
  RiSettings3Line, RiQuestionLine, RiGithubLine, RiDownload2Line,
  RiClipboardLine, RiRefreshLine, RiDeleteBinLine, RiFullscreenLine
} from '@remixicon/react';
import {
  formatDuration, remainingMs, VERSION, statusIsRunning, type Preferences, type Snapshot
} from '@stay-awake/contracts';
import { useSession } from '../../hooks/useSession';
import { useWakeLock } from '../../features/wake-lock/useWakeLock';
import { VideoLab } from '../../features/developer-lab/VideoLab';
import { Brand } from '../../components/brand';
import { Button, Card, InlineError, SectionTitle, StatusPill, Toggle } from '../../components/ui';
import { SessionControls } from '../../components/session-controls';
import '../../styles/index.css';

type Tab = 'session' | 'diagnostics' | 'developer' | 'settings' | 'help';
const repository = 'https://github.com/lucandradeforte/stay-awake';
const navigation = [
  { id:'session', name:'Sessão', icon: RiDashboardLine },
  { id:'diagnostics', name:'Diagnósticos', icon: RiPulseLine },
  { id:'developer', name:'Developer Lab', icon: RiFlaskLine },
  { id:'settings', name:'Configurações', icon: RiSettings3Line },
  { id:'help', name:'Ajuda', icon: RiQuestionLine }
] as const;
function updateHash(tab: Tab) { window.location.hash = tab; }
function initialTab(): Tab { const hash = window.location.hash.slice(1); return navigation.some(item=>item.id === hash) ? hash as Tab : 'session'; }

function DiagnosticView({ snapshot, now, clear, refresh }: { snapshot: Snapshot; now: number; clear():void; refresh():void }) {
  const [copyState, setCopyState] = useState('Copiar diagnóstico');
  const session = snapshot.session;
  const diagnostic = () => JSON.stringify({
    appVersion: VERSION, userAgent: navigator.userAgent.includes('Edg/') ? 'Microsoft Edge' : 'Chromium',
    status: session.status, level: session.level, durationMinutes: session.durationMinutes,
    startedAt: session.startedAt ? new Date(session.startedAt).toISOString() : null,
    expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : null,
    remainingMs: remainingMs(session, now), lastError: session.lastError, events: snapshot.events
  }, null, 2);
  const copy = async () => { try { await navigator.clipboard.writeText(diagnostic()); setCopyState('Copiado!'); } catch { setCopyState('Cópia indisponível'); } };
  return <div className="content-stack"><div className="page-intro"><span className="eyebrow">TRANSPARÊNCIA</span><h1>Diagnósticos</h1><p>Os valores abaixo representam solicitações da extensão. O estado de bloqueio da sessão Windows não é consultável.</p></div>
    <div className="stats-grid"><Card><span className="muted small">Engine</span><strong>chrome.power</strong><span className="muted small">API pública de extensões</span></Card>
      <Card><span className="muted small">Status</span><StatusPill status={session.status}/><span className="muted small">Sem confirmação externa do SO</span></Card>
      <Card><span className="muted small">Tempo restante</span><strong className="mono">{formatDuration(remainingMs(session,now))}</strong><span className="muted small">Timestamp absoluto</span></Card>
    </div>
    <Card><SectionTitle action={<Button variant="secondary" onClick={refresh}><RiRefreshLine size={16}/> Atualizar</Button>}>Dados da sessão</SectionTitle>
      <div className="details-table">
        {[
          ['Versão', VERSION],['Navegador', navigator.userAgent.includes('Edg/')?'Edge':'Chrome/Chromium'],
          ['ID da sessão', session.id || '—'],['Modo', session.level],
          ['Início', session.startedAt ? new Date(session.startedAt).toLocaleString('pt-BR') : '—'],
          ['Expiração', session.expiresAt ? new Date(session.expiresAt).toLocaleString('pt-BR') : 'Manual / —'],
          ['Último erro', session.lastError?.message ?? 'Nenhum']
        ].map(([key,value])=><div key={key}><span>{key}</span><strong>{value}</strong></div>)}
      </div>
    </Card>
    <Card><SectionTitle>Eventos locais (máx. 80)</SectionTitle>
      <div className="log-list">{snapshot.events.length ? [...snapshot.events].reverse().map(event=><div className="log-row" key={event.id}><time>{new Date(event.at).toLocaleString('pt-BR')}</time><strong>{event.event}</strong><span>{event.detail}</span></div>) : <p className="muted small">Nenhum evento registrado.</p>}</div>
      <div className="action-row"><Button variant="secondary" onClick={()=>void copy()}><RiClipboardLine size={16}/>{copyState}</Button><Button variant="quiet" onClick={clear}><RiDeleteBinLine size={16}/> Limpar eventos</Button></div>
    </Card>
  </div>;
}

function SettingsView({ prefs, change, reset, error }: { prefs: Preferences; change(patch:Partial<Preferences>):void; reset():void; error:string|null }) {
  return <div className="content-stack"><div className="page-intro"><span className="eyebrow">PREFERÊNCIAS</span><h1>Configurações</h1><p>Defina como o Stay Awake deve se comportar. Nenhuma opção altera o Registro ou as políticas do Windows.</p></div>
    <Card><SectionTitle>Inicialização e segurança</SectionTitle>
      <Toggle label="Retomar sessões finitas ao reabrir o navegador" description="Desativado por padrão. Se o prazo já tiver vencido, não será retomado." checked={prefs.resumeOnBrowserRestart} onChange={v=>change({ resumeOnBrowserRestart:v })}/>
      <Toggle label="Permitir retomar sessões sem prazo" description="Somente vale quando a opção anterior também estiver ativada." checked={prefs.resumeUnlimitedOnRestart} disabled={!prefs.resumeOnBrowserRestart} onChange={v=>change({resumeUnlimitedOnRestart:v})}/>
    </Card>
    <Card><SectionTitle>Funcionalidades experimentais</SectionTitle>
      <Toggle label="Ativar Developer Lab (Beta/Dev)" description="Libera a aba de experimentos visíveis com reprodução HTML5. Não é mecanismo de desbloqueio do Windows." checked={prefs.developerModeEnabled} onChange={v=>change({developerModeEnabled:v})}/>
    </Card>
    <Card><SectionTitle>Dados locais</SectionTitle><p className="muted small">Todas as preferências e diagnósticos ficam no armazenamento local da extensão.</p>
      <Button variant="danger" onClick={reset}><RiDeleteBinLine size={16}/> Encerrar sessão e apagar dados</Button>
      <InlineError message={error}/>
    </Card>
  </div>;
}
function HelpView() { return <div className="content-stack"><div className="page-intro"><span className="eyebrow">DOCUMENTAÇÃO</span><h1>Ajuda e informações</h1><p>O Stay Awake é um utilitário local para gerenciamento temporário de solicitações de energia.</p></div>
  <Card><SectionTitle>O que cada modo significa?</SectionTitle>
    <div className="faq-grid"><div><h3>Tela + sistema</h3><p>Solicita que o navegador mantenha monitor e computador acordados por inatividade.</p></div><div><h3>Somente sistema</h3><p>Solicita evitar suspensão do computador, mas permite que o monitor desligue.</p></div><div><h3>Screen Wake Lock</h3><p>Disponível na página Workspace em primeiro plano; o navegador pode revogar a solicitação.</p></div><div><h3>Media Lab</h3><p>Uma experiência manual e visível de mídia HTML5 para comparar comportamentos.</p></div></div>
  </Card>
  <Card><SectionTitle>Limitações importantes</SectionTitle><p>A extensão não pode garantir que o Windows permaneça desbloqueado nem contornar bloqueio manual, políticas de segurança ou decisões do sistema operacional. O Chrome precisa estar em execução para manter a solicitação.</p></Card>
  <Card><SectionTitle>Suporte, código e atualizações</SectionTitle><div className="action-row"><a className="btn btn-secondary" href={`${repository}#readme`} target="_blank" rel="noreferrer"><RiGithubLine size={17}/> Repositório</a><a className="btn btn-secondary" href={`${repository}/issues/new`} target="_blank" rel="noreferrer"><RiQuestionLine size={17}/> Enviar feedback</a><a className="btn btn-secondary" href={`${repository}/releases/latest`} target="_blank" rel="noreferrer"><RiDownload2Line size={17}/> Releases</a></div></Card>
  </div>; }

function App() {
  const { snapshot, pending, error, now, refresh, dispatch } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab());
  const [fullscreen, setFullscreen] = useState(false);
  const prefs = snapshot?.preferences;
  const active = !!snapshot && statusIsRunning(snapshot.session);
  const wake = useWakeLock(active);
  useEffect(() => {
    const onHash = () => setTab(initialTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { document.body.dataset.theme = prefs?.workspaceTheme ?? 'dark'; }, [prefs?.workspaceTheme]);
  const change = (patch: Partial<Preferences>) => { void dispatch({type:'PREFERENCES_SET', patch}).catch(()=>{}); };
  const reset = () => { if (window.confirm('Encerrar a sessão e apagar todos os dados locais da extensão?')) void dispatch({type:'RESET_LOCAL_DATA'}).catch(()=>{}); };
  const go = (next: Tab) => { updateHash(next);setTab(next); };
  const enterPresentation = () => { setFullscreen(!fullscreen); if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(()=>{}); else void document.exitFullscreen?.().catch(()=>{}); };
  return <div className={'workspace-layout ' + (fullscreen?'presentation':'')}>
    <aside className="sidebar"><Brand/><p className="sidebar-section">WORKSPACE</p><nav aria-label="Navegação do Workspace">
      {navigation.filter(item=>item.id !== 'developer' || prefs?.developerModeEnabled).map(item=><button key={item.id} onClick={()=>go(item.id)} className={'nav-item '+(tab===item.id?'nav-active':'')} aria-current={tab===item.id?'page':undefined}><item.icon size={19}/>{item.name}</button>)}
    </nav><div className="sidebar-spacer"/><div className="sidebar-foot"><span className="small muted">Stay Awake</span><span className="small muted">v{VERSION}</span></div></aside>
    <div className="workspace-main"><header className="workspace-header"><div className="breadcrumb">Stay Awake <span>/</span> {navigation.find(item=>item.id===tab)?.name}</div>
      <div className="header-actions"><StatusPill status={snapshot?.session.status ?? 'inactive'}/><button className="icon-button" aria-label="Alternar tema" title="Alternar tema" onClick={()=>change({workspaceTheme:prefs?.workspaceTheme==='light'?'dark':'light'})}>{prefs?.workspaceTheme==='light'?<RiMoonLine size={19}/>:<RiSunLine size={19}/>}</button></div>
    </header><main className="workspace-content">
      {tab==='session' && <div className="content-stack"><div className="page-intro"><span className="eyebrow">POWER MANAGEMENT</span><h1>Seu espaço, sem interrupções.</h1><p>Controle as solicitações de energia da tela e do sistema enquanto trabalha.</p></div>
        <div className="workspace-columns"><Card><SessionControls snapshot={snapshot} pending={pending} error={error} now={now} dispatch={dispatch} variant="workspace"/></Card>
          <div className="content-stack"><Card><SectionTitle>Screen Wake Lock <span className="subtle-tag">Página visível</span></SectionTitle>
              <p className="muted small">Solicitação adicional da API Web. Funciona somente enquanto esta página estiver elegível e visível.</p>
              <Toggle label="Solicitar Screen Wake Lock" description={wake.message} checked={wake.enabled} disabled={!active} onChange={wake.setEnabled}/>
              <div className="details-table"><div><span>Estado medido nesta página</span><strong>{wake.acquired?'Adquirido':'Não adquirido'}</strong></div><div><span>Visibilidade</span><strong>{document.visibilityState}</strong></div></div>
            </Card><Card><SectionTitle>Modo de espera</SectionTitle><p className="muted small">Utilize a página como painel de acompanhamento. Pode colocar em tela cheia para reduzir distrações.</p><Button variant="secondary" onClick={enterPresentation}><RiFullscreenLine size={17}/> {fullscreen?'Sair da apresentação':'Tela cheia'}</Button></Card>
            <Card><SectionTitle>Limitações</SectionTitle><p className="small muted">A extensão solicita gerenciamento de energia, não desativa o bloqueio do Windows. A suspensão manual, bloqueios administrativos e encerramento do navegador podem prevalecer.</p></Card></div>
        </div>
      </div>}
      {tab==='diagnostics' && snapshot && <DiagnosticView snapshot={snapshot} now={now} refresh={()=>void refresh()} clear={()=>void dispatch({type:'DIAGNOSTIC_CLEAR'}).catch(()=>{})}/>}
      {tab==='developer' && prefs?.developerModeEnabled && <div className="content-stack"><div className="page-intro"><span className="eyebrow">BETA / DEV</span><h1>Developer Lab</h1><p>Experimentos opcionais, visíveis e isolados do núcleo de energia.</p></div><VideoLab/></div>}
      {tab==='developer' && !prefs?.developerModeEnabled && <Card><p>Ative o Developer Lab em Configurações para visualizar os experimentos.</p><Button variant="secondary" onClick={()=>go('settings')}>Ir às configurações</Button></Card>}
      {tab==='settings' && prefs && <SettingsView prefs={prefs} change={change} reset={reset} error={error}/>}
      {tab==='help' && <HelpView/>}
      {!snapshot && <Card><p>Carregando estado da extensão…</p><InlineError message={error}/></Card>}
    </main></div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

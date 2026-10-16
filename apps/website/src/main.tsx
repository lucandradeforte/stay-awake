import React from 'react';
import { createRoot } from 'react-dom/client';
import { RiComputerLine, RiGithubLine, RiDownload2Line, RiShieldCheckLine, RiTimerLine, RiMoonLine, RiCodeLine, RiExternalLinkLine, RiArrowRightLine } from '@remixicon/react';
import '@stay-awake/design-tokens/theme.css';
import './site.css';
const repo = 'https://github.com/lucandradeforte/stay-awake';
function App() {
  return <>
    <header className="header"><a className="logo" href="#home"><span className="logo-icon"><RiComputerLine size={20}/></span> Stay Awake</a>
      <nav aria-label="Navegação principal"><a href="#features">Funcionalidades</a><a href="#install">Instalar</a><a href="#faq">FAQ</a><a href={repo} target="_blank" rel="noreferrer"><RiGithubLine size={19}/> GitHub</a></nav>
    </header>
    <main id="home"><section className="hero"><div className="eyebrow"><span className="dot"/> EXTENSÃO PARA CHROME + EDGE</div>
      <h1>Seu tempo.<br/><span className="gradient">Sua tela, sob controle.</span></h1>
      <p>Gerencie solicitações de energia da tela e do computador, com temporizador, interface minimalista e privacidade por padrão. Sem modificar configurações do Windows.</p>
      <div className="buttons"><a className="cta" href={`${repo}/releases/latest`} target="_blank" rel="noreferrer"><RiDownload2Line size={20}/> Baixar extensão <RiArrowRightLine size={16}/></a><a className="outline" href="#install">Como instalar</a></div>
      <p className="micro">Gratuito · Instalação local · Código-fonte disponível no GitHub</p>
      <div className="app-mock"><div className="mock-toolbar"><span/><span/><span/><p>Stay Awake / Workspace</p></div><div className="mock-content"><div className="mock-sidebar"><b><RiComputerLine size={16}/> Stay Awake</b><span>Sessão</span><span>Diagnósticos</span><span>Configurações</span></div><div className="mock-main"><small>POWER MANAGEMENT</small><h2>Seu espaço, sem interrupções.</h2><p>Solicitação local de energia. Políticas do sistema continuam aplicáveis.</p><div className="mock-panel"><div className="mock-orb"><RiComputerLine size={42}/></div><h3>Pronto para iniciar</h3><span>15 min · 30 min · 1 h · 2 h · Sem limite</span><div className="mock-bar">Iniciar sessão</div></div></div></div></div>
    </section>
    <section className="section" id="features"><span className="eyebrow">FEATURES</span><h2>Somente o que você precisa.</h2><p className="subhead">Uma ferramenta pequena, sem serviços externos ou permissões invasivas.</p>
      <div className="feature-grid"><article><RiComputerLine/><h3>Chrome Power</h3><p>Solicitação de tela e sistema acordados usando a API pública de extensões.</p></article><article><RiTimerLine/><h3>Temporizador</h3><p>Presets, duração personalizada, prazo absoluto e modo sem limite.</p></article><article><RiMoonLine/><h3>Dark-first</h3><p>Popup escuro e Workspace com alternância entre temas claro e escuro.</p></article><article><RiShieldCheckLine/><h3>Privacidade local</h3><p>Sem conta, rastreamento ou coleta das páginas que você visita.</p></article><article><RiCodeLine/><h3>Developer Lab</h3><p>Experimentos visíveis com Screen Wake Lock e reprodução HTML5.</p></article><article><RiGithubLine/><h3>Open source</h3><p>Projeto auditável, instalável localmente e mantido via GitHub.</p></article></div>
    </section>
    <section className="section install" id="install"><span className="eyebrow">INSTALLATION</span><h2>Instalação em poucos passos.</h2><p className="subhead">A distribuição inicial é local, sem Chrome Web Store ou Edge Add-ons.</p>
      <ol><li><strong>Baixe o ZIP</strong> da extensão compilada em <a href={`${repo}/releases/latest`} target="_blank" rel="noreferrer">GitHub Releases <RiExternalLinkLine size={14}/></a>. Não use o ZIP do código-fonte como se fosse o build.</li><li><strong>Extraia o ZIP</strong> para uma pasta que não será movida ou apagada.</li><li><strong>Abra a página de extensões</strong> em <code>chrome://extensions</code> ou <code>edge://extensions</code>.</li><li><strong>Ative o Modo do desenvolvedor</strong> e selecione <em>Carregar sem compactação</em> (Chrome) ou <em>Load unpacked</em> (Edge).</li><li><strong>Selecione a pasta extraída</strong> que contém o arquivo <code>manifest.json</code>, fixe o ícone e experimente.</li></ol>
      <div className="notice">O navegador pode pedir para confirmar extensões não publicadas e pode desativá-las conforme suas políticas. A extensão não foi feita para neutralizar bloqueios de segurança do Windows.</div>
    </section>
    <section className="section" id="faq"><span className="eyebrow">FAQ</span><h2>Respostas rápidas.</h2><div className="faq"><details><summary>Funciona no Chrome e no Edge?</summary><p>Ambos usam Chromium e documentam as APIs necessárias. O mesmo build é destinado aos dois; valide o comportamento em cada instalação.</p></details><details><summary>Preciso alterar configurações de energia do Windows?</summary><p>Não. A extensão usa APIs do navegador para solicitar gerenciamento temporário de energia.</p></details><details><summary>Ela impede o bloqueio do Windows?</summary><p>Não há garantia. Bloqueio manual, proteção de tela, autenticação e políticas corporativas podem prevalecer.</p></details><details><summary>O site precisa ficar aberto?</summary><p>Não para a API chrome.power. O Workspace é opcional. O Screen Wake Lock da página depende de uma aba visível.</p></details><details><summary>Como atualizar?</summary><p>Baixe um ZIP compilado da nova versão, extraia na pasta escolhida e use o botão Atualizar em chrome://extensions ou edge://extensions.</p></details></div></section>
    </main><footer><span>Stay Awake · 1.0.0</span><span>Projeto local-first · <a href={repo} target="_blank" rel="noreferrer">GitHub</a> · <a href={`${repo}/issues`} target="_blank" rel="noreferrer">Feedback</a></span></footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

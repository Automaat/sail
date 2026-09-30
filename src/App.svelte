<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { invoke, isTauri } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import { Badge, Button } from '@smykla-skalski/sui';
  import PlanPanel from './PlanPanel.svelte';
  import { connect, type OpenCodeClient, type RuntimeInfo, type SessionInfo, type SessionMessageInfo } from './lib/opencode';
  import { getPlan, type PlanSnapshot } from './lib/plan';

  let dark = $state(localStorage.getItem('sai-theme') === 'dark');
  let directory = $state(localStorage.getItem('sai-directory') ?? '');
  let runtimeState = $state<'starting' | 'connected' | 'error'>('starting');
  let runtimeError = $state('');
  let agentReady = $state(false);
  let sessions = $state<SessionInfo[]>([]);
  let sessionID = $state<string | null>(null);
  let messages = $state<SessionMessageInfo[]>([]);
  let snapshot = $state<PlanSnapshot>({ plan: null, questions: null });
  let draft = $state('');
  let sending = $state(false);
  let running = $state(false);
  let error = $state('');
  let chatEnd: HTMLDivElement;
  let client = $state<OpenCodeClient | null>(null);
  let eventController: AbortController | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let selection = 0;

  let currentSession = $derived(sessions.find((session) => session.id === sessionID));
  let chatMessages = $derived(messages.filter((message) => message.type === 'user' || message.type === 'assistant'));
  let canSend = $derived(!!client && !!directory && agentReady && !!draft.trim() && !sending);

  function setTheme(value: boolean) {
    dark = value;
    document.documentElement.dataset.suiTheme = value ? 'dark' : 'light';
    localStorage.setItem('sai-theme', value ? 'dark' : 'light');
  }

  onMount(() => {
    setTheme(dark);
    void initialize();
    return () => { eventController?.abort(); clearTimeout(refreshTimer); };
  });

  async function initialize() {
    if (!isTauri()) {
      runtimeState = 'error';
      runtimeError = 'Open the desktop app with mise run dev to start OpenCode.';
      return;
    }
    try {
      client = connect(await invoke<RuntimeInfo>('start_runtime'));
      await client.server.info();
      runtimeState = 'connected';
      eventController = new AbortController();
      void watchEvents(eventController.signal);
      if (directory) await loadProject(directory);
    } catch (cause) { runtimeState = 'error'; runtimeError = describe(cause); }
  }

  async function chooseProject() {
    const selected = await open({ directory: true, multiple: false, title: 'Choose a repository' });
    if (typeof selected === 'string') await loadProject(selected);
  }

  async function loadProject(path: string) {
    if (!client) return;
    error = '';
    const current = ++selection;
    directory = path;
    localStorage.setItem('sai-directory', path);
    sessionID = null;
    messages = [];
    running = false;
    snapshot = { plan: null, questions: null };
    agentReady = false;
    try {
      const agents = await client.agent.list({ location: { directory: path } });
      if (current !== selection) return;
      agentReady = agents.data.some((agent) => agent.id === 'architect');
      if (!agentReady) { error = 'Architect agent unavailable. Install and configure opencode-plugin-plan-review for this repository.'; return; }
      await refreshSessions();
      const saved = localStorage.getItem(`sai-session:${path}`);
      const initial = sessions.find((session) => session.id === saved) ?? sessions[0];
      if (initial) await selectSession(initial.id);
    } catch (cause) { error = describe(cause); }
  }

  async function refreshSessions() {
    if (!client || !directory) return;
    const path = directory;
    const result = await client.session.list({ directory: path, limit: 50, order: 'desc' });
    if (path !== directory) return;
    sessions = result.data.filter((session) => (session.agent === 'architect' || session.metadata?.saiHarness === true) && !session.parentID);
  }

  async function selectSession(id: string) {
    const current = ++selection;
    sessionID = id;
    messages = [];
    running = false;
    snapshot = { plan: null, questions: null };
    error = '';
    localStorage.setItem(`sai-session:${directory}`, id);
    await refreshSession(id, current);
  }

  function newPlan() {
    ++selection;
    sessionID = null;
    messages = [];
    running = false;
    snapshot = { plan: null, questions: null };
    draft = '';
    error = '';
    localStorage.removeItem(`sai-session:${directory}`);
  }

  async function refreshSession(id = sessionID, current = selection) {
    if (!client || !id || !directory) return;
    try {
      const [history, plan] = await Promise.all([
        client.message.list({ sessionID: id, limit: 100, order: 'asc' }),
        getPlan(client, directory, id),
      ]);
      if (current !== selection || id !== sessionID) return;
      messages = history.data;
      snapshot = plan;
      await tick();
      chatEnd?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    } catch (cause) { if (current === selection) error = describe(cause); }
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refreshSession(), 120);
  }

  async function watchEvents(signal: AbortSignal) {
    if (!client) return;
    while (!signal.aborted) {
      try {
        for await (const event of client.event.subscribe({ signal })) {
          if (signal.aborted) return;
          if (event.type === 'server.connected') { if (directory) await refreshSessions(); scheduleRefresh(); }
          if (event.type === 'session.created' || event.type === 'session.renamed') void refreshSessions();
          const eventSession = 'data' in event && 'sessionID' in event.data ? event.data.sessionID : undefined;
          if (eventSession === sessionID || (event.type === 'rpc.planreview.changed' && event.location?.directory === directory)) {
            if (event.type === 'session.execution.started') running = true;
            if (['session.execution.succeeded', 'session.execution.failed', 'session.execution.interrupted'].includes(event.type)) running = false;
            scheduleRefresh();
          }
        }
      } catch (cause) { if (!signal.aborted) error = `Live updates disconnected: ${describe(cause)}`; }
      if (!signal.aborted) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  async function send() {
    if (!client || !canSend) return;
    const text = draft.trim();
    draft = '';
    sending = true;
    error = '';
    try {
      let id = sessionID;
      if (!id) {
        const session = await client.session.create({ agent: 'architect', location: { directory }, metadata: { saiHarness: true }, title: text.length > 60 ? `${text.slice(0, 57)}…` : text });
        id = session.id;
        await refreshSessions();
        await selectSession(id);
      }
      running = true;
      await client.session.prompt({ sessionID: id, text });
      await refreshSession(id);
    } catch (cause) { draft = text; running = false; error = describe(cause); }
    finally { sending = false; }
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send(); }
  }

  function describe(cause: unknown): string {
    if (cause instanceof Error) return cause.message;
    if (typeof cause === 'object' && cause && 'message' in cause) return String(cause.message);
    return String(cause);
  }
  function assistantText(message: SessionMessageInfo): string {
    return message.type === 'assistant' ? message.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n') : '';
  }
  function toolsUsed(message: SessionMessageInfo): string[] {
    return message.type === 'assistant' ? message.content.filter((part) => part.type === 'tool').map((part) => part.name) : [];
  }
</script>

<svelte:head><title>SAI Harness · Plan workspace</title></svelte:head>
<div class="app-shell">
  <aside class="sidebar" aria-label="Plan sessions">
    <div class="brand"><span class="brand-mark">S.</span><span>SAI Harness</span></div>
    <div class="project-switcher"><span class="label">PROJECT</span><button class="project-button" onclick={chooseProject} disabled={runtimeState !== 'connected'} title={directory || 'Select repository'}><span class="project-icon">⌁</span><span class="project-name">{directory ? directory.split('/').filter(Boolean).at(-1) : 'Select repository'}</span><span>⌄</span></button></div>
    <div class="session-heading"><span class="label">PLAN SESSIONS</span><Button size="sm" variant="ghost" onclick={newPlan} disabled={!agentReady} aria-label="New plan">＋</Button></div>
    <nav aria-label="Plan sessions">{#each sessions as session (session.id)}<button class:active={session.id === sessionID} class="session-item" onclick={() => selectSession(session.id)} title={session.title ?? 'Untitled plan'}><span class="session-symbol">◇</span><span>{session.title ?? 'Untitled plan'}</span></button>{:else}<p class="session-empty">{directory ? 'No plans yet' : 'Choose a repository to begin'}</p>{/each}</nav>
    <div class="sidebar-footer"><span class:connected={runtimeState === 'connected'} class="status-dot"></span><span>OpenCode {runtimeState}</span></div>
  </aside>
  <div class="main-area">
    <header class="topbar"><div class="breadcrumb"><button class="breadcrumb-project" onclick={chooseProject} disabled={runtimeState !== 'connected'}>{directory ? directory.split('/').filter(Boolean).at(-1) : 'Workspace'} ⌄</button><span class="slash">/</span><strong>{currentSession?.title ?? 'New plan'}</strong></div><div class="topbar-actions"><Badge tone={agentReady ? 'success' : 'neutral'}>{agentReady ? 'Architect' : 'No agent'}</Badge><Button variant="ghost" size="sm" onclick={() => setTheme(!dark)}>{dark ? 'Light' : 'Dark'} theme</Button></div></header>
    <div class="workspace">
      <main class="chat-area" aria-label="Architect conversation">
        <div class="conversation">
          {#if !sessionID && messages.length === 0}<div class="welcome"><div class="welcome-mark">◇</div><p class="eyebrow">PLAN WITH ARCHITECT</p><h1>What are we building?</h1><p>Describe the work. The architect will explore the repository, ask for decisions, and create a plan you can review.</p>{#if !directory}<Button onclick={chooseProject} disabled={runtimeState !== 'connected'}>Select repository</Button>{/if}</div>{/if}
          {#each chatMessages as message (message.id)}
            {#if message.type === 'user'}<article class="message user-message"><div class="avatar user-avatar">You</div><div class="message-body"><div class="message-author">You</div><p>{message.text}</p></div></article>
            {:else if message.type === 'assistant'}<article class="message assistant-message"><div class="avatar agent-avatar">S.</div><div class="message-body"><div class="message-author">Architect</div>{#if assistantText(message)}<p>{assistantText(message)}</p>{/if}{#if toolsUsed(message).length}<div class="tool-line">Used {toolsUsed(message).join(', ')}</div>{/if}{#if message.error}<div class="message-error">{JSON.stringify(message.error)}</div>{/if}</div></article>{/if}
          {/each}
          {#if running}<div class="working"><span class="pulse"></span> Architect is working…</div>{/if}<div bind:this={chatEnd}></div>
        </div>
        <div class="composer-wrap">{#if runtimeError}<p class="notice error" role="alert">{runtimeError}</p>{/if}{#if error}<p class="notice error" role="alert">{error}</p>{/if}<div class="composer"><textarea bind:value={draft} onkeydown={keydown} rows="3" placeholder={agentReady ? 'Describe a goal or ask the architect a question…' : 'Select a repository with the architect plugin installed…'} disabled={!agentReady || sending}></textarea><div class="composer-bottom"><span>Enter to send · Shift+Enter for newline</span><Button onclick={send} disabled={!canSend} loading={sending}>Send ↗</Button></div></div></div>
      </main>
      <PlanPanel {snapshot} {client} {directory} {dark} onchanged={() => refreshSession()} />
    </div>
  </div>
</div>

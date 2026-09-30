<script lang="ts">
  import { Badge, Button, Card } from '@smykla-skalski/sui';

  let dark = $state(false);

  function toggleTheme() {
    dark = !dark;
    document.documentElement.dataset.suiTheme = dark ? 'dark' : 'light';
  }
</script>

<svelte:head>
  <title>SAI Harness</title>
</svelte:head>

<div class="app-shell">
  <aside class="sidebar" aria-label="Main navigation">
    <div class="brand"><span class="brand-mark">S.</span><span>SAI Harness</span></div>
    <div class="nav-group-label">WORKSPACE</div>
    <nav aria-label="Workspace">
      <span class="nav-item selected" aria-current="page">Overview</span>
      <span class="nav-item">Plan reviews</span>
      <span class="nav-item">Agent runs</span>
    </nav>
    <div class="sidebar-footer">
      <span class="sidebar-status"><span class="status-dot"></span> OpenCode disconnected</span>
      <span class="sidebar-caption">Local workspace</span>
    </div>
  </aside>

  <div class="main-area">
    <header class="topbar">
      <div class="breadcrumb">Workspace <span>/</span> Overview</div>
      <Button variant="ghost" size="sm" onclick={toggleTheme} aria-label={dark ? 'Use light theme' : 'Use dark theme'}>
        {dark ? 'Light theme' : 'Dark theme'}
      </Button>
    </header>

    <main class="content">
      <div class="page-heading">
        <div>
          <p class="eyebrow">WORKSPACE OVERVIEW</p>
          <h1>Plan and review agent work</h1>
          <p class="intro">Bring a repository into focus, review the plan, then follow the work through implementation.</p>
        </div>
        <Badge tone="neutral">Early scaffold</Badge>
      </div>

      <div class="overview-grid">
        <Card heading="Current project" description="Choose a local repository to begin a new plan review." class="project-card">
          <div class="empty-project">
            <div class="empty-project-mark" aria-hidden="true">⌘</div>
            <div>
              <strong>No repository selected</strong>
              <p>Project selection will connect your working directory to OpenCode.</p>
            </div>
          </div>
          {#snippet footer()}
            <Button disabled>Select repository</Button>
          {/snippet}
        </Card>

        <Card heading="OpenCode runtime" description="Agent sessions run through your local OpenCode server." class="runtime-card">
          <div class="runtime-row">
            <span>Connection</span>
            <Badge tone="danger">Disconnected</Badge>
          </div>
          <div class="runtime-row">
            <span>Active sessions</span>
            <strong>—</strong>
          </div>
          {#snippet footer()}
            <span class="footnote">Server connection is the next integration step.</span>
          {/snippet}
        </Card>
      </div>

      <section class="workflow-section" aria-labelledby="workflow-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">HOW IT WORKS</p>
            <h2 id="workflow-title">One reviewable workflow</h2>
          </div>
          <Badge tone="neutral">Coming next</Badge>
        </div>
        <Card class="workflow-card">
          <ol class="workflow-steps">
            <li><span class="step-number">01</span><div><strong>Draft a plan</strong><p>Capture the goal and ask OpenCode to propose concrete steps.</p></div></li>
            <li><span class="step-number">02</span><div><strong>Review decisions</strong><p>See findings, resolve questions, and approve each step.</p></div></li>
            <li><span class="step-number">03</span><div><strong>Follow implementation</strong><p>Launch the approved work and inspect its session and diff.</p></div></li>
          </ol>
        </Card>
      </section>
    </main>
  </div>
</div>

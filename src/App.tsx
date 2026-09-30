import { For } from "solid-js";

const steps = [
  { number: "01", title: "Understand the plugin workflow", detail: "Map the plan review lifecycle and existing OpenCode hooks.", state: "done" },
  { number: "02", title: "Design the harness boundary", detail: "Keep sessions in OpenCode; persist workflow and review state here.", state: "active" },
  { number: "03", title: "Build the plan review workspace", detail: "Present reviewer findings with evidence and resolution actions.", state: "queued" },
  { number: "04", title: "Hand approved work to an agent", detail: "Launch implementation and follow its session events.", state: "queued" },
];

export default function App() {
  return (
    <main class="shell">
      <aside class="rail">
        <div class="mark">S<span>.</span></div>
        <button class="rail-button selected" aria-label="Workspaces">⌂</button>
        <button class="rail-button" aria-label="Runs">◷</button>
        <button class="rail-button" aria-label="Settings">⚙</button>
        <div class="rail-bottom"><span class="connection-dot" /></div>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div class="breadcrumb">WORKSPACE <span>/</span> opencode-plugin-plan-review</div>
          <div class="runtime"><span class="connection-dot" /> OPENCODE <span class="runtime-state">OFFLINE</span></div>
        </header>

        <div class="content">
          <div class="eyebrow"><span class="eyebrow-line" /> SAI HARNESS <span class="eyebrow-muted">— LOCAL WORKSPACE</span></div>
          <div class="heading-row">
            <div>
              <h1>Plan review</h1>
              <p class="subtitle">Turn an idea into reviewed work, then hand it to an agent.</p>
            </div>
            <button class="quiet-button">↗ <span>Open project</span></button>
          </div>

          <section class="project-card">
            <div class="project-icon">⌘</div>
            <div class="project-meta"><span class="label">CURRENT PROJECT</span><strong>opencode-plugin-plan-review</strong><span class="path">~/sideprojects/opencode-plugin-plan-review</span></div>
            <span class="branch">⑂ main</span>
          </section>

          <div class="section-heading"><div><span class="section-index">01</span><h2>Active workflow</h2></div><span class="status-pill"><i /> IN PROGRESS</span></div>
          <section class="workflow-card">
            <div class="workflow-top"><div><span class="label">PLAN REVIEW · CREATED JUST NOW</span><h3>Build a desktop harness around OpenCode</h3></div><button class="more" aria-label="More options">···</button></div>
            <div class="step-list">
              <For each={steps}>{(step) => <div class={`step ${step.state}`}>
                <span class="step-marker">{step.state === "done" ? "✓" : step.number}</span>
                <div class="step-copy"><strong>{step.title}</strong><span>{step.detail}</span></div>
                <span class="step-state">{step.state === "active" ? "IN REVIEW" : step.state.toUpperCase()}</span>
              </div>}</For>
            </div>
            <footer class="workflow-footer"><span>2 of 4 steps reviewed</span><div class="progress"><i /></div><button class="review-button">Review plan <span>→</span></button></footer>
          </section>

          <div class="section-heading recent-heading"><div><span class="section-index">02</span><h2>Recent runs</h2></div><button class="text-button">View all <span>→</span></button></div>
          <div class="empty-run"><span class="empty-icon">↗</span><span>Your agent runs will appear here after a plan is approved.</span></div>

          <div class="connect-note"><span class="note-icon">↯</span><span>Connect to an OpenCode server to start a session.</span><button>Configure connection <span>→</span></button></div>
        </div>
      </section>
    </main>
  );
}

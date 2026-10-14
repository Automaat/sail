<script lang="ts">
  import type { TaskSnapshot } from './lib/session-tasks';
  let {
    snapshot,
    observedActivity = null,
  }: { snapshot: TaskSnapshot; observedActivity?: string | null } = $props();
</script>

<section class="tasks-panel" aria-label="Session tasks">
  <h2>Tasks</h2>
  {#if observedActivity === null && snapshot.reporting?.state === 'missing'}
    <p role="status">
      Task report missing. The agent did not report tasks.
      {#if snapshot.reporting.correctionRequested}One corrective request was attempted.{/if}
    </p>
  {:else if observedActivity === null && snapshot.reporting?.state === 'correcting'}
    <p role="status">Task report missing. Requesting one update from the agent…</p>
  {:else if observedActivity === null && (snapshot.reporting?.state === 'failed' || snapshot.reporting?.state === 'interrupted')}
    <p>
      Task report unavailable — turn {snapshot.reporting.state}.
      {#if snapshot.reporting.correctionRequested}
        One corrective request was attempted.
      {:else}No corrective request sent.{/if}
    </p>
  {/if}
  {#if observedActivity !== null}<p>Observed activity: {observedActivity}</p>
    <p>
      This provider does not verify child task calls. Tasks and focus cannot be reported from this
      child.
    </p>{:else if !snapshot.tasks.length}<p>No tasks reported in this session.</p>{:else}<ul>
      {#each snapshot.tasks as task (task.id)}<li class:focused={snapshot.focus === task.id}>
          <span class="task-title">{task.title}</span>
          <span class="task-status"
            >{task.origin === 'sail'
              ? task.status === 'done'
                ? 'Agent report received'
                : 'Waiting for agent report'
              : task.status.replaceAll('_', ' ')}</span
          >
          {#if task.origin === 'sail'}<span class="task-origin">Sail starting task</span>{/if}
          {#if snapshot.focus === task.id}<span class="task-origin">Current focus</span>{/if}
        </li>{/each}
    </ul>{/if}
</section>

<style>
  .tasks-panel {
    padding: 16px;
    min-width: 0;
  }
  h2 {
    font-size: 16px;
    margin: 0 0 12px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--sui-border);
  }
  .task-title {
    flex: 1 1 100%;
    overflow-wrap: anywhere;
  }
  .task-status,
  .task-origin {
    font-size: 12px;
    color: var(--sui-muted);
  }
  .focused .task-title {
    font-weight: 600;
  }
</style>

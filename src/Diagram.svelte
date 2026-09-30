<script lang="ts">
  interface Props {
    source: string;
    dark: boolean;
  }

  let { source, dark }: Props = $props();
  let svg = $state('');
  let error = $state('');
  let generation = 0;

  $effect(() => {
    const current = ++generation;
    svg = '';
    error = '';
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'neutral',
        });
        const rendered = await mermaid.render(`sai-plan-${current}-${Math.random().toString(36).slice(2)}`, source);
        if (current === generation) svg = rendered.svg;
      } catch {
        if (current === generation) error = 'Diagram preview is unavailable.';
      }
    })();
  });
</script>

<div class="diagram" aria-label="Plan diagram">
  {#if svg}
    {@html svg}
  {:else if error}
    <p>{error}</p>
    <pre>{source}</pre>
  {:else}
    <p>Rendering diagram…</p>
  {/if}
</div>

<style>
  .diagram { overflow: auto; padding: 16px; border: 1px solid var(--shell-divider); border-radius: 10px; background: var(--sui-surface); }
  .diagram :global(svg) { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  p { margin: 0; color: var(--sui-muted); font-size: 13px; }
  pre { overflow: auto; font-size: 12px; white-space: pre-wrap; }
</style>

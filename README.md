# SAI Harness

A desktop workspace for planning and reviewing coding-agent work. OpenCode runs the agent sessions; SAI Harness manages the workflow around them: plans, reviewer findings, decisions, approvals, and implementation handoff.

## Current scaffold

- Tauri 2 desktop shell with a SolidJS interface.
- Initial plan-review workspace screen.
- OpenCode server integration is the next implementation step; the UI currently uses illustrative sample data.

## Development

Prerequisites: Rust, Node.js, and the platform dependencies required by [Tauri](https://tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev
```

To run the frontend by itself:

```sh
npm run dev
```

## Architecture direction

```text
SolidJS UI ── Tauri commands ── local app services
                                  ├── OpenCode server (HTTP + SSE)
                                  └── local workflow store (plans, reviews, decisions)
```

OpenCode owns agent execution and session state. SAI Harness owns the review workflow and links its records to OpenCode sessions. Keep the plan-review OpenCode plugin useful as a standalone integration.

## License

MIT

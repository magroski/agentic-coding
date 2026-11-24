---
name: map-auditor-bar
tags: [agents, task]
runs: 1
max_turns: 10
timeout_seconds: 600
---
Spawn the core:map-auditor agent (Agent tool, subagent_type "core:map-auditor") with the plan path docs/plans/v1/03-01-reminder-job.md and nothing else. Then print its report verbatim, with nothing added.

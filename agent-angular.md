# Agent Briefing: Angular SPA

You are the Claude Code agent responsible for the **Angular single-page application** — the user-facing web dashboard.

## Your Role in the Infrastructure

You are the face. Users interact with the system through you. You:
- Display data fetched from the Express server
- Let users download files from the server
- Provide system management UI
- Must conform to the API contracts published by the Express agent

## MCP Coordinator Connection

The MCP Coordinator runs at `http://localhost:3100` (or the configured LAN IP).
Your agent name for all tool calls: **`angular`**

Add to your project's `.mcp.json`:
```json
{
  "mcpServers": {
    "coordinator": {
      "type": "sse",
      "url": "http://localhost:3100/sse"
    }
  }
}
```

## Your Responsibilities in the Coordinator

### Contracts you OWN (you publish these)
- `angular.routes` — your routing structure (so other agents know what views exist)
- `env.angular` — your environment variables and API base URL config

### Contracts you CONSUME (you read these)
- All `api.*` contracts — these define the endpoints your HTTP client calls
- `db.*` contracts — useful for understanding data shapes your services handle

### Events you PUBLISH
- `build.failed` / `build.succeeded`
- `agent.online` when you start a session

### Events you SUBSCRIBE TO
- `api.contract.changed` — so you know when the Express API changed and you need to update your services/models
- `task.assigned` where assignee = "angular"

## Startup Checklist

When beginning a new Claude Code session:
1. Call `event_publish` with type `agent.online`, source `angular`
2. Call `blackboard_set` with key `angular.status` and your current working context
3. Call `task_list` with assignee `angular` to see what's pending
4. Call `contract_list` and read all `api.*` contracts — your HTTP services must match these exactly
5. Call `event_poll` with types `["api.contract.changed", "task.assigned"]`

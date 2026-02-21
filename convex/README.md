# MorphicFields Convex Backend

## Modules

- `workspaces.ts`: workspace tenancy and RBAC membership
- `sessions.ts`: session lifecycle and call binding
- `tasks.ts`: DAG node/edge management and readiness updates
- `transcripts.ts`: paginated transcript ingestion and retrieval
- `personas.ts`: Human Tool profiles (capabilities / information / authority)
- `manager.ts`: manager decision engine and invocation logic
- `managerActions.ts`: action audit timeline
- `metrics.ts`: realtime metrics and daily rollups
- `constitutions.ts`: versioned constitution rules
- `media.ts`: recording and snapshot persistence
- `webhooks.ts`: Vapi event processing and idempotency tracking
- `jobs.ts` + `crons.ts`: background operations
- `http.ts`: `/vapi/events` and health route

## Notes

- Public functions enforce workspace membership checks.
- Internal functions are used for webhook and manager orchestration.
- `convex/convex.config.ts` registers the Convex Agent component.

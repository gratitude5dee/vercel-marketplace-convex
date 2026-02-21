# MorphicFields

MorphicFields is a production-oriented Next.js + Convex dashboard for orchestrating multi-human collaboration sessions driven by a Vapi voice manager.

## Core capabilities

- Workspace-scoped multi-tenant session management
- Realtime task graph (DAG) with dependencies and assignment/status updates
- Transcript ingestion from Vapi webhook events
- Manager decision logging and Human Tool invocation triggers
- Constitution versioning and session metrics tracking
- Recording/media persistence with replay view
- Operational cron jobs (cleanup, recovery, daily rollups)

## Routes

- `/` workspace and session management
- `/sessions/[sessionId]` live dashboard
- `/sessions/[sessionId]/replay` replay view
- `/server` reserved server-rendered route

## Local development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

If you are not wiring auth immediately, set `DEV_AUTH_USER_ID` for local development identity fallback.

3. Run frontend and backend:

```bash
npm run dev:full
```

## CI quality gates

```bash
npm run ci
```

This runs lint, typecheck, and unit/integration/e2e test suites.

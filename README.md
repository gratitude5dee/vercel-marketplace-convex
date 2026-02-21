# Aura (MorphicFields) — Human-Agent Task Management Dashboard

Aura is a production-oriented **Next.js + Convex** dashboard for orchestrating **multi-human collaboration sessions** led by a **voice Manager Agent** (Vapi). It’s built around the *Human Tool* paradigm: **the AI orchestrates** and selectively “calls” humans for the things humans are uniquely good at—preferences, judgment, creativity, and authorization.

Human Tool Paper : https://arxiv.org/pdf/2602.12953
Orchestrating Human-AI Teams Paper : https://arxiv.org/pdf/2510.02557

---

## Why this exists (the “Human Tool” inversion)

Most “human-in-the-loop” systems assume the human should orchestrate the AI. The Human Tool research argues the opposite: when the AI is strong at planning/execution, **human-led orchestration becomes the bottleneck** (attention, coordination overhead). Instead, the AI should lead and **invoke humans only at the right moments**.

Aura implements that by:

- Treating participants as structured **Human Tools** with explicit:
  - **Capabilities** (judgment/creativity/external interaction)
  - **Information** (domain expertise/private constraints/preferences)
  - **Authority** (what requires approval / what can be shared)
- Using **invocation triggers** to decide when to pull a human into the loop:
  - **Capability complementarity**
  - **Information exchange**
  - **Authority control**
- Driving interactions with **voice** (lower friction than typing), while the dashboard tracks state and decisions.

---

## What you get

### Core product capabilities
- **Workspace-scoped** multi-tenant session management
- **Realtime task graph (DAG)** with dependencies, assignment, and status updates
- **Transcript ingestion** from Vapi webhook events
- **Manager decision logging** + Human Tool invocation triggers
- **Constitution versioning** + session metrics tracking (evolving norms + guardrails)
- **Recording/media persistence** with a replay view
- **Operational cron jobs** (cleanup, recovery, daily rollups)

### Human-Tool-aligned interaction behaviors (voice)
Aura’s Manager Agent is designed to:
- **Prime → Configure** at the start (context + collaboration style)
- During work: **Probe → Cue → Elicit → Augment → Guide → Critique**
- When wrong: **Explain → Correct → Reflect**
- Ending: **Approve** (final confirmation before committing)

---

## Routes

- `/` — workspace + session management
- `/sessions/[sessionId]` — live dashboard
- `/sessions/[sessionId]/replay` — replay view
- `/server` — reserved server-rendered route

---

## Architecture (high level)

- **Frontend:** Next.js (App Router) + React
- **Backend:** Convex (realtime DB + actions + webhooks)
- **Voice layer:** Vapi (webhooks for transcript + events)
- **LLM:** configured via `MORPHICFIELDS_MANAGER_MODEL` (defaults to `claude-3-5-haiku-latest`)
- **Agent framework:** `@convex-dev/agent`

> Conceptually: Convex is the state machine + event bus; the dashboard is the control room; Vapi is the human interface; the Manager Agent is the orchestrator.

---

## Local development

### 1) Install dependencies
```bash
npm install

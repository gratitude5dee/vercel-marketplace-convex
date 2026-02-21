# MorphicFields Release Workflow

## Environments

- `preview`: default for pull request deployments.
- `staging`: pre-production environment for acceptance checks.
- `prod`: production environment.

Each environment must use separate Convex deployments and environment variables:

- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- `VAPI_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `MORPHICFIELDS_MANAGER_MODEL`

## Promotion Rules

1. Merge to preview branch and validate all CI checks.
2. Promote preview build to staging and execute webhook smoke tests.
3. Promote staging build to production after manual approval and zero failing checks.

## Required Checks

- `npm run lint`
- `npm run typecheck`
- `npm run test`

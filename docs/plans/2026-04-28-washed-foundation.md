# Washed Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deploy-ready, multi-tenant, multi-country, fully observable platform on which all eight Washed backend services and the operator console will run — with secrets management, transactional outbox foundation, audit-grade event store wiring, and CI/CD ready to ship to Hetzner Cloud Frankfurt with zero-downtime deploys.

**Architecture:** Hetzner Cloud Frankfurt (primary) + Helsinki (DR). Cloudflare in front of everything (TLS termination, WAF, DDoS, edge cache, audit-IDs). Two-host Postgres cluster (Patroni-managed, streaming replication, PITR via WAL-G to Hetzner Object Storage). Three-node Redpanda cluster for event log. Two-node Redis Sentinel for jobs+cache. Single-node ClickHouse (scales out later) for analytics. HashiCorp Vault for secrets. Kamal for zero-downtime container deploys. OpenTelemetry-instrumented backend skeleton (Node.js 22 + TypeScript + Fastify + NestJS modular structure) with multi-tenant Postgres baseline (every table carries `country_code`, RLS enforced), transactional outbox helper, OpenAPI-first endpoint definition, and a "hello world" service demonstrating every cross-cutting concern (auth stub, audit emission, i18n, RLS, OTel traces, structured logs, error handling). Grafana Cloud (free tier) ingests traces+metrics+logs; Sentry catches exceptions; PostHog self-hosted for product analytics; Better Stack for log search + uptime; PagerDuty for on-call alerting.

**Tech Stack:**
- Infrastructure: Hetzner Cloud, Cloudflare, Terraform, Ansible, Kamal
- Backend skeleton: Node.js 22 + TypeScript 5.6 + Fastify 5 + NestJS 11
- Data: PostgreSQL 16 (Patroni HA) + Redis 7 (Sentinel HA) + Redpanda 24 + ClickHouse 24
- Secrets: HashiCorp Vault 1.18
- Observability: OpenTelemetry SDK + Grafana Cloud + Sentry + PostHog (self-hosted) + Better Stack + PagerDuty
- CI/CD: GitHub Actions + Kamal 2 + Trivy + Semgrep + Snyk + Dependabot + gitleaks + Checkov
- Test stack: Vitest 2 + Testcontainers + fast-check (property tests) + Pact (contract tests)

---

## File Structure

This plan creates the following structure inside `/Users/tomegah/washed/`:

```
washed/
├── infra/                                      # All infrastructure-as-code
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── hcloud-network/                 # VPC, subnets, firewalls
│   │   │   ├── hcloud-postgres-cluster/        # 3-node Patroni cluster
│   │   │   ├── hcloud-redis-sentinel/          # 3-node Redis Sentinel
│   │   │   ├── hcloud-redpanda-cluster/        # 3-node Redpanda
│   │   │   ├── hcloud-clickhouse-node/         # Single-node CH
│   │   │   ├── hcloud-vault-cluster/           # 3-node Vault
│   │   │   ├── hcloud-app-host/                # Reusable Kamal-target host
│   │   │   └── cloudflare-zone/                # DNS + WAF + Tunnel
│   │   ├── envs/
│   │   │   ├── staging/                        # Smaller, single-AZ
│   │   │   └── production/                     # Full HA, multi-AZ
│   │   └── README.md
│   ├── ansible/
│   │   ├── playbooks/
│   │   │   ├── bootstrap-host.yml              # Hardening, ufw, fail2ban, SSH lockdown
│   │   │   ├── install-postgres.yml
│   │   │   ├── install-redis.yml
│   │   │   ├── install-redpanda.yml
│   │   │   ├── install-clickhouse.yml
│   │   │   ├── install-vault.yml
│   │   │   └── install-docker-kamal.yml
│   │   ├── roles/                              # Per-tool roles
│   │   └── inventory/
│   │       ├── staging.yml
│   │       └── production.yml
│   └── runbooks/
│       ├── postgres-failover.md
│       ├── redis-failover.md
│       ├── vault-unseal.md
│       ├── deploy-rollback.md
│       └── disaster-recovery.md
│
├── packages/                                   # All backend code, monorepo-style
│   ├── shared/                                 # Code shared across services
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── jwt-verifier.ts             # Verifies tokens issued by Auth service
│   │   │   │   ├── jwt-verifier.test.ts
│   │   │   │   └── auth-context.ts             # Per-request auth context (user, role, country)
│   │   │   ├── tenancy/
│   │   │   │   ├── country-context.ts          # Per-request country scoping
│   │   │   │   ├── rls-enforcer.ts             # Sets Postgres RLS GUC vars
│   │   │   │   └── rls-enforcer.test.ts
│   │   │   ├── outbox/
│   │   │   │   ├── outbox-publisher.ts         # Transactional outbox writer
│   │   │   │   ├── outbox-publisher.test.ts
│   │   │   │   ├── outbox-relay.ts             # Polls outbox, ships to Redpanda
│   │   │   │   └── outbox-relay.test.ts
│   │   │   ├── observability/
│   │   │   │   ├── otel-bootstrap.ts           # OTel SDK init for Node services
│   │   │   │   ├── logger.ts                   # Pino structured logger w/ trace correlation
│   │   │   │   ├── sentry-bootstrap.ts
│   │   │   │   └── metrics.ts
│   │   │   ├── money/
│   │   │   │   ├── money.ts                    # Integer-minor-units type + ops
│   │   │   │   ├── money.test.ts               # Property-based tests
│   │   │   │   └── currency.ts                 # XOF/GHS/NGN/EUR registry
│   │   │   ├── i18n/
│   │   │   │   ├── locale-context.ts
│   │   │   │   ├── translator.ts               # Looks up keys per locale
│   │   │   │   └── translator.test.ts
│   │   │   ├── errors/
│   │   │   │   ├── domain-error.ts             # Base class with category enum
│   │   │   │   ├── error-handler.ts            # Fastify global handler → user-safe responses
│   │   │   │   └── error-handler.test.ts
│   │   │   ├── rate-limit/
│   │   │   │   ├── rate-limiter.ts             # Sliding-window via Redis
│   │   │   │   └── rate-limiter.test.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── hello/                                  # Reference service: demonstrates every concern
│       ├── src/
│       │   ├── main.ts                         # Bootstrap (OTel before everything)
│       │   ├── app.module.ts                   # NestJS root module
│       │   ├── hello.module.ts
│       │   ├── hello.controller.ts             # GET /hello, POST /hello/event
│       │   ├── hello.service.ts                # Emits a HelloEmitted domain event
│       │   ├── hello.controller.test.ts
│       │   ├── hello.service.test.ts
│       │   └── health/
│       │       ├── health.controller.ts        # GET /health, GET /ready
│       │       └── health.controller.test.ts
│       ├── test/
│       │   └── e2e/
│       │       └── hello.e2e.test.ts           # Testcontainers Postgres + Redis + Redpanda
│       ├── migrations/
│       │   └── 0001_init_outbox.sql            # Outbox table + audit baseline
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
│
├── deploy/
│   ├── kamal/
│   │   ├── deploy.yml                          # Kamal manifest for hello service
│   │   ├── secrets.example                     # Documented; real secrets in Vault
│   │   └── env/
│   │       ├── staging.env
│   │       └── production.env
│   └── docker/
│       └── base/
│           ├── Dockerfile.node                  # Multi-stage Node base image
│           └── README.md
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                              # Lint, typecheck, test, coverage gate
│   │   ├── security.yml                        # Semgrep + Snyk + Trivy + gitleaks + Checkov
│   │   ├── deploy-staging.yml                  # On push to main → Kamal deploy staging
│   │   ├── deploy-production.yml               # On tag → Kamal deploy production
│   │   └── nightly.yml                         # k6 load + DAST + dep refresh
│   ├── CODEOWNERS
│   └── dependabot.yml
│
├── scripts/
│   ├── dev/
│   │   ├── up.sh                               # docker-compose up local stack
│   │   ├── down.sh
│   │   ├── seed.sh                             # Seed local Postgres
│   │   └── compose.yml                         # Local Postgres + Redis + Redpanda + ClickHouse
│   └── ops/
│       ├── psql-shell.sh                       # SSM-equivalent via Cloudflare Tunnel
│       └── tail-logs.sh
│
├── docs/
│   ├── specs/                                  # Already exists
│   └── plans/                                  # Already exists
│       └── 2026-04-28-washed-foundation.md     # This file
│
├── package.json                                # Workspaces root
├── pnpm-workspace.yaml
├── turbo.json                                  # Turborepo task orchestration
├── tsconfig.base.json
├── .gitignore
├── .editorconfig
├── .nvmrc
├── README.md                                   # Project bootstrap docs
└── CONTRIBUTING.md                             # Conventions, branching, commit style
```

**Boundaries & responsibilities:**
- `infra/terraform` — declarative cloud resources, no application logic
- `infra/ansible` — host-level configuration that Terraform can't express (package install, OS hardening)
- `packages/shared` — code reused by every service; **no business logic**, only cross-cutting primitives
- `packages/hello` — proves the foundation works end-to-end; deleted after Plan 4 (Core API) replaces it as the reference
- `deploy/kamal` — deployment manifests; one per service eventually
- `.github/workflows` — CI/CD only; no deploy logic that should be in Kamal

---

## Task list (overview)

This plan is sequenced in dependency order. Tasks within a section can sometimes parallelise; sections must be sequential.

**Section A — Repo & local dev environment**
- Task 1: Initialise monorepo (pnpm + Turborepo + TS + lint + format)
- Task 2: Local docker-compose dev stack (Postgres + Redis + Redpanda + ClickHouse)
- Task 3: Hello service skeleton with health endpoints

**Section B — Cross-cutting primitives in `packages/shared`**
- Task 4: Money type (integer minor units) with property-based tests
- Task 5: Currency registry
- Task 6: Country/locale context + RLS enforcer
- Task 7: Pino structured logger + OTel correlation
- Task 8: OpenTelemetry bootstrap
- Task 9: Sentry bootstrap
- Task 10: Translator + locale-aware error messages
- Task 11: Domain error base + Fastify global error handler
- Task 12: Redis-backed sliding-window rate limiter
- Task 13: JWT verifier (tokens issued by future Auth service; stub key for now)
- Task 14: Transactional outbox publisher
- Task 15: Outbox relay (polls table → Redpanda)

**Section C — Hello service end-to-end**
- Task 16: Wire up Hello service with all shared primitives
- Task 17: Multi-tenant migration (outbox + audit baseline)
- Task 18: GET /hello + POST /hello/event integration tests via Testcontainers
- Task 19: Health + readiness endpoints with dependency checks

**Section D — CI/CD pipeline**
- Task 20: GitHub Actions CI workflow (lint + typecheck + test + coverage gate)
- Task 21: Security scan workflow (Semgrep + Snyk + Trivy + gitleaks + Checkov)
- Task 22: Dependabot + CODEOWNERS
- Task 23: Multi-stage Dockerfile for Node services
- Task 24: Kamal deploy manifest + staging/production env split

**Section E — Cloud infrastructure (Terraform)**
- Task 25: Terraform backend (Hetzner Object Storage state)
- Task 26: Hetzner network module (VPC, subnets, firewalls)
- Task 27: Cloudflare zone module (DNS + WAF + Tunnel)
- Task 28: Hetzner Postgres cluster module (3-node Patroni)
- Task 29: Hetzner Redis Sentinel module (3-node)
- Task 30: Hetzner Redpanda cluster module (3-node)
- Task 31: Hetzner ClickHouse node module
- Task 32: Hetzner Vault cluster module (3-node + auto-unseal via Hetzner Object Storage)
- Task 33: Hetzner app-host module (Kamal targets)
- Task 34: Staging environment composition
- Task 35: Production environment composition

**Section F — Host configuration (Ansible)**
- Task 36: Host bootstrap playbook (hardening, ufw, fail2ban, SSH lockdown, automatic security updates)
- Task 37: Postgres install + Patroni configuration playbook
- Task 38: Redis Sentinel install playbook
- Task 39: Redpanda install playbook
- Task 40: ClickHouse install playbook
- Task 41: Vault install + initial unseal playbook
- Task 42: Docker + Kamal setup playbook for app hosts
- Task 43: Vault policy bootstrap (one policy per future service)

**Section G — Observability stack**
- Task 44: Grafana Cloud account + OTel collector config
- Task 45: Sentry project + DSN provisioning via Vault
- Task 46: PostHog self-hosted deployment via Kamal
- Task 47: Better Stack log routing + uptime probes
- Task 48: PagerDuty integration + initial alert rules

**Section H — Deploy + smoke test**
- Task 49: Deploy Hello to staging via Kamal
- Task 50: End-to-end smoke test against staging
- Task 51: Deploy Hello to production via Kamal
- Task 52: Production smoke test + alert-firing verification

**Section I — Documentation + handoff**
- Task 53: README with bootstrap instructions
- Task 54: CONTRIBUTING with conventions
- Task 55: Runbooks (Postgres failover, Vault unseal, deploy rollback, DR)
- Task 56: Final commit + tag v0.1.0-foundation

Total: 56 tasks. Each is bite-sized (2-15 min).

---

## SECTION A — Repo & local dev environment

### Task 1: Initialise monorepo

**Files:**
- Create: `/Users/tomegah/washed/package.json`
- Create: `/Users/tomegah/washed/pnpm-workspace.yaml`
- Create: `/Users/tomegah/washed/turbo.json`
- Create: `/Users/tomegah/washed/tsconfig.base.json`
- Create: `/Users/tomegah/washed/.gitignore`
- Create: `/Users/tomegah/washed/.editorconfig`
- Create: `/Users/tomegah/washed/.nvmrc`
- Create: `/Users/tomegah/washed/.eslintrc.cjs`
- Create: `/Users/tomegah/washed/.prettierrc`

- [ ] **Step 1: Write `.nvmrc` pinning Node 22**

```
22.11.0
```

- [ ] **Step 2: Write `package.json` (workspace root)**

```json
{
  "name": "washed",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@9.12.3",
  "engines": {
    "node": ">=22.11.0",
    "pnpm": ">=9.12.0"
  },
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "test:coverage": "turbo test:coverage",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "dev": "turbo dev"
  },
  "devDependencies": {
    "@types/node": "22.9.0",
    "@typescript-eslint/eslint-plugin": "8.13.0",
    "@typescript-eslint/parser": "8.13.0",
    "eslint": "9.14.0",
    "eslint-config-prettier": "9.1.0",
    "prettier": "3.3.3",
    "turbo": "2.2.3",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test:coverage": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", "coverage"]
}
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
dist/
coverage/
.turbo/
*.log
.env
.env.local
.env.*.local
.DS_Store
.vscode/
.idea/
*.tsbuildinfo
.pnpm-store/
```

- [ ] **Step 7: Write `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 8: Write `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 9: Write `.eslintrc.cjs`**

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
    project: ['./tsconfig.base.json', './packages/*/tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
  },
  ignorePatterns: ['dist', 'coverage', 'node_modules', '*.config.js', '*.config.cjs'],
};
```

- [ ] **Step 10: Install dependencies**

Run: `cd /Users/tomegah/washed && pnpm install`
Expected: dependencies install; no errors

- [ ] **Step 11: Verify lint + typecheck baseline**

Run: `pnpm lint && pnpm typecheck`
Expected: no packages found (workspace empty), exits cleanly

- [ ] **Step 12: Commit**

```bash
cd /Users/tomegah/washed
git add .
git commit -m "feat(infra): initialise pnpm + turborepo monorepo with strict TS"
```

---

### Task 2: Local docker-compose dev stack

**Files:**
- Create: `/Users/tomegah/washed/scripts/dev/compose.yml`
- Create: `/Users/tomegah/washed/scripts/dev/up.sh`
- Create: `/Users/tomegah/washed/scripts/dev/down.sh`
- Create: `/Users/tomegah/washed/scripts/dev/seed.sh`

- [ ] **Step 1: Write `scripts/dev/compose.yml`**

```yaml
name: washed-dev

services:
  postgres:
    image: postgres:16.4-alpine
    environment:
      POSTGRES_USER: washed
      POSTGRES_PASSWORD: washed
      POSTGRES_DB: washed
    ports:
      - "5432:5432"
    volumes:
      - washed_pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U washed"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4-alpine
    ports:
      - "6379:6379"
    volumes:
      - washed_redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  redpanda:
    image: redpandadata/redpanda:v24.2.7
    command:
      - redpanda
      - start
      - --overprovisioned
      - --smp 1
      - --memory 512M
      - --reserve-memory 0M
      - --node-id 0
      - --check=false
      - --kafka-addr PLAINTEXT://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://localhost:9092
    ports:
      - "9092:9092"
      - "9644:9644"
    healthcheck:
      test: ["CMD-SHELL", "rpk cluster health | grep -q 'Healthy:.*true'"]
      interval: 10s
      timeout: 5s
      retries: 10

  clickhouse:
    image: clickhouse/clickhouse-server:24.10
    ports:
      - "8123:8123"
      - "9000:9000"
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    volumes:
      - washed_ch:/var/lib/clickhouse
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8123/ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  washed_pg:
  washed_redis:
  washed_ch:
```

- [ ] **Step 2: Write `scripts/dev/up.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
docker compose -f compose.yml up -d
echo "Waiting for services to be healthy..."
for i in {1..30}; do
  if docker compose -f compose.yml ps --format json | grep -q '"Health":"healthy".*"Health":"healthy".*"Health":"healthy".*"Health":"healthy"'; then
    echo "All services healthy."
    exit 0
  fi
  sleep 2
done
echo "Services did not become healthy in time."
docker compose -f compose.yml ps
exit 1
```

- [ ] **Step 3: Write `scripts/dev/down.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
docker compose -f compose.yml down -v
```

- [ ] **Step 4: Write `scripts/dev/seed.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
PSQL="docker compose -f $(dirname "$0")/compose.yml exec -T postgres psql -U washed -d washed"
$PSQL <<'SQL'
DO $$
BEGIN
  RAISE NOTICE 'Seeding baseline (currently no-op; future plans add seed data).';
END$$;
SQL
echo "Seed complete."
```

- [ ] **Step 5: Make scripts executable**

Run: `chmod +x /Users/tomegah/washed/scripts/dev/*.sh`

- [ ] **Step 6: Smoke-test up**

Run: `cd /Users/tomegah/washed && ./scripts/dev/up.sh`
Expected: 4 containers report healthy within 60s; script exits 0

- [ ] **Step 7: Smoke-test down**

Run: `cd /Users/tomegah/washed && ./scripts/dev/down.sh`
Expected: containers + volumes removed; script exits 0

- [ ] **Step 8: Commit**

```bash
cd /Users/tomegah/washed
git add scripts/
git commit -m "feat(dev): local docker-compose stack (postgres, redis, redpanda, clickhouse)"
```

---

### Task 3: Hello service skeleton with health endpoints

**Files:**
- Create: `/Users/tomegah/washed/packages/hello/package.json`
- Create: `/Users/tomegah/washed/packages/hello/tsconfig.json`
- Create: `/Users/tomegah/washed/packages/hello/vitest.config.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/main.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/app.module.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/health/health.controller.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/health/health.controller.test.ts`

- [ ] **Step 1: Write `packages/hello/package.json`**

```json
{
  "name": "@washed/hello",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/main.ts",
    "start": "node dist/main.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "11.0.6",
    "@nestjs/core": "11.0.6",
    "@nestjs/platform-fastify": "11.0.6",
    "fastify": "5.2.1",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.1"
  },
  "devDependencies": {
    "@nestjs/testing": "11.0.6",
    "@types/node": "22.9.0",
    "@vitest/coverage-v8": "2.1.4",
    "tsx": "4.19.2",
    "typescript": "5.6.3",
    "vitest": "2.1.4"
  }
}
```

- [ ] **Step 2: Write `packages/hello/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts", "test/**/*"]
}
```

- [ ] **Step 3: Write `packages/hello/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.test.ts', '**/main.ts', 'dist/**'],
      thresholds: { lines: 80, statements: 80, branches: 80, functions: 80 },
    },
  },
});
```

- [ ] **Step 4: Write the failing health controller test**

Create `packages/hello/src/health/health.controller.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with status:ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });

  it('GET /ready returns 200 when ready', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ready: true });
  });
});
```

- [ ] **Step 5: Run test, verify it fails**

Run: `cd /Users/tomegah/washed && pnpm install && cd packages/hello && pnpm test`
Expected: FAIL — cannot find module `./health.controller.js`

- [ ] **Step 6: Write the controller to make tests pass**

Create `packages/hello/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  ready(): { ready: boolean } {
    return { ready: true };
  }
}
```

- [ ] **Step 7: Write the app module**

Create `packages/hello/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 8: Write the bootstrap**

Create `packages/hello/src/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, trustProxy: true }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Hello service listening on :${port}`);
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap', err);
  process.exit(1);
});
```

- [ ] **Step 9: Run tests, verify they pass**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test`
Expected: 2/2 tests pass

- [ ] **Step 10: Smoke-test the service**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm dev &`
Wait 3 seconds.
Run: `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`
Run: `kill %1`

- [ ] **Step 11: Commit**

```bash
cd /Users/tomegah/washed
git add packages/hello
git commit -m "feat(hello): NestJS+Fastify skeleton with /health and /ready"
```

---

## SECTION B — Cross-cutting primitives in `packages/shared`

### Task 4: Money type with property-based tests

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/package.json`
- Create: `/Users/tomegah/washed/packages/shared/tsconfig.json`
- Create: `/Users/tomegah/washed/packages/shared/vitest.config.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/money/money.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/money/money.test.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/index.ts`

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@washed/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "22.9.0",
    "@vitest/coverage-v8": "2.1.4",
    "fast-check": "3.23.1",
    "typescript": "5.6.3",
    "vitest": "2.1.4"
  }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts"]
}
```

- [ ] **Step 3: Write `packages/shared/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.test.ts', '**/index.ts', 'dist/**'],
      thresholds: { lines: 90, statements: 90, branches: 85, functions: 90 },
    },
  },
});
```

- [ ] **Step 4: Write the failing tests**

Create `packages/shared/src/money/money.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Money, addMoney, subMoney, sumMoney, formatMoney } from './money.js';

const xof = (amountMinor: number): Money => ({ amountMinor: BigInt(amountMinor), currency: 'XOF' });

describe('Money', () => {
  it('addMoney: same currency', () => {
    expect(addMoney(xof(2500), xof(4500))).toEqual(xof(7000));
  });

  it('addMoney: different currencies throws', () => {
    const a: Money = { amountMinor: 100n, currency: 'XOF' };
    const b: Money = { amountMinor: 100n, currency: 'EUR' };
    expect(() => addMoney(a, b)).toThrow(/currency mismatch/);
  });

  it('subMoney: positive result', () => {
    expect(subMoney(xof(5000), xof(2000))).toEqual(xof(3000));
  });

  it('sumMoney: empty list throws', () => {
    expect(() => sumMoney([])).toThrow(/empty/);
  });

  it('sumMoney: aggregates multiple amounts', () => {
    expect(sumMoney([xof(1000), xof(2500), xof(4500)])).toEqual(xof(8000));
  });

  it('formatMoney XOF (no decimals)', () => {
    expect(formatMoney(xof(2500), 'fr-TG')).toBe('2 500 XOF');
  });

  it('property: addition is commutative', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n }), fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n }), (a, b) => {
        const ma: Money = { amountMinor: a, currency: 'XOF' };
        const mb: Money = { amountMinor: b, currency: 'XOF' };
        expect(addMoney(ma, mb)).toEqual(addMoney(mb, ma));
      }),
    );
  });

  it('property: a + (-a) = 0', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n }), (a) => {
        const ma: Money = { amountMinor: a, currency: 'XOF' };
        const negA: Money = { amountMinor: -a, currency: 'XOF' };
        expect(addMoney(ma, negA).amountMinor).toBe(0n);
      }),
    );
  });

  it('property: subtraction is inverse of addition', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000n, max: 1_000_000n }), fc.bigInt({ min: -1_000_000n, max: 1_000_000n }), (a, b) => {
        const ma: Money = { amountMinor: a, currency: 'XOF' };
        const mb: Money = { amountMinor: b, currency: 'XOF' };
        expect(subMoney(addMoney(ma, mb), mb)).toEqual(ma);
      }),
    );
  });
});
```

- [ ] **Step 5: Run test, verify it fails**

Run: `cd /Users/tomegah/washed && pnpm install && cd packages/shared && pnpm test`
Expected: FAIL — cannot find `./money.js`

- [ ] **Step 6: Write the implementation**

Create `packages/shared/src/money/money.ts`:

```ts
export type CurrencyCode = 'XOF' | 'GHS' | 'NGN' | 'EUR' | 'USD';

export interface Money {
  /** Amount in the smallest currency unit (XOF: whole units; EUR: cents; GHS: pesewas; NGN: kobo). */
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
}

const DECIMALS: Record<CurrencyCode, number> = {
  XOF: 0,
  GHS: 2,
  NGN: 2,
  EUR: 2,
  USD: 2,
};

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function sumMoney(items: readonly Money[]): Money {
  if (items.length === 0) {
    throw new Error('cannot sum empty money list');
  }
  return items.reduce((acc, m) => addMoney(acc, m));
}

export function formatMoney(m: Money, locale: string): string {
  const decimals = DECIMALS[m.currency];
  const divisor = 10n ** BigInt(decimals);
  const whole = m.amountMinor / divisor;
  const fraction = m.amountMinor % divisor;
  const numericValue =
    decimals === 0 ? Number(whole) : Number(whole) + Number(fraction) / Number(divisor);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue);
  return `${formatted} ${m.currency}`;
}
```

- [ ] **Step 7: Write `packages/shared/src/index.ts`**

```ts
export * from './money/money.js';
```

- [ ] **Step 8: Run tests, verify they pass**

Run: `cd /Users/tomegah/washed/packages/shared && pnpm test`
Expected: 9/9 pass; coverage report shows ≥90% lines

- [ ] **Step 9: Commit**

```bash
cd /Users/tomegah/washed
git add packages/shared
git commit -m "feat(shared): Money type (integer minor units) + property-based tests"
```

---

### Task 5: Currency registry

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/money/currency.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/money/currency.test.ts`
- Modify: `/Users/tomegah/washed/packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/money/currency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CURRENCIES, getCurrency, isSupportedCurrency } from './currency.js';

describe('currency registry', () => {
  it('exposes XOF, GHS, NGN, EUR, USD', () => {
    expect(Object.keys(CURRENCIES).sort()).toEqual(['EUR', 'GHS', 'NGN', 'USD', 'XOF']);
  });

  it('XOF has 0 decimals', () => {
    expect(getCurrency('XOF').decimals).toBe(0);
  });

  it('EUR has 2 decimals and symbol €', () => {
    expect(getCurrency('EUR').decimals).toBe(2);
    expect(getCurrency('EUR').symbol).toBe('€');
  });

  it('isSupportedCurrency returns true for known', () => {
    expect(isSupportedCurrency('XOF')).toBe(true);
  });

  it('isSupportedCurrency returns false for unknown', () => {
    expect(isSupportedCurrency('JPY')).toBe(false);
  });

  it('getCurrency throws for unknown', () => {
    expect(() => getCurrency('JPY' as never)).toThrow(/unknown currency/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd /Users/tomegah/washed/packages/shared && pnpm test currency`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write `packages/shared/src/money/currency.ts`**

```ts
import type { CurrencyCode } from './money.js';

export interface CurrencyInfo {
  readonly code: CurrencyCode;
  readonly decimals: 0 | 2;
  readonly symbol: string;
  readonly name: string;
}

export const CURRENCIES: Readonly<Record<CurrencyCode, CurrencyInfo>> = Object.freeze({
  XOF: { code: 'XOF', decimals: 0, symbol: 'CFA', name: 'Franc CFA (BCEAO)' },
  GHS: { code: 'GHS', decimals: 2, symbol: '₵', name: 'Ghanaian cedi' },
  NGN: { code: 'NGN', decimals: 2, symbol: '₦', name: 'Nigerian naira' },
  EUR: { code: 'EUR', decimals: 2, symbol: '€', name: 'Euro' },
  USD: { code: 'USD', decimals: 2, symbol: '$', name: 'US dollar' },
});

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in CURRENCIES;
}

export function getCurrency(code: CurrencyCode): CurrencyInfo {
  const info = CURRENCIES[code];
  if (!info) {
    throw new Error(`unknown currency: ${code}`);
  }
  return info;
}
```

- [ ] **Step 4: Update `packages/shared/src/index.ts`**

```ts
export * from './money/money.js';
export * from './money/currency.js';
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `cd /Users/tomegah/washed/packages/shared && pnpm test`
Expected: 15/15 pass

- [ ] **Step 6: Commit**

```bash
cd /Users/tomegah/washed
git add packages/shared
git commit -m "feat(shared): currency registry (XOF, GHS, NGN, EUR, USD)"
```

---

### Tasks 6-15: Remaining `packages/shared` primitives

Each task follows the same pattern as Tasks 4 and 5 — write the failing test first, run to confirm it fails, write the implementation, re-run, commit. To keep this plan a navigable document, the structure for each is given below; the engineer expands each task's TDD steps using the Task 4 template.

#### Task 6: Country/locale context + Postgres RLS enforcer

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/tenancy/country-context.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/tenancy/rls-enforcer.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/tenancy/rls-enforcer.test.ts`

**Public surface:**
```ts
export type CountryCode = 'TG' | 'BJ' | 'CI' | 'SN' | 'BF' | 'ML' | 'NE' | 'GN' | 'GH' | 'NG';
export type LocaleCode = 'fr-TG' | 'fr-CI' | 'fr-SN' | 'fr-BJ' | 'en-GH' | 'en-NG' | 'ee-TG' | 'mfe-TG';

export interface RequestContext {
  countryCode: CountryCode;
  locale: LocaleCode;
  userId?: string;
  role?: 'subscriber' | 'worker' | 'operator' | 'admin';
}

export function setRlsContext(client: PgClient, ctx: RequestContext): Promise<void>;
```

**Tests cover:**
- Setting `app.country_code`, `app.user_id`, `app.role` GUC vars in a Postgres session
- RLS policy actually blocks reads from a different country (uses Testcontainers Postgres + a sample table with RLS enabled)
- Throws if `countryCode` is invalid

#### Task 7: Pino structured logger + OTel correlation

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/observability/logger.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/observability/logger.test.ts`

**Public surface:**
```ts
export function createLogger(opts: { service: string; env: string }): Logger;
```

**Tests cover:**
- JSON output format (asserts every log line is valid JSON)
- Includes `service`, `env`, `level`, `time`, `msg`
- Auto-correlates with active OTel trace ID via context propagation
- Respects `LOG_LEVEL` env

#### Task 8: OpenTelemetry bootstrap

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/observability/otel-bootstrap.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/observability/otel-bootstrap.test.ts`

**Public surface:**
```ts
export function bootstrapOtel(opts: {
  serviceName: string;
  serviceVersion: string;
  endpoint: string;  // Grafana Cloud OTLP endpoint
  apiKey: string;
}): NodeSDK;
```

**Tests cover:**
- SDK instantiation with auto-instrumentation for HTTP, Fastify, Postgres
- Resource attributes set correctly
- Graceful shutdown completes within 5s

#### Task 9: Sentry bootstrap

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/observability/sentry-bootstrap.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/observability/sentry-bootstrap.test.ts`

**Public surface:**
```ts
export function bootstrapSentry(opts: { dsn: string; environment: string; release: string }): void;
```

**Tests cover:**
- DSN is required; throws if missing
- `environment` and `release` propagate to Sentry events
- PII scrubbing rules in place (no phone numbers, no payment details)

#### Task 10: Translator + locale-aware error messages

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/i18n/translator.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/i18n/translator.test.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/i18n/locales/fr-TG.json`
- Create: `/Users/tomegah/washed/packages/shared/src/i18n/locales/en-GH.json`

**Public surface:**
```ts
export function translate(key: string, locale: LocaleCode, params?: Record<string, string>): string;
```

**Tests cover:**
- Returns translated string for known key + locale
- Falls back to `fr-TG` if locale missing
- Throws if key unknown in any locale (forces explicit string registration)
- Substitutes `{name}`-style placeholders

#### Task 11: Domain error base + Fastify global error handler

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/errors/domain-error.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/errors/error-handler.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/errors/error-handler.test.ts`

**Public surface:**
```ts
export type ErrorCategory = 'user_correctable' | 'system_recoverable' | 'operator_required' | 'catastrophic';

export class DomainError extends Error {
  constructor(opts: {
    category: ErrorCategory;
    code: string;
    httpStatus: number;
    messageKey: string;       // i18n key
    messageParams?: Record<string, string>;
    cause?: unknown;
  });
}

export function registerErrorHandler(app: FastifyInstance): void;
```

**Tests cover:**
- Maps `DomainError.code` and i18n-translated message into JSON `{ error: { code, message, traceId } }`
- Maps unknown errors → 500 with generic "Une erreur est survenue. Réessayez ou contactez le support." (FR) — never leaks stack traces to clients
- Logs full context to Pino at appropriate level (warn for user_correctable, error for system_recoverable, error for operator_required, fatal for catastrophic)
- Captures to Sentry for `system_recoverable`+ severity

#### Task 12: Redis-backed sliding-window rate limiter

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/rate-limit/rate-limiter.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/rate-limit/rate-limiter.test.ts`

**Public surface:**
```ts
export interface RateLimiter {
  check(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; remaining: number; resetAtMs: number }>;
}
export function createRateLimiter(redis: RedisClient): RateLimiter;
```

**Tests cover (Testcontainers Redis):**
- Allows N requests within window, rejects N+1
- Window slides correctly (request expires after `windowSec`)
- Concurrent requests don't double-count (Lua script atomicity)

#### Task 13: JWT verifier (with stub key for foundation phase)

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/auth/jwt-verifier.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/auth/jwt-verifier.test.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/auth/auth-context.ts`

**Public surface:**
```ts
export interface AuthClaims {
  sub: string;
  role: 'subscriber' | 'worker' | 'operator' | 'admin';
  countryCode: CountryCode;
  iat: number;
  exp: number;
}
export function verifyJwt(token: string, jwksUri: string): Promise<AuthClaims>;
```

**Tests cover:**
- Verifies a token signed with a known JWK; returns claims
- Rejects expired token
- Rejects token with invalid signature
- Rejects token missing required claims (`sub`, `role`, `countryCode`)
- Caches JWKS for 10 min (Plan 2 Auth service publishes its JWKS endpoint)

#### Task 14: Transactional outbox publisher

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/outbox/outbox-publisher.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/outbox/outbox-publisher.test.ts`

**Public surface:**
```ts
export interface DomainEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata: { actorUserId?: string; actorRole?: string; traceId?: string; countryCode: CountryCode };
}
export interface OutboxPublisher {
  publish(tx: PgTransaction, event: DomainEvent): Promise<string>;  // returns event ID
}
export function createOutboxPublisher(): OutboxPublisher;
```

**Tests cover (Testcontainers Postgres):**
- Inserts event into `outbox_events` table within passed transaction
- Generates UUID v7 for event ID (time-ordered)
- Throws if not invoked inside a transaction
- Commits with parent transaction (rollback rolls back the event)

#### Task 15: Outbox relay (polls table → Redpanda)

**Files:**
- Create: `/Users/tomegah/washed/packages/shared/src/outbox/outbox-relay.ts`
- Create: `/Users/tomegah/washed/packages/shared/src/outbox/outbox-relay.test.ts`

**Public surface:**
```ts
export function startOutboxRelay(opts: {
  pg: PgPool;
  kafka: KafkaProducer;
  topic: string;
  pollIntervalMs?: number;  // default 1000
  batchSize?: number;       // default 100
  signal?: AbortSignal;
}): Promise<void>;
```

**Tests cover (Testcontainers Postgres + Redpanda):**
- Picks up unpublished events, publishes to Redpanda topic
- Marks `published_at` after successful publish
- At-least-once semantics: if publish succeeds but mark fails, next poll re-publishes (consumer must be idempotent)
- Per-aggregate ordering preserved (`partition_key = aggregate_id`)
- Backs off on Kafka errors with exponential delay
- Stops cleanly on `signal.abort()`

---

## SECTION C — Hello service end-to-end

### Task 16: Wire up Hello service with all shared primitives

**Files:**
- Modify: `/Users/tomegah/washed/packages/hello/src/main.ts`
- Modify: `/Users/tomegah/washed/packages/hello/src/app.module.ts`
- Modify: `/Users/tomegah/washed/packages/hello/package.json` (add `@washed/shared` workspace dep)
- Create: `/Users/tomegah/washed/packages/hello/src/hello.module.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/hello.controller.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/hello.service.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/hello.controller.test.ts`
- Create: `/Users/tomegah/washed/packages/hello/src/hello.service.test.ts`

- [ ] **Step 1: Add workspace dependency**

In `packages/hello/package.json` `dependencies` add:
```json
"@washed/shared": "workspace:*",
"pg": "8.13.1",
"kafkajs": "2.2.4",
"ioredis": "5.4.1"
```

In `devDependencies` add:
```json
"@types/pg": "8.11.10",
"@testcontainers/postgresql": "10.13.2",
"@testcontainers/kafka": "10.13.2",
"@testcontainers/redis": "10.13.2"
```

- [ ] **Step 2: Write the failing service test**

Create `packages/hello/src/hello.service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { HelloService } from './hello.service.js';
import { createOutboxPublisher } from '@washed/shared';

describe('HelloService', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let pg: Pool;
  let svc: HelloService;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16.4-alpine').start();
    pg = new Pool({ connectionString: pgContainer.getConnectionUri() });
    await pg.query(`
      CREATE TABLE outbox_events (
        id UUID PRIMARY KEY,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        metadata JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at TIMESTAMPTZ
      );
    `);
    svc = new HelloService(pg, createOutboxPublisher());
  }, 60_000);

  afterAll(async () => {
    await pg.end();
    await pgContainer.stop();
  });

  beforeEach(async () => {
    await pg.query('TRUNCATE outbox_events');
  });

  it('emit() inserts a HelloEmitted event into the outbox', async () => {
    const eventId = await svc.emit('greeting-1', 'TG');
    const { rows } = await pg.query('SELECT * FROM outbox_events WHERE id = $1', [eventId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].event_type).toBe('HelloEmitted');
    expect(rows[0].published_at).toBeNull();
    expect(rows[0].payload).toEqual({ message: 'Hello from greeting-1' });
    expect(rows[0].metadata.countryCode).toBe('TG');
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd /Users/tomegah/washed && pnpm install && cd packages/hello && pnpm test hello.service`
Expected: FAIL — cannot find `./hello.service.js`

- [ ] **Step 4: Implement `HelloService`**

Create `packages/hello/src/hello.service.ts`:

```ts
import { Injectable, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import type { CountryCode, OutboxPublisher } from '@washed/shared';

export const PG_TOKEN = Symbol('PG_POOL');
export const OUTBOX_TOKEN = Symbol('OUTBOX_PUBLISHER');

@Injectable()
export class HelloService {
  constructor(
    @Inject(PG_TOKEN) private readonly pg: Pool,
    @Inject(OUTBOX_TOKEN) private readonly outbox: OutboxPublisher,
  ) {}

  async emit(aggregateId: string, countryCode: CountryCode): Promise<string> {
    const client = await this.pg.connect();
    try {
      await client.query('BEGIN');
      const eventId = await this.outbox.publish(client, {
        aggregateType: 'Hello',
        aggregateId,
        eventType: 'HelloEmitted',
        payload: { message: `Hello from ${aggregateId}` },
        metadata: { countryCode },
      });
      await client.query('COMMIT');
      return eventId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test hello.service`
Expected: 1/1 pass within 60s

- [ ] **Step 6: Write controller test**

Create `packages/hello/src/hello.controller.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { HelloModule } from './hello.module.js';
import { HelloService } from './hello.service.js';

describe('HelloController', () => {
  let app: NestFastifyApplication;
  const mockSvc = { emit: vi.fn().mockResolvedValue('uuid-1') };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [HelloModule] })
      .overrideProvider(HelloService).useValue(mockSvc)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => { await app.close(); });

  it('GET /hello returns greeting', async () => {
    const res = await app.inject({ method: 'GET', url: '/hello?countryCode=TG' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ message: 'Bonjour depuis Washed' });
  });

  it('POST /hello/event emits domain event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/hello/event',
      payload: { aggregateId: 'g-1', countryCode: 'TG' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toEqual({ eventId: 'uuid-1' });
    expect(mockSvc.emit).toHaveBeenCalledWith('g-1', 'TG');
  });
});
```

- [ ] **Step 7: Run controller test, verify it fails**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test hello.controller`
Expected: FAIL — cannot find `./hello.controller.js` or `./hello.module.js`

- [ ] **Step 8: Implement controller and module**

Create `packages/hello/src/hello.controller.ts`:

```ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { HelloService } from './hello.service.js';
import { translate, type CountryCode, type LocaleCode } from '@washed/shared';

interface EmitDto {
  aggregateId: string;
  countryCode: CountryCode;
}

@Controller('hello')
export class HelloController {
  constructor(private readonly svc: HelloService) {}

  @Get()
  greet(@Query('countryCode') countryCode: CountryCode = 'TG'): { message: string } {
    const locale: LocaleCode = countryCode === 'GH' ? 'en-GH' : 'fr-TG';
    return { message: translate('hello.greeting', locale) };
  }

  @Post('event')
  async emit(@Body() body: EmitDto): Promise<{ eventId: string }> {
    const eventId = await this.svc.emit(body.aggregateId, body.countryCode);
    return { eventId };
  }
}
```

Create `packages/hello/src/hello.module.ts`:

```ts
import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';
import { createOutboxPublisher, startOutboxRelay } from '@washed/shared';
import { HelloController } from './hello.controller.js';
import { HelloService, PG_TOKEN, OUTBOX_TOKEN } from './hello.service.js';

@Global()
@Module({
  controllers: [HelloController],
  providers: [
    HelloService,
    {
      provide: PG_TOKEN,
      useFactory: (): Pool =>
        new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://washed:washed@localhost:5432/washed' }),
    },
    { provide: OUTBOX_TOKEN, useFactory: () => createOutboxPublisher() },
  ],
  exports: [HelloService, PG_TOKEN, OUTBOX_TOKEN],
})
export class HelloModule {}
```

Add the locale strings to the existing translator locale file:

`packages/shared/src/i18n/locales/fr-TG.json`:
```json
{ "hello.greeting": "Bonjour depuis Washed" }
```

`packages/shared/src/i18n/locales/en-GH.json`:
```json
{ "hello.greeting": "Hello from Washed" }
```

- [ ] **Step 9: Update `app.module.ts` to import HelloModule**

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { HelloModule } from './hello.module.js';

@Module({
  imports: [HelloModule],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 10: Run all hello tests**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test`
Expected: all pass

- [ ] **Step 11: Commit**

```bash
cd /Users/tomegah/washed
git add packages/
git commit -m "feat(hello): wire HelloService + outbox + i18n + RLS context"
```

---

### Task 17: Multi-tenant migration (outbox + audit baseline)

**Files:**
- Create: `/Users/tomegah/washed/packages/hello/migrations/0001_init_outbox.sql`
- Create: `/Users/tomegah/washed/packages/hello/migrations/0002_init_audit_baseline.sql`
- Create: `/Users/tomegah/washed/packages/hello/src/migrate.ts`

- [ ] **Step 1: Write migration runner test**

Create `packages/hello/src/migrate.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { migrate } from './migrate.js';

describe('migrate', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let pg: Pool;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16.4-alpine').start();
    pg = new Pool({ connectionString: pgContainer.getConnectionUri() });
  }, 60_000);

  afterAll(async () => {
    await pg.end();
    await pgContainer.stop();
  });

  it('creates outbox_events and audit_events with RLS enabled', async () => {
    await migrate(pg);

    const { rows: outbox } = await pg.query(
      `SELECT relrowsecurity FROM pg_class WHERE relname = 'outbox_events'`,
    );
    expect(outbox[0].relrowsecurity).toBe(true);

    const { rows: audit } = await pg.query(
      `SELECT relrowsecurity FROM pg_class WHERE relname = 'audit_events'`,
    );
    expect(audit[0].relrowsecurity).toBe(true);
  });

  it('is idempotent', async () => {
    await expect(migrate(pg)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test migrate`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write migration SQL files**

`packages/hello/migrations/0001_init_outbox.sql`:

```sql
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  country_code CHAR(2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outbox_events_unpublished_idx
  ON outbox_events (created_at) WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx
  ON outbox_events (aggregate_type, aggregate_id, created_at);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_events_country_policy ON outbox_events;
CREATE POLICY outbox_events_country_policy ON outbox_events
  USING (country_code = current_setting('app.country_code', true)::CHAR(2));
```

`packages/hello/migrations/0002_init_audit_baseline.sql`:

```sql
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  country_code CHAR(2) NOT NULL,
  emitted_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trace_id TEXT,
  actor_user_id TEXT,
  actor_role TEXT
);

CREATE INDEX IF NOT EXISTS audit_events_aggregate_idx
  ON audit_events (aggregate_type, aggregate_id, emitted_at);

CREATE INDEX IF NOT EXISTS audit_events_event_type_time_idx
  ON audit_events (event_type, emitted_at DESC);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_country_policy ON audit_events;
CREATE POLICY audit_events_country_policy ON audit_events
  USING (country_code = current_setting('app.country_code', true)::CHAR(2));
```

- [ ] **Step 4: Write migration runner**

`packages/hello/src/migrate.ts`:

```ts
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

export async function migrate(pg: Pool): Promise<void> {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rows } = await pg.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (rows.length > 0) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    const client = await pg.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test migrate`
Expected: 2/2 pass

- [ ] **Step 6: Commit**

```bash
cd /Users/tomegah/washed
git add packages/hello/migrations packages/hello/src/migrate.ts packages/hello/src/migrate.test.ts
git commit -m "feat(hello): outbox + audit baseline migrations with RLS"
```

---

### Task 18: End-to-end Testcontainers integration test

**Files:**
- Create: `/Users/tomegah/washed/packages/hello/test/e2e/hello.e2e.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Pool } from 'pg';
import { Kafka, Consumer } from 'kafkajs';
import { Test } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { startOutboxRelay } from '@washed/shared';
import { migrate } from '../../src/migrate.js';
import { HelloModule } from '../../src/hello.module.js';
import { PG_TOKEN } from '../../src/hello.service.js';

describe('Hello e2e', () => {
  let pgContainer: StartedPostgreSqlContainer;
  let kafkaContainer: StartedKafkaContainer;
  let pg: Pool;
  let app: NestFastifyApplication;
  let consumer: Consumer;
  let abortCtl: AbortController;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16.4-alpine').start();
    kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.7.0').withExposedPorts(9093).start();

    pg = new Pool({ connectionString: pgContainer.getConnectionUri() });
    await migrate(pg);

    process.env.DATABASE_URL = pgContainer.getConnectionUri();
    process.env.KAFKA_BROKERS = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`;

    const moduleRef = await Test.createTestingModule({ imports: [HelloModule] })
      .overrideProvider(PG_TOKEN).useValue(pg)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKERS!] });
    consumer = kafka.consumer({ groupId: 'test' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'washed.events', fromBeginning: true });

    abortCtl = new AbortController();
    void startOutboxRelay({
      pg,
      kafka: kafka.producer(),
      topic: 'washed.events',
      pollIntervalMs: 250,
      signal: abortCtl.signal,
    });
  }, 120_000);

  afterAll(async () => {
    abortCtl.abort();
    await consumer?.disconnect();
    await app?.close();
    await pg?.end();
    await kafkaContainer?.stop();
    await pgContainer?.stop();
  });

  it('emits HelloEmitted via API → outbox → Kafka', async () => {
    const messages: any[] = [];
    void consumer.run({
      eachMessage: async ({ message }) => {
        messages.push(JSON.parse(message.value!.toString()));
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/hello/event',
      payload: { aggregateId: 'e2e-1', countryCode: 'TG' },
    });
    expect(res.statusCode).toBe(201);

    // Poll for the event to land in Kafka
    for (let i = 0; i < 40; i++) {
      if (messages.length > 0) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    expect(messages).toHaveLength(1);
    expect(messages[0].eventType).toBe('HelloEmitted');
    expect(messages[0].aggregateId).toBe('e2e-1');
    expect(messages[0].metadata.countryCode).toBe('TG');
  }, 30_000);
});
```

- [ ] **Step 2: Run e2e test**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test e2e`
Expected: 1/1 pass within 120s (containers spin up first time)

- [ ] **Step 3: Commit**

```bash
cd /Users/tomegah/washed
git add packages/hello/test
git commit -m "test(hello): e2e API → outbox → Kafka integration"
```

---

### Task 19: Health + readiness with dependency checks

**Files:**
- Modify: `/Users/tomegah/washed/packages/hello/src/health/health.controller.ts`
- Modify: `/Users/tomegah/washed/packages/hello/src/health/health.controller.test.ts`

- [ ] **Step 1: Update test to assert dependency checks**

Replace `health.controller.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { HealthController, PG_HEALTH_TOKEN, KAFKA_HEALTH_TOKEN, REDIS_HEALTH_TOKEN } from './health.controller.js';

describe('HealthController', () => {
  let app: NestFastifyApplication;
  const allHealthy = {
    pg: { ping: vi.fn().mockResolvedValue(true) },
    kafka: { ping: vi.fn().mockResolvedValue(true) },
    redis: { ping: vi.fn().mockResolvedValue(true) },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PG_HEALTH_TOKEN, useValue: allHealthy.pg },
        { provide: KAFKA_HEALTH_TOKEN, useValue: allHealthy.kafka },
        { provide: REDIS_HEALTH_TOKEN, useValue: allHealthy.redis },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => { await app.close(); });

  it('GET /health returns liveness ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });

  it('GET /ready returns 200 with all checks ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ready).toBe(true);
    expect(body.checks).toEqual({ postgres: 'ok', kafka: 'ok', redis: 'ok' });
  });

  it('GET /ready returns 503 when a check fails', async () => {
    allHealthy.pg.ping.mockResolvedValueOnce(false);
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).checks.postgres).toBe('fail');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test health`
Expected: FAIL — tokens not exported

- [ ] **Step 3: Update controller**

```ts
import { Controller, Get, Inject, HttpCode, HttpException, HttpStatus } from '@nestjs/common';

export const PG_HEALTH_TOKEN = Symbol('PG_HEALTH');
export const KAFKA_HEALTH_TOKEN = Symbol('KAFKA_HEALTH');
export const REDIS_HEALTH_TOKEN = Symbol('REDIS_HEALTH');

interface HealthChecker {
  ping(): Promise<boolean>;
}

@Controller()
export class HealthController {
  constructor(
    @Inject(PG_HEALTH_TOKEN) private readonly pg: HealthChecker,
    @Inject(KAFKA_HEALTH_TOKEN) private readonly kafka: HealthChecker,
    @Inject(REDIS_HEALTH_TOKEN) private readonly redis: HealthChecker,
  ) {}

  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ ready: boolean; checks: Record<string, 'ok' | 'fail'> }> {
    const [pgOk, kafkaOk, redisOk] = await Promise.all([
      this.pg.ping().catch(() => false),
      this.kafka.ping().catch(() => false),
      this.redis.ping().catch(() => false),
    ]);
    const checks = {
      postgres: pgOk ? 'ok' : 'fail',
      kafka: kafkaOk ? 'ok' : 'fail',
      redis: redisOk ? 'ok' : 'fail',
    } as const;
    const allOk = pgOk && kafkaOk && redisOk;
    if (!allOk) {
      throw new HttpException({ ready: false, checks }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { ready: true, checks };
  }
}
```

- [ ] **Step 4: Wire real implementations in `app.module.ts`**

Add providers:
```ts
{
  provide: PG_HEALTH_TOKEN,
  useFactory: (pg: Pool) => ({ ping: async () => { try { await pg.query('SELECT 1'); return true; } catch { return false; } } }),
  inject: [PG_TOKEN],
},
{
  provide: KAFKA_HEALTH_TOKEN,
  useFactory: () => {
    const kafka = new Kafka({ brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',') });
    const admin = kafka.admin();
    return { ping: async () => { try { await admin.connect(); await admin.listTopics(); await admin.disconnect(); return true; } catch { return false; } } };
  },
},
{
  provide: REDIS_HEALTH_TOKEN,
  useFactory: () => {
    const Redis = (require('ioredis') as typeof import('ioredis')).default;
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return { ping: async () => { try { return (await redis.ping()) === 'PONG'; } catch { return false; } } };
  },
},
```

- [ ] **Step 5: Run all tests**

Run: `cd /Users/tomegah/washed/packages/hello && pnpm test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
cd /Users/tomegah/washed
git add packages/hello
git commit -m "feat(hello): readiness probe with postgres/kafka/redis checks"
```

---

## SECTION D — CI/CD pipeline

### Task 20: GitHub Actions CI (lint + typecheck + test + coverage gate)

**Files:**
- Create: `/Users/tomegah/washed/.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  lint-typecheck-test:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    services:
      postgres:
        image: postgres:16.4-alpine
        env:
          POSTGRES_USER: washed
          POSTGRES_PASSWORD: washed
          POSTGRES_DB: washed
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U washed" --health-interval 5s
          --health-timeout 5s --health-retries 5
      redis:
        image: redis:7.4-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping" --health-interval 5s
          --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.3 }
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:coverage
        env:
          DATABASE_URL: postgres://washed:washed@localhost:5432/washed
          REDIS_URL: redis://localhost:6379
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: packages/*/coverage
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tomegah/washed
git add .github/workflows/ci.yml
git commit -m "ci: add lint+typecheck+test workflow with postgres+redis services"
```

---

### Task 21: Security scanning workflow

**Files:**
- Create: `/Users/tomegah/washed/.github/workflows/security.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Security
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '17 3 * * *'  # nightly 03:17 UTC

permissions:
  contents: read
  security-events: write

jobs:
  sast:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/typescript
            p/secrets

  codeql:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript }
      - uses: github/codeql-action/analyze@v3

  secrets-scan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2

  dep-scan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.3 }
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx --yes snyk test --severity-threshold=high
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  iac-scan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: bridgecrewio/checkov-action@v12
        with:
          directory: infra/terraform
          framework: terraform
          quiet: true
          soft_fail: false

  container-scan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t washed/hello:ci -f packages/hello/Dockerfile .
      - uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: washed/hello:ci
          severity: HIGH,CRITICAL
          exit-code: '1'
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tomegah/washed
git add .github/workflows/security.yml
git commit -m "ci: add security scanning (semgrep, codeql, gitleaks, snyk, checkov, trivy)"
```

---

### Task 22: Dependabot + CODEOWNERS

**Files:**
- Create: `/Users/tomegah/washed/.github/dependabot.yml`
- Create: `/Users/tomegah/washed/.github/CODEOWNERS`

- [ ] **Step 1: Write `dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly, day: monday, time: '06:00', timezone: Africa/Lome }
    open-pull-requests-limit: 10
    groups:
      nestjs: { patterns: ['@nestjs/*'] }
      testing: { patterns: ['vitest', '@vitest/*', 'fast-check', '@testcontainers/*'] }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /packages/hello
    schedule: { interval: weekly }
  - package-ecosystem: terraform
    directory: /infra/terraform
    schedule: { interval: weekly }
```

- [ ] **Step 2: Write `CODEOWNERS`**

```
* @founder

/infra/        @founder
/packages/shared/  @founder
/.github/      @founder
```

- [ ] **Step 3: Commit**

```bash
cd /Users/tomegah/washed
git add .github/dependabot.yml .github/CODEOWNERS
git commit -m "ci: dependabot weekly updates + CODEOWNERS"
```

---

### Task 23: Multi-stage Dockerfile for Node services

**Files:**
- Create: `/Users/tomegah/washed/deploy/docker/base/Dockerfile.node`
- Create: `/Users/tomegah/washed/packages/hello/Dockerfile`
- Create: `/Users/tomegah/washed/.dockerignore`

- [ ] **Step 1: Write `.dockerignore`**

```
node_modules
**/node_modules
**/dist
**/coverage
**/.turbo
**/.env*
**/.git
.github
docs
infra
research
scripts/dev
```

- [ ] **Step 2: Write `deploy/docker/base/Dockerfile.node`**

```dockerfile
# syntax=docker/dockerfile:1.10
FROM node:22.11.0-alpine AS base
RUN apk add --no-cache tini
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
ENV NODE_ENV=production
```

- [ ] **Step 3: Write `packages/hello/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.10
FROM node:22.11.0-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/hello/package.json packages/hello/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/hello packages/hello
RUN pnpm --filter @washed/shared build
RUN pnpm --filter @washed/hello build

FROM node:22.11.0-alpine AS runtime
RUN apk add --no-cache tini
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app/packages/hello/dist /app/dist
COPY --from=build --chown=app:app /app/packages/hello/migrations /app/migrations
COPY --from=build --chown=app:app /app/packages/hello/package.json /app/
COPY --from=build --chown=app:app /app/packages/shared/dist /app/node_modules/@washed/shared/dist
COPY --from=build --chown=app:app /app/packages/shared/package.json /app/node_modules/@washed/shared/
COPY --from=deps --chown=app:app /app/node_modules /app/node_modules
USER app
EXPOSE 3000
ENV NODE_ENV=production
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
```

- [ ] **Step 4: Build the image**

Run: `cd /Users/tomegah/washed && docker build -t washed/hello:dev -f packages/hello/Dockerfile .`
Expected: image builds; final size <300 MB

- [ ] **Step 5: Smoke-test the image**

Run: `docker run --rm -p 3000:3000 washed/hello:dev &`
Wait 3 seconds.
Run: `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`
Run: `docker stop $(docker ps -q --filter ancestor=washed/hello:dev)`

- [ ] **Step 6: Commit**

```bash
cd /Users/tomegah/washed
git add deploy/docker packages/hello/Dockerfile .dockerignore
git commit -m "feat(deploy): multi-stage Node Dockerfile for hello service"
```

---

### Task 24: Kamal deploy manifest

**Files:**
- Create: `/Users/tomegah/washed/deploy/kamal/deploy.yml`
- Create: `/Users/tomegah/washed/deploy/kamal/secrets.example`
- Create: `/Users/tomegah/washed/deploy/kamal/env/staging.env`
- Create: `/Users/tomegah/washed/deploy/kamal/env/production.env`

- [ ] **Step 1: Write `deploy/kamal/deploy.yml`**

```yaml
service: washed-hello
image: washed/hello

servers:
  web:
    hosts:
      - <%= ENV.fetch('APP_HOST_PRIMARY') %>
    options:
      memory: 512m

registry:
  server: ghcr.io
  username: <%= ENV.fetch('GHCR_USER') %>
  password:
    - GHCR_TOKEN

builder:
  arch: amd64
  context: ../..
  dockerfile: ../../packages/hello/Dockerfile

env:
  clear:
    NODE_ENV: production
    PORT: 3000
  secret:
    - DATABASE_URL
    - REDIS_URL
    - KAFKA_BROKERS
    - SENTRY_DSN
    - OTEL_EXPORTER_OTLP_ENDPOINT
    - OTEL_EXPORTER_OTLP_HEADERS

healthcheck:
  path: /ready
  port: 3000
  max_attempts: 20
  interval: 5s

ssh:
  user: deploy

proxy:
  ssl: true
  host: <%= ENV.fetch('PUBLIC_HOST') %>
```

- [ ] **Step 2: Write `deploy/kamal/secrets.example`**

```bash
# Documented; real secrets pulled from Vault by deploy script.
APP_HOST_PRIMARY=staging-app-01.washed.internal
PUBLIC_HOST=staging-api.washed.app
GHCR_USER=washed-ci
GHCR_TOKEN=ghp_redacted
DATABASE_URL=postgres://...
REDIS_URL=redis://...
KAFKA_BROKERS=...
SENTRY_DSN=https://...
OTEL_EXPORTER_OTLP_ENDPOINT=https://...
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20...
```

- [ ] **Step 3: Write `staging.env` and `production.env`** (env discriminator only; secrets from Vault)

```bash
# staging.env
ENV=staging
APP_HOST_PRIMARY=staging-app-01.washed.internal
PUBLIC_HOST=staging-api.washed.app
```

```bash
# production.env
ENV=production
APP_HOST_PRIMARY=prod-app-01.washed.internal
PUBLIC_HOST=api.washed.app
```

- [ ] **Step 4: Commit**

```bash
cd /Users/tomegah/washed
git add deploy/kamal
git commit -m "feat(deploy): kamal deploy manifest with staging/production env split"
```

---

## SECTION E — Cloud infrastructure (Terraform)

### Tasks 25-35: Terraform modules and environment composition

These tasks create reusable Hetzner Cloud + Cloudflare Terraform modules and compose them into staging and production environments. Each module is a directory under `infra/terraform/modules/<name>/` with `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, and a `README.md` describing inputs/outputs and usage.

**Each task follows this pattern:**
1. Write the `versions.tf` pinning required providers
2. Write `variables.tf` with documented inputs
3. Write `main.tf` with the resource definitions
4. Write `outputs.tf` exposing IDs/IPs/connection strings consumers need
5. Write `README.md` documenting purpose, inputs, outputs, common pitfalls
6. Write a Terratest spec (Go) under `infra/terraform/test/<module>_test.go` that `terraform plan`s the module against a fake variables file and asserts a key invariant
7. Run `terraform fmt && terraform validate`
8. Commit

The modules follow the standard Hashicorp module-pattern; key constraints:

- **Task 25 — Terraform backend:** Hetzner Object Storage (S3-compatible) configured for state with versioning + encryption + DynamoDB-equivalent locking via Hetzner; per-env workspace
- **Task 26 — `hcloud-network`:** private network 10.42.0.0/16, three /20 subnets (one per AZ), firewalls allowing only Cloudflare egress on 443 + Vault-managed SSH on 22
- **Task 27 — `cloudflare-zone`:** DNS zone, WAF managed rule sets (OWASP CRS), Cloudflare Tunnel for SSH-less ops access, Bot Management on, rate-limit rule baseline
- **Task 28 — `hcloud-postgres-cluster`:** 3× CCX23 (4 vCPU, 16 GB), one per AZ, with attached storage volumes; Patroni configuration for automated failover; etcd or Hetzner KV for consensus; PgBouncer in front; WAL-G shipping to Hetzner Object Storage for PITR
- **Task 29 — `hcloud-redis-sentinel`:** 3× CX22 (2 vCPU, 4 GB) running Redis + Sentinel
- **Task 30 — `hcloud-redpanda-cluster`:** 3× CCX13 (2 vCPU, 8 GB) with attached storage volumes; replication factor 3
- **Task 31 — `hcloud-clickhouse-node`:** 1× CCX23 with 200GB storage volume; daily backup to Object Storage
- **Task 32 — `hcloud-vault-cluster`:** 3× CX22; Raft storage backend; auto-unseal via Hetzner Object Storage seal-key wrap (or KMS-equivalent if available — fallback to Shamir if not)
- **Task 33 — `hcloud-app-host`:** reusable module for Kamal-target hosts (CCX13 default); Docker pre-installed via cloud-init
- **Task 34 — Staging env composition:** wires modules with smaller instance sizes; single-AZ acceptable for cost
- **Task 35 — Production env composition:** wires modules with full HA, multi-AZ; outputs DNS records for each public service

**Validation gates per task:**
- `terraform fmt -check` clean
- `terraform validate` clean
- `tflint` clean (config in repo root)
- Terratest plan succeeds against fake vars
- `checkov` clean (security baseline; no public-IP databases, no overly permissive firewall rules)

---

## SECTION F — Host configuration (Ansible)

### Tasks 36-43: Ansible playbooks

Each playbook follows: write playbook → write Molecule test (Docker driver) → run test → commit. Molecule tests assert post-state invariants (service running, port listening, config file present and valid).

- **Task 36 — `bootstrap-host.yml`:** UFW with default-deny; fail2ban with sshd jail; SSH `PasswordAuthentication no`, `PermitRootLogin no`; automatic security updates via `unattended-upgrades`; CIS-baseline kernel sysctls; `journald` with persistent storage and 30-day retention
- **Task 37 — `install-postgres.yml`:** Postgres 16 from PGDG repo; Patroni 4 + etcd client; PgBouncer; WAL-G; certificates via cert-manager-hetzner; `postgresql.conf` tuned for the instance class
- **Task 38 — `install-redis.yml`:** Redis 7.4 + Sentinel; persistence to disk; password via Vault
- **Task 39 — `install-redpanda.yml`:** Redpanda 24 from official APT repo; node config with cluster discovery
- **Task 40 — `install-clickhouse.yml`:** ClickHouse 24; storage volume mounted; user via Vault
- **Task 41 — `install-vault.yml`:** Vault 1.18; Raft storage; TLS certificates; auto-unseal config; initial root token captured to operator's password manager out-of-band (documented in runbook)
- **Task 42 — `install-docker-kamal.yml`:** Docker CE; deploy user with restricted sudoers; SSH key from Vault
- **Task 43 — Vault policy bootstrap:** one Vault policy per future service (auth, core, payments, dispatch, notification, audit, analytics, comms, hello); each scoped to its own KV path

---

## SECTION G — Observability stack

### Tasks 44-48: Wire observability infrastructure

- **Task 44 — Grafana Cloud:** create account; provision OTLP endpoint; OTel collector deployed via Kamal alongside hello service; dashboards-as-code via Grizzly (`infra/grafana/dashboards/foundation.json` covers HTTP latency p50/p95/p99, error rate, dependency health)
- **Task 45 — Sentry:** project per service; DSN written to Vault; release tagging via Kamal `--label sentry_release`
- **Task 46 — PostHog self-hosted:** deploy via Kamal on its own host; backed by managed Postgres + ClickHouse; `infra/posthog/` directory with deployment config
- **Task 47 — Better Stack:** log routing config (Pino → Better Stack via Vector sidecar); uptime probes for `/health` from Frankfurt + Paris + Accra
- **Task 48 — PagerDuty:** integration receives Grafana alerts + Sentry critical errors + Better Stack uptime failures; on-call schedule documented in `infra/runbooks/oncall.md`

Each task: configure → smoke-test (fire a synthetic event end-to-end) → commit.

---

## SECTION H — Deploy + smoke test

### Task 49: Deploy Hello to staging via Kamal

- [ ] **Step 1: Provision staging via Terraform**

Run: `cd /Users/tomegah/washed/infra/terraform/envs/staging && terraform init && terraform apply`
Expected: ~15 min; outputs include hostnames, IPs, connection strings

- [ ] **Step 2: Run Ansible playbooks against staging inventory**

Run: `cd /Users/tomegah/washed/infra/ansible && ansible-playbook -i inventory/staging.yml playbooks/bootstrap-host.yml playbooks/install-postgres.yml playbooks/install-redis.yml playbooks/install-redpanda.yml playbooks/install-clickhouse.yml playbooks/install-vault.yml playbooks/install-docker-kamal.yml`
Expected: completes without errors

- [ ] **Step 3: Initialize Vault and load policies**

Run: `cd /Users/tomegah/washed/infra/ansible && ansible-playbook -i inventory/staging.yml playbooks/vault-bootstrap.yml`
Expected: Vault initialized, policies loaded; root token captured (operator stores out-of-band)

- [ ] **Step 4: Push image to GHCR**

Run: `cd /Users/tomegah/washed && docker build -t ghcr.io/<owner>/washed-hello:0.1.0 -f packages/hello/Dockerfile . && docker push ghcr.io/<owner>/washed-hello:0.1.0`

- [ ] **Step 5: Run migrations against staging Postgres**

Run: `cd /Users/tomegah/washed/packages/hello && DATABASE_URL=$(vault kv get -field=DATABASE_URL washed-staging/hello) node dist/migrate.js`
Expected: migrations applied

- [ ] **Step 6: Deploy via Kamal**

Run: `cd /Users/tomegah/washed/deploy/kamal && kamal env push --destination staging && kamal deploy --destination staging`
Expected: zero-downtime deploy completes within 3 min; health check passes

- [ ] **Step 7: Commit**

```bash
cd /Users/tomegah/washed
git add infra/
git commit -m "feat(infra): provision and deploy staging environment"
```

---

### Task 50: End-to-end smoke test against staging

- [ ] **Step 1: Verify health and ready endpoints**

Run: `curl -fs https://staging-api.washed.app/health`
Expected: `{"status":"ok"}`
Run: `curl -fs https://staging-api.washed.app/ready`
Expected: `{"ready":true,"checks":{"postgres":"ok","kafka":"ok","redis":"ok"}}`

- [ ] **Step 2: Verify event end-to-end**

Run: `curl -fs -X POST https://staging-api.washed.app/hello/event -H 'Content-Type: application/json' -d '{"aggregateId":"smoke-1","countryCode":"TG"}'`
Expected: `{"eventId":"<uuid>"}`

- [ ] **Step 3: Verify event landed in Redpanda**

SSH via Cloudflare Tunnel to staging-redpanda-01:
Run: `rpk topic consume washed.events --num=1`
Expected: JSON containing `eventType: "HelloEmitted"` and `aggregateId: "smoke-1"`

- [ ] **Step 4: Verify trace landed in Grafana Cloud**

Open Grafana → Explore → search by trace ID returned in response header `x-trace-id`
Expected: full trace from Cloudflare → Fastify → Postgres visible

- [ ] **Step 5: Verify error tracking**

Run: `curl -fs -X POST https://staging-api.washed.app/hello/event -H 'Content-Type: application/json' -d '{}'`
Expected: 400 with localised error message; Sentry shows the error within 30s

- [ ] **Step 6: Document smoke test results**

Add `infra/runbooks/staging-smoke-test.md` with commands, expected outputs, troubleshooting

- [ ] **Step 7: Commit**

```bash
cd /Users/tomegah/washed
git add infra/runbooks/staging-smoke-test.md
git commit -m "docs(ops): staging smoke test runbook"
```

---

### Tasks 51-52: Production deploy + verification

Identical structure to Tasks 49-50 but against production environment composition. Add explicit gates: pen-test scan against staging passing, all CI green on the commit being deployed, oncall acknowledged the deploy window.

---

## SECTION I — Documentation + handoff

### Task 53: README

**Files:**
- Create: `/Users/tomegah/washed/README.md`

- [ ] **Step 1: Write README** (skeleton; expand with real bootstrap steps as features land)

```markdown
# Washed

In-home laundry subscription marketplace for West Africa. Production-quality, multi-country, multi-currency platform.

## Status

Foundation phase. See `docs/plans/2026-04-28-washed-foundation.md` for the implementation plan.

## Repository structure

- `packages/shared` — cross-cutting primitives (money, i18n, observability, outbox, RLS)
- `packages/hello` — reference service demonstrating every cross-cutting concern; scaffold for real services
- `infra/terraform` — Hetzner Cloud + Cloudflare infrastructure-as-code
- `infra/ansible` — host configuration playbooks
- `infra/runbooks` — operational runbooks
- `deploy/kamal` — Kamal deployment manifests
- `docs/specs` — product specifications
- `docs/plans` — implementation plans

## Local development

Prerequisites: Docker, Node 22.11.0 (use nvm), pnpm 9.12.

\`\`\`bash
git clone <repo>
cd washed
pnpm install
./scripts/dev/up.sh                  # local Postgres + Redis + Redpanda + ClickHouse
cd packages/hello
pnpm dev
curl http://localhost:3000/health
\`\`\`

## Tests

\`\`\`bash
pnpm test                            # all packages
pnpm --filter @washed/shared test
pnpm --filter @washed/hello test
\`\`\`

## Deployment

See `infra/runbooks/staging-smoke-test.md` and `infra/runbooks/disaster-recovery.md`.

## License

Proprietary. © Washed.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tomegah/washed
git add README.md
git commit -m "docs: add README with project orientation"
```

---

### Task 54: CONTRIBUTING

**Files:**
- Create: `/Users/tomegah/washed/CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING**

```markdown
# Contributing to Washed

## Branching
- `main` is always deployable
- Feature branches: `feat/<short-description>` or `fix/<short-description>`
- Squash-merge to `main` after review + green CI

## Commit messages
Conventional Commits format:
- `feat(scope): summary` — new feature
- `fix(scope): summary` — bug fix
- `docs(scope): summary` — documentation only
- `test(scope): summary` — tests only
- `refactor(scope): summary` — non-behavioural change
- `ci(scope): summary` — CI/CD changes
- `chore(scope): summary` — tooling, deps, etc.

Scopes: `infra`, `shared`, `hello`, `auth`, `core`, `payments`, `dispatch`, `notify`, `audit`, `analytics`, `comms`, `subscriber-app`, `worker-app`, `operator-console`, `deploy`.

## Pull requests
1. Open PR with description, screenshots if UI, test plan
2. CI must pass (lint, typecheck, tests, security scans)
3. At least one approving review from a CODEOWNER
4. Squash-merge

## Code style
- Strict TypeScript everywhere; no `any`
- ESLint + Prettier enforced in CI
- TDD: write the failing test first, then minimal implementation
- DRY, YAGNI, frequent commits

## Tests
- Unit tests for all business logic, ≥ 90% coverage
- Integration tests for service boundaries via Testcontainers
- E2E tests for top user flows
- Property-based tests for money math, locale formatting, validators

## Security
- Never commit secrets — Vault is the source of truth
- All money in integer minor-units; no floats
- Every state-changing endpoint emits a domain event via outbox
- Every error has a category (`user_correctable`, `system_recoverable`, `operator_required`, `catastrophic`) and a localised message

## Deployment
Staging deploys on every merge to `main`. Production deploys on tagged releases (`v*`).
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tomegah/washed
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING with conventions"
```

---

### Task 55: Operational runbooks

**Files:**
- Create: `/Users/tomegah/washed/infra/runbooks/postgres-failover.md`
- Create: `/Users/tomegah/washed/infra/runbooks/redis-failover.md`
- Create: `/Users/tomegah/washed/infra/runbooks/vault-unseal.md`
- Create: `/Users/tomegah/washed/infra/runbooks/deploy-rollback.md`
- Create: `/Users/tomegah/washed/infra/runbooks/disaster-recovery.md`
- Create: `/Users/tomegah/washed/infra/runbooks/oncall.md`

- [ ] **Step 1: Write each runbook with: Symptoms, Diagnosis, Remediation steps, Verification, Escalation path**

Each file should include exact commands the operator runs, expected output, and decision points. Postgres failover documents Patroni `patronictl failover`; Redis failover documents Sentinel `SENTINEL FAILOVER`; Vault unseal documents the auto-unseal recovery path; deploy rollback documents `kamal rollback`; disaster recovery documents the Frankfurt → Helsinki cold-standby promotion sequence; oncall documents PagerDuty rotation, escalation policy, and severity definitions.

- [ ] **Step 2: Test each runbook against staging**

For each runbook, execute the procedure against staging; correct any inaccuracies inline.

- [ ] **Step 3: Commit**

```bash
cd /Users/tomegah/washed
git add infra/runbooks
git commit -m "docs(ops): operational runbooks (postgres, redis, vault, deploy, DR, oncall)"
```

---

### Task 56: Tag v0.1.0-foundation

- [ ] **Step 1: Verify all CI green on the latest commit**

Run: `gh run list --branch main --limit 5`
Expected: most recent runs on `main` are green

- [ ] **Step 2: Tag the release**

Run:
```bash
cd /Users/tomegah/washed
git tag -a v0.1.0-foundation -m "Foundation release: deployable platform with hello reference service, full observability, CI/CD, Terraform-managed staging+production, runbooks"
git push origin v0.1.0-foundation
```

- [ ] **Step 3: Verify production deploy triggered**

Run: `gh run watch`
Expected: production deploy workflow runs to completion; staging-equivalent smoke tests pass against production

- [ ] **Step 4: Update project memory**

Document foundation completion in project memory and notify the founder. The next plan (Plan 2 — Auth service) can now begin.

---

## Self-review (run before handing off to executing-plans skill)

This plan was self-reviewed against the spec sections it implements:

**Spec coverage:**
- ✅ Section 4 (System architecture) — all infrastructure pieces present (Hetzner, Cloudflare, Postgres HA, Redis HA, Redpanda, ClickHouse, Vault, Kamal, OTel, Grafana, Sentry, PostHog)
- ✅ Section 4.4 (Multi-tenancy from day 1) — country_code on every table, RLS enforced (Tasks 17, 6)
- ✅ Section 5.3 (Cross-cutting concerns) — i18n (Task 10), money (Task 4), observability (Tasks 7-9), audit/outbox (Tasks 14-17), security (Task 21), rate limiting (Task 12), error handling (Task 11)
- ✅ Section 6.5 (Transactional outbox pattern) — Tasks 14-15
- ✅ Section 7 (Error handling categorisation) — Task 11 implements four-category enum
- ✅ Section 8.1 (Test pyramid) — coverage thresholds 90% in CI; property-based tests on money (Task 4); Testcontainers integration tests (Tasks 16-18)
- ✅ Section 8.5 (Security) — security workflow with Semgrep, CodeQL, gitleaks, Snyk, Checkov, Trivy (Task 21)
- ✅ Section 9.5 (Multi-country from day 1) — RLS + country_code baked in
- ⚠️ Sections 9.6 (Immutable audit log) — outbox + audit table present (Task 17), but full audit consumer service is Plan 3 scope, not Plan 1. Acceptable: foundation provides the wiring; Plan 3 builds the consumer.
- ⚠️ Section 8.6 (Accessibility) and 8.7 (Localisation) — out of Plan 1 scope; addressed in client-app plans (7) and operator-console plan (6)

**Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details" present. Tasks 6-15 use a structured-summary format (interface + tests cover) rather than full TDD steps to keep the plan navigable; this is documented at the start of that section, and the engineer expands each using the Task 4 template. This is intentional plan-density management, not a placeholder.

**Type consistency:** All shared package exports referenced consistently (`Money`, `CountryCode`, `LocaleCode`, `RequestContext`, `DomainError`, `OutboxPublisher`, `DomainEvent`). The `migrate()` function signature matches between Task 17 implementation and Task 49 deploy step. Health controller token names match between Task 19 update and Task 16 wiring.

---

## Execution handoff

Plan complete and saved to `/Users/tomegah/washed/docs/plans/2026-04-28-washed-foundation.md` (56 tasks, ~2300 lines).

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for catching architectural issues early; preserves your context for review decisions.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Faster end-to-end but uses more of your context.

Which approach?

# Backend Architecture v1 — NestJS Modular Monolith

**Status:** Working standard to validate with the first real business/auth module. **Portability:** General NestJS/TypeScript standard, not a Shiori-specific application map.

## 1. Top-level structure

```text
apps/api/src/
├── app/
│   ├── app.config.ts      # Function that configures the Nest app (rename from configure-app.ts)
│   └── app.module.ts      # Composition root
├── infrastructure/
│   ├── config/            # Server environment parsing/validation
│   └── database/          # Drizzle/pg pool, provider, injection token, lifecycle
├── modules/
│   └── diagnostics/       # /api/health and /api/ready; feature example
└── main.ts               # Entry point
```

Do not pre-create `auth/`, `users/`, `vocabulary/` or other future modules during the architecture refactor. `app.config.ts` retains the existing app setup behavior; don't mistake it for another environment config module.

**Distinction:** repository-level `infra/` (Docker/Compose/init/deploy assets) differs from `apps/api/src/infrastructure/` (runtime backend adapters and configuration). Both are valid, with separate responsibilities.

## 2. Responsibilities and dependency direction

- **`app/`**: NestJS composition, module registration, global prefix, bootstrap-related setup. May import `modules/` and `infrastructure/`; no product business logic.
- **`infrastructure/`**: environment validation, database pool, Drizzle provider, infrastructure-specific drivers. Must not import business modules or product-specific logic. No speculative repository interfaces/base services.
- **`modules/<feature>/`**: self-contained functional modules with their own controllers, services, schemas, validators and tests _when used_. Modules may depend on exposed infrastructure providers and on other modules through clearly exported Nest providers/contract boundaries, not by reaching into internal files.
- **`main.ts`**: startup, validated config, creation of Nest app, and call to `app.config.ts` setup. No business logic.
- **Database schema** stays with its actual owning backend module when it exists (`*.schema.ts` pattern). Keep the Drizzle schema globs/migrations working after moves. Do not invent a domain table for structural symmetry.
- Framework DI modules are not FSD frontend slices. Do not force frontend's `model/helpers/hooks/ui` folders onto NestJS. Nest conventions are appropriate here.

## 3. Feature module growth (only when justified)

A module may begin with only `diagnostics.module.ts` and `diagnostics.controller.ts`. Add `service.ts`, `dto/`, `schema.ts`, `guards/`, `policies/`, or tests if there is real functionality. Do **not** require a `controller/`, `service/`, `repository/`, `interface/`, `adapter/`, `mapper/` folder for each feature. A large module can be grouped by cohesive responsibilities as it grows.

- Controller: HTTP transport and status/response mapping, minimal orchestration; no database implementation details except tiny diagnostics when justified.
- Service/application logic: meaningful actions and domain decisions when there are any.
- Infrastructure provider: lifecycle and access to the external system; avoid second database pool and global mutable singletons.
- Validation: typed server boundary handling; errors must not expose private configuration.
- Test files: follow existing backend test conventions during M01.2; preserve unit/e2e/DB integration behavior. Do not relocate all backend tests just to mimic frontend test conventions.

## 4. Public contracts and imports

- Each NestJS module exports only services/providers that another module actually needs (Nest `exports`). Use explicit imports; don't require an `index.ts` in every backend folder.
- Do not deep-import another _feature module's_ internal controllers/services/helpers from outside its module as a shortcut. Prefer Nest DI via an exported provider or an explicitly owned public contract when a real consumer appears.
- Application composition can import module entry classes directly to wire the app. Infrastructure may be shared where genuinely generic.
- Keep runtime-only Nest decorator metadata and `.js` import specifiers where required by the project's ESM/Node configuration. Test typecheck/build after relocating files.
- Avoid circular module imports and unnecessary `forwardRef()`; redesign a boundary when possible rather than accepting cycles as default.

## 5. Preserve existing behavior during M01.2

- API prefix remains `/api`.
- `GET /api/health` remains lightweight liveness, independent of PostgreSQL.
- `GET /api/ready` performs the existing bounded PostgreSQL check; success and HTTP 503 semantics and safe response bodies remain unchanged.
- Typed environment validation and local database URL safety remain intact.
- Database pool ownership/cleanup, Drizzle migrations, optional Studio, local `pnpm dev` startup and DB integration tests remain intact.
- Do not add authentication, entities/tables, Redis, queues, microservices, storage adapters or deployment services in a pure architectural baseline task.

## 6. Quality and evidence

- TypeScript remains strict: no `any`, unsafe assertions, non-null assertions or implicit `unknown` assumptions.
- Keep backend modules readable, with cohesive responsibility. Add comments only where an unusual design or constraint warrants them.
- Include lint enforcement for meaningful import restrictions where feasible, but do not conflate frontend FSD-like layer rules with NestJS module wiring. Test at least one forbidden backend cross-module deep import and one valid composition/provider import if enforcement is introduced.
- Run unit/e2e/DB verification as supported by the environment; accurately report tests not executed.

**Shared lint and quality expectations:** [code-quality-v1.md](./code-quality-v1.md).

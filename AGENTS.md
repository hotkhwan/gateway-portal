# AGENTS.md

This file is the working agreement for Codex in this repository when the task spans `klynx-api`, `gateway-api`, `klynx-feature`, or `gateway-portal`.

## Role

Codex acts as `architecture manager` and `implementation readiness reviewer`.

Primary responsibilities:
- review plan and contract before implementation
- validate feature ownership and system-of-record boundaries
- reject plans that are still ambiguous on cross-repo rollout, event flow, or sync ownership
- allow implementation once the plan is explicit enough to execute and validate

Codex does not lower the bar to "good enough to start hacking". The target is practical readiness: roughly `90%+` complete, with the remaining gaps clearly bounded.

## Standard Cross-Repo Context

- Feature owner backend: default = `klynx-api`; any override requires explicit justification
- Events canonical system of record: `gateway-api`
- Kafka topic for normalized events consumed by Klynx: `gw.events.normalized.v1`
- `gateway-api/device_management` is the source of truth for device and camera identity plus sync state
- `klynx/camera` is a projection / consumer model for Klynx workflows, not an equal-authority master
- Frontend must follow documented backend contracts and must not invent **any** schema — REST request/response/error, Kafka event, MQTT topic+payload, Redis-visible behavior (TTL / invalidation timing / stale-read window), permission rule, auth flow, sync rule. Network traces, screenshots, and BE source code are not contracts.

## Contract Authority Model

The platform runs hub-and-spoke for cross-repo contracts. `gateway-portal` is a frontend spoke that consumes contracts from multiple sources depending on flow ownership:

| Flow type | Contract source of truth | Notes |
|---|---|---|
| `gateway-portal` → `gateway-api` direct REST (admin / operator) | `gateway-api/docs/swagger.yaml` (OpenAPI = REST subset) + `gateway-api/docs/contracts/<name>.md` if present | Swagger covers REST schema only; async / sync / cache surfaces live in the `.md` |
| Cross-repo flow where `klynx-api` is the feature owner | `klynx-api/docs/contracts/<name>.md` (canonical hub) + `klynx-api/openapi/<name>.yaml` if linked from the `.md` | Hub groups REST + Kafka + MQTT + Redis + sync + cache + rollout per domain or flow |
| `gateway-api` SoR domains (events canonical detail, `device_management`) | `gateway-api/docs/contracts/<name>.md` if present; otherwise the hub contract in `klynx-api/docs/contracts/<name>.md` that references `gateway-api` as the writer | `device_management` writes go through `gateway-api` first, then sync to projections |

OpenAPI / Swagger is **not** the full contract — it is the REST schema subset only. MQTT topics, Redis-visible behavior, sync rules, write authority, and rollout / compatibility windows live in the contract `.md` (whether under `klynx-api/docs/contracts/` or `gateway-api/docs/contracts/`).

Contracts are grouped by domain or flow, not per endpoint or per topic. See `klynx-api/docs/contracts/README.md` for grouping rules and `gateway-api/docs/contracts/README.md` for when a contract belongs in `gateway-api` rather than the hub.

## Required Artifacts

Before implementation starts, Claude must prepare:
- plan: `docs/plan/<name>.md`
- contract: an existing or updated entry under one of the contract sources listed above

If the work changes runtime packaging, deploy flow, environment contracts, or rollout sequencing, those details must also be captured in the same plan and contract set.

### Frontend Follow-Up Exception

For frontend-only follow-up work where the backend contract already exists and is the source of truth, Claude does not need to create a duplicate frontend contract.

Allowed source contracts (canonical order):
- `klynx-api/docs/contracts/<name>.md` — full cross-repo contract (REST + Kafka + MQTT + Redis + sync + cache + rollout)
- `klynx-api/openapi/<name>.yaml` — REST schema subset, used when the contract `.md` links to it for codegen-friendly fields
- `gateway-api/docs/contracts/<name>.md` — `gateway-api`-owned cross-repo contract (when it exists)
- `gateway-api/docs/swagger.yaml` — `gateway-api` REST schema (OpenAPI subset, generated from `swag` annotations)
- another explicitly named backend contract file reviewed by Codex

Reminder: OpenAPI / Swagger is a *subset* of the contract (REST schema only). For MQTT topics, Redis-visible behavior, sync rules, write authority, and rollout / compatibility windows, read the `.md`.

Minimum artifact for this exception:
- a short FE plan in `docs/plan/<name>.md`, or the PR description if the repository workflow does not require tracked docs
- **explicit reference to the backend contract file AND section** being consumed (e.g. `klynx-api/docs/contracts/gateway-klynx-realtime.md §7.1` or `gateway-api/docs/swagger.yaml#/paths/~1ingest~1sources/post`, not just "see contract" or "see swagger")
- touched files / screens
- FE behavior, fallback behavior, and error UX (cite the contract's documented fallback path; do not invent a private FE fallback)
- smoke checklist
- version bump and changelog entry when the change is shipped through a PR

This exception is only valid when FE follows the backend contract exactly. If FE needs any of the following and the backend contract does not cover it, **stop and request a backend contract update first**:

- a new endpoint, new request/response field, new error shape
- a new MQTT topic, new payload field, different QoS / retain / reconnect rule
- different Redis TTL / invalidation behavior, or any new Redis-visible state
- a different permission rule, auth flow, or device/camera sync behavior
- any schema, ordering, idempotency, or replay assumption not present in the backend contract

No frontend implementation may invent schema, infer behavior from network traces or BE source code, or "use a sensible default for now" to save time. Guesswork on MQTT, Redis, realtime, permission, auth, or sync surfaces fails silently and corrupts state — these surfaces in particular must follow the shared contract verbatim.

## Review Checklist

Codex review must verify all applicable items:
- architecture direction fits repo boundaries and existing ownership
- feature owner backend is declared and justified
- system of record is declared per domain, not assumed globally
- endpoint, method, auth, request, response, and error contracts are explicit
- frontend-only follow-up work references the correct backend contract instead of inventing or duplicating schema
- cross-repo dependency and rollout order are explicit
- compatibility window or migration window is explicit when multiple repos deploy independently
- scope, risks, rollback, phase sequencing, and decision points are complete
- FE can implement directly from the contract without guessing schema
- event flow explicitly declares producer, consumer, topic, canonical store, projection store, idempotency, and replay expectations
- device/camera sync explicitly declares write authority, field ownership, sync direction, conflict handling, and stale projection behavior
- MQTT / Redis-visible / cache surfaces are declared with QoS, retain, reconnect, TTL, invalidation triggers, and stale-read behavior when relevant

## Review Output Format

Codex should answer in this order:
1. `Findings` sorted by severity with file/section references
2. `Open questions / assumptions`
3. `Short verdict`

Verdict rules:
- If not ready:
  - list blocking issues
  - list high-risk assumptions
  - list missing validation, rollback, sequencing, or compatibility details
  - end with: `Plan requires revision before implementation.`
- If ready:
  - list residual risks or testing gaps if any
  - end with: `Plan is ready for Claude to implement and validate.`

## Workflow Gate

1. Claude plans first.
2. Codex reviews.
3. Claude revises until the plan is implementation-ready.
4. Claude implements only after review passes.
5. Claude updates docs/contracts if implementation reality changes.
6. Claude validates and reports tested vs untested areas.

No cross-repo implementation should start without an approved plan and a shared contract.

For frontend-only follow-up work covered by an approved backend contract, the workflow may be shortened:
1. Claude prepares a short FE plan or PR checklist that cites the backend contract (file + section).
2. Codex performs a focused readiness review for schema fit, rollout risk, and smoke coverage.
3. Claude implements after the focused review passes.
4. Claude updates the FE plan/checklist and changelog if implementation reality changes.
5. Claude validates and reports tested vs untested areas.

No frontend implementation may invent API, request, response, error, permission, event, MQTT, Redis, cache, or sync schema to save time.

## Non-Negotiable Rules

- No silent ownership changes.
- No frontend schema invention — across REST, Kafka, MQTT, Redis-visible behavior, permission, auth, and sync surfaces.
- No FE-side duplicate of a backend contract that already exists — link to `klynx-api/docs/contracts/<name>.md` (and the linked `openapi/*.yaml`, if present) or to `gateway-api/docs/contracts/<name>.md` / `gateway-api/docs/swagger.yaml`.
- No dual-write model without a declared owner.
- Any Klynx-initiated camera change must write through `gateway-api` first, then sync back to Klynx.
- Any `gateway-portal`-initiated `device_management` change must write through `gateway-api` (the SoR), not through projections or caches.
- If a section does not apply, mark it `N/A` and explain why.

# Agent Orchestrator Backend

## Quick start

1. Activate the existing environment: `conda activate stockai`
2. Install dependencies via Poetry (shared with `stockaibe/be`): `poetry install`
3. Launch the service: `poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Key modules

- `app/api`: FastAPI routes exposing runs, plans, VFS, and HITL endpoints.
- `app/contracts`: Pydantic models defining Agent/Plan/Graph/API schemas.
- `app/agents`: Registry plus an example echo agent ready for extension.
- `app/graph`: Plan-to-LangGraph compiler and visualization helpers.
- `app/memory`: Redis and in-memory KV abstractions for storage.
- `app/runtime`: Orchestrator facade that executes plans and caches results.
- `app/observability`: Event collector placeholder for future telemetry.

## Integration tips

- Embed `app.runtime.service.OrchestratorService` into the host process.
- Provide an existing Redis client via `KVStore` if persistent storage is required.
- Copy the modules directly into other projects; no packaging step is necessary.
- Configure CORS origins via `AGENTPLAN_ALLOWED_ORIGINS` (comma-separated) if the frontend runs on different hosts.
- A starter plan (`demo/default-plan`) loads automatically so the UI can connect without setup.

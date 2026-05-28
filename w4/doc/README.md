# GeekBrain W4 AI System

W4 is organized into four working areas:

```text
w4/
  frontend/   React/Vite console for chat and observability
  backend/    FastAPI unified agent, tools, data, tests, and backend scripts
  terraform/  AWS Bedrock Knowledge Base, S3, OpenSearch, DynamoDB, and Lambda infra
  doc/        Project documentation
```

## Architecture

The backend exposes one unified intelligent agent. The API request does not contain a level selector. L1/L2/L3/L4 are evaluation criteria only, not code routing branches.

Core API contract:

```http
POST /query
Content-Type: application/json

{
  "query": "Which services breached SLA last month?",
  "session_id": "optional-session-id"
}
```

The agent decides whether to answer directly or invoke tools through a ReAct loop. Registered tools:

- `retrieve_knowledge`
- `query_database`
- `get_service_metrics`
- `get_service_status`
- `list_services`
- `get_incident_history`
- `get_team_info`
- `compare_services`

## Backend

```bash
cd w4/backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
python seed_data.py --db-type sqlite --sqlite-path geekbrain.db
./start_backend.sh
```

Backend services:

- Monitoring API: `http://localhost:8000`
- Unified Agent API: `http://localhost:8001`
- Observability endpoints: `GET /api/queries`, `GET /api/query/{query_id}`

Environment template: `w4/backend/.env.example`

The backend searches for `.env` in the current directory, `backend/`, `w4/`, and the repository root.

## Frontend

```bash
cd w4/frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:8002`

The React app calls `VITE_API_BASE_URL`, defaulting to `http://localhost:8001`. To override:

```bash
cp .env.example .env
# edit VITE_API_BASE_URL if needed
```

Frontend capabilities:

- Chat with the unified `/query` API
- Session-aware queries through `session_id`
- Query history from the backend observability API
- Event timeline showing memory, retrieval, tool calls, and final responses

## Terraform

```bash
cd w4/terraform
terraform init
terraform plan
terraform apply
```

Terraform reads Knowledge Base documents from:

```text
w4/backend/data_package/knowledge_base
```

Lambda packaging reads from:

```text
w4/backend/lambda/kb_auto_sync_lambda.py
```

After apply, use the Terraform helper scripts from `w4/terraform`:

```bash
bash create_index_manual.sh
bash trigger_kb_sync.sh
```

## Tests

```bash
cd w4/backend
../venv/bin/python -m compileall src tests
../venv/bin/python -m pytest tests/unit -q
../venv/bin/python -m pytest tests/integration/test_l3_orchestration.py -q
```

The integration test file name still reflects the original assignment label, but the implementation under test is the unified no-level agent architecture.

## Development Notes

- Keep React UI code in `frontend/`.
- Keep Python application code, data packages, Lambda source, and tests in `backend/`.
- Keep AWS infrastructure code in `terraform/`.
- Keep architecture and run documentation in `doc/`.
- Do not reintroduce a `level` field into `/query` or hardcoded L1/L2/L3/L4 routing.

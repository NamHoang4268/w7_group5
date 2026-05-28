"""
FastAPI application for GeekBrain AI System.

This module provides the REST API endpoints for querying the AI system.
"""

import os
import time
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from rag_pipeline import RAGPipeline
from orchestrator import Orchestrator, QueryRequest as OrchestratorQueryRequest
from tools import ToolExecutor, RetrieveKnowledgeTool, DatabaseQueryTool, ServiceMetricsTool, ServiceStatusTool, ListServicesTool, IncidentHistoryTool, TeamInfoTool, CompareServicesTool
from memory import WindowMemory, DynamoDBMemory
from event_logger import event_logger

# Load environment variables from .env file
# Look for .env in multiple locations: current dir, backend dir, w4 dir, and repo root
env_paths = [
    Path(".env"),
    Path("../.env"),
    Path("../../.env"),
    Path("../../../.env"),
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break
else:
    # If no .env found, just load from default location
    load_dotenv()


# Pydantic models for request/response
class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    query: str = Field(..., min_length=1, description="User's question")
    session_id: Optional[str] = Field(None, description="Optional session ID for multi-turn conversations")


class QueryResponse(BaseModel):
    """Response model for query endpoint."""
    answer: str = Field(..., description="Generated answer")
    sources: list[str] = Field(..., description="Source documents cited")
    tools_used: list[str] = Field(default_factory=list, description="Tools selected autonomously by the agent")
    processing_time: float = Field(..., description="Processing time in seconds")


# Initialize FastAPI app
app = FastAPI(
    title="GeekBrain AI System",
    description="AI-powered question answering system for GeekBrain fintech startup",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG Pipeline
# Get configuration from environment variables
KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KB_ID")
MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-sonnet-20241022-v2:0")
_DEFAULT_DB_PATH = str(Path(__file__).resolve().parent.parent / "geekbrain.db")
DB_PATH = os.getenv("DB_PATH", _DEFAULT_DB_PATH)
MONITORING_API_URL = os.getenv("MONITORING_API_URL", "http://localhost:8000")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE", "")
DYNAMODB_REGION = os.getenv("DYNAMODB_REGION") or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")

rag_pipeline = RAGPipeline(
    knowledge_base_id=KNOWLEDGE_BASE_ID,
    model_id=MODEL_ID
)

# Initialize the unified tool registry
tool_executor = None
orchestrator = None

try:
    print(f"📂 DB_PATH = {DB_PATH}")
    print(f"   exists={os.path.exists(DB_PATH)}, size={os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 'N/A'}")
    
    # Validate the database is not empty
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) == 0:
        print(f"⚠️  WARNING: Database file is empty (0 bytes)! Removing and looking for real one...")
        os.remove(DB_PATH)
    
    if not os.path.exists(DB_PATH) or os.path.getsize(DB_PATH) == 0:
        # Try to find the real database
        alt_paths = [
            str(Path(__file__).resolve().parent.parent / "geekbrain.db"),
            str(Path(__file__).resolve().parent / ".." / "geekbrain.db"),
        ]
        for alt in alt_paths:
            if os.path.exists(alt) and os.path.getsize(alt) > 0:
                DB_PATH = alt
                print(f"✅ Found valid database at: {DB_PATH} ({os.path.getsize(DB_PATH)} bytes)")
                break
    
    # Initialize tools
    retrieve_tool = RetrieveKnowledgeTool(rag_pipeline=rag_pipeline)
    db_tool = DatabaseQueryTool(db_path=DB_PATH)
    metrics_tool = ServiceMetricsTool(api_base_url=MONITORING_API_URL)
    status_tool = ServiceStatusTool(api_base_url=MONITORING_API_URL)
    list_services_tool = ListServicesTool(api_base_url=MONITORING_API_URL)
    incident_tool = IncidentHistoryTool(db_path=DB_PATH)
    team_info_tool = TeamInfoTool(rag_pipeline=rag_pipeline)
    compare_tool = CompareServicesTool(metrics_tool=metrics_tool)
    
    # Register all tools
    tool_executor = ToolExecutor()
    tool_executor.register_tool("retrieve_knowledge", retrieve_tool)
    tool_executor.register_tool("query_database", db_tool)
    tool_executor.register_tool("get_service_metrics", metrics_tool)
    tool_executor.register_tool("get_service_status", status_tool)
    tool_executor.register_tool("list_services", list_services_tool)
    tool_executor.register_tool("get_incident_history", incident_tool)
    tool_executor.register_tool("get_team_info", team_info_tool)
    tool_executor.register_tool("compare_services", compare_tool)
    
    # Verify DB tool works at startup
    test_result = db_tool.execute_query("SELECT COUNT(*) as cnt FROM monthly_costs")
    print(f"   DB test query: {test_result}")
    
    # Initialize Orchestrator with RAG, tools, and optional memory
    # Use DynamoDB if configured, otherwise fall back to in-memory WindowMemory
    memory_manager = None
    if DYNAMODB_TABLE:
        try:
            memory_manager = DynamoDBMemory(
                table_name=DYNAMODB_TABLE,
                window_size=5,
                ttl_days=30,
                region_name=DYNAMODB_REGION,
            )
            print(f"✅ DynamoDBMemory initialized: table={DYNAMODB_TABLE}")
        except Exception as e:
            print(f"⚠️  DynamoDB not available ({e}), falling back to WindowMemory")
            memory_manager = WindowMemory(window_size=5)
    else:
        memory_manager = WindowMemory(window_size=5)
        print("ℹ️  Using in-memory WindowMemory (set DYNAMODB_TABLE to enable persistence)")

    orchestrator = Orchestrator(
        rag_pipeline=rag_pipeline,
        tool_executor=tool_executor,
        memory_manager=memory_manager,
        model_id=MODEL_ID
    )
    
    print("✅ Unified agent initialized with 8 tools + WindowMemory")
    
except Exception as e:
    print(f"⚠️  Warning: Could not initialize unified agent tools: {e}")
    print("   /query will not be available until tools are initialized")
    # Continue so health checks can still report process status


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "service": "GeekBrain AI System",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "knowledge_base_configured": KNOWLEDGE_BASE_ID is not None
    }


@app.get("/api/queries")
async def list_queries():
    """List recent query summaries for the React observability UI."""
    query_ids = event_logger.get_all_query_ids()
    summaries = []
    for query_id in query_ids[:50]:
        summary = event_logger.get_query_summary(query_id)
        if summary:
            summaries.append(summary)
    return {"queries": summaries}


@app.get("/api/query/{query_id}")
async def get_query_details(query_id: str):
    """Return all processing events for a query."""
    events = event_logger.get_events(query_id)
    return {
        "query_id": query_id,
        "events": [event.to_dict() for event in events],
    }


@app.post("/query", response_model=QueryResponse, status_code=status.HTTP_200_OK)
async def query_endpoint(request: QueryRequest):
    """
    Query endpoint for the unified intelligent agent.

    The request does not include an architecture selector. The LLM decides
    whether to answer directly or use one or more registered tools.
    
    Args:
        request: QueryRequest with query string and optional session ID
        
    Returns:
        QueryResponse with answer, sources, tools_used, and processing time
        
    Raises:
        HTTPException: If query processing fails
    """
    start_time = time.time()
    query_id = event_logger.new_query_id()
    event_logger.log_query_received(query_id, request.query, request.session_id)
    
    try:
        if orchestrator is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unified agent is not available. Tools or memory were not initialized."
            )

        orchestrator_request = OrchestratorQueryRequest(
            query=request.query,
            session_id=request.session_id,
        )

        response = orchestrator.process_query(orchestrator_request)
        processing_time = round(response.processing_time, 3)

        if response.memory_turns_loaded and request.session_id:
            event_logger.log_memory_loaded(
                query_id, request.session_id, response.memory_turns_loaded
            )

        if response.chunks_used:
            event_logger.log_retrieval(query_id, response.chunks_used)

        for call in response.tool_calls:
            event_logger.log_tool_call(
                query_id,
                call.get("tool_name", "unknown"),
                call.get("parameters", {}),
                call.get("result", ""),
                call.get("success", False),
            )

        event_logger.log_response_generated(
            query_id, response.answer, response.processing_time, response.tools_used
        )

        return QueryResponse(
            answer=response.answer,
            sources=response.sources,
            tools_used=response.tools_used,
            processing_time=processing_time,
        )
        
    except ValueError as e:
        # Handle validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
        
    except RuntimeError as e:
        # Handle Bedrock API failures
        error_message = str(e)
        
        # Check for specific error types
        if "retrieve" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Knowledge Base retrieval failed: {error_message}"
            )
        elif "generate" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Response generation failed: {error_message}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Query processing failed: {error_message}"
            )
        
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


# ── Bonus B: Investigation Endpoint ─────────────────────────────
investigation_agent = None
try:
    from investigation import InvestigationAgent
    if orchestrator:
        investigation_agent = InvestigationAgent(orchestrator)
        print("✅ InvestigationAgent initialized (Bonus B)")
except Exception as e:
    print(f"⚠️  InvestigationAgent not available: {e}")


class InvestigationRequest(BaseModel):
    """Request model for investigation endpoint."""
    query: str = Field(..., min_length=1, description="Investigation question")
    service_name: Optional[str] = Field(None, description="Service to investigate (auto-detected if omitted)")


@app.post("/investigate")
async def investigate_endpoint(request: InvestigationRequest):
    """
    Investigation endpoint (Bonus B) — multi-step agent reasoning.

    Runs plan-gather-analyze-report workflow and returns structured report.
    """
    if investigation_agent is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Investigation agent not available"
        )

    try:
        report = investigation_agent.investigate(
            query=request.query,
            service_name=request.service_name
        )
        return {
            "service": report.service_name,
            "report_markdown": report.to_markdown(),
            "issues_count": len(report.issues_found),
            "recommendations_count": len(report.recommendations),
            "reasoning_steps": len(report.reasoning_steps),
            "total_time_ms": round(report.total_time_ms, 1),
            "issues": report.issues_found,
            "recommendations": report.recommendations,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Investigation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )

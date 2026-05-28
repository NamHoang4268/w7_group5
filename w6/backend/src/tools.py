"""
Tool implementations for GeekBrain AI System.

This module provides the unified agent's tool registry: knowledge retrieval,
database access, live monitoring API calls, and composed helper tools.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import sqlite3
import requests


@dataclass
class ToolDefinition:
    """Definition of a tool that can be called by the LLM."""
    name: str
    description: str
    parameters: Dict[str, Any]


@dataclass
class ToolResult:
    """Result from executing a tool."""
    success: bool
    data: Any
    error: str = None


class RetrieveKnowledgeTool:
    """Tool for retrieving qualitative information from the Bedrock Knowledge Base."""

    def __init__(self, rag_pipeline):
        self.rag_pipeline = rag_pipeline

    def retrieve_knowledge(self, query: str, max_results: int = 5) -> ToolResult:
        """
        Search the GeekBrain knowledge base.

        Args:
            query: Search query
            max_results: Maximum number of chunks to retrieve

        Returns:
            ToolResult with retrieved document excerpts and source citations
        """
        try:
            bounded_results = max(1, min(int(max_results or 5), 10))
            chunks = self.rag_pipeline.retrieve(query=query, top_k=bounded_results)
            data = {
                "query": query,
                "chunks": [
                    {
                        "text": chunk.text,
                        "source": chunk.source,
                        "score": chunk.score,
                    }
                    for chunk in chunks
                ],
            }
            return ToolResult(success=True, data=data)
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Knowledge retrieval failed: {str(e)}",
            )

    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="retrieve_knowledge",
            description=(
                "Search GeekBrain knowledge base for qualitative information. "
                "Contains team structure, policies, architecture docs, and postmortems. "
                "Use for questions about who, what policy, how to, team ownership, "
                "architecture explanations, and qualitative incident causes. "
                "Do NOT use for numerical data, current metrics, historical costs, "
                "counts, or SLA target values."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for the knowledge base",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of document chunks to retrieve",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        )


class DatabaseQueryTool:
    """Tool for executing read-only SQL queries against the database."""
    
    def __init__(self, db_path: str):
        """
        Initialize database query tool.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.read_only_keywords = ['SELECT', 'WITH']
        self.forbidden_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER']
    
    def execute_query(self, sql: str) -> ToolResult:
        """
        Execute read-only SQL query against database.
        
        Args:
            sql: SQL query string
            
        Returns:
            ToolResult with rows or error message
        """
        # Validate query is read-only
        sql_upper = sql.strip().upper()
        if not any(sql_upper.startswith(kw) for kw in self.read_only_keywords):
            return ToolResult(
                success=False,
                data=None,
                error="Only SELECT queries are allowed"
            )
        
        if any(kw in sql_upper for kw in self.forbidden_keywords):
            return ToolResult(
                success=False,
                data=None,
                error="Write operations are not permitted"
            )
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return ToolResult(success=True, data=rows)
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Query execution failed: {str(e)}"
            )
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="query_database",
            description=(
                "Query historical numerical data from GeekBrain database. "
                "Tables: monthly_costs, incidents, sla_targets, daily_metrics. "
                "Contains historical numerical data from Oct 2025 through Mar 2026. "
                "Use for costs, incident counts, SLA target values, and historical metrics. "
                "CRITICAL: Always use this for numerical historical data; never answer "
                "numbers from documents. Returns rows as JSON."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL SELECT query to execute"
                    }
                },
                "required": ["sql"]
            }
        )


class ServiceMetricsTool:
    """Tool for fetching current service metrics from monitoring API."""
    
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        """
        Initialize service metrics tool.
        
        Args:
            api_base_url: Base URL of monitoring API
        """
        self.api_base_url = api_base_url
        self.timeout = 3  # seconds
    
    def get_metrics(self, service_name: str) -> ToolResult:
        """
        Get current live metrics for a service.
        
        Args:
            service_name: Name of service (e.g., 'PaymentGW')
            
        Returns:
            ToolResult with current metrics or error
        """
        try:
            response = requests.get(
                f"{self.api_base_url}/metrics/{service_name}",
                timeout=self.timeout
            )
            
            if response.status_code == 404:
                return ToolResult(
                    success=False,
                    data=None,
                    error=f"Service '{service_name}' not found"
                )
            
            response.raise_for_status()
            data = response.json()
            
            return ToolResult(success=True, data=data)
            
        except requests.Timeout:
            return ToolResult(
                success=False,
                data=None,
                error="Monitoring API timeout - service may be down"
            )
        except requests.RequestException as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Failed to fetch metrics: {str(e)}"
            )
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="get_service_metrics",
            description=(
                "Get CURRENT live performance metrics for one service from the monitoring API. "
                "Returns p50/p95/p99 latency in ms, error rate percentage, and requests per minute. "
                "Use when the question asks about current, now, right now, live metrics, "
                "latency now, error rate now, or whether a specific service is healthy. "
                "Do NOT use for historical data; use query_database instead."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "Name of the service (e.g., PaymentGW, NotificationSvc)"
                    }
                },
                "required": ["service_name"]
            }
        )


class ServiceStatusTool:
    """Tool for getting live status of a service."""
    
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        """
        Initialize service status tool.
        
        Args:
            api_base_url: Base URL of monitoring API
        """
        self.api_base_url = api_base_url
        self.timeout = 3  # seconds
    
    def get_status(self, service_name: str) -> ToolResult:
        """
        Get current operational status of a service.
        
        Args:
            service_name: Name of service (e.g., 'PaymentGW')
            
        Returns:
            ToolResult with status (healthy/degraded/down) or error
        """
        try:
            if service_name.lower() == "all":
                services_response = requests.get(
                    f"{self.api_base_url}/services",
                    timeout=self.timeout
                )
                services_response.raise_for_status()
                services = services_response.json()
                statuses = []
                for service in services:
                    status_response = requests.get(
                        f"{self.api_base_url}/status/{service}",
                        timeout=self.timeout
                    )
                    status_response.raise_for_status()
                    statuses.append(status_response.json())
                return ToolResult(success=True, data=statuses)

            response = requests.get(
                f"{self.api_base_url}/status/{service_name}",
                timeout=self.timeout
            )
            
            if response.status_code == 404:
                return ToolResult(
                    success=False,
                    data=None,
                    error=f"Service '{service_name}' not found"
                )
            
            response.raise_for_status()
            data = response.json()
            
            return ToolResult(success=True, data=data)
            
        except requests.Timeout:
            return ToolResult(
                success=False,
                data=None,
                error="Monitoring API timeout - service may be down"
            )
        except requests.RequestException as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Failed to fetch status: {str(e)}"
            )
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="get_service_status",
            description=(
                "Get CURRENT status of one or all services. Returns status "
                "(healthy/degraded/down), last incident, and active alerts. "
                "Use when the question asks whether a service is healthy, whether any "
                "services are degraded, or what is down. This is the only tool that can "
                "answer 'are any services degraded' questions."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "Service name, or 'all' for all services"
                    }
                },
                "required": ["service_name"]
            }
        )


class ListServicesTool:
    """Tool for listing all services in the system."""
    
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        """
        Initialize list services tool.
        
        Args:
            api_base_url: Base URL of monitoring API
        """
        self.api_base_url = api_base_url
        self.timeout = 3  # seconds
    
    def list_services(self) -> ToolResult:
        """
        Get list of all services in the GeekBrain system.
        
        Returns:
            ToolResult with list of service names or error
        """
        try:
            response = requests.get(
                f"{self.api_base_url}/services",
                timeout=self.timeout
            )
            
            response.raise_for_status()
            data = response.json()
            
            return ToolResult(success=True, data=data)
            
        except requests.Timeout:
            return ToolResult(
                success=False,
                data=None,
                error="Monitoring API timeout - service may be down"
            )
        except requests.RequestException as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Failed to fetch services list: {str(e)}"
            )
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="list_services",
            description=(
                "List all services being monitored. Use when the question asks "
                "what services, list services, or which services are monitored."
            ),
            parameters={
                "type": "object",
                "properties": {}
            }
        )


class IncidentHistoryTool:
    """Tool for querying incident history from database."""
    
    def __init__(self, db_tool: "DatabaseQueryTool" = None, db_path: str = None):
        """
        Initialize incident history tool.
        
        Args:
            db_tool: DatabaseQueryTool instance (preferred)
            db_path: Path to SQLite database (alternative, creates a DatabaseQueryTool internally)
        """
        if db_tool is not None:
            self.db_tool = db_tool
        elif db_path is not None:
            self.db_tool = DatabaseQueryTool(db_path=db_path)
        else:
            raise ValueError("Either db_tool or db_path must be provided")
    
    def get_incidents(
        self,
        service_name: Optional[str] = None,
        severity: str = "all",
        limit: int = 10,
    ) -> ToolResult:
        """
        Get past incidents for a service or all services.
        
        Args:
            service_name: Optional service name to filter by
            
        Returns:
            ToolResult with incident records or error
        """
        filters = []
        if service_name and service_name.lower() != "all":
            safe_service = service_name.replace("'", "''")
            filters.append(f"service = '{safe_service}'")
        if severity and severity.lower() != "all":
            safe_severity = severity.replace("'", "''")
            filters.append(f"severity = '{safe_severity}'")

        bounded_limit = max(1, min(int(limit or 10), 50))
        where_clause = f" WHERE {' AND '.join(filters)}" if filters else ""
        sql = f"SELECT * FROM incidents{where_clause} ORDER BY date DESC LIMIT {bounded_limit}"
        
        return self.db_tool.execute_query(sql)
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="get_incident_history",
            description=(
                "Get past incidents for a service from the database. Returns incident "
                "records with severity, timestamp/date, duration, root cause, and resolution. "
                "Use when the question asks about past incidents, incident history, or "
                "how many incidents. Do NOT use for current status; use get_service_status instead."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "Service name, or 'all' for all services"
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["P1", "P2", "P3", "all"],
                        "description": "Optional incident severity filter",
                        "default": "all",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of incidents to return",
                        "default": 10,
                    }
                },
                "required": ["service_name"],
            }
        )


class TeamInfoTool:
    """Tool for retrieving team information from knowledge base."""
    
    def __init__(self, rag_pipeline):
        """
        Initialize team info tool.
        
        Args:
            rag_pipeline: RAGPipeline instance for searching documents
        """
        self.rag_pipeline = rag_pipeline
    
    def get_team_info(self, team_name: str) -> ToolResult:
        """
        Get information about a team.
        
        Args:
            team_name: Name of the team (e.g., "Platform", "Commerce")
            
        Returns:
            ToolResult with team information or error
        """
        try:
            # Use RAG pipeline to search for team documents
            query = f"Information about Team {team_name}"
            chunks = self.rag_pipeline.retrieve(query, top_k=3)
            
            if not chunks:
                return ToolResult(
                    success=False,
                    data=None,
                    error=f"No information found for Team {team_name}"
                )
            
            # Extract relevant information from chunks
            team_info = {
                "team_name": team_name,
                "chunks": [
                    {
                        "text": chunk.text,
                        "source": chunk.source,
                        "score": chunk.score
                    }
                    for chunk in chunks
                ]
            }
            
            return ToolResult(success=True, data=team_info)
            
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Failed to retrieve team info: {str(e)}"
            )
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="get_team_info",
            description=(
                "Get information about a team from the knowledge base. Returns team lead, "
                "members, responsibilities, and services owned. Use when the question asks "
                "about team structure, who owns a service, or which team is responsible. "
                "This is a convenience wrapper around retrieve_knowledge for team queries."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "team_name": {
                        "type": "string",
                        "description": "Name of the team (e.g., Platform, Commerce, Data)"
                    }
                },
                "required": ["team_name"]
            }
        )


class CompareServicesTool:
    """Tool for comparing metrics between multiple services."""
    
    def __init__(self, metrics_tool: ServiceMetricsTool):
        """
        Initialize compare services tool.
        
        Args:
            metrics_tool: ServiceMetricsTool instance for fetching metrics
        """
        self.metrics_tool = metrics_tool
    
    def compare_services(self, service_names: List[str], metric: str) -> ToolResult:
        """
        Compare a specific metric across multiple services.
        
        Args:
            service_names: List of service names to compare
            metric: Metric to compare (e.g., 'latency_p99_ms', 'error_rate')
            
        Returns:
            ToolResult with comparison data or error
        """
        try:
            results = {}
            errors = []
            
            metric_aliases = {
                "latency": ["latency_p99_ms", "latency_ms.p99"],
                "latency_p99_ms": ["latency_p99_ms", "latency_ms.p99"],
                "error_rate": ["error_rate", "error_rate_percent"],
                "requests": ["requests_per_min", "requests_per_minute"],
                "requests_per_min": ["requests_per_min", "requests_per_minute"],
            }
            candidates = metric_aliases.get(metric, [metric])

            for service in service_names:
                metrics_result = self.metrics_tool.get_metrics(service)
                if metrics_result.success:
                    value_found = False
                    for candidate in candidates:
                        if "." in candidate:
                            outer, inner = candidate.split(".", 1)
                            if outer in metrics_result.data and inner in metrics_result.data[outer]:
                                results[service] = metrics_result.data[outer][inner]
                                value_found = True
                                break
                        elif candidate in metrics_result.data:
                            results[service] = metrics_result.data[candidate]
                            value_found = True
                            break
                    if not value_found:
                        errors.append(f"Metric '{metric}' not found for {service}")
                else:
                    errors.append(f"Failed to get metrics for {service}: {metrics_result.error}")
            
            if not results and errors:
                return ToolResult(
                    success=False,
                    data=None,
                    error="; ".join(errors)
                )
            
            comparison_data = {
                "metric": metric,
                "services": results
            }
            
            if errors:
                comparison_data["warnings"] = errors
            
            return ToolResult(success=True, data=comparison_data)
            
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error=f"Failed to compare services: {str(e)}"
            )
    
    def get_definition(self) -> ToolDefinition:
        """Get tool definition for LLM."""
        return ToolDefinition(
            name="compare_services",
            description=(
                "Compare metrics across multiple services. Returns a comparison table with "
                "metrics for each service. Use when the question asks to compare services "
                "or identify which service has the highest latency, error rate, or traffic. "
                "This tool automatically calls get_service_metrics for each service."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "service_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of service names to compare"
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["latency", "error_rate", "requests", "latency_p99_ms", "requests_per_min"],
                        "description": "Metric to compare"
                    }
                },
                "required": ["service_names", "metric"]
            }
        )


class ToolExecutor:
    """Orchestrates tool execution."""
    
    # Map from tool name to the method to call on the tool instance
    _METHOD_MAP: Dict[str, str] = {
        "retrieve_knowledge": "retrieve_knowledge",
        "query_database": "execute_query",
        "get_service_metrics": "get_metrics",
        "get_service_status": "get_status",
        "list_services": "list_services",
        "get_incident_history": "get_incidents",
        "get_team_info": "get_team_info",
        "compare_services": "compare_services",
    }

    def __init__(self, tools: List[Any] = None):
        """
        Initialize tool executor.

        Can be used in two ways:
        1. Pass a list of tool instances at creation time.
        2. Call register_tool() to add tools individually after creation.

        Args:
            tools: Optional list of tool instances (each must have get_definition())
        """
        self.tools: Dict[str, Any] = {}
        self.tool_definitions: List[ToolDefinition] = []

        if tools:
            for tool in tools:
                defn = tool.get_definition()
                self.tools[defn.name] = tool
                self.tool_definitions.append(defn)

    def register_tool(self, name: str, tool: Any) -> None:
        """
        Register a tool instance under the given name.

        Args:
            name: Tool name (must match the tool's get_definition().name)
            tool: Tool instance with get_definition() method
        """
        self.tools[name] = tool
        defn = tool.get_definition()
        # Replace existing definition if already registered
        self.tool_definitions = [
            d for d in self.tool_definitions if d.name != name
        ]
        self.tool_definitions.append(defn)

    def execute(self, tool_name: str, parameters: Dict[str, Any] = None, **kwargs) -> ToolResult:
        """
        Execute a tool function with given parameters.
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Parameters to pass to the tool
            
        Returns:
            ToolResult from tool execution
        """
        if parameters is None:
            parameters = kwargs
        elif kwargs:
            parameters = {**parameters, **kwargs}

        if tool_name not in self.tools:
            return ToolResult(
                success=False,
                data=None,
                error=f"Tool '{tool_name}' not found"
            )
        
        tool = self.tools[tool_name]
        method_name = self._METHOD_MAP.get(tool_name)

        if method_name and hasattr(tool, method_name):
            method = getattr(tool, method_name)
            try:
                return method(**parameters)
            except TypeError as e:
                return ToolResult(
                    success=False,
                    data=None,
                    error=f"Invalid parameters for tool '{tool_name}': {str(e)}"
                )
        else:
            return ToolResult(
                success=False,
                data=None,
                error=f"Unknown tool or missing method: {tool_name}"
            )
    
    def get_tool_definitions(self) -> List[ToolDefinition]:
        """Return list of available tools for LLM."""
        return self.tool_definitions

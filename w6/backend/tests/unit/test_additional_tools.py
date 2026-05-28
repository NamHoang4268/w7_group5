"""
Unit tests for additional tools (Tasks 12.3, 13.6).

Tests ServiceMetricsTool, ServiceStatusTool, ListServicesTool,
IncidentHistoryTool, TeamInfoTool, CompareServicesTool.
Uses mocks to avoid depending on live monitoring API or AWS.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from tools import (
    RetrieveKnowledgeTool, ServiceMetricsTool, ServiceStatusTool, ListServicesTool,
    IncidentHistoryTool, CompareServicesTool, ToolResult, ToolExecutor,
    DatabaseQueryTool
)
from rag_pipeline import Chunk

DB_PATH = str(Path(__file__).parent.parent.parent / "geekbrain.db")


# ---------------------------------------------------------------------------
# RetrieveKnowledgeTool
# ---------------------------------------------------------------------------


class TestRetrieveKnowledgeTool:
    """Unit tests for RetrieveKnowledgeTool."""

    def test_retrieve_knowledge_returns_chunks(self):
        mock_rag = MagicMock()
        mock_rag.retrieve.return_value = [
            Chunk(text="Team Platform is led by Alex Chen.", source="team_platform.md", score=0.91)
        ]

        tool = RetrieveKnowledgeTool(rag_pipeline=mock_rag)
        result = tool.retrieve_knowledge("Who leads Team Platform?", max_results=3)

        assert result.success is True
        assert result.data["chunks"][0]["source"] == "team_platform.md"
        mock_rag.retrieve.assert_called_once_with(query="Who leads Team Platform?", top_k=3)

    def test_get_definition(self):
        tool = RetrieveKnowledgeTool(rag_pipeline=MagicMock())
        definition = tool.get_definition()

        assert definition.name == "retrieve_knowledge"
        assert "qualitative" in definition.description.lower()
        assert "query" in definition.parameters["required"]

# ---------------------------------------------------------------------------
# ServiceMetricsTool (Task 12.3)
# ---------------------------------------------------------------------------

PAYMENT_GW_METRICS = {
    "service": "PaymentGW",
    "timestamp": "2026-03-15T10:30:00Z",
    "latency_p50_ms": 45,
    "latency_p95_ms": 120,
    "latency_p99_ms": 185,
    "error_rate": 0.02,
    "requests_per_min": 1250
}


class TestServiceMetricsTool:
    """Unit tests for ServiceMetricsTool."""

    def setup_method(self):
        self.tool = ServiceMetricsTool(api_base_url="http://localhost:8000")

    def test_successful_metrics_retrieval(self):
        """Test successful metrics retrieval returns correct data."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = PAYMENT_GW_METRICS

        with patch("tools.requests.get", return_value=mock_response):
            result = self.tool.get_metrics("PaymentGW")

        assert result.success is True
        assert result.data is not None
        assert result.data["service"] == "PaymentGW"
        assert result.data["latency_p99_ms"] == 185
        assert result.data["error_rate"] == 0.02

    def test_service_not_found_returns_error(self):
        """Test that 404 returns a descriptive error."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("tools.requests.get", return_value=mock_response):
            result = self.tool.get_metrics("NonExistentSvc")

        assert result.success is False
        assert result.error is not None
        assert "not found" in result.error.lower()

    def test_timeout_returns_error(self):
        """Test timeout handling when API is unavailable."""
        import requests as req

        with patch("tools.requests.get", side_effect=req.Timeout):
            result = self.tool.get_metrics("PaymentGW")

        assert result.success is False
        assert result.error is not None
        assert "timeout" in result.error.lower()

    def test_connection_error_returns_error(self):
        """Test connection error when monitoring API is not running."""
        import requests as req

        with patch("tools.requests.get", side_effect=req.ConnectionError("Connection refused")):
            result = self.tool.get_metrics("PaymentGW")

        assert result.success is False
        assert result.error is not None

    def test_get_definition(self):
        """Test tool definition has correct fields."""
        definition = self.tool.get_definition()
        assert definition.name == "get_service_metrics"
        assert "current" in definition.description.lower() or "live" in definition.description.lower()
        assert "latency" in definition.description.lower()
        assert "service_name" in definition.parameters["properties"]
        assert "service_name" in definition.parameters["required"]


# ---------------------------------------------------------------------------
# ServiceStatusTool (Task 13.6)
# ---------------------------------------------------------------------------


class TestServiceStatusTool:
    """Unit tests for ServiceStatusTool."""

    def setup_method(self):
        self.tool = ServiceStatusTool(api_base_url="http://localhost:8000")

    def test_successful_status_retrieval(self):
        """Test successful status retrieval."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"service": "PaymentGW", "status": "healthy"}

        with patch("tools.requests.get", return_value=mock_response):
            result = self.tool.get_status("PaymentGW")

        assert result.success is True
        assert result.data["status"] == "healthy"

    def test_service_not_found(self):
        """Test 404 returns error."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("tools.requests.get", return_value=mock_response):
            result = self.tool.get_status("UnknownSvc")

        assert result.success is False
        assert "not found" in result.error.lower()

    def test_get_definition(self):
        """Test tool definition is correctly formatted."""
        definition = self.tool.get_definition()
        assert definition.name == "get_service_status"
        assert "status" in definition.description.lower()
        assert "service_name" in definition.parameters["properties"]


# ---------------------------------------------------------------------------
# ListServicesTool (Task 13.6)
# ---------------------------------------------------------------------------


class TestListServicesTool:
    """Unit tests for ListServicesTool."""

    SERVICES_RESPONSE = {
        "services": [
            "PaymentGW", "NotificationSvc", "UserAuthSvc",
            "ReportingEngine", "FraudDetector", "DataPipeline"
        ]
    }

    def setup_method(self):
        self.tool = ListServicesTool(api_base_url="http://localhost:8000")

    def test_returns_all_services(self):
        """Test that list_services returns list of services."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.SERVICES_RESPONSE

        with patch("tools.requests.get", return_value=mock_response):
            result = self.tool.list_services()

        assert result.success is True
        assert result.data is not None

    def test_get_definition(self):
        """Test tool definition has no required parameters."""
        definition = self.tool.get_definition()
        assert definition.name == "list_services"
        assert "services" in definition.description.lower() or "list" in definition.description.lower()

    def test_timeout_error(self):
        """Test timeout handling."""
        import requests as req

        with patch("tools.requests.get", side_effect=req.Timeout):
            result = self.tool.list_services()

        assert result.success is False
        assert "timeout" in result.error.lower()


# ---------------------------------------------------------------------------
# IncidentHistoryTool (Task 13.6)
# ---------------------------------------------------------------------------


class TestIncidentHistoryTool:
    """Unit tests for IncidentHistoryTool."""

    def setup_method(self):
        self.tool = IncidentHistoryTool(db_path=DB_PATH)

    def test_get_all_incidents(self):
        """Test fetching all incidents (no service filter)."""
        result = self.tool.get_incidents()
        assert result.success is True
        assert result.data is not None
        assert isinstance(result.data, list)

    def test_get_incidents_for_payment_gw(self):
        """Test filtering incidents by service name."""
        result = self.tool.get_incidents(service_name="PaymentGW")
        assert result.success is True
        # All returned incidents should be for PaymentGW
        for incident in result.data:
            assert incident["service"] == "PaymentGW"

    def test_get_incidents_unknown_service(self):
        """Test that unknown service returns empty list (not error)."""
        result = self.tool.get_incidents(service_name="NonExistentSvc")
        assert result.success is True
        assert result.data == []

    def test_get_definition(self):
        """Test tool definition is correctly formatted."""
        definition = self.tool.get_definition()
        assert definition.name == "get_incident_history"
        assert "incident" in definition.description.lower()
        assert "service_name" in definition.parameters["properties"]

    def test_init_with_db_path(self):
        """Test IncidentHistoryTool can be initialized with db_path."""
        tool = IncidentHistoryTool(db_path=DB_PATH)
        assert tool.db_tool is not None

    def test_init_with_db_tool(self):
        """Test IncidentHistoryTool can be initialized with db_tool instance."""
        db_tool = DatabaseQueryTool(db_path=DB_PATH)
        tool = IncidentHistoryTool(db_tool=db_tool)
        assert tool.db_tool is db_tool

    def test_init_without_args_raises(self):
        """Test that init without args raises ValueError."""
        with pytest.raises(ValueError):
            IncidentHistoryTool()


# ---------------------------------------------------------------------------
# CompareServicesTool (Task 13.6)
# ---------------------------------------------------------------------------


class TestCompareServicesTool:
    """Unit tests for CompareServicesTool."""

    def setup_method(self):
        self.metrics_tool = ServiceMetricsTool(api_base_url="http://localhost:8000")
        self.tool = CompareServicesTool(metrics_tool=self.metrics_tool)

    def _mock_metrics(self, service_name: str) -> ToolResult:
        """Return mock metrics for known services."""
        data = {
            "PaymentGW": {
                "latency_p99_ms": 185, "error_rate": 0.02, "requests_per_min": 1250
            },
            "NotificationSvc": {
                "latency_p99_ms": 3200, "error_rate": 0.15, "requests_per_min": 450
            },
        }
        if service_name in data:
            return ToolResult(success=True, data=data[service_name])
        return ToolResult(success=False, data=None, error=f"Service '{service_name}' not found")

    def test_compare_two_services(self):
        """Test comparing latency_p99_ms between two services."""
        with patch.object(self.metrics_tool, "get_metrics", side_effect=self._mock_metrics):
            result = self.tool.compare_services(
                service_names=["PaymentGW", "NotificationSvc"],
                metric="latency_p99_ms"
            )

        assert result.success is True
        assert result.data["metric"] == "latency_p99_ms"
        assert result.data["services"]["PaymentGW"] == 185
        assert result.data["services"]["NotificationSvc"] == 3200

    def test_compare_with_invalid_service(self):
        """Test comparison when one service fails."""
        with patch.object(self.metrics_tool, "get_metrics", side_effect=self._mock_metrics):
            result = self.tool.compare_services(
                service_names=["PaymentGW", "UnknownSvc"],
                metric="latency_p99_ms"
            )

        # Should succeed with partial results
        assert result.success is True
        assert "PaymentGW" in result.data["services"]
        assert "warnings" in result.data

    def test_compare_all_invalid_services_returns_error(self):
        """Test that comparing only invalid services returns error."""
        with patch.object(self.metrics_tool, "get_metrics", side_effect=self._mock_metrics):
            result = self.tool.compare_services(
                service_names=["UnknownSvc1", "UnknownSvc2"],
                metric="latency_p99_ms"
            )

        assert result.success is False
        assert result.error is not None

    def test_get_definition(self):
        """Test tool definition has correct schema."""
        definition = self.tool.get_definition()
        assert definition.name == "compare_services"
        assert "service_names" in definition.parameters["properties"]
        assert "metric" in definition.parameters["properties"]
        assert "service_names" in definition.parameters["required"]
        assert "metric" in definition.parameters["required"]


# ---------------------------------------------------------------------------
# ToolExecutor (Task 13.6)
# ---------------------------------------------------------------------------


class TestToolExecutor:
    """Tests for ToolExecutor register/execute mechanism."""

    def setup_method(self):
        self.db_tool = DatabaseQueryTool(db_path=DB_PATH)
        self.executor = ToolExecutor()
        self.executor.register_tool("query_database", self.db_tool)

    def test_register_and_execute_tool(self):
        """Test registering a tool and executing it."""
        result = self.executor.execute(
            "query_database",
            {"sql": "SELECT COUNT(*) as cnt FROM monthly_costs"}
        )
        assert result.success is True
        assert result.data[0]["cnt"] > 0

    def test_execute_unknown_tool_returns_error(self):
        """Test executing an unknown tool name returns error."""
        result = self.executor.execute("nonexistent_tool", {})
        assert result.success is False
        assert "not found" in result.error.lower()

    def test_get_tool_definitions(self):
        """Test that definitions are returned after registration."""
        definitions = self.executor.get_tool_definitions()
        names = [d.name for d in definitions]
        assert "query_database" in names

    def test_register_multiple_tools(self):
        """Test that multiple tools can be registered."""
        metrics_tool = ServiceMetricsTool()
        status_tool = ServiceStatusTool()
        self.executor.register_tool("get_service_metrics", metrics_tool)
        self.executor.register_tool("get_service_status", status_tool)

        definitions = self.executor.get_tool_definitions()
        names = [d.name for d in definitions]
        assert "query_database" in names
        assert "get_service_metrics" in names
        assert "get_service_status" in names

    def test_init_with_tool_list(self):
        """Test that ToolExecutor can be initialized with a list of tools."""
        executor = ToolExecutor(tools=[self.db_tool])
        definitions = executor.get_tool_definitions()
        assert any(d.name == "query_database" for d in definitions)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

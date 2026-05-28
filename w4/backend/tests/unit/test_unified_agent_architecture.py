"""
Unit tests for the unified GeekBrain agent architecture.
"""

import json
import os
import sys
from unittest.mock import MagicMock, Mock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../src"))

from orchestrator import Orchestrator, QueryRequest, ToolOrchestrator
from rag_pipeline import RAGPipeline
from tools import ToolDefinition, ToolExecutor, ToolResult
from memory import WindowMemory, ConversationTurn
from datetime import datetime


def _bedrock_response(payload):
    response = {"body": MagicMock()}
    response["body"].read.return_value = json.dumps(payload).encode("utf-8")
    return response


class TestUnifiedAgentArchitecture:
    def test_direct_general_knowledge_uses_no_tools(self):
        mock_executor = Mock(spec=ToolExecutor)
        mock_executor.get_tool_definitions.return_value = []

        direct_response = _bedrock_response(
            {
                "stop_reason": "end_turn",
                "content": [
                    {"type": "text", "text": "Answer: SLA stands for Service Level Agreement."}
                ],
            }
        )

        with patch("orchestrator.boto3.client") as mock_client:
            mock_client.return_value.invoke_model.return_value = direct_response
            agent = ToolOrchestrator(mock_executor)
            result = agent.process_query_with_tools("What does SLA mean?")

        assert result["tools_used"] == []
        mock_executor.execute.assert_not_called()

    def test_status_query_executes_status_tool_only(self):
        mock_executor = Mock(spec=ToolExecutor)
        mock_executor.get_tool_definitions.return_value = [
            ToolDefinition(
                name="get_service_status",
                description="Get current status",
                parameters={"type": "object", "properties": {"service_name": {"type": "string"}}},
            )
        ]
        mock_executor.execute.return_value = ToolResult(
            success=True,
            data=[{"service": "NotificationSvc", "status": "degraded"}],
        )

        tool_response = _bedrock_response(
            {
                "stop_reason": "tool_use",
                "content": [
                    {
                        "type": "tool_use",
                        "id": "tool_1",
                        "name": "get_service_status",
                        "input": {"service_name": "all"},
                    }
                ],
            }
        )
        final_response = _bedrock_response(
            {
                "stop_reason": "end_turn",
                "content": [{"type": "text", "text": "NotificationSvc is degraded."}],
            }
        )

        with patch("orchestrator.boto3.client") as mock_client:
            mock_client.return_value.invoke_model.side_effect = [tool_response, final_response]
            agent = ToolOrchestrator(mock_executor)
            result = agent.process_query_with_tools("Are any services degraded?")

        assert result["tools_used"] == ["get_service_status"]
        mock_executor.execute.assert_called_once_with(
            "get_service_status", {"service_name": "all"}
        )

    def test_multi_tool_query_executes_all_selected_tools(self):
        mock_executor = Mock(spec=ToolExecutor)
        mock_executor.get_tool_definitions.return_value = [
            ToolDefinition("query_database", "Query database", {"type": "object"}),
            ToolDefinition("get_service_metrics", "Get metrics", {"type": "object"}),
        ]
        mock_executor.execute.side_effect = [
            ToolResult(success=True, data=[{"metric": "latency_p99_ms", "target": 2000}]),
            ToolResult(success=True, data={"latency_ms": {"p99": 3200}}),
        ]

        tool_response = _bedrock_response(
            {
                "stop_reason": "tool_use",
                "content": [
                    {
                        "type": "tool_use",
                        "id": "tool_1",
                        "name": "query_database",
                        "input": {"sql": "SELECT * FROM sla_targets WHERE service = 'NotificationSvc'"},
                    },
                    {
                        "type": "tool_use",
                        "id": "tool_2",
                        "name": "get_service_metrics",
                        "input": {"service_name": "NotificationSvc"},
                    },
                ],
            }
        )
        final_response = _bedrock_response(
            {
                "stop_reason": "end_turn",
                "content": [{"type": "text", "text": "NotificationSvc is breaching SLA."}],
            }
        )

        with patch("orchestrator.boto3.client") as mock_client:
            mock_client.return_value.invoke_model.side_effect = [tool_response, final_response]
            agent = ToolOrchestrator(mock_executor)
            result = agent.process_query_with_tools("Is NotificationSvc meeting its SLA targets?")

        assert result["tools_used"] == ["query_database", "get_service_metrics"]
        assert len(result["tool_calls"]) == 2

    def test_retrieve_knowledge_is_tool_selected_by_model(self):
        mock_executor = Mock(spec=ToolExecutor)
        mock_executor.get_tool_definitions.return_value = [
            ToolDefinition("retrieve_knowledge", "Search KB", {"type": "object"})
        ]
        mock_executor.execute.return_value = ToolResult(
            success=True,
            data={
                "chunks": [
                    {
                        "text": "Team Platform is led by Alex Chen.",
                        "source": "team_platform.md",
                        "score": 0.93,
                    }
                ]
            },
        )

        tool_response = _bedrock_response(
            {
                "stop_reason": "tool_use",
                "content": [
                    {
                        "type": "tool_use",
                        "id": "tool_1",
                        "name": "retrieve_knowledge",
                        "input": {"query": "Team Platform lead", "max_results": 3},
                    }
                ],
            }
        )
        final_response = _bedrock_response(
            {
                "stop_reason": "end_turn",
                "content": [{"type": "text", "text": "Team Platform is led by Alex Chen."}],
            }
        )

        with patch("orchestrator.boto3.client") as mock_client:
            mock_client.return_value.invoke_model.side_effect = [tool_response, final_response]
            agent = ToolOrchestrator(mock_executor)
            result = agent.process_query_with_tools("Who leads Team Platform?")

        assert result["tools_used"] == ["retrieve_knowledge"]
        assert result["sources"] == ["team_platform.md"]
        assert result["retrieval_chunks"][0]["source"] == "team_platform.md"

    def test_orchestrator_passes_session_history_without_preretrieval(self):
        mock_rag = Mock(spec=RAGPipeline)
        mock_executor = Mock(spec=ToolExecutor)
        memory = WindowMemory(window_size=5)
        memory.save_turn(
            "session-1",
            ConversationTurn(
                turn_id=1,
                timestamp=datetime.now(),
                query="Which service had the highest cost in March 2026?",
                response="PaymentGW had the highest March cost.",
                context_used=["query_database tool"],
            ),
        )

        orchestrator = Orchestrator(
            rag_pipeline=mock_rag,
            tool_executor=mock_executor,
            memory_manager=memory,
        )
        orchestrator.tool_orchestrator = Mock(spec=ToolOrchestrator)
        orchestrator.tool_orchestrator.process_query_with_tools.return_value = {
            "answer": "The spike was caused by the PaymentGW scaling incident.",
            "tools_used": ["retrieve_knowledge"],
            "sources": ["paymentgw_postmortem.md"],
            "tool_calls": [],
            "retrieval_chunks": [],
        }

        response = orchestrator.process_query(
            QueryRequest(query="Why did its cost spike?", session_id="session-1")
        )

        assert response.memory_turns_loaded == 1
        assert not mock_rag.retrieve.called
        call_kwargs = orchestrator.tool_orchestrator.process_query_with_tools.call_args.kwargs
        assert "PaymentGW" in call_kwargs["conversation_context"]

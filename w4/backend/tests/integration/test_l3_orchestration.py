"""
Integration-style tests for unified tool orchestration.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, PropertyMock
import json

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

from orchestrator import Orchestrator, QueryRequest, ToolOrchestrator
from rag_pipeline import RAGPipeline, Chunk
from tools import ToolExecutor, DatabaseQueryTool, ServiceMetricsTool, ToolDefinition, ToolResult


class TestUnifiedOrchestration:
    """Test unified orchestration with tools."""
    
    def test_l3_orchestrator_with_mocked_components(self):
        """Test L3 orchestration with fully mocked components."""
        # Create mock RAG pipeline
        mock_rag = Mock(spec=RAGPipeline)
        mock_rag.retrieve.return_value = [
            Chunk(
                text='PaymentGW is a payment gateway service.',
                source='service_paymentgw.md',
                score=0.9
            )
        ]
        mock_rag._format_chunks_as_context.return_value = "Context: PaymentGW info"
        
        # Create mock tool executor
        mock_tool_executor = Mock(spec=ToolExecutor)
        mock_tool_executor.get_tool_definitions.return_value = [
            ToolDefinition(
                name="query_database",
                description="Query database",
                parameters={"type": "object", "properties": {"sql": {"type": "string"}}}
            )
        ]
        mock_tool_executor.execute.return_value = ToolResult(
            success=True,
            data=[{"sum": 16500}],
            error=None
        )
        
        # Create mock ToolOrchestrator
        mock_tool_orch = Mock(spec=ToolOrchestrator)
        mock_tool_orch.process_query_with_tools.return_value = {
            "answer": "Tổng chi phí của PaymentGW là $16,500.",
            "tools_used": ["query_database"],
            "sources": ["service_paymentgw.md", "query_database tool"],
            "iterations": 2
        }
        
        # Create orchestrator with mocked components
        orchestrator = Orchestrator(
            rag_pipeline=mock_rag,
            tool_executor=mock_tool_executor
        )
        
        # Replace the tool_orchestrator with our mock
        orchestrator.tool_orchestrator = mock_tool_orch
        
        # Process query without any architecture selector
        request = QueryRequest(
            query="What was PaymentGW's total cost?"
        )
        
        response = orchestrator.process_query(request)
        
        # Verify response
        assert response.answer == "Tổng chi phí của PaymentGW là $16,500."
        assert "query_database" in response.tools_used
        assert len(response.sources) > 0
        assert response.processing_time >= 0
        
        # Verify RAG was not called before the agent selected a tool
        assert not mock_rag.retrieve.called
        
        # Verify tool orchestrator was called
        assert mock_tool_orch.process_query_with_tools.called
    
    def test_tool_orchestrator_respects_max_iterations(self):
        """Test that tool orchestrator has max_iterations set correctly."""
        mock_tool_executor = Mock(spec=ToolExecutor)
        orchestrator = ToolOrchestrator(mock_tool_executor)
        
        # Verify max_iterations is set
        assert orchestrator.max_iterations == 10
    
    def test_processing_without_tool_executor_raises_error(self):
        """Test that processing without a tool executor raises error."""
        mock_rag = Mock(spec=RAGPipeline)
        
        # Create orchestrator without tool_executor
        orchestrator = Orchestrator(
            rag_pipeline=mock_rag,
            tool_executor=None
        )
        
        request = QueryRequest(
            query="Test query"
        )
        
        # Should raise ValueError
        with pytest.raises(ValueError, match="Unified agent requires"):
            orchestrator.process_query(request)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

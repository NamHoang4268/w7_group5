"""
Unit tests for ToolOrchestrator class.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
import json

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

from orchestrator import ToolOrchestrator
from tools import ToolExecutor, ToolDefinition, ToolResult, DatabaseQueryTool


class TestToolOrchestrator:
    """Test ToolOrchestrator functionality."""
    
    def test_tool_orchestrator_initialization(self):
        """Test ToolOrchestrator can be initialized."""
        # Create mock tool executor
        mock_tool_executor = Mock(spec=ToolExecutor)
        
        # Initialize ToolOrchestrator
        orchestrator = ToolOrchestrator(
            tool_executor=mock_tool_executor,
            model_id="test-model-id"
        )
        
        assert orchestrator.tool_executor == mock_tool_executor
        assert orchestrator.model_id == "test-model-id"
        assert orchestrator.max_iterations == 10
    
    def test_format_tool_definitions(self):
        """Test tool definitions are formatted correctly for Claude API."""
        # Create mock tool executor with tool definitions
        mock_tool_executor = Mock(spec=ToolExecutor)
        mock_tool_executor.get_tool_definitions.return_value = [
            ToolDefinition(
                name="test_tool",
                description="A test tool",
                parameters={
                    "type": "object",
                    "properties": {
                        "param1": {"type": "string"}
                    }
                }
            )
        ]
        
        orchestrator = ToolOrchestrator(mock_tool_executor)
        formatted = orchestrator._format_tool_definitions()
        
        assert len(formatted) == 1
        assert formatted[0]["name"] == "test_tool"
        assert formatted[0]["description"] == "A test tool"
        assert "input_schema" in formatted[0]
    
    def test_system_prompt_contains_tool_guidance(self):
        """Test unified system prompt contains tool selection guidance."""
        mock_tool_executor = Mock(spec=ToolExecutor)
        orchestrator = ToolOrchestrator(mock_tool_executor)
        
        prompt = orchestrator._get_system_prompt()
        
        # Check for key guidance elements
        assert "retrieve_knowledge" in prompt
        assert "query_database" in prompt
        assert "get_service_metrics" in prompt
        assert "historical" in prompt.lower()
        assert "current" in prompt.lower()
        assert "zero tools" in prompt.lower()
    
    @patch('orchestrator.boto3.client')
    def test_process_query_with_direct_answer(self, mock_boto_client):
        """Test processing query when LLM answers directly without tools."""
        # Setup mock
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock
        
        # Mock LLM response - direct answer without tool use
        mock_response = {
            'body': MagicMock()
        }
        mock_response['body'].read.return_value = json.dumps({
            'stop_reason': 'end_turn',
            'content': [
                {
                    'type': 'text',
                    'text': 'This is a direct answer from knowledge base.'
                }
            ]
        }).encode('utf-8')
        
        mock_bedrock.invoke_model.return_value = mock_response
        
        # Create orchestrator
        mock_tool_executor = Mock(spec=ToolExecutor)
        mock_tool_executor.get_tool_definitions.return_value = []
        
        orchestrator = ToolOrchestrator(mock_tool_executor)
        
        # Process query
        result = orchestrator.process_query_with_tools(
            query="Test query",
            context="Test context"
        )
        
        assert result["answer"] == "This is a direct answer from knowledge base."
        assert result["tools_used"] == []
        assert result["iterations"] == 1
    
    @patch('orchestrator.boto3.client')
    def test_process_query_with_tool_use(self, mock_boto_client):
        """Test processing query when LLM uses a tool."""
        # Setup mock
        mock_bedrock = MagicMock()
        mock_boto_client.return_value = mock_bedrock
        
        # Mock tool executor
        mock_tool_executor = Mock(spec=ToolExecutor)
        mock_tool_executor.get_tool_definitions.return_value = [
            ToolDefinition(
                name="test_tool",
                description="Test tool",
                parameters={"type": "object", "properties": {}}
            )
        ]
        mock_tool_executor.execute.return_value = ToolResult(
            success=True,
            data={"result": "tool result"}
        )
        
        # Mock LLM responses
        # First response: tool_use
        tool_use_response = {
            'body': MagicMock()
        }
        tool_use_response['body'].read.return_value = json.dumps({
            'stop_reason': 'tool_use',
            'content': [
                {
                    'type': 'text',
                    'text': 'I need to use a tool.'
                },
                {
                    'type': 'tool_use',
                    'id': 'tool_123',
                    'name': 'test_tool',
                    'input': {}
                }
            ]
        }).encode('utf-8')
        
        # Second response: final answer
        final_response = {
            'body': MagicMock()
        }
        final_response['body'].read.return_value = json.dumps({
            'stop_reason': 'end_turn',
            'content': [
                {
                    'type': 'text',
                    'text': 'Based on the tool result, the answer is X.'
                }
            ]
        }).encode('utf-8')
        
        mock_bedrock.invoke_model.side_effect = [tool_use_response, final_response]
        
        # Create orchestrator
        orchestrator = ToolOrchestrator(mock_tool_executor)
        
        # Process query
        result = orchestrator.process_query_with_tools(
            query="Test query requiring tool"
        )
        
        assert "answer" in result
        assert result["tools_used"] == ["test_tool"]
        assert result["iterations"] == 2
        assert mock_tool_executor.execute.called


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

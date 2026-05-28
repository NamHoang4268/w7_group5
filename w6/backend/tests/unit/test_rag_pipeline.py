"""
Unit tests for RAG Pipeline module.

Tests the retrieve() and retrieve_and_generate() methods with mocked Bedrock API calls.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))

from rag_pipeline import RAGPipeline, Chunk, Response


class TestRAGPipelineRetrieve:
    """Test suite for RAGPipeline.retrieve() method."""
    
    @pytest.fixture
    def rag_pipeline(self):
        """Create RAGPipeline instance with test KB ID."""
        return RAGPipeline(knowledge_base_id="test-kb-123")
    
    @pytest.fixture
    def mock_retrieve_response(self):
        """Mock response from Bedrock retrieve API."""
        return {
            'retrievalResults': [
                {
                    'content': {'text': 'Team Platform is led by Alex Chen.'},
                    'location': {
                        's3Location': {
                            'uri': 's3://geekbrain-kb/team_platform.md'
                        }
                    },
                    'score': 0.95
                },
                {
                    'content': {'text': 'Team Platform manages infrastructure and deployment.'},
                    'location': {
                        's3Location': {
                            'uri': 's3://geekbrain-kb/team_platform.md'
                        }
                    },
                    'score': 0.87
                },
                {
                    'content': {'text': 'PaymentGW is owned by Team Platform.'},
                    'location': {
                        's3Location': {
                            'uri': 's3://geekbrain-kb/services/payment_gateway.md'
                        }
                    },
                    'score': 0.82
                },
                {
                    'content': {'text': 'Deployment freeze window is Friday 18:00 to Monday 08:00.'},
                    'location': {
                        's3Location': {
                            'uri': 's3://geekbrain-kb/policies/deployment_policy.md'
                        }
                    },
                    'score': 0.78
                },
                {
                    'content': {'text': 'All deployments require approval from team lead.'},
                    'location': {
                        's3Location': {
                            'uri': 's3://geekbrain-kb/policies/deployment_policy.md'
                        }
                    },
                    'score': 0.71
                }
            ]
        }
    
    def test_retrieve_returns_expected_number_of_chunks(self, rag_pipeline, mock_retrieve_response):
        """Test that retrieve() returns the correct number of chunks based on top_k."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            # Test with default top_k=5
            chunks = rag_pipeline.retrieve("Who is Team Platform lead?", top_k=5)
            assert len(chunks) == 5, f"Expected 5 chunks, got {len(chunks)}"
            
            # Test with top_k=3
            mock_response_3 = {
                'retrievalResults': mock_retrieve_response['retrievalResults'][:3]
            }
            with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_response_3):
                chunks = rag_pipeline.retrieve("Who is Team Platform lead?", top_k=3)
                assert len(chunks) == 3, f"Expected 3 chunks, got {len(chunks)}"
    
    def test_retrieve_chunks_contain_required_fields(self, rag_pipeline, mock_retrieve_response):
        """Test that each chunk contains text, source, and score fields."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            chunks = rag_pipeline.retrieve("Who is Team Platform lead?", top_k=5)
            
            for i, chunk in enumerate(chunks):
                # Check that chunk is a Chunk instance
                assert isinstance(chunk, Chunk), f"Chunk {i} is not a Chunk instance"
                
                # Check text field
                assert hasattr(chunk, 'text'), f"Chunk {i} missing 'text' field"
                assert isinstance(chunk.text, str), f"Chunk {i} text is not a string"
                assert len(chunk.text) > 0, f"Chunk {i} text is empty"
                
                # Check source field
                assert hasattr(chunk, 'source'), f"Chunk {i} missing 'source' field"
                assert isinstance(chunk.source, str), f"Chunk {i} source is not a string"
                assert len(chunk.source) > 0, f"Chunk {i} source is empty"
                
                # Check score field
                assert hasattr(chunk, 'score'), f"Chunk {i} missing 'score' field"
                assert isinstance(chunk.score, (int, float)), f"Chunk {i} score is not numeric"
                assert 0.0 <= chunk.score <= 1.0, f"Chunk {i} score {chunk.score} not in range [0, 1]"
    
    def test_retrieve_extracts_filename_from_s3_uri(self, rag_pipeline, mock_retrieve_response):
        """Test that source field contains just the filename, not full S3 URI."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            chunks = rag_pipeline.retrieve("Who is Team Platform lead?", top_k=5)
            
            # Check that sources are filenames, not full URIs
            assert chunks[0].source == 'team_platform.md'
            assert chunks[2].source == 'payment_gateway.md'
            assert chunks[3].source == 'deployment_policy.md'
            
            # Ensure no S3 URI prefix
            for chunk in chunks:
                assert not chunk.source.startswith('s3://'), f"Source should be filename only, got: {chunk.source}"
    
    def test_retrieve_orders_by_relevance_score(self, rag_pipeline, mock_retrieve_response):
        """Test that chunks are ordered by relevance score (highest first)."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            chunks = rag_pipeline.retrieve("Who is Team Platform lead?", top_k=5)
            
            # Verify scores are in descending order
            scores = [chunk.score for chunk in chunks]
            assert scores == sorted(scores, reverse=True), "Chunks should be ordered by score (highest first)"
            
            # Verify specific scores from mock data
            assert chunks[0].score == 0.95
            assert chunks[1].score == 0.87
            assert chunks[2].score == 0.82
            assert chunks[3].score == 0.78
            assert chunks[4].score == 0.71
    
    def test_retrieve_raises_error_without_kb_id(self):
        """Test that retrieve() raises ValueError when knowledge_base_id is not set."""
        rag_pipeline = RAGPipeline(knowledge_base_id=None)
        
        with pytest.raises(ValueError, match="knowledge_base_id is required"):
            rag_pipeline.retrieve("test query")
    
    def test_retrieve_handles_api_error(self, rag_pipeline):
        """Test that retrieve() raises RuntimeError when Bedrock API fails."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', side_effect=Exception("API Error")):
            with pytest.raises(RuntimeError, match="Failed to retrieve from Knowledge Base"):
                rag_pipeline.retrieve("test query")
    
    def test_retrieve_handles_empty_results(self, rag_pipeline):
        """Test that retrieve() handles empty retrieval results gracefully."""
        empty_response = {'retrievalResults': []}
        
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=empty_response):
            chunks = rag_pipeline.retrieve("nonexistent query")
            assert len(chunks) == 0, "Should return empty list for no results"
    
    def test_retrieve_calls_bedrock_api_with_correct_parameters(self, rag_pipeline):
        """Test that retrieve() calls Bedrock API with correct parameters."""
        mock_retrieve = Mock(return_value={'retrievalResults': []})
        
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', mock_retrieve):
            rag_pipeline.retrieve("test query", top_k=10)
            
            # Verify API was called with correct parameters
            mock_retrieve.assert_called_once()
            call_args = mock_retrieve.call_args
            
            assert call_args.kwargs['knowledgeBaseId'] == 'test-kb-123'
            assert call_args.kwargs['retrievalQuery'] == {'text': 'test query'}
            assert call_args.kwargs['retrievalConfiguration'] == {
                'vectorSearchConfiguration': {
                    'numberOfResults': 10
                }
            }


class TestRAGPipelineRetrieveAndGenerate:
    """Test suite for RAGPipeline.retrieve_and_generate() method."""
    
    @pytest.fixture
    def rag_pipeline(self):
        """Create RAGPipeline instance with test KB ID."""
        return RAGPipeline(knowledge_base_id="test-kb-123")
    
    @pytest.fixture
    def mock_retrieve_response(self):
        """Mock response from Bedrock retrieve API."""
        return {
            'retrievalResults': [
                {
                    'content': {'text': 'Team Platform is led by Alex Chen.'},
                    'location': {'s3Location': {'uri': 's3://geekbrain-kb/team_platform.md'}},
                    'score': 0.95
                },
                {
                    'content': {'text': 'Alex Chen has 8 years of experience in infrastructure.'},
                    'location': {'s3Location': {'uri': 's3://geekbrain-kb/team_platform.md'}},
                    'score': 0.88
                }
            ]
        }
    
    @pytest.fixture
    def mock_invoke_model_response(self):
        """Mock response from Bedrock InvokeModel API."""
        response_body = {
            'content': [
                {
                    'text': 'Theo team_platform.md, Team Platform lead là Alex Chen.'
                }
            ]
        }
        
        # Create a mock response object
        mock_response = {
            'body': BytesIO(json.dumps(response_body).encode('utf-8'))
        }
        return mock_response
    
    def test_retrieve_and_generate_includes_source_citations(self, rag_pipeline, mock_retrieve_response, mock_invoke_model_response):
        """Test that retrieve_and_generate() response includes source citations."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', return_value=mock_invoke_model_response):
                response = rag_pipeline.retrieve_and_generate("Who is Team Platform lead?")
                
                # Check that response is a Response instance
                assert isinstance(response, Response)
                
                # Check that sources list is populated
                assert len(response.sources) > 0, "Response should include sources"
                
                # Check that source citation is present
                assert 'team_platform.md' in response.sources
                
                # Check that answer contains citation
                assert 'team_platform.md' in response.answer.lower()
    
    def test_retrieve_and_generate_returns_response_object(self, rag_pipeline, mock_retrieve_response, mock_invoke_model_response):
        """Test that retrieve_and_generate() returns a properly structured Response object."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', return_value=mock_invoke_model_response):
                response = rag_pipeline.retrieve_and_generate("test query")
                
                # Check Response structure
                assert isinstance(response, Response)
                assert hasattr(response, 'answer')
                assert hasattr(response, 'sources')
                assert hasattr(response, 'chunks_used')
                
                # Check field types
                assert isinstance(response.answer, str)
                assert isinstance(response.sources, list)
                assert isinstance(response.chunks_used, list)
                
                # Check that answer is not empty
                assert len(response.answer) > 0
    
    def test_retrieve_and_generate_uses_retrieved_chunks(self, rag_pipeline, mock_retrieve_response, mock_invoke_model_response):
        """Test that retrieve_and_generate() includes retrieved chunks in response."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', return_value=mock_invoke_model_response):
                response = rag_pipeline.retrieve_and_generate("test query")
                
                # Check that chunks_used is populated
                assert len(response.chunks_used) == 2
                
                # Check that chunks are Chunk instances
                for chunk in response.chunks_used:
                    assert isinstance(chunk, Chunk)
    
    def test_retrieve_and_generate_handles_no_chunks(self, rag_pipeline):
        """Test that retrieve_and_generate() handles case when no chunks are retrieved."""
        empty_response = {'retrievalResults': []}
        
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=empty_response):
            response = rag_pipeline.retrieve_and_generate("nonexistent query")
            
            # Should return a response indicating no information found
            assert isinstance(response, Response)
            assert 'could not find relevant information' in response.answer.lower()
            assert len(response.sources) == 0
            assert len(response.chunks_used) == 0
    
    def test_retrieve_and_generate_calls_llm_with_context(self, rag_pipeline, mock_retrieve_response, mock_invoke_model_response):
        """Test that retrieve_and_generate() calls LLM with properly formatted context."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            mock_invoke = Mock(return_value=mock_invoke_model_response)
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', mock_invoke):
                rag_pipeline.retrieve_and_generate("Who is Team Platform lead?")
                
                # Verify invoke_model was called
                mock_invoke.assert_called_once()
                
                # Extract the request body
                call_args = mock_invoke.call_args
                body_str = call_args.kwargs['body']
                body = json.loads(body_str)
                
                # Check that system prompt is included
                assert 'system' in body
                assert 'GeekBrain' in body['system']
                
                # Check that messages include context and query
                assert 'messages' in body
                assert len(body['messages']) > 0
                user_message = body['messages'][0]['content']
                
                # Context should include chunk text
                assert 'Team Platform is led by Alex Chen' in user_message
                assert 'Câu hỏi:' in user_message or 'Who is Team Platform lead?' in user_message
    
    def test_retrieve_and_generate_handles_llm_error(self, rag_pipeline, mock_retrieve_response):
        """Test that retrieve_and_generate() raises RuntimeError when LLM invocation fails."""
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_retrieve_response):
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', side_effect=Exception("LLM Error")):
                with pytest.raises(RuntimeError, match="Failed to generate grounded response"):
                    rag_pipeline.retrieve_and_generate("test query")
    
    def test_retrieve_and_generate_extracts_unique_sources(self, rag_pipeline, mock_invoke_model_response):
        """Test that retrieve_and_generate() extracts unique sources from chunks."""
        # Mock response with duplicate sources
        mock_response_duplicates = {
            'retrievalResults': [
                {
                    'content': {'text': 'Text 1'},
                    'location': {'s3Location': {'uri': 's3://bucket/doc1.md'}},
                    'score': 0.9
                },
                {
                    'content': {'text': 'Text 2'},
                    'location': {'s3Location': {'uri': 's3://bucket/doc1.md'}},
                    'score': 0.8
                },
                {
                    'content': {'text': 'Text 3'},
                    'location': {'s3Location': {'uri': 's3://bucket/doc2.md'}},
                    'score': 0.7
                }
            ]
        }
        
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_response_duplicates):
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', return_value=mock_invoke_model_response):
                response = rag_pipeline.retrieve_and_generate("test query")
                
                # Should have only 2 unique sources
                assert len(response.sources) == 2
                assert 'doc1.md' in response.sources
                assert 'doc2.md' in response.sources
    
    def test_retrieve_and_generate_respects_top_k_parameter(self, rag_pipeline, mock_invoke_model_response):
        """Test that retrieve_and_generate() passes top_k parameter to retrieve()."""
        # Create mock with 10 results
        mock_response_10 = {
            'retrievalResults': [
                {
                    'content': {'text': f'Text {i}'},
                    'location': {'s3Location': {'uri': f's3://bucket/doc{i}.md'}},
                    'score': 0.9 - (i * 0.05)
                }
                for i in range(10)
            ]
        }
        
        with patch.object(rag_pipeline.bedrock_agent_runtime, 'retrieve', return_value=mock_response_10):
            with patch.object(rag_pipeline.bedrock_runtime, 'invoke_model', return_value=mock_invoke_model_response):
                response = rag_pipeline.retrieve_and_generate("test query", top_k=10)
                
                # Should have 10 chunks
                assert len(response.chunks_used) == 10


class TestRAGPipelineHelperMethods:
    """Test suite for RAGPipeline helper methods."""
    
    @pytest.fixture
    def rag_pipeline(self):
        """Create RAGPipeline instance."""
        return RAGPipeline(knowledge_base_id="test-kb-123")
    
    def test_format_chunks_as_context(self, rag_pipeline):
        """Test that _format_chunks_as_context() creates proper context string."""
        chunks = [
            Chunk(text="Team Platform is led by Alex Chen.", source="team_platform.md", score=0.95),
            Chunk(text="Deployment freeze is Friday 18:00 to Monday 08:00.", source="deployment_policy.md", score=0.87)
        ]
        
        context = rag_pipeline._format_chunks_as_context(chunks)
        
        # Check that context includes header
        assert "Knowledge base excerpts" in context
        
        # Check that sources are numbered
        assert "[Source 1: team_platform.md]" in context
        assert "[Source 2: deployment_policy.md]" in context
        
        # Check that chunk text is included
        assert "Team Platform is led by Alex Chen." in context
        assert "Deployment freeze is Friday 18:00 to Monday 08:00." in context
    
    def test_get_knowledge_system_prompt(self, rag_pipeline):
        """Test that _get_knowledge_system_prompt() returns proper system prompt."""
        prompt = rag_pipeline._get_knowledge_system_prompt()
        
        # Check key instructions are present
        assert "GeekBrain" in prompt
        assert "cite" in prompt.lower()
        assert "knowledge base" in prompt.lower()
        
        # Check that prompt is not empty
        assert len(prompt) > 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

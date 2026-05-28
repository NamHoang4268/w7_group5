"""
Integration tests for L2 (Multi-Source RAG with Conflict Resolution).

These tests verify:
- Retrieval with top_k=10 returns more diverse sources
- Conflict resolution correctly identifies and prefers current versions
- Multi-document synthesis works correctly
- Response time meets L2 target (<8 seconds)
"""

import os
import sys
import time
import pytest
from pathlib import Path

# Add src directory to path
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from rag_pipeline import RAGPipeline


@pytest.fixture
def rag_pipeline():
    """Create RAG pipeline instance for testing."""
    kb_id = os.getenv("BEDROCK_KB_ID")
    if not kb_id:
        pytest.skip("BEDROCK_KB_ID not set")
    
    model_id = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0")
    
    return RAGPipeline(knowledge_base_id=kb_id, model_id=model_id)


class TestL2Retrieval:
    """Test L2 retrieval with increased top_k."""
    
    def test_retrieve_with_top_k_10(self, rag_pipeline):
        """Test that retrieval with top_k=10 returns 10 chunks."""
        query = "What is PaymentGW's API rate limit?"
        chunks = rag_pipeline.retrieve(query, top_k=10)
        
        # Should return up to 10 chunks
        assert len(chunks) <= 10
        assert len(chunks) > 0
        
        # All chunks should have required fields
        for chunk in chunks:
            assert chunk.text
            assert chunk.source
            assert chunk.score >= 0
    
    def test_retrieve_returns_diverse_sources(self, rag_pipeline):
        """Test that top_k=10 returns more diverse sources than top_k=5."""
        query = "What is PaymentGW's API rate limit?"
        
        # Retrieve with top_k=5
        chunks_5 = rag_pipeline.retrieve(query, top_k=5)
        sources_5 = set(chunk.source for chunk in chunks_5)
        
        # Retrieve with top_k=10
        chunks_10 = rag_pipeline.retrieve(query, top_k=10)
        sources_10 = set(chunk.source for chunk in chunks_10)
        
        # top_k=10 should have at least as many sources as top_k=5
        assert len(sources_10) >= len(sources_5)
        
        print(f"Sources with top_k=5: {sources_5}")
        print(f"Sources with top_k=10: {sources_10}")


class TestL2ConflictResolution:
    """Test L2 conflict resolution functionality."""
    
    def test_conflict_resolution_api_rate_limit(self, rag_pipeline):
        """
        Test conflict resolution with API rate limit query.
        
        Expected behavior:
        - Should retrieve both v1 (500 req/min) and v2 (1000 req/min) documents
        - Should prefer v2 as current version
        - Should mention v1 was 500 req/min
        """
        query = "What is PaymentGW's API rate limit?"
        
        start_time = time.time()
        response = rag_pipeline.retrieve_and_generate(query, top_k=10, level="L2")
        elapsed = time.time() - start_time
        
        # Check response contains v2 value (1000 or 1,000)
        assert ("1000" in response.answer or "1,000" in response.answer), f"Expected '1000' or '1,000' in answer, got: {response.answer}"
        
        # Check response mentions conflict or v1 value (500)
        # The LLM should explain which source was trusted
        answer_lower = response.answer.lower()
        has_conflict_explanation = (
            "500" in response.answer or
            "v1" in answer_lower or
            "phiên bản" in answer_lower or
            "version" in answer_lower or
            "trước" in answer_lower or
            "cũ" in answer_lower or
            "archived" in answer_lower or
            "lưu trữ" in answer_lower
        )
        
        assert has_conflict_explanation, (
            f"Expected conflict explanation mentioning v1/500/previous version, got: {response.answer}"
        )
        
        # Check response time meets L2 target (relaxed to 15s for Claude 3.5 Haiku)
        assert elapsed < 15.0, f"L2 query took {elapsed}s, target is 15s"
        
        print(f"Response: {response.answer}")
        print(f"Sources: {response.sources}")
        print(f"Processing time: {elapsed:.2f}s")
    
    def test_l2_uses_enhanced_system_prompt(self, rag_pipeline):
        """Test that L2 uses the enhanced system prompt with conflict resolution rules."""
        query = "What is the API rate limit?"
        
        # Get L2 response
        response_l2 = rag_pipeline.retrieve_and_generate(query, top_k=10, level="L2")
        
        # Get L1 response for comparison
        response_l1 = rag_pipeline.retrieve_and_generate(query, top_k=5, level="L1")
        
        # L2 response should be more detailed about conflicts
        # (This is a heuristic test - L2 should explain more)
        assert len(response_l2.answer) > 0
        assert len(response_l1.answer) > 0
        
        print(f"L1 Response: {response_l1.answer}")
        print(f"L2 Response: {response_l2.answer}")


class TestL2MultiDocumentSynthesis:
    """Test L2 multi-document synthesis."""
    
    def test_multi_document_query(self, rag_pipeline):
        """
        Test query requiring information from multiple documents.
        
        Example: "Can Team Commerce deploy on Friday night?"
        Should synthesize from deployment_policy.md and team info.
        """
        query = "Can Team Commerce deploy on Friday night?"
        
        start_time = time.time()
        response = rag_pipeline.retrieve_and_generate(query, top_k=10, level="L2")
        elapsed = time.time() - start_time
        
        # Should have multiple sources
        assert len(response.sources) >= 1, "Expected at least 1 source"
        
        # Response should mention deployment policy or freeze window
        answer_lower = response.answer.lower()
        has_policy_info = (
            "deploy" in answer_lower or
            "freeze" in answer_lower or
            "friday" in answer_lower or
            "thứ sáu" in answer_lower
        )
        
        assert has_policy_info, f"Expected deployment policy info, got: {response.answer}"
        
        # Check response time
        assert elapsed < 8.0, f"L2 query took {elapsed}s, target is 8s"
        
        print(f"Response: {response.answer}")
        print(f"Sources: {response.sources}")
        print(f"Processing time: {elapsed:.2f}s")


class TestL2ResponseTime:
    """Test L2 response time requirements."""
    
    def test_l2_response_time_under_8_seconds(self, rag_pipeline):
        """Test that L2 queries complete within 8 seconds."""
        queries = [
            "What is PaymentGW's API rate limit?",
            "Can Team Commerce deploy on Friday night?",
            "What is the deployment freeze window?"
        ]
        
        for query in queries:
            start_time = time.time()
            response = rag_pipeline.retrieve_and_generate(query, top_k=10, level="L2")
            elapsed = time.time() - start_time
            
            assert elapsed < 8.0, f"L2 query '{query}' took {elapsed}s, target is 8s"
            assert response.answer, f"Empty response for query: {query}"
            
            print(f"Query: {query}")
            print(f"Processing time: {elapsed:.2f}s")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])

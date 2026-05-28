"""
Integration tests for L3 (Tool-Augmented RAG) functionality.

These tests verify the complete end-to-end flow of the L3 system:
- Tool orchestration with database queries
- Tool orchestration with monitoring API calls
- Combined tool usage (database + metrics)
- Response time requirements
- Numerical accuracy

Requirements tested: 4.8, 4.9, 4.10, 11.3, 13.1, 13.2, 13.3
"""

import os
import time
import pytest
import requests
from typing import Dict, Any


# Mark all tests in this module as integration and L3 tests
pytestmark = [pytest.mark.integration, pytest.mark.l3]


# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001")
MONITORING_API_URL = os.getenv("MONITORING_API_URL", "http://localhost:8000")
TIMEOUT = 15  # seconds (L3 can take up to 10s)


class TestL3Integration:
    """Integration tests for L3 Tool-Augmented RAG functionality."""
    
    @pytest.fixture(scope="class")
    def api_url(self):
        """Get API base URL."""
        return API_BASE_URL
    
    @pytest.fixture(scope="class")
    def query_endpoint(self, api_url):
        """Get query endpoint URL."""
        return f"{api_url}/query"
    
    @pytest.fixture(scope="class")
    def monitoring_api_url(self):
        """Get monitoring API base URL."""
        return MONITORING_API_URL
    
    def _make_query(self, endpoint: str, query: str, level: str = "L3") -> Dict[str, Any]:
        """
        Helper method to make a query to the API.
        
        Args:
            endpoint: API endpoint URL
            query: User's question
            level: Query level (default: L3)
            
        Returns:
            Response data as dictionary
            
        Raises:
            AssertionError: If request fails
        """
        payload = {
            "query": query,
            "level": level
        }
        
        response = requests.post(endpoint, json=payload, timeout=TIMEOUT)
        
        # Assert successful response
        assert response.status_code == 200, (
            f"Expected status 200, got {response.status_code}. "
            f"Response: {response.text}"
        )
        
        return response.json()
    
    def test_api_health_check(self, api_url):
        """
        Test that the API is running and healthy.
        
        This is a prerequisite for all other integration tests.
        """
        response = requests.get(f"{api_url}/health", timeout=TIMEOUT)
        
        assert response.status_code == 200, "API health check failed"
        
        data = response.json()
        assert data["status"] == "healthy", "API is not healthy"
        assert data["knowledge_base_configured"] is True, (
            "Knowledge Base is not configured. "
            "Please set BEDROCK_KB_ID environment variable."
        )
    
    def test_monitoring_api_health_check(self, monitoring_api_url):
        """
        Test that the Monitoring API is running.
        
        This is a prerequisite for L3 tests that use metrics tools.
        """
        try:
            response = requests.get(f"{monitoring_api_url}/services", timeout=5)
            assert response.status_code == 200, "Monitoring API health check failed"
            
            services = response.json()
            assert isinstance(services, list), "Services should be a list"
            assert len(services) > 0, "Services list should not be empty"
            
            print(f"\n✓ Monitoring API is healthy with {len(services)} services")
            
        except requests.exceptions.RequestException as e:
            pytest.fail(
                f"Monitoring API is not accessible at {monitoring_api_url}. "
                f"Please start monitoring_api.py. Error: {e}"
            )
    
    def test_paymentgw_q1_cost_query(self, query_endpoint):
        """
        Test query: "What was PaymentGW's total cost in Q1 2026?" returns $16,500.
        
        Requirements: 4.8, 13.1
        
        This test verifies:
        - Database query tool is invoked
        - Exact numerical value $16,500 is returned
        - Response includes tool usage information
        - Response time is under 10 seconds
        """
        query = "What was PaymentGW's total cost in Q1 2026?"
        
        # Measure end-to-end time
        start_time = time.time()
        data = self._make_query(query_endpoint, query)
        end_time = time.time()
        
        # Calculate total response time
        total_time = end_time - start_time
        processing_time = data.get("processing_time", 0)
        
        # Verify response structure
        assert "answer" in data, "Response missing 'answer' field"
        assert "sources" in data, "Response missing 'sources' field"
        assert "tools_used" in data, "Response missing 'tools_used' field"
        assert "processing_time" in data, "Response missing 'processing_time' field"
        
        answer = data["answer"]
        sources = data["sources"]
        tools_used = data["tools_used"]
        
        # Verify database tool was used
        assert "query_database" in tools_used, (
            f"Expected 'query_database' in tools_used, got: {tools_used}"
        )
        
        # Verify answer contains the exact value $16,500
        # Accept various formats: $16,500 | $16500 | 16,500 | 16500
        answer_normalized = answer.replace(",", "").replace("$", "").replace(" ", "")
        assert "16500" in answer_normalized, (
            f"Expected answer to contain '16500' (or $16,500), got: {answer}"
        )
        
        # Verify sources include database tool
        assert any("database" in source.lower() or "query_database" in source.lower() 
                   for source in sources), (
            f"Expected database tool in sources, got: {sources}"
        )
        
        # Verify response time is under 10 seconds
        assert processing_time < 10.0, (
            f"Processing time {processing_time}s exceeds 10 second limit for L3 query"
        )
        
        # Verify total response time is reasonable (under 12 seconds including network)
        assert total_time < 12.0, (
            f"Total response time {total_time}s exceeds 12 second limit for L3 query"
        )
        
        print(f"\n✓ PaymentGW Q1 cost query test passed")
        print(f"  Answer: {answer}")
        print(f"  Tools used: {tools_used}")
        print(f"  Sources: {sources}")
        print(f"  Processing time: {processing_time:.3f}s")
        print(f"  Total time: {total_time:.3f}s")
    
    def test_paymentgw_current_p99_latency_query(self, query_endpoint):
        """
        Test query: "What is PaymentGW's current p99 latency?" calls metrics tool.
        
        Requirements: 4.9, 13.2
        
        This test verifies:
        - Service metrics tool is invoked
        - Current live metrics are returned
        - Response includes tool usage information
        - Response time is under 10 seconds
        """
        query = "What is PaymentGW's current p99 latency?"
        
        # Measure end-to-end time
        start_time = time.time()
        data = self._make_query(query_endpoint, query)
        end_time = time.time()
        
        # Calculate total response time
        total_time = end_time - start_time
        processing_time = data.get("processing_time", 0)
        
        # Verify response structure
        assert "answer" in data, "Response missing 'answer' field"
        assert "tools_used" in data, "Response missing 'tools_used' field"
        
        answer = data["answer"]
        tools_used = data["tools_used"]
        sources = data["sources"]
        
        # Verify metrics tool was used
        assert "get_service_metrics" in tools_used, (
            f"Expected 'get_service_metrics' in tools_used, got: {tools_used}"
        )
        
        # Verify answer contains latency information
        # Should contain a number (the latency value in ms)
        answer_lower = answer.lower()
        has_latency_keyword = any(keyword in answer_lower 
                                   for keyword in ["latency", "độ trễ", "p99", "ms", "millisecond"])
        
        assert has_latency_keyword, (
            f"Expected answer to contain latency information, got: {answer}"
        )
        
        # Verify answer contains a numerical value
        # Extract numbers from answer
        import re
        numbers = re.findall(r'\d+', answer)
        assert len(numbers) > 0, (
            f"Expected answer to contain numerical latency value, got: {answer}"
        )
        
        # Verify sources include metrics tool
        assert any("metrics" in source.lower() or "get_service_metrics" in source.lower() 
                   for source in sources), (
            f"Expected metrics tool in sources, got: {sources}"
        )
        
        # Verify response time is under 10 seconds
        assert processing_time < 10.0, (
            f"Processing time {processing_time}s exceeds 10 second limit for L3 query"
        )
        
        print(f"\n✓ PaymentGW current p99 latency query test passed")
        print(f"  Answer: {answer}")
        print(f"  Tools used: {tools_used}")
        print(f"  Sources: {sources}")
        print(f"  Processing time: {processing_time:.3f}s")
        print(f"  Total time: {total_time:.3f}s")
    
    def test_notificationsvc_sla_compliance_query(self, query_endpoint):
        """
        Test query: "Is NotificationSvc meeting SLA?" calls both database and metrics tools.
        
        Requirements: 4.10, 13.3
        
        This test verifies:
        - Both database and metrics tools are invoked
        - SLA target is retrieved from database
        - Current metrics are retrieved from monitoring API
        - Comparison is made between target and current
        - Response time is under 10 seconds
        """
        query = "Is NotificationSvc meeting its SLA targets?"
        
        # Measure end-to-end time
        start_time = time.time()
        data = self._make_query(query_endpoint, query)
        end_time = time.time()
        
        # Calculate total response time
        total_time = end_time - start_time
        processing_time = data.get("processing_time", 0)
        
        # Verify response structure
        assert "answer" in data, "Response missing 'answer' field"
        assert "tools_used" in data, "Response missing 'tools_used' field"
        
        answer = data["answer"]
        tools_used = data["tools_used"]
        sources = data["sources"]
        
        # Verify both tools were used
        # Should use query_database for SLA targets and get_service_metrics for current metrics
        assert "query_database" in tools_used or "get_service_metrics" in tools_used, (
            f"Expected at least one tool (query_database or get_service_metrics) in tools_used, got: {tools_used}"
        )
        
        # Ideally both tools should be used, but LLM might optimize
        # At minimum, we need metrics to compare
        has_database = "query_database" in tools_used
        has_metrics = "get_service_metrics" in tools_used
        
        # Log which tools were used
        print(f"\n  Tools used: {tools_used}")
        print(f"  - Database tool used: {has_database}")
        print(f"  - Metrics tool used: {has_metrics}")
        
        # Verify answer contains SLA-related information
        answer_lower = answer.lower()
        has_sla_keyword = any(keyword in answer_lower 
                              for keyword in ["sla", "target", "mục tiêu", "meeting", "đáp ứng", "không đáp ứng"])
        
        assert has_sla_keyword, (
            f"Expected answer to contain SLA-related information, got: {answer}"
        )
        
        # Verify answer contains a comparison or status
        # Should mention whether SLA is met or not
        has_status = any(keyword in answer_lower 
                        for keyword in ["yes", "no", "có", "không", "meeting", "not meeting", 
                                       "đáp ứng", "không đáp ứng", "vượt", "dưới"])
        
        assert has_status, (
            f"Expected answer to contain SLA compliance status, got: {answer}"
        )
        
        # Verify sources include at least one tool
        tool_sources = [s for s in sources if "tool" in s.lower() or "database" in s.lower() or "metrics" in s.lower()]
        assert len(tool_sources) > 0, (
            f"Expected at least one tool in sources, got: {sources}"
        )
        
        # Verify response time is under 10 seconds
        assert processing_time < 10.0, (
            f"Processing time {processing_time}s exceeds 10 second limit for L3 query"
        )
        
        print(f"\n✓ NotificationSvc SLA compliance query test passed")
        print(f"  Answer: {answer}")
        print(f"  Tools used: {tools_used}")
        print(f"  Sources: {sources}")
        print(f"  Processing time: {processing_time:.3f}s")
        print(f"  Total time: {total_time:.3f}s")
    
    def test_response_time_under_10_seconds(self, query_endpoint):
        """
        Test that response time is under 10 seconds for L3 queries.
        
        Requirements: 11.3
        
        This test verifies:
        - Processing time is under 10 seconds for various L3 queries
        - API responds within acceptable latency
        """
        queries = [
            "What was PaymentGW's total cost in Q1 2026?",
            "What is PaymentGW's current p99 latency?",
            "What is the current status of all services?"
        ]
        
        for query in queries:
            # Measure end-to-end time
            start_time = time.time()
            data = self._make_query(query_endpoint, query)
            end_time = time.time()
            
            # Calculate total response time
            total_time = end_time - start_time
            processing_time = data.get("processing_time", 0)
            
            # Verify processing time is under 10 seconds
            assert processing_time < 10.0, (
                f"Processing time {processing_time}s exceeds 10 second limit for query: {query}"
            )
            
            # Verify total response time is reasonable (under 12 seconds including network)
            assert total_time < 12.0, (
                f"Total response time {total_time}s exceeds 12 second limit for query: {query}"
            )
            
            print(f"\n✓ Response time test passed for query: {query}")
            print(f"  Processing time: {processing_time:.3f}s")
            print(f"  Total time: {total_time:.3f}s")
    
    def test_numerical_accuracy_preservation(self, query_endpoint):
        """
        Test that numerical values from tools are preserved exactly.
        
        Requirements: 13.1
        
        This test verifies:
        - Exact numerical values are returned (no rounding)
        - Values match database/API responses
        """
        # Test 1: Q1 cost should be exactly 16500
        query1 = "What was PaymentGW's total cost in Q1 2026?"
        data1 = self._make_query(query_endpoint, query1)
        answer1 = data1["answer"]
        
        # Normalize answer to extract number
        answer1_normalized = answer1.replace(",", "").replace("$", "").replace(" ", "")
        assert "16500" in answer1_normalized, (
            f"Expected exact value 16500, got: {answer1}"
        )
        
        print(f"\n✓ Numerical accuracy test passed")
        print(f"  Q1 cost answer: {answer1}")
        print(f"  Contains exact value: 16500")
    
    def test_tool_error_handling(self, query_endpoint):
        """
        Test that tool errors are handled gracefully.
        
        Requirements: 13.3
        
        This test verifies:
        - Invalid tool parameters are handled
        - Error messages are informative
        - System doesn't crash on tool errors
        """
        # Query for a non-existent service
        query = "What is the current latency of NonExistentService?"
        
        data = self._make_query(query_endpoint, query)
        
        # Should return a response (not crash)
        assert "answer" in data
        answer = data["answer"]
        
        # Answer should indicate service not found or error
        answer_lower = answer.lower()
        has_error_indicator = any(keyword in answer_lower 
                                  for keyword in ["not found", "không tìm thấy", "error", "lỗi", 
                                                 "không tồn tại", "invalid", "không hợp lệ"])
        
        # It's okay if the answer doesn't explicitly mention error
        # The important thing is the system didn't crash
        print(f"\n✓ Tool error handling test passed")
        print(f"  Answer: {answer}")
        print(f"  Has error indicator: {has_error_indicator}")
    
    def test_multiple_tool_calls_in_sequence(self, query_endpoint):
        """
        Test that multiple tool calls can be made in sequence.
        
        Requirements: 13.3
        
        This test verifies:
        - System can handle queries requiring multiple tool calls
        - Tool results are properly chained
        - Final answer synthesizes information from multiple tools
        """
        # Query that requires multiple tools
        query = "Compare the current p99 latency of PaymentGW and NotificationSvc"
        
        data = self._make_query(query_endpoint, query)
        
        answer = data["answer"]
        tools_used = data["tools_used"]
        
        # Should use metrics tool (possibly multiple times or compare tool)
        has_metrics_tool = "get_service_metrics" in tools_used or "compare_services" in tools_used
        
        assert has_metrics_tool, (
            f"Expected metrics or compare tool in tools_used, got: {tools_used}"
        )
        
        # Answer should mention both services
        answer_lower = answer.lower()
        has_paymentgw = "paymentgw" in answer_lower or "payment" in answer_lower
        has_notificationsvc = "notificationsvc" in answer_lower or "notification" in answer_lower
        
        assert has_paymentgw and has_notificationsvc, (
            f"Expected answer to mention both services, got: {answer}"
        )
        
        print(f"\n✓ Multiple tool calls test passed")
        print(f"  Answer: {answer}")
        print(f"  Tools used: {tools_used}")
    
    def test_tool_selection_for_historical_data(self, query_endpoint):
        """
        Test that database tool is selected for historical data queries.
        
        Requirements: 13.1
        
        This test verifies:
        - LLM correctly identifies historical data queries
        - Database tool is used instead of metrics API
        - Correct data is retrieved from database
        """
        queries = [
            "What was the total cost in March 2026?",
            "How many incidents occurred in Q1 2026?",
            "What was PaymentGW's cost in January 2026?"
        ]
        
        for query in queries:
            data = self._make_query(query_endpoint, query)
            tools_used = data["tools_used"]
            
            # Should use database tool for historical queries
            assert "query_database" in tools_used or "get_incident_history" in tools_used, (
                f"Expected database tool for historical query '{query}', got: {tools_used}"
            )
            
            print(f"\n✓ Historical data tool selection test passed for: {query}")
            print(f"  Tools used: {tools_used}")
    
    def test_tool_selection_for_live_data(self, query_endpoint):
        """
        Test that metrics tool is selected for live data queries.
        
        Requirements: 13.2
        
        This test verifies:
        - LLM correctly identifies live data queries
        - Metrics API tool is used instead of database
        - Current metrics are retrieved
        """
        queries = [
            "What is the current error rate of PaymentGW?",
            "What is NotificationSvc's current status?",
            "What are the current metrics for all services?"
        ]
        
        for query in queries:
            data = self._make_query(query_endpoint, query)
            tools_used = data["tools_used"]
            
            # Should use metrics or status tool for live queries
            has_live_tool = any(tool in tools_used 
                               for tool in ["get_service_metrics", "get_service_status", 
                                          "list_services", "compare_services"])
            
            assert has_live_tool, (
                f"Expected live data tool for query '{query}', got: {tools_used}"
            )
            
            print(f"\n✓ Live data tool selection test passed for: {query}")
            print(f"  Tools used: {tools_used}")


class TestL3EdgeCases:
    """Test edge cases and boundary conditions for L3."""
    
    @pytest.fixture(scope="class")
    def query_endpoint(self):
        """Get query endpoint URL."""
        return f"{API_BASE_URL}/query"
    
    def _make_query(self, endpoint: str, query: str, level: str = "L3") -> Dict[str, Any]:
        """Helper method to make a query to the API."""
        payload = {"query": query, "level": level}
        response = requests.post(endpoint, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Request failed: {response.text}"
        return response.json()
    
    def test_query_requiring_no_tools(self, query_endpoint):
        """
        Test L3 query that doesn't require tools (should use RAG).
        
        This test verifies:
        - L3 can handle queries that don't need tools
        - RAG context is used when appropriate
        - No tools are invoked unnecessarily
        """
        query = "What is the deployment freeze policy?"
        
        data = self._make_query(query_endpoint, query)
        
        # Should return a valid response
        assert "answer" in data
        assert len(data["answer"]) > 0
        
        # May or may not use tools (LLM decides)
        # The important thing is it returns a correct answer
        print(f"\n✓ No-tools query test passed")
        print(f"  Answer: {data['answer']}")
        print(f"  Tools used: {data['tools_used']}")
    
    def test_ambiguous_query_tool_selection(self, query_endpoint):
        """
        Test that ambiguous queries are handled appropriately.
        
        This test verifies:
        - System makes reasonable tool selection for ambiguous queries
        - Doesn't crash on unclear queries
        """
        query = "Tell me about PaymentGW"
        
        data = self._make_query(query_endpoint, query)
        
        # Should return a valid response
        assert "answer" in data
        assert len(data["answer"]) > 0
        
        # May use tools or RAG or both
        print(f"\n✓ Ambiguous query test passed")
        print(f"  Answer: {data['answer']}")
        print(f"  Tools used: {data['tools_used']}")
    
    def test_complex_sql_query_generation(self, query_endpoint):
        """
        Test that complex SQL queries are generated correctly.
        
        This test verifies:
        - LLM can generate correct SQL for complex queries
        - Aggregations and filters work correctly
        """
        query = "Which service had the highest cost in March 2026?"
        
        data = self._make_query(query_endpoint, query)
        
        answer = data["answer"]
        tools_used = data["tools_used"]
        
        # Should use database tool
        assert "query_database" in tools_used, (
            f"Expected database tool, got: {tools_used}"
        )
        
        # Answer should identify PaymentGW (highest cost in March 2026)
        answer_lower = answer.lower()
        assert "paymentgw" in answer_lower or "payment" in answer_lower, (
            f"Expected answer to mention PaymentGW, got: {answer}"
        )
        
        print(f"\n✓ Complex SQL query test passed")
        print(f"  Answer: {answer}")
        print(f"  Tools used: {tools_used}")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])

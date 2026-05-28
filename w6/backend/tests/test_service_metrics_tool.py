"""
Test suite for ServiceMetricsTool.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from tools import ServiceMetricsTool, ToolResult


def test_get_metrics_success():
    """Test successful metrics retrieval for PaymentGW."""
    tool = ServiceMetricsTool(api_base_url="http://localhost:8000")
    result = tool.get_metrics("PaymentGW")
    
    assert result.success is True
    assert result.data is not None
    assert result.error is None
    
    # Verify response structure
    assert "service" in result.data
    assert result.data["service"] == "PaymentGW"
    assert "timestamp" in result.data
    assert "latency_ms" in result.data
    assert "error_rate_percent" in result.data
    assert "requests_per_minute" in result.data
    
    # Verify latency metrics structure
    latency = result.data["latency_ms"]
    assert "p50" in latency
    assert "p95" in latency
    assert "p99" in latency
    
    # Verify metrics are within expected ranges (with jitter)
    assert 40 <= latency["p50"] <= 50
    assert 110 <= latency["p95"] <= 130
    assert 170 <= latency["p99"] <= 200
    
    print("✓ Test passed: get_metrics_success")
    print(f"  PaymentGW p99 latency: {latency['p99']}ms")


def test_get_metrics_service_not_found():
    """Test error handling when service doesn't exist."""
    tool = ServiceMetricsTool(api_base_url="http://localhost:8000")
    result = tool.get_metrics("NonExistentService")
    
    assert result.success is False
    assert result.data is None
    assert result.error is not None
    assert "not found" in result.error.lower()
    
    print("✓ Test passed: get_metrics_service_not_found")


def test_get_metrics_api_unavailable():
    """Test timeout handling when API is unavailable."""
    tool = ServiceMetricsTool(api_base_url="http://localhost:9999")
    result = tool.get_metrics("PaymentGW")
    
    assert result.success is False
    assert result.data is None
    assert result.error is not None
    
    print("✓ Test passed: get_metrics_api_unavailable")


def test_get_definition():
    """Test tool definition for LLM."""
    tool = ServiceMetricsTool()
    definition = tool.get_definition()
    
    assert definition.name == "get_service_metrics"
    assert "current" in definition.description.lower() or "live" in definition.description.lower()
    assert "latency" in definition.description.lower()
    assert "error rate" in definition.description.lower()
    
    # Verify parameters schema
    assert definition.parameters["type"] == "object"
    assert "service_name" in definition.parameters["properties"]
    assert definition.parameters["properties"]["service_name"]["type"] == "string"
    assert "service_name" in definition.parameters["required"]
    
    print("✓ Test passed: get_definition")
    print(f"  Tool name: {definition.name}")


def test_notification_svc_metrics():
    """Test metrics retrieval for NotificationSvc (degraded service)."""
    tool = ServiceMetricsTool(api_base_url="http://localhost:8000")
    result = tool.get_metrics("NotificationSvc")
    
    assert result.success is True
    assert result.data is not None
    
    latency = result.data["latency_ms"]
    # NotificationSvc has high latency (p99 ~3200ms)
    assert latency["p99"] > 3000
    
    print("✓ Test passed: notification_svc_metrics")
    print(f"  NotificationSvc p99 latency: {latency['p99']}ms")


if __name__ == "__main__":
    print("\n=== Testing ServiceMetricsTool ===\n")
    
    try:
        test_get_metrics_success()
        test_get_metrics_service_not_found()
        test_get_metrics_api_unavailable()
        test_get_definition()
        test_notification_svc_metrics()
        
        print("\n✅ All tests passed!\n")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}\n")
        sys.exit(1)

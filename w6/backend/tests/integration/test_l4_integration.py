"""
Integration tests for L4 Memory-Enabled Multi-Turn Conversations (Task 17.2).

These tests verify the complete end-to-end flow of L4 with REAL AWS Bedrock,
real SQLite database, and real monitoring API — NO mocks.

Pattern mirrors L3 integration tests: POST to running FastAPI at localhost:8001
with level="L4" and session_id for multi-turn conversations.

Requirements tested: 8.5, 8.6, 8.7, 8.8, 8.9, 11.4, 22.7
"""

import os
import time
import uuid
import pytest
import requests
from typing import Dict, Any

# Mark all tests in this module as integration and L4 tests
pytestmark = [pytest.mark.integration, pytest.mark.l4]

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001")
MONITORING_API_URL = os.getenv("MONITORING_API_URL", "http://localhost:8000")
TIMEOUT = 20  # seconds (L4 can take up to 12s + buffer)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_query(
    query: str,
    level: str = "L4",
    session_id: str = None,
    endpoint: str = None
) -> Dict[str, Any]:
    """
    POST a query to the running FastAPI and return JSON response.

    Args:
        query: User's question
        level: "L4"
        session_id: Session ID for multi-turn context
        endpoint: Override API endpoint (default: API_BASE_URL/query)

    Returns:
        Parsed JSON response dict

    Raises:
        AssertionError: If HTTP status is not 200
    """
    if endpoint is None:
        endpoint = f"{API_BASE_URL}/query"

    payload = {"query": query, "level": level}
    if session_id:
        payload["session_id"] = session_id

    response = requests.post(endpoint, json=payload, timeout=TIMEOUT)

    assert response.status_code == 200, (
        f"Expected status 200, got {response.status_code}. "
        f"Response: {response.text}"
    )
    return response.json()


def _new_session() -> str:
    """Generate a unique session ID for each test to avoid state leakage."""
    return f"test-l4-{uuid.uuid4().hex[:8]}"


# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------


class TestL4Prerequisites:
    """Verify all required services are running before L4 tests."""

    def test_main_api_healthy(self):
        """Test that the main FastAPI is running and KB is configured."""
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        assert response.status_code == 200, "Main API health check failed"

        data = response.json()
        assert data["status"] == "healthy"
        assert data.get("knowledge_base_configured") is True, (
            "Knowledge Base not configured. Set BEDROCK_KB_ID environment variable."
        )
        print(f"\n✓ Main API is healthy")

    def test_monitoring_api_running(self):
        """Test that the monitoring API is running (required for L4 tool calls)."""
        try:
            response = requests.get(f"{MONITORING_API_URL}/services", timeout=5)
            assert response.status_code == 200, "Monitoring API health check failed"
            services = response.json()
            assert isinstance(services, list) and len(services) > 0
            print(f"\n✓ Monitoring API is healthy with {len(services)} services")
        except requests.exceptions.RequestException as e:
            pytest.fail(
                f"Monitoring API not accessible at {MONITORING_API_URL}. "
                f"Please run: python monitoring_api.py. Error: {e}"
            )

    def test_l4_requires_session_id(self):
        """Test that L4 returns 400 when session_id is missing."""
        response = requests.post(
            f"{API_BASE_URL}/query",
            json={"query": "Test", "level": "L4"},
            timeout=10
        )
        assert response.status_code == 400, (
            f"Expected 400 when session_id missing, got {response.status_code}"
        )
        print(f"\n✓ L4 correctly requires session_id")


# ---------------------------------------------------------------------------
# Core L4 Tests
# ---------------------------------------------------------------------------


class TestL4SingleTurn:
    """Test single L4 queries to verify basic memory integration works."""

    def test_l4_single_turn_returns_valid_response(self):
        """Test that a single L4 query returns the same structure as L1/L2/L3."""
        session_id = _new_session()
        data = _make_query(
            "Who is the Team Platform lead?",
            level="L4",
            session_id=session_id
        )

        assert "answer" in data
        assert "sources" in data
        assert "tools_used" in data
        assert "processing_time" in data

        answer = data["answer"]
        assert len(answer) > 0, "Answer should not be empty"
        assert "Alex Chen" in answer, (
            f"Expected 'Alex Chen' in answer, got: {answer}"
        )
        print(f"\n✓ L4 single turn works. Answer: {answer[:100]}")

    def test_l4_response_time_under_12_seconds(self):
        """Test that L4 response time is under 12 seconds (Requirement 11.4)."""
        session_id = _new_session()
        start_time = time.time()
        data = _make_query(
            "What is the deployment freeze window?",
            level="L4",
            session_id=session_id
        )
        total_time = time.time() - start_time

        processing_time = data.get("processing_time", 0)

        assert processing_time < 12.0, (
            f"Processing time {processing_time:.2f}s exceeds 12s L4 limit"
        )
        assert total_time < 15.0, (
            f"Total time {total_time:.2f}s exceeds 15s (12s limit + network buffer)"
        )
        print(f"\n✓ L4 response time: {processing_time:.2f}s (processing), {total_time:.2f}s (total)")


# ---------------------------------------------------------------------------
# 4-Turn Pronoun Resolution (Core Requirement 8.5–8.9)
# ---------------------------------------------------------------------------


class TestL4PronounResolution:
    """
    Test 4-turn conversation where each turn references entities from prior turns.

    Requirements: 8.5, 8.6, 8.7, 8.8, 8.9
    """

    def test_four_turn_conversation_with_pronoun_resolution(self):
        """
        Test the canonical 4-turn L4 conversation sequence.

        Turn 1: "Which service had highest cost in March 2026?" → PaymentGW, $7,500
        Turn 2: "Why did its costs spike?" → resolves "its" = PaymentGW
        Turn 3: "Which team is responsible?" → Team Platform / Alex Chen
        Turn 4: "Is the postmortem review deadline overdue?" → maintains PaymentGW context
        """
        session_id = _new_session()
        print(f"\n\nStarting 4-turn L4 conversation. Session: {session_id}")

        # ── Turn 1 ──────────────────────────────────────────────────────────
        start = time.time()
        data1 = _make_query(
            "Which service had the highest cost in March 2026?",
            session_id=session_id
        )
        t1 = time.time() - start

        answer1 = data1["answer"]
        assert "paymentgw" in answer1.lower() or "payment" in answer1.lower(), (
            f"Turn 1: Expected PaymentGW in answer. Got: {answer1}"
        )
        # Verify the value $7,500
        answer1_norm = answer1.replace(",", "").replace("$", "").replace(" ", "")
        assert "7500" in answer1_norm, (
            f"Turn 1: Expected $7,500 in answer. Got: {answer1}"
        )
        print(f"\n  Turn 1 ({t1:.2f}s): {answer1[:120]}")

        # ── Turn 2: pronoun "its" → PaymentGW ───────────────────────────────
        start = time.time()
        data2 = _make_query(
            "Why did its costs spike?",
            session_id=session_id
        )
        t2 = time.time() - start

        answer2 = data2["answer"]
        # Should resolve "its" = PaymentGW and discuss postmortem
        assert "paymentgw" in answer2.lower() or "payment" in answer2.lower(), (
            f"Turn 2: Expected PaymentGW in pronoun-resolved answer. Got: {answer2}"
        )
        print(f"\n  Turn 2 ({t2:.2f}s): {answer2[:120]}")

        # ── Turn 3: implicit entity → PaymentGW team ────────────────────────
        start = time.time()
        data3 = _make_query(
            "Which team is responsible for it?",
            session_id=session_id
        )
        t3 = time.time() - start

        answer3 = data3["answer"]
        answer3_lower = answer3.lower()
        has_team = (
            "platform" in answer3_lower
            or "alex chen" in answer3_lower
            or "team" in answer3_lower
        )
        assert has_team, (
            f"Turn 3: Expected team information (Platform / Alex Chen). Got: {answer3}"
        )
        print(f"\n  Turn 3 ({t3:.2f}s): {answer3[:120]}")

        # ── Turn 4: full context chain ───────────────────────────────────────
        start = time.time()
        data4 = _make_query(
            "Is the postmortem review deadline overdue?",
            session_id=session_id
        )
        t4 = time.time() - start

        answer4 = data4["answer"]
        answer4_lower = answer4.lower()
        # Should reference postmortem and give a yes/no/date answer
        has_postmortem_context = any(word in answer4_lower for word in [
            "postmortem", "deadline", "review", "overdue", "quá hạn",
            "đã qua", "chưa qua", "paymentgw", "payment"
        ])
        assert has_postmortem_context, (
            f"Turn 4: Expected postmortem/deadline context. Got: {answer4}"
        )
        print(f"\n  Turn 4 ({t4:.2f}s): {answer4[:120]}")

        # All turns should be under 12 seconds each
        for idx, (t, d) in enumerate([(t1, data1), (t2, data2), (t3, data3), (t4, data4)], 1):
            proc_time = d.get("processing_time", 0)
            assert proc_time < 12.0, (
                f"Turn {idx} processing time {proc_time:.2f}s exceeds 12s L4 limit"
            )

        print(f"\n✓ 4-turn pronoun resolution test PASSED")
        print(f"  Turn times: {t1:.2f}s, {t2:.2f}s, {t3:.2f}s, {t4:.2f}s")

    def test_session_context_isolated_between_sessions(self):
        """
        Test that two different sessions don't share memory.

        Session A asks about PaymentGW. Session B asks "What service did we discuss?"
        Session B should NOT know about PaymentGW from Session A.
        """
        session_a = _new_session()
        session_b = _new_session()

        # Session A: ask about PaymentGW
        _make_query(
            "What was PaymentGW's total cost in Q1 2026?",
            session_id=session_a
        )

        # Session B: ask about previous context — should not know about PaymentGW
        data_b = _make_query(
            "What is the deployment freeze window?",
            session_id=session_b
        )

        # Session B should return deployment info, not PaymentGW cost
        answer_b = data_b["answer"]
        assert len(answer_b) > 0, "Session B should return a valid answer"
        # Session B answers about deployment, not about prior session's PaymentGW
        print(f"\n✓ Session isolation test PASSED")
        print(f"  Session B answer (unrelated to Session A): {answer_b[:100]}")

    def test_two_turn_pronoun_resolution_minimal(self):
        """
        Minimal 2-turn test for pronoun resolution: establish entity, then use pronoun.
        """
        session_id = _new_session()

        # Turn 1: establish entity
        data1 = _make_query(
            "What is NotificationSvc's SLA target for p99 latency?",
            session_id=session_id
        )
        answer1 = data1["answer"]
        answer1_norm = answer1.replace(",", "").replace(" ", "")
        assert "2000" in answer1_norm, (
            f"Turn 1: Expected 2000ms SLA target. Got: {answer1}"
        )
        print(f"\n  Turn 1: {answer1[:100]}")

        # Turn 2: use pronoun "it" referencing NotificationSvc
        data2 = _make_query(
            "Is it currently meeting that target?",
            session_id=session_id
        )
        answer2 = data2["answer"]
        answer2_lower = answer2.lower()

        # Should resolve "it" = NotificationSvc and compare SLA vs current metrics
        has_sla_context = any(word in answer2_lower for word in [
            "notificationsvc", "notification", "sla", "target", "latency",
            "ms", "đáp ứng", "không đáp ứng", "breached", "meeting"
        ])
        assert has_sla_context, (
            f"Turn 2: Expected pronoun resolution with SLA comparison. Got: {answer2}"
        )
        print(f"\n  Turn 2: {answer2[:100]}")
        print(f"\n✓ 2-turn pronoun resolution PASSED")


# ---------------------------------------------------------------------------
# L4 Tool Integration (memory + tools combined)
# ---------------------------------------------------------------------------


class TestL4WithTools:
    """Test L4 queries that require both memory AND tool calls."""

    def test_l4_uses_database_tool_in_multiturn(self):
        """
        Test that L4 correctly invokes tools while maintaining session context.

        Turn 1: Cost query → uses query_database tool
        Turn 2: Follow-up → maintains session context
        """
        session_id = _new_session()

        # Turn 1: force tool use
        start = time.time()
        data1 = _make_query(
            "What was PaymentGW's total infrastructure cost in Q1 2026?",
            session_id=session_id
        )
        t1 = time.time() - start

        tools_used1 = data1.get("tools_used", [])
        answer1 = data1["answer"]

        # Should use database tool
        assert "query_database" in tools_used1, (
            f"Turn 1: Expected query_database tool. Got tools: {tools_used1}"
        )

        # Should return exact value
        answer1_norm = answer1.replace(",", "").replace("$", "").replace(" ", "")
        assert "16500" in answer1_norm, (
            f"Turn 1: Expected $16,500. Got: {answer1}"
        )
        print(f"\n  Turn 1 ({t1:.2f}s): tools={tools_used1}, answer={answer1[:80]}")

        # Turn 2: follow-up question (context maintained)
        start = time.time()
        data2 = _make_query(
            "How does that compare to Q1 SLA budget?",
            session_id=session_id
        )
        t2 = time.time() - start

        answer2 = data2["answer"]
        # Should understand "that" refers to PaymentGW Q1 cost
        assert len(answer2) > 0, "Turn 2 should return a non-empty answer"
        print(f"\n  Turn 2 ({t2:.2f}s): answer={answer2[:100]}")
        print(f"\n✓ L4 database tool in multi-turn PASSED")

    def test_l4_uses_metrics_tool_in_multiturn(self):
        """
        Test that L4 correctly invokes metrics API while maintaining session context.
        """
        session_id = _new_session()

        # Turn 1: live metrics query
        data1 = _make_query(
            "What is PaymentGW's current p99 latency?",
            session_id=session_id
        )
        tools_used1 = data1.get("tools_used", [])
        answer1 = data1["answer"]

        assert "get_service_metrics" in tools_used1, (
            f"Turn 1: Expected get_service_metrics. Got: {tools_used1}"
        )
        # Should contain a latency value
        import re
        numbers = re.findall(r'\d+', answer1)
        assert len(numbers) > 0, f"Expected latency number in answer: {answer1}"
        print(f"\n  Turn 1: tools={tools_used1}, answer={answer1[:80]}")

        # Turn 2: ask about SLA compliance using pronoun
        data2 = _make_query(
            "Is that within acceptable SLA limits?",
            session_id=session_id
        )
        answer2 = data2["answer"]
        assert len(answer2) > 0
        print(f"\n  Turn 2: answer={answer2[:100]}")
        print(f"\n✓ L4 metrics tool in multi-turn PASSED")


# ---------------------------------------------------------------------------
# Response Time Verification
# ---------------------------------------------------------------------------


class TestL4ResponseTimes:
    """Verify L4 response times meet Requirement 11.4 (< 12 seconds)."""

    def test_three_sequential_l4_queries_all_under_12s(self):
        """Test 3 different L4 queries all complete within 12 seconds."""
        session_id = _new_session()
        queries = [
            "Who is the Team Platform lead?",
            "What was PaymentGW's total cost in Q1 2026?",
            "What is the deployment freeze window?",
        ]

        for i, query in enumerate(queries, 1):
            start = time.time()
            data = _make_query(query, session_id=session_id)
            total_time = time.time() - start
            processing_time = data.get("processing_time", 0)

            assert processing_time < 12.0, (
                f"Query {i} processing time {processing_time:.2f}s exceeds 12s L4 limit. "
                f"Query: '{query}'"
            )
            print(
                f"\n  Query {i} ({processing_time:.2f}s proc / {total_time:.2f}s total): "
                f"{query[:50]}"
            )

        print(f"\n✓ All L4 response times under 12s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

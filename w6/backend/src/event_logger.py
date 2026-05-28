"""
Event Logger for GeekBrain AI System Observability (Bonus A).

Tracks processing events for each query:
- query_received, retrieval_completed, tool_executed, llm_invoked, response_generated

Events are stored in-memory keyed by query_id and exposed through the backend
observability endpoints for the React frontend.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import threading


@dataclass
class ProcessingEvent:
    """A single processing event in the query pipeline."""
    event_id: str
    timestamp: datetime
    event_type: str  # query_received | retrieval_completed | tool_executed | llm_invoked | response_generated
    data: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "data": self.data,
        }


class EventLogger:
    """
    Thread-safe event logger that stores processing events per query_id.

    Usage:
        logger = EventLogger()
        query_id = logger.new_query_id()
        logger.log_query_received(query_id, "What is PaymentGW cost?")
        logger.log_retrieval(query_id, chunks=[...])
        logger.log_tool_call(query_id, "query_database", {"sql": "..."}, result)
        logger.log_response_generated(query_id, "Answer text", 2.5)
    """

    def __init__(self, max_queries: int = 200):
        self.events: Dict[str, List[ProcessingEvent]] = {}
        self._lock = threading.Lock()
        self._max_queries = max_queries
        self._counter: Dict[str, int] = {}  # query_id -> event counter

    @staticmethod
    def new_query_id() -> str:
        """Generate a unique query ID."""
        return f"q-{uuid.uuid4().hex[:12]}"

    # ── Logging Methods ────────────────────────────────────────────

    def log_query_received(self, query_id: str, query: str, session_id: str = None):
        """Log that a user query has been received."""
        data = {"query": query, "architecture": "unified_agent"}
        if session_id:
            data["session_id"] = session_id
        self._add_event(query_id, "query_received", data)

    def log_retrieval(self, query_id: str, chunks: List[Dict]):
        """Log completion of RAG retrieval step."""
        truncated = []
        for c in chunks[:10]:
            truncated.append({
                "text": (c.get("text", "") or "")[:200] + ("..." if len(c.get("text", "")) > 200 else ""),
                "source": c.get("source", "unknown"),
                "score": round(c.get("score", 0.0), 4),
            })
        self._add_event(query_id, "retrieval_completed", {
            "num_chunks": len(chunks),
            "chunks": truncated,
        })

    def log_tool_call(self, query_id: str, tool_name: str, parameters: Dict, result: Any, success: bool = True):
        """Log a tool execution."""
        self._add_event(query_id, "tool_executed", {
            "tool_name": tool_name,
            "parameters": parameters,
            "result": str(result)[:500],
            "success": success,
        })

    def log_llm_invocation(self, query_id: str, model_id: str = "", prompt_length: int = 0, response_preview: str = ""):
        """Log an LLM invocation."""
        self._add_event(query_id, "llm_invoked", {
            "model_id": model_id,
            "prompt_length": prompt_length,
            "response_preview": response_preview[:300],
        })

    def log_memory_loaded(self, query_id: str, session_id: str, num_turns: int):
        """Log that conversation history has been loaded."""
        self._add_event(query_id, "memory_loaded", {
            "session_id": session_id,
            "num_turns": num_turns,
        })

    def log_response_generated(self, query_id: str, response: str, processing_time: float, tools_used: List[str] = None):
        """Log the final response."""
        self._add_event(query_id, "response_generated", {
            "response": response[:500],
            "processing_time_ms": round(processing_time * 1000, 1),
            "tools_used": tools_used or [],
        })

    # ── Query Methods ──────────────────────────────────────────────

    def get_events(self, query_id: str) -> List[ProcessingEvent]:
        """Get all events for a query."""
        with self._lock:
            return list(self.events.get(query_id, []))

    def get_all_query_ids(self) -> List[str]:
        """Get all query IDs in reverse chronological order."""
        with self._lock:
            return list(reversed(list(self.events.keys())))

    def get_query_summary(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Get a summary of a query's events."""
        events = self.get_events(query_id)
        if not events:
            return None

        query_text = ""
        architecture = "unified_agent"
        processing_time_ms = 0
        tools_used = []

        for e in events:
            if e.event_type == "query_received":
                query_text = e.data.get("query", "")
                architecture = e.data.get("architecture", "unified_agent")
            elif e.event_type == "tool_executed":
                tools_used.append(e.data.get("tool_name", ""))
            elif e.event_type == "response_generated":
                processing_time_ms = e.data.get("processing_time_ms", 0)

        return {
            "query_id": query_id,
            "query": query_text,
            "architecture": architecture,
            "num_events": len(events),
            "tools_used": tools_used,
            "processing_time_ms": processing_time_ms,
            "timestamp": events[0].timestamp.isoformat(),
            "first_event": events[0].timestamp.isoformat(),
        }

    # ── Internal ───────────────────────────────────────────────────

    def _add_event(self, query_id: str, event_type: str, data: Dict[str, Any]):
        with self._lock:
            if query_id not in self.events:
                self.events[query_id] = []
                self._counter[query_id] = 0
                # Evict oldest if at capacity
                if len(self.events) > self._max_queries:
                    oldest = next(iter(self.events))
                    del self.events[oldest]
                    del self._counter[oldest]

            self._counter[query_id] += 1
            seq = self._counter[query_id]

            event = ProcessingEvent(
                event_id=f"{query_id}-{seq:03d}",
                timestamp=datetime.now(),
                event_type=event_type,
                data=data,
            )
            self.events[query_id].append(event)


# Singleton shared across the application
event_logger = EventLogger()

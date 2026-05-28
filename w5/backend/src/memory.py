"""
Memory management for multi-turn conversations.

This module provides conversation state management for the unified agent.
Strategies:
  - BufferMemory: stores all turns, sends all to LLM
  - WindowMemory: stores all turns, sends only last N to LLM
  - DynamoDBMemory: persists turns in AWS DynamoDB with TTL, sends last N to LLM
"""

import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ConversationTurn:
    """Represents a single turn in a conversation."""
    turn_id: int
    timestamp: datetime
    query: str
    response: str
    context_used: List[str]  # Sources/tools used


class MemoryManager:
    """Base class for memory management strategies."""
    
    def save_turn(self, session_id: str, turn: ConversationTurn) -> None:
        """Save a conversation turn to persistent storage."""
        raise NotImplementedError
    
    def get_history(self, session_id: str, last_n: Optional[int] = None) -> List[ConversationTurn]:
        """Retrieve conversation history for a session."""
        raise NotImplementedError
    
    def format_for_llm(self, history: List[ConversationTurn]) -> str:
        """Format conversation history for LLM context."""
        raise NotImplementedError
    
    def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a session."""
        raise NotImplementedError


class BufferMemory(MemoryManager):
    """Store all turns, send all to LLM."""
    
    def __init__(self):
        """Initialize buffer memory with in-memory storage."""
        self.sessions: Dict[str, List[ConversationTurn]] = {}
    
    def save_turn(self, session_id: str, turn: ConversationTurn) -> None:
        """Save a conversation turn."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        self.sessions[session_id].append(turn)
    
    def get_history(self, session_id: str, last_n: Optional[int] = None) -> List[ConversationTurn]:
        """Retrieve conversation history."""
        history = self.sessions.get(session_id, [])
        if last_n:
            return history[-last_n:]
        return history
    
    def format_for_llm(self, history: List[ConversationTurn]) -> str:
        """Format conversation history for LLM context."""
        if not history:
            return ""
        
        formatted = "Previous conversation:\n\n"
        for turn in history:
            formatted += f"User: {turn.query}\n"
            formatted += f"Assistant: {turn.response}\n\n"
        return formatted
    
    def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]


class WindowMemory(MemoryManager):
    """Store all turns, send only last N to LLM."""
    
    def __init__(self, window_size: int = 5):
        """
        Initialize window memory.
        
        Args:
            window_size: Number of recent turns to include in context
        """
        self.window_size = window_size
        self.sessions: Dict[str, List[ConversationTurn]] = {}
    
    def save_turn(self, session_id: str, turn: ConversationTurn) -> None:
        """Save a conversation turn."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        self.sessions[session_id].append(turn)
    
    def get_history(self, session_id: str, last_n: Optional[int] = None) -> List[ConversationTurn]:
        """Retrieve conversation history."""
        history = self.sessions.get(session_id, [])
        n = last_n or self.window_size
        return history[-n:]
    
    def format_for_llm(self, history: List[ConversationTurn]) -> str:
        """Format conversation history for LLM context."""
        if not history:
            return ""
        
        formatted = f"Recent conversation (last {len(history)} turns):\n\n"
        for turn in history:
            formatted += f"User: {turn.query}\n"
            formatted += f"Assistant: {turn.response}\n\n"
        return formatted
    
    def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]


class DynamoDBMemory(MemoryManager):
    """
    Persist conversation turns in AWS DynamoDB with windowed retrieval.

    Table schema:
        - Partition key: session_id (S)
        - Sort key: turn_id (N)
        - TTL attribute: expires_at (auto-delete after ttl_days)

    Each item stores:
        session_id, turn_id, timestamp, query, response, context_used, expires_at
    """

    def __init__(
        self,
        table_name: str,
        window_size: int = 5,
        ttl_days: int = 30,
        region_name: Optional[str] = None,
    ):
        """
        Initialize DynamoDB memory.

        Args:
            table_name: DynamoDB table name
            window_size: Number of recent turns to send to LLM
            ttl_days: Days until items auto-expire (default 30)
            region_name: AWS region (default: boto3 default)
        """
        import boto3

        self.table_name = table_name
        self.window_size = window_size
        self.ttl_days = ttl_days

        kwargs = {}
        if region_name:
            kwargs["region_name"] = region_name
        self._dynamo = boto3.resource("dynamodb", **kwargs)
        self._table = self._dynamo.Table(table_name)
        logger.info(f"DynamoDBMemory initialized: table={table_name}, window={window_size}, ttl={ttl_days}d")

    # ── Persistence ────────────────────────────────────────────────

    def save_turn(self, session_id: str, turn: ConversationTurn) -> None:
        """Save a conversation turn to DynamoDB."""
        import time
        from decimal import Decimal

        expires_at = int(time.time()) + (self.ttl_days * 86400)

        try:
            self._table.put_item(
                Item={
                    "session_id": session_id,
                    "turn_id": Decimal(str(turn.turn_id)),
                    "timestamp": turn.timestamp.isoformat(),
                    "query": turn.query,
                    "response": turn.response,
                    "context_used": turn.context_used or [],
                    "expires_at": Decimal(str(expires_at)),
                }
            )
            logger.debug(f"Saved turn {turn.turn_id} for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to save turn to DynamoDB: {e}")
            raise

    def get_history(
        self, session_id: str, last_n: Optional[int] = None
    ) -> List[ConversationTurn]:
        """
        Retrieve conversation history from DynamoDB.

        Returns the last N turns (default: window_size) sorted by turn_id.
        """
        try:
            from boto3.dynamodb.conditions import Key

            response = self._table.query(
                KeyConditionExpression=Key("session_id").eq(session_id),
                ScanIndexForward=True,  # ascending by turn_id
            )
            items = response.get("Items", [])

            # Convert to ConversationTurn objects
            turns = []
            for item in items:
                turns.append(
                    ConversationTurn(
                        turn_id=int(item["turn_id"]),
                        timestamp=datetime.fromisoformat(item["timestamp"]),
                        query=item["query"],
                        response=item["response"],
                        context_used=item.get("context_used", []),
                    )
                )

            # Apply window
            n = last_n or self.window_size
            return turns[-n:]

        except Exception as e:
            logger.error(f"Failed to get history from DynamoDB: {e}")
            return []

    def format_for_llm(self, history: List[ConversationTurn]) -> str:
        """Format conversation history for LLM context."""
        if not history:
            return ""

        formatted = f"Recent conversation (last {len(history)} turns):\n\n"
        for turn in history:
            formatted += f"User: {turn.query}\n"
            formatted += f"Assistant: {turn.response}\n\n"
        return formatted

    def clear_session(self, session_id: str) -> None:
        """Delete all turns for a session from DynamoDB."""
        try:
            from boto3.dynamodb.conditions import Key

            response = self._table.query(
                KeyConditionExpression=Key("session_id").eq(session_id),
                ProjectionExpression="session_id, turn_id",
            )
            items = response.get("Items", [])

            with self._table.batch_writer() as batch:
                for item in items:
                    batch.delete_item(
                        Key={
                            "session_id": item["session_id"],
                            "turn_id": item["turn_id"],
                        }
                    )
            logger.info(f"Cleared {len(items)} turns for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to clear session from DynamoDB: {e}")
            raise


"""
Unified orchestration engine for the GeekBrain AI system.

The architecture is a single ReAct-style agent. The model decides whether to
answer directly or call one or more tools from the registry. Knowledge retrieval
is one tool among the others, not a default preprocessing step.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3

from rag_pipeline import RAGPipeline
from tools import ToolExecutor
from memory import MemoryManager, ConversationTurn


@dataclass
class QueryRequest:
    """Represents a user query request for the unified agent."""

    query: str
    session_id: Optional[str] = None


@dataclass
class QueryResponse:
    """Represents the unified agent response and observability metadata."""

    answer: str
    sources: List[str]
    tools_used: List[str]
    processing_time: float
    chunks_used: List[Dict[str, Any]] = field(default_factory=list)
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    memory_turns_loaded: int = 0


class Orchestrator:
    """Main entrypoint for the single unified GeekBrain agent."""

    def __init__(
        self,
        rag_pipeline: RAGPipeline,
        tool_executor: Optional[ToolExecutor] = None,
        memory_manager: Optional[MemoryManager] = None,
        model_id: str = "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    ):
        """
        Initialize the unified orchestrator.

        Args:
            rag_pipeline: RAG helper used by retrieve_knowledge tool
            tool_executor: Tool registry/executor used by the agent
            memory_manager: Optional conversation memory provider
            model_id: Bedrock model ID for the ReAct loop
        """
        self.rag_pipeline = rag_pipeline
        self.tool_executor = tool_executor
        self.memory_manager = memory_manager
        self.tool_orchestrator = (
            ToolOrchestrator(tool_executor, model_id) if tool_executor else None
        )

    def process_query(self, request: QueryRequest) -> QueryResponse:
        """
        Process a query through the unified agent.

        The caller does not choose a pipeline. If a session ID is provided, the
        last conversation turns are supplied to the model so it can resolve
        pronouns and follow-up questions.
        """
        if not self.tool_orchestrator:
            raise ValueError("Unified agent requires a tool executor with registered tools.")

        start_time = datetime.now()
        memory_context = ""
        memory_turns_loaded = 0
        full_history: List[ConversationTurn] = []

        if request.session_id and self.memory_manager:
            recent_history = self.memory_manager.get_history(request.session_id)
            memory_turns_loaded = len(recent_history)
            memory_context = self.memory_manager.format_for_llm(recent_history)
            full_history = self.memory_manager.get_history(request.session_id, last_n=1000)

        result = self.tool_orchestrator.process_query_with_tools(
            query=request.query,
            conversation_context=memory_context,
        )

        answer = result.get("answer", "")

        if request.session_id and self.memory_manager:
            next_turn_id = max((turn.turn_id for turn in full_history), default=0) + 1
            self.memory_manager.save_turn(
                request.session_id,
                ConversationTurn(
                    turn_id=next_turn_id,
                    timestamp=datetime.now(),
                    query=request.query,
                    response=answer,
                    context_used=result.get("sources", []),
                ),
            )

        processing_time = (datetime.now() - start_time).total_seconds()

        return QueryResponse(
            answer=answer,
            sources=result.get("sources", []),
            tools_used=result.get("tools_used", []),
            processing_time=processing_time,
            chunks_used=result.get("retrieval_chunks", []),
            tool_calls=result.get("tool_calls", []),
            memory_turns_loaded=memory_turns_loaded,
        )


class ToolOrchestrator:
    """
    ReAct-style tool orchestration loop.

    Flow:
    1. Send the user query, optional conversation history, and tool definitions.
    2. Let the model answer directly or request one or more tools.
    3. Execute requested tools and return results to the model.
    4. Repeat until the model provides a final answer or max iterations is hit.
    """

    def __init__(
        self,
        tool_executor: ToolExecutor,
        model_id: str = "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    ):
        self.tool_executor = tool_executor
        self.model_id = model_id
        self.max_iterations = 10
        self._bedrock_runtime = None

    def process_query_with_tools(
        self,
        query: str,
        context: str = "",
        rag_chunks: Optional[List[Any]] = None,
        conversation_context: str = "",
        **_ignored,
    ) -> Dict[str, Any]:
        """
        Run the unified agent loop.

        Args:
            query: User question
            context: Optional caller-provided context for compatibility
            rag_chunks: Optional pre-provided chunks for compatibility only
            conversation_context: Formatted recent conversation history

        Returns:
            Dict with answer, tools_used, sources, tool_calls, and retrieval chunks
        """
        messages = [{"role": "user", "content": self._build_user_message(query, context)}]
        tools_used: List[str] = []
        sources: List[str] = []
        tool_calls: List[Dict[str, Any]] = []
        retrieval_chunks: List[Dict[str, Any]] = []

        if rag_chunks:
            for chunk in rag_chunks:
                source = getattr(chunk, "source", None)
                if source:
                    sources.append(source)

        for iteration in range(self.max_iterations):
            try:
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4000,
                    "temperature": 0.0,
                    "system": self._get_system_prompt(conversation_context),
                    "messages": messages,
                    "tools": self._format_tool_definitions(),
                }

                response = self._get_bedrock_runtime().invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(request_body),
                )
                response_body = json.loads(response["body"].read())
                stop_reason = response_body.get("stop_reason")
                content = response_body.get("content", [])

                if stop_reason == "tool_use":
                    tool_use_blocks = [
                        block for block in content if block.get("type") == "tool_use"
                    ]
                    if not tool_use_blocks:
                        return {
                            "answer": "Error: the model requested a tool but did not provide tool details.",
                            "tools_used": tools_used,
                            "sources": self._dedupe(sources),
                            "tool_calls": tool_calls,
                            "retrieval_chunks": retrieval_chunks,
                            "error": "Missing tool_use block",
                        }

                    messages.append({"role": "assistant", "content": content})
                    tool_result_blocks = []

                    for tool_use in tool_use_blocks:
                        tool_name = tool_use.get("name", "")
                        tool_input = tool_use.get("input", {}) or {}
                        tool_use_id = tool_use.get("id")

                        tool_result = self.tool_executor.execute(tool_name, tool_input)
                        tools_used.append(tool_name)

                        call_trace = {
                            "tool_name": tool_name,
                            "parameters": tool_input,
                            "success": tool_result.success,
                            "result": tool_result.data if tool_result.success else tool_result.error,
                        }
                        tool_calls.append(call_trace)

                        if tool_result.success:
                            self._collect_sources(
                                tool_name,
                                tool_result.data,
                                sources,
                                retrieval_chunks,
                            )

                        tool_result_blocks.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use_id,
                                "content": self._serialize_tool_result(tool_result),
                            }
                        )

                    messages.append({"role": "user", "content": tool_result_blocks})
                    continue

                if stop_reason == "end_turn":
                    answer_text = "".join(
                        block.get("text", "")
                        for block in content
                        if block.get("type") == "text"
                    )
                    return {
                        "answer": answer_text,
                        "tools_used": tools_used,
                        "sources": self._dedupe(sources),
                        "tool_calls": tool_calls,
                        "retrieval_chunks": retrieval_chunks,
                        "iterations": iteration + 1,
                    }

                return {
                    "answer": f"Error: unexpected model stop reason: {stop_reason}",
                    "tools_used": tools_used,
                    "sources": self._dedupe(sources),
                    "tool_calls": tool_calls,
                    "retrieval_chunks": retrieval_chunks,
                    "error": f"Unexpected stop_reason: {stop_reason}",
                }

            except Exception as e:
                return {
                    "answer": f"Error while processing with the unified agent: {str(e)}",
                    "tools_used": tools_used,
                    "sources": self._dedupe(sources),
                    "tool_calls": tool_calls,
                    "retrieval_chunks": retrieval_chunks,
                    "error": str(e),
                }

        return {
            "answer": "Error: exceeded the maximum of 10 tool-planning iterations.",
            "tools_used": tools_used,
            "sources": self._dedupe(sources),
            "tool_calls": tool_calls,
            "retrieval_chunks": retrieval_chunks,
            "error": "Max iterations exceeded",
        }

    def _get_bedrock_runtime(self):
        if self._bedrock_runtime is None:
            self._bedrock_runtime = boto3.client("bedrock-runtime")
        return self._bedrock_runtime

    def _format_tool_definitions(self) -> List[Dict[str, Any]]:
        """Format registered tool definitions for Claude."""
        return [
            {
                "name": tool_def.name,
                "description": tool_def.description,
                "input_schema": tool_def.parameters,
            }
            for tool_def in self.tool_executor.get_tool_definitions()
        ]

    def _build_user_message(self, query: str, context: str = "") -> str:
        if context:
            return f"Additional context:\n{context}\n\nUser question: {query}"
        return f"User question: {query}"

    def _get_system_prompt(self, conversation_context: str = "") -> str:
        prompt = """You are an AI assistant for GeekBrain, a fintech company running 6 production services.

You have access to multiple tools. Your job is to intelligently select which tools to use based on the query. RAG retrieval is a tool, not default behavior. Use zero tools when the answer does not require GeekBrain-specific data.

## Available Data Sources

1. Knowledge Base via retrieve_knowledge:
   - 36 markdown documents
   - Contains: team structure, policies, architecture docs, postmortems
   - Use for: qualitative information, who, what policy, how to, what happened qualitatively

2. Database via query_database:
   - Tables: monthly_costs, incidents, sla_targets, daily_metrics
   - Contains: historical numerical data from Oct 2025 through Mar 2026
   - Use for: costs, incident counts, SLA targets, historical metrics

3. Monitoring API via get_service_metrics, get_service_status, list_services:
   - Live system state
   - Contains: current latency, error rate, requests/minute, service status
   - Use for: current, now, right now, healthy, degraded, down, monitored services

## Tool Selection Rules

Rule 1: Qualitative information -> retrieve_knowledge
- Questions about who, what policy, how to, architecture, owners, and qualitative incident causes.

Rule 2: Historical numbers -> query_database
- Questions about costs, incident counts, SLA targets, and past metrics.
- Useful SQL examples:
  - PaymentGW Q1 cost: SELECT month, total_cost FROM monthly_costs WHERE service = 'PaymentGW' AND month IN ('2026-01','2026-02','2026-03') ORDER BY month
  - Highest March cost: SELECT service, total_cost FROM monthly_costs WHERE month = '2026-03' ORDER BY total_cost DESC LIMIT 1
  - SLA target: SELECT service, metric, target, measurement_window FROM sla_targets WHERE service = 'NotificationSvc'

Rule 3: Current state -> Monitoring API tools
- Current metrics for one service -> get_service_metrics.
- Current status for one or all services -> get_service_status. Use service_name = 'all' for degraded/down service checks.
- List monitored services -> list_services.

Rule 4: Comparisons -> multiple tools when needed
- SLA compliance needs target from query_database and current data from get_service_metrics.
- Health questions may need status plus metrics.
- Cross-service current comparisons can use compare_services.

Rule 5: General knowledge -> no tools
- Definitions such as what SLA means or what a priority incident is can be answered directly.

## Critical Rules

1. NEVER answer numerical GeekBrain questions without tools.
2. NEVER use retrieve_knowledge for exact numerical data; documents are qualitative.
3. Choose the minimum necessary tools.
4. Use multiple tools when the question genuinely needs multiple data sources.
5. Use conversation history to resolve pronouns such as it, its, that service, they, or that team. If history is insufficient, ask a concise clarifying question.
6. Never invent missing numbers. If a tool fails or data is missing, say so clearly.

## Response Format

Always structure the response with:
1. Answer: direct answer to the question
2. Data: key numbers or facts, if applicable
3. Source: cite which tool or tools you used
4. Context: additional relevant information, optional

Answer in the same language as the user unless they ask otherwise. Keep the response concise and operational.
"""

        if conversation_context:
            prompt += f"\n\n## Recent Conversation\n\n{conversation_context}"

        return prompt

    def _collect_sources(
        self,
        tool_name: str,
        data: Any,
        sources: List[str],
        retrieval_chunks: List[Dict[str, Any]],
    ) -> None:
        if tool_name == "retrieve_knowledge" and isinstance(data, dict):
            chunks = data.get("chunks", [])
            for chunk in chunks:
                source = chunk.get("source")
                if source:
                    sources.append(source)
                retrieval_chunks.append(chunk)
        elif tool_name == "get_team_info" and isinstance(data, dict):
            for chunk in data.get("chunks", []):
                source = chunk.get("source")
                if source:
                    sources.append(source)
                retrieval_chunks.append(chunk)
        else:
            sources.append(f"{tool_name} tool")

    def _serialize_tool_result(self, tool_result) -> str:
        payload = (
            {"success": True, "data": tool_result.data}
            if tool_result.success
            else {"success": False, "error": tool_result.error}
        )
        return json.dumps(payload, ensure_ascii=False, default=str)

    def _dedupe(self, values: List[str]) -> List[str]:
        seen = set()
        result = []
        for value in values:
            if value not in seen:
                seen.add(value)
                result.append(value)
        return result

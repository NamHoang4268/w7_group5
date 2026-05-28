"""
Bedrock Knowledge Base retrieval helper for GeekBrain AI.

The unified agent uses this module through the retrieve_knowledge tool. It does
not run automatically before every query.
"""

import json
from dataclasses import dataclass
from typing import List

import boto3


@dataclass
class Chunk:
    """Represents a retrieved chunk from the knowledge base."""

    text: str
    source: str
    score: float


@dataclass
class Response:
    """Represents a generated response from retrieved knowledge."""

    answer: str
    sources: List[str]
    chunks_used: List[Chunk]


class RAGPipeline:
    """Handles Bedrock Knowledge Base retrieval and optional grounded generation."""

    def __init__(
        self,
        knowledge_base_id: str = None,
        model_id: str = "us.anthropic.claude-haiku-4-20250514-v1:0",
    ):
        """
        Initialize the retrieval helper.

        Args:
            knowledge_base_id: Bedrock Knowledge Base ID
            model_id: Bedrock model ID or inference profile ID for optional generation
        """
        self.knowledge_base_id = knowledge_base_id
        self.model_id = model_id
        self.bedrock_agent_runtime = boto3.client("bedrock-agent-runtime")
        self.bedrock_runtime = boto3.client("bedrock-runtime")

    def retrieve(self, query: str, top_k: int = 5) -> List[Chunk]:
        """
        Retrieve relevant chunks from the knowledge base.

        Args:
            query: User question or search query
            top_k: Number of chunks to retrieve

        Returns:
            List of Chunk objects with text, source, and score
        """
        if not self.knowledge_base_id:
            raise ValueError("knowledge_base_id is required for retrieval")

        try:
            response = self.bedrock_agent_runtime.retrieve(
                knowledgeBaseId=self.knowledge_base_id,
                retrievalQuery={"text": query},
                retrievalConfiguration={
                    "vectorSearchConfiguration": {
                        "numberOfResults": top_k,
                    }
                },
            )

            chunks = []
            for result in response.get("retrievalResults", []):
                text = result.get("content", {}).get("text", "")
                location = result.get("location", {})
                s3_location = location.get("s3Location", {})
                source_uri = s3_location.get("uri", "unknown")
                source = source_uri.split("/")[-1] if source_uri != "unknown" else "unknown"
                score = result.get("score", 0.0)

                chunks.append(Chunk(text=text, source=source, score=score))

            return chunks

        except Exception as e:
            raise RuntimeError(f"Failed to retrieve from Knowledge Base: {str(e)}")

    def retrieve_and_generate(self, query: str, top_k: int = 5, **_ignored) -> Response:
        """
        Compatibility helper for direct grounded generation.

        The main API does not call this method. The unified agent should normally
        invoke retrieve_knowledge as a tool and synthesize the final answer itself.
        """
        chunks = self.retrieve(query, top_k)

        if not chunks:
            return Response(
                answer="I could not find relevant information in the knowledge base.",
                sources=[],
                chunks_used=[],
            )

        context = self._format_chunks_as_context(chunks)

        try:
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "temperature": 0.0,
                "system": self._get_knowledge_system_prompt(),
                "messages": [
                    {
                        "role": "user",
                        "content": f"{context}\n\nQuestion: {query}",
                    }
                ],
            }

            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body),
            )
            response_body = json.loads(response["body"].read())
            answer = response_body.get("content", [{}])[0].get("text", "")
            sources = list({chunk.source for chunk in chunks})

            return Response(answer=answer, sources=sources, chunks_used=chunks)

        except Exception as e:
            raise RuntimeError(f"Failed to generate grounded response: {str(e)}")

    def _format_chunks_as_context(self, chunks: List[Chunk]) -> str:
        """
        Format retrieved chunks into context text for a model.

        Args:
            chunks: Retrieved knowledge chunks

        Returns:
            Formatted context string
        """
        context = "Knowledge base excerpts:\n\n"
        for index, chunk in enumerate(chunks, 1):
            context += f"[Source {index}: {chunk.source}]\n{chunk.text}\n\n"
        return context

    def _get_knowledge_system_prompt(self) -> str:
        """Prompt for direct grounded generation from retrieved documents."""
        return """You are an AI assistant for GeekBrain, a fintech company.

Answer only from the supplied knowledge base excerpts. Cite source filenames in the response. If the excerpts do not contain the answer, say that the information is not available in the knowledge base. Do not invent numbers or facts.
"""

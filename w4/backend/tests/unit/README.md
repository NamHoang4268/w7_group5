# Unit Tests for GeekBrain AI System

## Overview

This directory contains unit tests for the GeekBrain AI System components. All tests use mocked AWS Bedrock API calls to ensure fast execution without requiring actual AWS resources.

## Test Files

### `test_rag_pipeline.py`

Comprehensive unit tests for the RAG Pipeline module (`src/rag_pipeline.py`).

**Test Coverage:**

#### TestRAGPipelineRetrieve (8 tests)
Tests for the `retrieve()` method:
- ✅ Returns expected number of chunks based on `top_k` parameter
- ✅ Chunks contain required fields (text, source, score)
- ✅ Extracts filename from S3 URI (not full path)
- ✅ Orders chunks by relevance score (highest first)
- ✅ Raises ValueError when knowledge_base_id is not set
- ✅ Handles Bedrock API errors gracefully
- ✅ Handles empty retrieval results
- ✅ Calls Bedrock API with correct parameters

#### TestRAGPipelineRetrieveAndGenerate (8 tests)
Tests for the `retrieve_and_generate()` method:
- ✅ Includes source citations in response
- ✅ Returns properly structured Response object
- ✅ Uses retrieved chunks in response
- ✅ Handles case when no chunks are retrieved
- ✅ Calls LLM with properly formatted context
- ✅ Handles LLM invocation errors
- ✅ Extracts unique sources from chunks
- ✅ Respects top_k parameter

#### TestRAGPipelineHelperMethods (2 tests)
Tests for helper methods:
- ✅ `_format_chunks_as_context()` creates proper context string
- ✅ `_get_l1_system_prompt()` returns proper system prompt

**Total: 18 tests**

## Running Tests

### Run all unit tests:
```bash
cd w4
source venv/bin/activate
python -m pytest tests/unit/ -v
```

### Run specific test file:
```bash
python -m pytest tests/unit/test_rag_pipeline.py -v
```

### Run specific test class:
```bash
python -m pytest tests/unit/test_rag_pipeline.py::TestRAGPipelineRetrieve -v
```

### Run specific test:
```bash
python -m pytest tests/unit/test_rag_pipeline.py::TestRAGPipelineRetrieve::test_retrieve_returns_expected_number_of_chunks -v
```

### Run with coverage:
```bash
python -m pytest tests/unit/ --cov=src --cov-report=html
```

## Mocking Strategy

All tests use `unittest.mock` to mock AWS Bedrock API calls:

- **Bedrock Agent Runtime**: Mocked `retrieve()` method returns predefined retrieval results
- **Bedrock Runtime**: Mocked `invoke_model()` method returns predefined LLM responses

This approach ensures:
- ⚡ Fast test execution (no network calls)
- 💰 No AWS costs during testing
- 🔄 Repeatable test results
- 🧪 Isolated unit testing

## Test Data

Mock responses include realistic data:
- Knowledge base chunks with text, S3 URIs, and relevance scores
- LLM responses in Vietnamese with source citations
- Various edge cases (empty results, errors, duplicates)

## Requirements

Tests require the following packages (see `requirements.txt`):
- `pytest>=7.4.0`
- `pytest-mock>=3.12.0`

## Next Steps

Additional test files to be added:
- `test_tools.py` - Unit tests for tool implementations (L3)
- `test_memory.py` - Unit tests for memory management (L4)
- `test_orchestrator.py` - Unit tests for orchestration engine

Integration tests are located in `tests/integration/`.

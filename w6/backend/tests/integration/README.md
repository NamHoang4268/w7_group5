# Integration Tests for GeekBrain AI System

This directory contains integration tests that verify the end-to-end functionality of the GeekBrain AI System.

## Test Files

- `test_l1_integration.py` - Integration tests for L1 (Simple RAG) functionality

## Prerequisites

Before running integration tests, ensure:

1. **AWS Credentials**: AWS credentials are configured with access to Bedrock services
2. **Environment Variables**: Required environment variables are set
3. **Knowledge Base**: Bedrock Knowledge Base is created and synced
4. **API Server**: The FastAPI server is running

### Required Environment Variables

```bash
# Bedrock Knowledge Base ID
export BEDROCK_KB_ID="your-kb-id-here"

# Bedrock Model ID (optional, defaults to Claude Sonnet)
export BEDROCK_MODEL_ID="anthropic.claude-3-sonnet-20240229-v1:0"

# API Base URL (optional, defaults to http://localhost:8001)
export API_BASE_URL="http://localhost:8001"
```

## Running the Tests

### 1. Start the API Server

In one terminal, start the FastAPI server:

```bash
cd w4/backend/src
python main.py
```

The server should start on `http://localhost:8001`.

### 2. Run Integration Tests

In another terminal, run the integration tests:

```bash
# Run all L1 integration tests
cd w4/backend
pytest tests/integration/test_l1_integration.py -v

# Run specific test
pytest tests/integration/test_l1_integration.py::TestL1Integration::test_team_platform_lead_query -v

# Run with detailed output
pytest tests/integration/test_l1_integration.py -v -s
```

## Test Coverage

### L1 Integration Tests (`test_l1_integration.py`)

**Requirements Tested**: 1.5, 1.6, 11.1, 22.4

#### TestL1Integration Class

1. **test_api_health_check** - Verifies API is running and KB is configured
2. **test_team_platform_lead_query** - Tests query "Who is the Team Platform lead?" returns "Alex Chen"
3. **test_deployment_freeze_window_query** - Tests query "What is the deployment freeze window?" returns correct time range
4. **test_response_includes_source_citations** - Verifies all responses include source citations
5. **test_response_time_under_5_seconds** - Verifies response time < 5 seconds (Requirement 11.1)
6. **test_multiple_queries_consistency** - Verifies consistent results for repeated queries
7. **test_error_handling_empty_query** - Tests graceful handling of empty queries
8. **test_error_handling_invalid_top_k** - Tests graceful handling of invalid parameters
9. **test_vietnamese_response_language** - Verifies responses are in Vietnamese

#### TestL1EdgeCases Class

1. **test_query_with_special_characters** - Tests queries with special characters
2. **test_query_with_numbers** - Tests queries with numbers
3. **test_long_query** - Tests handling of long queries
4. **test_query_not_in_knowledge_base** - Tests graceful handling when information is not available

## Expected Test Results

All tests should pass if:

- Bedrock Knowledge Base is properly synced with all 36 markdown documents
- The documents contain the expected information (Team Platform lead = Alex Chen, deployment freeze window = Friday 18:00 to Monday 08:00)
- API server is running and accessible
- AWS credentials have proper permissions

## Troubleshooting

### Test Failures

**"API health check failed"**
- Ensure the API server is running on the correct port
- Check that `API_BASE_URL` environment variable is set correctly

**"Knowledge Base is not configured"**
- Set the `BEDROCK_KB_ID` environment variable
- Verify the Knowledge Base ID is correct

**"Expected 'Alex Chen' in answer"**
- Verify the Knowledge Base is synced with the correct documents
- Check that `team_platform.md` contains "Alex Chen" as the team lead
- Review the Bedrock Knowledge Base sync status

**"Processing time exceeds 5 second limit"**
- This may indicate network latency or Bedrock service issues
- Check AWS service health status
- Consider increasing the timeout if consistently failing

**"Expected deployment policy document in sources"**
- Verify `deployment_policy.md` is uploaded to S3 and synced to Knowledge Base
- Check that the document contains deployment freeze window information

### Debug Mode

Run tests with maximum verbosity to see detailed output:

```bash
pytest tests/integration/test_l1_integration.py -vv -s --tb=long
```

## Performance Benchmarks

Expected performance for L1 queries:

- **Processing Time**: < 5 seconds (per Requirement 11.1)
- **Total Response Time**: < 6 seconds (including network overhead)
- **Consistency**: Same query should return consistent results across multiple runs

## Next Steps

After L1 integration tests pass:

1. Proceed to L2 integration tests (multi-source retrieval with conflict resolution)
2. Implement L3 integration tests (tool-augmented RAG)
3. Implement L4 integration tests (memory-enabled conversations)

## Notes

- Integration tests make real API calls to AWS Bedrock services and will incur costs
- Tests are designed to be idempotent and can be run multiple times
- Some tests may take several seconds to complete due to LLM inference time
- Tests use a timeout of 10 seconds to prevent hanging on network issues

#!/bin/bash

# Script to trigger Bedrock Knowledge Base ingestion job
# This starts the sync process to ingest documents from S3 into the vector store

set -e

echo "=========================================="
echo "Trigger Knowledge Base Sync"
echo "=========================================="
echo ""

# Get Knowledge Base ID and Data Source ID from Terraform outputs
KB_ID=$(terraform output -raw knowledge_base_id 2>/dev/null)
DS_ID=$(terraform output -raw data_source_id 2>/dev/null)

if [ -z "$KB_ID" ] || [ -z "$DS_ID" ]; then
    echo "Error: Could not retrieve Knowledge Base ID or Data Source ID"
    echo "Make sure Terraform has been applied successfully"
    exit 1
fi

echo "Knowledge Base ID: $KB_ID"
echo "Data Source ID: $DS_ID"
echo ""

# Start ingestion job
echo "Starting ingestion job..."
INGESTION_JOB=$(aws bedrock-agent start-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DS_ID" \
    --output json)

INGESTION_JOB_ID=$(echo "$INGESTION_JOB" | jq -r '.ingestionJob.ingestionJobId')

if [ -z "$INGESTION_JOB_ID" ]; then
    echo "Error: Failed to start ingestion job"
    exit 1
fi

echo "✓ Ingestion job started successfully"
echo "Ingestion Job ID: $INGESTION_JOB_ID"
echo ""

# Monitor ingestion job status
echo "Monitoring ingestion job status..."
echo "(This may take 5-10 minutes depending on document count)"
echo ""

while true; do
    STATUS=$(aws bedrock-agent get-ingestion-job \
        --knowledge-base-id "$KB_ID" \
        --data-source-id "$DS_ID" \
        --ingestion-job-id "$INGESTION_JOB_ID" \
        --output json)
    
    JOB_STATUS=$(echo "$STATUS" | jq -r '.ingestionJob.status')
    
    echo "Status: $JOB_STATUS ($(date '+%H:%M:%S'))"
    
    if [ "$JOB_STATUS" = "COMPLETE" ]; then
        echo ""
        echo "=========================================="
        echo "✓ Ingestion Complete!"
        echo "=========================================="
        echo ""
        
        # Display statistics
        echo "$STATUS" | jq '.ingestionJob.statistics'
        echo ""
        
        echo "Knowledge Base is ready for queries!"
        echo ""
        echo "Next step: Test retrieval with task 5.3"
        break
    elif [ "$JOB_STATUS" = "FAILED" ]; then
        echo ""
        echo "Error: Ingestion job failed"
        echo "$STATUS" | jq '.ingestionJob.failureReasons'
        exit 1
    fi
    
    sleep 30
done

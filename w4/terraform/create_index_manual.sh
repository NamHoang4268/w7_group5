#!/bin/bash
# Manual script to create OpenSearch Serverless index
# Run this ONCE after terraform creates the OpenSearch collection
# and BEFORE creating the Bedrock Knowledge Base

set -e

echo "=========================================="
echo "Create OpenSearch Index for Bedrock KB"
echo "=========================================="
echo ""

# Get endpoint from terraform
ENDPOINT=$(terraform output -raw opensearch_collection_endpoint 2>/dev/null)

if [ -z "$ENDPOINT" ]; then
    echo "Error: Could not get OpenSearch endpoint from terraform"
    echo "Make sure you've run 'terraform apply' first"
    exit 1
fi

REGION=$(terraform output -raw s3_bucket_region 2>/dev/null || echo "us-east-1")
INDEX_NAME="geekbrain-kb-index"

echo "Endpoint: $ENDPOINT"
echo "Region: $REGION"
echo "Index: $INDEX_NAME"
echo ""

# Check if awscurl is available
if command -v awscurl &> /dev/null; then
    echo "Using awscurl..."
    awscurl --service aoss --region "$REGION" \
        -X PUT \
        "$ENDPOINT/$INDEX_NAME" \
        -H "Content-Type: application/json" \
        -d '{
          "settings": {
            "index.knn": true
          },
          "mappings": {
            "properties": {
              "embedding": {
                "type": "knn_vector",
                "dimension": 1024,
                "method": {
                  "name": "hnsw",
                  "engine": "faiss",
                  "parameters": {
                    "ef_construction": 512,
                    "m": 16
                  }
                }
              },
              "text": {
                "type": "text"
              },
              "metadata": {
                "type": "object"
              }
            }
          }
        }'
    
    echo ""
    echo "✓ Index created successfully with awscurl"
    
elif python3 -c "import boto3, urllib3" 2>/dev/null; then
    echo "Using Python with boto3..."
    
    # Remove https:// prefix
    HOST=$(echo "$ENDPOINT" | sed 's|https://||')
    
    python3 - <<PYTHON_SCRIPT "$HOST" "$INDEX_NAME" "$REGION"
import sys
import json
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import urllib3

http = urllib3.PoolManager()

host = sys.argv[1]
index_name = sys.argv[2]
region = sys.argv[3]

url = f"https://{host}/{index_name}"

body = {
    "settings": {"index.knn": True},
    "mappings": {
        "properties": {
            "embedding": {
                "type": "knn_vector",
                "dimension": 1024,
                "method": {
                    "name": "hnsw",
                    "engine": "faiss",
                    "parameters": {"ef_construction": 512, "m": 16}
                }
            },
            "text": {"type": "text"},
            "metadata": {"type": "object"}
        }
    }
}

session = boto3.Session()
credentials = session.get_credentials()

request = AWSRequest(
    method='PUT',
    url=url,
    data=json.dumps(body),
    headers={'Content-Type': 'application/json'}
)

SigV4Auth(credentials, 'aoss', region).add_auth(request)

response = http.request(
    request.method,
    request.url,
    body=request.body,
    headers=dict(request.headers)
)

print(f"Status: {response.status}")
if response.status in [200, 201]:
    print("✓ Index created successfully")
elif 'resource_already_exists' in response.data.decode('utf-8'):
    print("✓ Index already exists")
else:
    print(f"Response: {response.data.decode('utf-8')}")
    sys.exit(1)
PYTHON_SCRIPT
    
else
    echo "Error: Neither awscurl nor Python boto3 is available"
    echo ""
    echo "Install one of:"
    echo "  1. awscurl: pip install awscurl"
    echo "  2. boto3 + urllib3: pip install boto3 urllib3"
    echo ""
    echo "Or create index via AWS Console:"
    echo "  1. Go to OpenSearch Serverless console"
    echo "  2. Select collection: geekbrain-kb-dev"
    echo "  3. Create index: geekbrain-kb-index"
    echo "  4. Use mapping from README.md"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Index Creation Complete"
echo "=========================================="
echo ""
echo "Next step: Continue with terraform apply"
echo "  terraform apply"

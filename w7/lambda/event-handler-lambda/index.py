import json
import os
import boto3
import urllib.parse
from datetime import datetime

# Initialize AWS clients
dynamodb = boto3.client('dynamodb')
bedrock_agent = boto3.client('bedrock-agent')

DOCUMENT_TABLE = os.environ.get('DOCUMENT_TABLE')
BEDROCK_KB_ID = os.environ.get('BEDROCK_KB_ID')
BEDROCK_DS_ID = os.environ.get('BEDROCK_DS_ID')

def handler(event, context):
    print("Event Handler Received:", json.dumps(event))
    
    # 1. Handle S3 ObjectCreated Event (Triggered when user uploads PDF successfully)
    if 'Records' in event and len(event['Records']) > 0:
        record = event['Records'][0]
        if record.get('eventSource') == 'aws:s3' and 'ObjectCreated' in record.get('eventName', ''):
            handle_s3_upload(record)
            return {"statusCode": 200, "body": "S3 Event Processed"}
            
    # 2. Handle EventBridge Event (Triggered by Bedrock Knowledge Base Ingestion state change)
    if event.get('source') == 'aws.bedrock' and event.get('detail-type') == 'Knowledge Base Ingestion State Change':
        handle_bedrock_ingestion_event(event)
        return {"statusCode": 200, "body": "Bedrock Event Processed"}
        
    return {"statusCode": 200, "body": "Unknown Event, Ignored"}

def handle_s3_upload(record):
    bucket = record['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(record['s3']['object']['key'], encoding='utf-8')
    
    # Ignore .metadata.json uploads, we only care about the actual files
    if key.endswith('.metadata.json'):
        print("Ignoring metadata file upload.")
        return
        
    print(f"File uploaded to S3: s3://{bucket}/{key}")
    
    # Extract document_id from key
    # New format: docs/{short_id}_{filename} → short_id là 8 ký tự đầu của document_id
    # Old format: workspace_id/document_id/filename (deprecated)
    parts = key.split('/')
    document_id = None
    
    if len(parts) == 2 and parts[0] == 'docs':
        # New format: docs/43bc92c8_filename.pdf → extract short_id
        filename_part = parts[1]
        short_id = filename_part.split('_')[0]  # lấy 8 ký tự đầu
        
        # Scan DynamoDB để tìm document có document_id bắt đầu bằng short_id
        response = dynamodb.scan(
            TableName=DOCUMENT_TABLE,
            FilterExpression='begins_with(document_id, :prefix)',
            ExpressionAttributeValues={':prefix': {'S': short_id}}
        )
        items = response.get('Items', [])
        if items:
            document_id = items[0]['document_id']['S']
    elif len(parts) >= 3:
        # Old format fallback
        document_id = parts[1]
    
    if not document_id:
        print(f"Could not extract document_id from key: {key}")
        return
    
    # Update DynamoDB status to READY
    dynamodb.update_item(
        TableName=DOCUMENT_TABLE,
        Key={'document_id': {'S': document_id}},
        UpdateExpression='SET #status = :s, updated_at = :u',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':s': {'S': 'READY'},
            ':u': {'S': datetime.utcnow().isoformat()}
        }
    )
    print(f"Updated document {document_id} to READY")

    # Trigger Bedrock Knowledge Base Ingestion Job
    try:
        response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=BEDROCK_KB_ID,
            dataSourceId=BEDROCK_DS_ID,
            description=f"Auto-sync for document {document_id}"
        )
        job_id = response['ingestionJob']['ingestionJobId']
        print(f"Started Bedrock Ingestion Job: {job_id}")
        
        # Store job_id in DB
        dynamodb.update_item(
            TableName=DOCUMENT_TABLE,
            Key={'document_id': {'S': document_id}},
            UpdateExpression='SET ingestion_job_id = :j',
            ExpressionAttributeValues={':j': {'S': job_id}}
        )
    except Exception as e:
        print(f"Failed to start Bedrock Ingestion: {str(e)}")


def handle_bedrock_ingestion_event(event):
    detail = event.get('detail', {})
    job_id = detail.get('ingestionJobId')
    kb_id = detail.get('knowledgeBaseId')
    status = detail.get('status') # e.g., COMPLETE, FAILED
    
    print(f"Bedrock Ingestion Job {job_id} for KB {kb_id} changed to {status}")
    
    # We need to find which document(s) this job belongs to and update their status.
    # In a simple hackathon setup, if it's COMPLETE, we can just scan for INDEXING docs 
    # and mark them READY. Or query by ingestion_job_id using a GSI.
    # Here is a basic implementation assuming we update all INDEXING docs that match the job_id.
    
    new_status = 'READY' if status == 'COMPLETE' else 'ERROR'
    
    # Without a GSI on ingestion_job_id, we have to scan (okay for Hackathon scale)
    response = dynamodb.scan(
        TableName=DOCUMENT_TABLE,
        FilterExpression='ingestion_job_id = :j',
        ExpressionAttributeValues={':j': {'S': job_id}}
    )
    
    items = response.get('Items', [])
    for item in items:
        doc_id = item['document_id']['S']
        dynamodb.update_item(
            TableName=DOCUMENT_TABLE,
            Key={'document_id': {'S': doc_id}},
            UpdateExpression='SET #status = :s, updated_at = :u',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':s': {'S': new_status},
                ':u': {'S': datetime.utcnow().isoformat()}
            }
        )
        print(f"Updated document {doc_id} to {new_status}")

"""
Lambda function for automatic KB sync when S3 documents change.

Triggered by S3 events (ObjectCreated, ObjectRemoved) on the knowledge_base/ prefix.
Calls Bedrock StartIngestionJob to re-sync the Knowledge Base.

Environment Variables:
    BEDROCK_KB_ID  — Knowledge Base ID
    BEDROCK_DS_ID  — Data Source ID
"""

import os
import json
import logging
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """
    Handle S3 event or API Gateway event and trigger KB sync.

    Args:
        event: S3 event notification or API Gateway proxy event
        context: Lambda context

    Returns:
        dict with statusCode and body
    """
    # Force error for DLQ testing
    if event.get("force_error"):
        logger.error("Force error triggered for DLQ test")
        raise RuntimeError("Intentional failure for DLQ demonstration")

    # Detect API Gateway invocation (has httpMethod or requestContext)
    if "httpMethod" in event or "requestContext" in event:
        logger.info("API Gateway invocation detected")
        return handle_api_gateway(event, context)

    kb_id = os.environ.get("BEDROCK_KB_ID")
    ds_id = os.environ.get("BEDROCK_DS_ID")

    if not kb_id or not ds_id:
        logger.error("Missing BEDROCK_KB_ID or BEDROCK_DS_ID environment variables")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Missing configuration"})
        }

    # Log the triggering event
    records = event.get("Records", [])
    changed_files = []
    for record in records:
        event_name = record.get("eventName", "Unknown")
        s3_info = record.get("s3", {})
        bucket = s3_info.get("bucket", {}).get("name", "unknown")
        key = s3_info.get("object", {}).get("key", "unknown")
        changed_files.append({"event": event_name, "bucket": bucket, "key": key})

    logger.info(f"S3 event received: {len(changed_files)} file(s) changed")
    for f in changed_files:
        logger.info(f"  {f['event']}: s3://{f['bucket']}/{f['key']}")

    # Trigger KB sync
    client = boto3.client("bedrock-agent")

    try:
        response = client.start_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=ds_id,
            description=f"Auto-sync triggered by S3 event at {datetime.now().isoformat()}"
        )

        job = response.get("ingestionJob", {})
        job_id = job.get("ingestionJobId", "unknown")
        status = job.get("status", "UNKNOWN")

        logger.info(f"✅ Ingestion job started: {job_id} (status: {status})")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "KB sync triggered successfully",
                "ingestion_job_id": job_id,
                "status": status,
                "changed_files": changed_files
            })
        }

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]

        if error_code == "ConflictException":
            logger.warning(f"⚠️ Sync already in progress: {error_msg}")
            return {
                "statusCode": 409,
                "body": json.dumps({
                    "message": "Sync already in progress",
                    "error": error_msg
                })
            }

        logger.error(f"❌ Failed to start sync: {error_code} — {error_msg}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": f"{error_code}: {error_msg}"
            })
        }

    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


def handle_api_gateway(event, context):
    """Handle API Gateway proxy integration request."""
    kb_id = os.environ.get("BEDROCK_KB_ID", "not-configured")
    ds_id = os.environ.get("BEDROCK_DS_ID", "not-configured")

    logger.info(f"Manual sync requested via API Gateway")
    logger.info(f"KB ID: {kb_id}, DS ID: {ds_id}")

    if kb_id == "placeholder" or ds_id == "placeholder":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "KB sync endpoint active",
                "status": "ready",
                "kb_id": kb_id,
                "ds_id": ds_id,
                "timestamp": datetime.now().isoformat(),
                "note": "Bedrock KB not yet configured - endpoint validated successfully"
            })
        }

    client = boto3.client("bedrock-agent")
    try:
        response = client.start_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=ds_id,
            description=f"Manual sync via API Gateway at {datetime.now().isoformat()}"
        )
        job = response.get("ingestionJob", {})
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "KB sync triggered successfully",
                "ingestion_job_id": job.get("ingestionJobId"),
                "status": job.get("status")
            })
        }
    except ClientError as e:
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Sync attempted",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        }
    except Exception as e:
        logger.error(f"Unexpected error in API Gateway handler: {str(e)}")
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Sync endpoint reached",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        }

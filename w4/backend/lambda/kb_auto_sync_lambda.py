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


def lambda_handler(event, context):
    """
    Handle S3 event and trigger KB sync.

    Args:
        event: S3 event notification (contains Records with s3 object info)
        context: Lambda context

    Returns:
        dict with statusCode and body
    """
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

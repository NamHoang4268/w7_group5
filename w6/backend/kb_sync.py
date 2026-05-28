"""
Knowledge Base Sync Script (Bonus C).

Triggers Bedrock KB re-ingestion when documents in S3 change.

Usage (Manual):
    python kb_sync.py                          # Trigger sync
    python kb_sync.py --wait                   # Trigger and wait for completion
    python kb_sync.py --status JOB_ID          # Check sync status

Environment:
    BEDROCK_KB_ID        — Knowledge Base ID (required)
    BEDROCK_DS_ID        — Data Source ID (required)
    AWS_DEFAULT_REGION   — AWS region (default: us-east-1)
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime

import boto3
from botocore.exceptions import ClientError


class KBSyncManager:
    """Manages Bedrock Knowledge Base synchronization."""

    def __init__(self, kb_id: str = None, ds_id: str = None, region: str = None):
        self.kb_id = kb_id or os.getenv("BEDROCK_KB_ID")
        self.ds_id = ds_id or os.getenv("BEDROCK_DS_ID")
        self.region = region or os.getenv("AWS_DEFAULT_REGION", "us-east-1")

        if not self.kb_id:
            raise ValueError("BEDROCK_KB_ID is required (set via env or constructor)")
        if not self.ds_id:
            raise ValueError("BEDROCK_DS_ID is required (set via env or constructor)")

        self.client = boto3.client("bedrock-agent", region_name=self.region)

    def start_sync(self) -> dict:
        """
        Start an ingestion job to re-sync the Knowledge Base.

        Returns:
            dict with ingestion_job_id, status, and started_at
        """
        try:
            response = self.client.start_ingestion_job(
                knowledgeBaseId=self.kb_id,
                dataSourceId=self.ds_id,
                description=f"Sync triggered at {datetime.now().isoformat()}"
            )

            job = response.get("ingestionJob", {})
            job_id = job.get("ingestionJobId", "unknown")
            status = job.get("status", "UNKNOWN")

            print(f"✅ Ingestion job started")
            print(f"   Job ID:    {job_id}")
            print(f"   Status:    {status}")
            print(f"   KB ID:     {self.kb_id}")
            print(f"   DS ID:     {self.ds_id}")

            return {
                "ingestion_job_id": job_id,
                "status": status,
                "started_at": datetime.now().isoformat(),
                "knowledge_base_id": self.kb_id,
                "data_source_id": self.ds_id,
            }

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_msg = e.response["Error"]["Message"]

            if error_code == "ConflictException":
                print(f"⚠️  A sync job is already in progress for this KB")
                print(f"   Error: {error_msg}")
                return {"status": "CONFLICT", "error": error_msg}

            print(f"❌ Failed to start ingestion job: {error_code} — {error_msg}")
            return {"status": "ERROR", "error": f"{error_code}: {error_msg}"}

    def get_job_status(self, job_id: str) -> dict:
        """
        Get the status of an ingestion job.

        Args:
            job_id: Ingestion job ID

        Returns:
            dict with job status details
        """
        try:
            response = self.client.get_ingestion_job(
                knowledgeBaseId=self.kb_id,
                dataSourceId=self.ds_id,
                ingestionJobId=job_id
            )

            job = response.get("ingestionJob", {})
            status = job.get("status", "UNKNOWN")
            stats = job.get("statistics", {})

            return {
                "ingestion_job_id": job_id,
                "status": status,
                "documents_scanned": stats.get("numberOfDocumentsScanned", 0),
                "documents_indexed": stats.get("numberOfNewDocumentsIndexed", 0),
                "documents_updated": stats.get("numberOfModifiedDocumentsIndexed", 0),
                "documents_deleted": stats.get("numberOfDocumentsDeleted", 0),
                "documents_failed": stats.get("numberOfDocumentsFailed", 0),
                "started_at": str(job.get("startedAt", "")),
                "updated_at": str(job.get("updatedAt", "")),
            }

        except ClientError as e:
            return {"status": "ERROR", "error": str(e)}

    def wait_for_completion(self, job_id: str, timeout: int = 300, poll_interval: int = 10) -> dict:
        """
        Wait for an ingestion job to complete.

        Args:
            job_id: Ingestion job ID
            timeout: Maximum wait time in seconds
            poll_interval: Seconds between status checks

        Returns:
            Final job status dict
        """
        print(f"\n⏳ Waiting for sync to complete (timeout: {timeout}s)...")
        start = time.time()

        while time.time() - start < timeout:
            status = self.get_job_status(job_id)
            current = status.get("status", "UNKNOWN")
            elapsed = time.time() - start

            print(f"   [{elapsed:.0f}s] Status: {current} "
                  f"(scanned: {status.get('documents_scanned', '?')}, "
                  f"indexed: {status.get('documents_indexed', '?')})")

            if current in ("COMPLETE", "FAILED", "STOPPED"):
                if current == "COMPLETE":
                    print(f"\n✅ Sync completed successfully!")
                elif current == "FAILED":
                    print(f"\n❌ Sync failed!")
                else:
                    print(f"\n⚠️  Sync stopped!")
                return status

            time.sleep(poll_interval)

        print(f"\n⏰ Timeout reached ({timeout}s). Job may still be running.")
        return self.get_job_status(job_id)

    def list_recent_jobs(self, max_results: int = 5) -> list:
        """
        List recent ingestion jobs.

        Returns:
            List of job summaries
        """
        try:
            response = self.client.list_ingestion_jobs(
                knowledgeBaseId=self.kb_id,
                dataSourceId=self.ds_id,
                maxResults=max_results,
                sortBy={"attribute": "STARTED_AT", "order": "DESCENDING"}
            )

            jobs = response.get("ingestionJobSummaries", [])
            return [
                {
                    "job_id": j.get("ingestionJobId"),
                    "status": j.get("status"),
                    "started_at": str(j.get("startedAt", "")),
                    "updated_at": str(j.get("updatedAt", "")),
                    "stats": j.get("statistics", {}),
                }
                for j in jobs
            ]

        except ClientError as e:
            print(f"❌ Failed to list jobs: {e}")
            return []


def main():
    parser = argparse.ArgumentParser(
        description="GeekBrain Knowledge Base Sync Tool (Bonus C)"
    )
    parser.add_argument(
        "--wait", action="store_true",
        help="Wait for sync to complete"
    )
    parser.add_argument(
        "--status", type=str, metavar="JOB_ID",
        help="Check status of an existing ingestion job"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List recent ingestion jobs"
    )
    parser.add_argument(
        "--timeout", type=int, default=300,
        help="Timeout in seconds when using --wait (default: 300)"
    )

    args = parser.parse_args()

    try:
        sync = KBSyncManager()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("   Set environment variables: BEDROCK_KB_ID, BEDROCK_DS_ID")
        sys.exit(1)

    if args.list:
        print(f"📋 Recent ingestion jobs for KB {sync.kb_id}:")
        jobs = sync.list_recent_jobs()
        for j in jobs:
            print(f"   {j['job_id']}  {j['status']}  started={j['started_at']}")
        return

    if args.status:
        print(f"🔍 Checking status for job {args.status}...")
        status = sync.get_job_status(args.status)
        print(json.dumps(status, indent=2, default=str))
        return

    # Default: start sync
    result = sync.start_sync()

    if result.get("status") in ("STARTING", "IN_PROGRESS"):
        if args.wait:
            job_id = result.get("ingestion_job_id")
            if job_id:
                sync.wait_for_completion(job_id, timeout=args.timeout)
    elif result.get("status") == "CONFLICT":
        print("\n💡 Tip: Use --list to see running jobs, or --status JOB_ID to check status")


if __name__ == "__main__":
    main()

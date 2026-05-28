"""
MH-SEC: Self-Healing Security Guard Lambda
--------------------------------------------
Detects S3 buckets that have Public Access DISABLED and auto-remediates
by calling PutPublicAccessBlock to re-enable block-public-access.

Triggered by:
  - EventBridge rule on CloudTrail event PutBucketPolicy / PutBucketAcl (near real-time)
  - EventBridge Scheduler daily cron (fallback sweep)
"""
import json
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3  = boto3.client("s3")
ec2 = boto3.client("ec2")
cloudwatch = boto3.client("cloudwatch")


def _publish_metric(action: str, count: int):
    cloudwatch.put_metric_data(
        Namespace="GeekBrain/SecurityGuard",
        MetricData=[{
            "MetricName": "RemediationsApplied",
            "Dimensions": [{"Name": "Action", "Value": action}],
            "Value": count,
            "Unit": "Count",
        }]
    )


# ---------------------------------------------------------------------------
# S3: Block Public Access remediation
# ---------------------------------------------------------------------------

def remediate_s3_public_access(bucket_name: str = None):
    """
    If bucket_name is given (event-driven), remediate just that bucket.
    Otherwise (scheduled sweep), remediate ALL buckets that have any block disabled.
    """
    buckets_to_fix = []

    if bucket_name:
        buckets_to_check = [{"Name": bucket_name}]
    else:
        buckets_to_check = s3.list_buckets().get("Buckets", [])

    for bucket in buckets_to_check:
        name = bucket["Name"]
        try:
            config = s3.get_public_access_block(Bucket=name)["PublicAccessBlockConfiguration"]
            is_fully_blocked = all([
                config.get("BlockPublicAcls", False),
                config.get("IgnorePublicAcls", False),
                config.get("BlockPublicPolicy", False),
                config.get("RestrictPublicBuckets", False),
            ])
            if not is_fully_blocked:
                buckets_to_fix.append(name)
                logger.warning("VIOLATION: bucket '%s' has public access NOT fully blocked.", name)
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchPublicAccessBlockConfiguration":
                # No config exists at all = fully public = violation
                buckets_to_fix.append(name)
                logger.warning("VIOLATION: bucket '%s' has NO public access block configuration.", name)
            else:
                logger.error("Error checking bucket '%s': %s", name, e)
        except Exception as exc:
            logger.error("Error checking bucket '%s': %s", name, exc)

    for name in buckets_to_fix:
        logger.info("REMEDIATING: Enabling full Block Public Access on bucket '%s'", name)
        s3.put_public_access_block(
            Bucket=name,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            }
        )
        logger.info("REMEDIATED: bucket '%s' is now fully blocked.", name)

    if buckets_to_fix:
        _publish_metric("S3PublicAccessBlock", len(buckets_to_fix))

    return buckets_to_fix


# ---------------------------------------------------------------------------
# EC2 Security Group: revoke open SSH/RDP rules
# ---------------------------------------------------------------------------

def remediate_sg_open_ssh():
    """Sweep all security groups and revoke ingress rules open to 0.0.0.0/0 on port 22/3389."""
    sgs = ec2.describe_security_groups()["SecurityGroups"]
    violated_sgs = []

    for sg in sgs:
        sg_id = sg["GroupId"]
        for perm in sg.get("IpPermissions", []):
            from_port = perm.get("FromPort", 0)
            to_port   = perm.get("ToPort", 0)

            # Check for open SSH (22) or RDP (3389)
            dangerous_ports = any(
                from_port <= p <= to_port
                for p in [22, 3389]
            )
            open_cidrs = [
                r for r in perm.get("IpRanges", [])
                if r.get("CidrIp") in ("0.0.0.0/0", "::/0")
            ]
            open_ipv6  = [
                r for r in perm.get("Ipv6Ranges", [])
                if r.get("CidrIpv6") == "::/0"
            ]

            if dangerous_ports and (open_cidrs or open_ipv6):
                logger.warning(
                    "VIOLATION: SG '%s' has open ingress on port %s-%s from 0.0.0.0/0",
                    sg_id, from_port, to_port
                )
                try:
                    ec2.revoke_security_group_ingress(
                        GroupId=sg_id,
                        IpPermissions=[perm]
                    )
                    logger.info("REMEDIATED: Revoked open ingress on SG '%s'", sg_id)
                    violated_sgs.append(sg_id)
                except Exception as exc:
                    logger.error("Failed to revoke SG '%s': %s", sg_id, exc)

    if violated_sgs:
        _publish_metric("SGRevokeOpenSSH", len(violated_sgs))

    return violated_sgs


# ---------------------------------------------------------------------------
# Lambda Handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """Entry point. Works for CloudTrail-based EventBridge and scheduled cron."""
    logger.info("Security Guard triggered. Event: %s", json.dumps(event))

    # Detect if this is an event-driven S3 trigger
    bucket_name = None
    detail = event.get("detail", {})
    request_params = detail.get("requestParameters", {})

    if detail.get("eventName") in ("PutBucketPolicy", "PutBucketAcl", "DeletePublicAccessBlock"):
        bucket_name = request_params.get("bucketName")
        logger.info("Event-driven trigger for bucket: %s", bucket_name)

    fixed_s3  = remediate_s3_public_access(bucket_name=bucket_name)
    fixed_sgs = remediate_sg_open_ssh()

    result = {
        "remediated_s3_buckets":   fixed_s3,
        "remediated_security_groups": fixed_sgs,
        "total_remediations": len(fixed_s3) + len(fixed_sgs),
    }
    logger.info("Security Guard completed. Result: %s", json.dumps(result))
    return result

"""
MH-COST-A: Automated Cost Guard Lambda
----------------------------------------
Stops EC2 instances and ECS Fargate tasks that do NOT have tag keep=true.
Triggered by:
  - Daily EventBridge Scheduler (cron)
  - SNS message from AWS Budgets alert
"""
import json
import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2 = boto3.client("ec2")
ecs = boto3.client("ecs")
cloudwatch = boto3.client("cloudwatch")

KEEP_TAG_KEY   = "keep"
KEEP_TAG_VALUE = "true"


def _publish_metric(action: str, count: int):
    """Publish a custom metric tracking how many resources were stopped."""
    cloudwatch.put_metric_data(
        Namespace="GeekBrain/CostGuard",
        MetricData=[{
            "MetricName": "ResourcesStopped",
            "Dimensions": [{"Name": "Action", "Value": action}],
            "Value": count,
            "Unit": "Count",
        }]
    )


def stop_untagged_ec2():
    """Stop all running EC2 instances that do NOT have keep=true."""
    paginator = ec2.get_paginator("describe_instances")
    pages = paginator.paginate(
        Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
    )

    to_stop = []
    for page in pages:
        for reservation in page["Reservations"]:
            for instance in reservation["Instances"]:
                tags = {t["Key"]: t["Value"] for t in instance.get("Tags", [])}
                if tags.get(KEEP_TAG_KEY, "false").lower() != KEEP_TAG_VALUE:
                    to_stop.append(instance["InstanceId"])

    if to_stop:
        logger.info("Stopping EC2 instances: %s", to_stop)
        ec2.stop_instances(InstanceIds=to_stop)
        _publish_metric("EC2Stop", len(to_stop))
    else:
        logger.info("No untagged running EC2 instances found.")

    return to_stop


def stop_untagged_ecs_tasks():
    """Stop ECS tasks in clusters that do NOT belong to a kept service."""
    stopped = []
    clusters_resp = ecs.list_clusters()
    for cluster_arn in clusters_resp.get("clusterArns", []):
        tasks_resp = ecs.list_tasks(cluster=cluster_arn, desiredStatus="RUNNING")
        for task_arn in tasks_resp.get("taskArns", []):
            desc = ecs.describe_tasks(cluster=cluster_arn, tasks=[task_arn])
            task = desc["tasks"][0]
            tags = {t["key"]: t["value"] for t in task.get("tags", [])}
            if tags.get(KEEP_TAG_KEY, "false").lower() != KEEP_TAG_VALUE:
                logger.info("Stopping ECS task %s in cluster %s", task_arn, cluster_arn)
                ecs.stop_task(cluster=cluster_arn, task=task_arn, reason="Cost Guard: no keep=true tag")
                stopped.append(task_arn)

    if stopped:
        _publish_metric("ECSTaskStop", len(stopped))
    return stopped


def handler(event, context):
    """Lambda entry point — works for both EventBridge and SNS triggers."""
    logger.info("Cost Guard triggered. Event: %s", json.dumps(event))

    # If coming from SNS (Budget alert), log the budget message
    if "Records" in event:
        for record in event["Records"]:
            if record.get("EventSource") == "aws:sns":
                message = record["Sns"]["Message"]
                logger.info("Budget SNS alert: %s", message)

    stopped_ec2  = stop_untagged_ec2()
    stopped_ecs  = stop_untagged_ecs_tasks()

    result = {
        "stopped_ec2": stopped_ec2,
        "stopped_ecs_tasks": stopped_ecs,
        "total_stopped": len(stopped_ec2) + len(stopped_ecs),
    }
    logger.info("Cost Guard completed. Result: %s", json.dumps(result))
    return result

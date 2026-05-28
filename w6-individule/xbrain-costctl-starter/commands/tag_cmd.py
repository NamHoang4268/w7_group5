"""tag — add or update tags on one resource."""
import boto3
from botocore.exceptions import ClientError

from commands._common import parse_kv


def _to_tags(set_args):
    return [{"Key": k, "Value": v} for k, v in (parse_kv(s) for s in set_args)]


def _tag_ec2(rid, tags):
    ec2 = boto3.client("ec2")
    ec2.create_tags(Resources=[rid], Tags=tags)


def _tag_rds(rid, tags):
    rds = boto3.client("rds")
    db = rds.describe_db_instances(DBInstanceIdentifier=rid)["DBInstances"][0]
    arn = db["DBInstanceArn"]
    rds.add_tags_to_resource(ResourceName=arn, Tags=tags)


def _tag_s3(rid, tags):
    s3 = boto3.client("s3")
    try:
        existing = s3.get_bucket_tagging(Bucket=rid).get("TagSet", [])
    except ClientError:
        existing = []
    merged = {t["Key"]: t["Value"] for t in existing}
    for t in tags:
        merged[t["Key"]] = t["Value"]
    final = [{"Key": k, "Value": v} for k, v in merged.items()]
    s3.put_bucket_tagging(Bucket=rid, Tagging={"TagSet": final})


def _tag_volume(rid, tags):
    ec2 = boto3.client("ec2")
    ec2.create_tags(Resources=[rid], Tags=tags)


DISPATCH = {
    "ec2": _tag_ec2,
    "rds": _tag_rds,
    "s3": _tag_s3,
    "volume": _tag_volume,
}


def run(args):
    tags = _to_tags(args.set)
    DISPATCH[args.type](args.id, tags)
    tag_str = ", ".join(f"{t['Key']}={t['Value']}" for t in tags)
    print(f"Applied {len(tags)} tag(s) to {args.type} {args.id}: {tag_str}")

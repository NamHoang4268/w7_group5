"""list — list AWS resources by type, filter by tag / missing-tag.

WHAT YOU MUST BUILD
-------------------
Support 4 resource types: ec2, rds, s3, volume.
Each takes:
- `want` — list of (key, value) tag pairs the resource MUST have
- `missing` — list of tag keys the resource MUST NOT have

Print a formatted table to stdout. Test cases are in tests/test_list.py.

HELPERS YOU CAN USE
-------------------
From commands._common:
  parse_kv(s) -> (k, v)            # "Owner=alice" -> ("Owner", "alice")
  tags_to_dict(items) -> dict       # boto3 [{"Key","Value"}] -> {k: v}
  tags_match(tags, want, missing) -> bool

AWS APIS YOU'LL NEED
--------------------
- EC2: ec2.describe_instances() with get_paginator
- RDS: rds.describe_db_instances(), then list_tags_for_resource(ResourceName=arn)
- S3:  s3.list_buckets(), then get_bucket_tagging(Bucket=name)
       (catch ClientError when bucket has no tagging config — treat as {})
- EBS: ec2.describe_volumes() with get_paginator

EXPECTED OUTPUT FORMAT (when run from CLI)
------------------------------------------
    EC2 Environment=dev — 1 found:
    ------------------------------------------------------------------------------
      i-0abc123def456789a       t3.micro       running       Environment=dev

VERIFY
------
    pytest tests/test_list.py -v
"""
import boto3
from botocore.exceptions import ClientError

from commands._common import parse_kv, tags_to_dict, tags_match


def _list_ec2(want, missing):
    ec2 = boto3.client("ec2")
    paginator = ec2.get_paginator("describe_instances")
    rows = []
    for page in paginator.paginate():
        for res in page["Reservations"]:
            for inst in res["Instances"]:
                tags = tags_to_dict(inst.get("Tags"))
                if tags_match(tags, want, missing):
                    rows.append((
                        inst["InstanceId"],
                        inst["InstanceType"],
                        inst["State"]["Name"],
                        tags,
                    ))
    return rows


def _list_rds(want, missing):
    rds = boto3.client("rds")
    resp = rds.describe_db_instances()
    rows = []
    for db in resp["DBInstances"]:
        tag_resp = rds.list_tags_for_resource(ResourceName=db["DBInstanceArn"])
        tags = tags_to_dict(tag_resp.get("TagList"))
        if tags_match(tags, want, missing):
            rows.append((
                db["DBInstanceIdentifier"],
                db["DBInstanceClass"],
                db["DBInstanceStatus"],
                tags,
            ))
    return rows


def _list_s3(want, missing):
    s3 = boto3.client("s3")
    buckets = s3.list_buckets().get("Buckets", [])
    rows = []
    for b in buckets:
        try:
            tag_resp = s3.get_bucket_tagging(Bucket=b["Name"])
            tags = tags_to_dict(tag_resp.get("TagSet"))
        except ClientError:
            tags = {}
        if tags_match(tags, want, missing):
            rows.append((b["Name"], "bucket", "active", tags))
    return rows


def _list_volume(want, missing):
    ec2 = boto3.client("ec2")
    paginator = ec2.get_paginator("describe_volumes")
    rows = []
    for page in paginator.paginate():
        for vol in page["Volumes"]:
            tags = tags_to_dict(vol.get("Tags"))
            if tags_match(tags, want, missing):
                type_size = f"{vol['VolumeType']}-{vol['Size']}GB"
                rows.append((vol["VolumeId"], type_size, vol["State"], tags))
    return rows


DISPATCH = {
    "ec2": _list_ec2,
    "rds": _list_rds,
    "s3": _list_s3,
    "volume": _list_volume,
}


def run(args):
    want = [parse_kv(t) for t in args.tag]
    missing = args.missing_tag
    rows = DISPATCH[args.type](want, missing)

    tag_desc = " ".join(f"{k}={v}" for k, v in want)
    missing_desc = " ".join(f"missing:{k}" for k in missing)
    filter_desc = " ".join(filter(None, [tag_desc, missing_desc])) or "(no filter)"

    print(f"{args.type.upper()} {filter_desc} — {len(rows)} found:")
    print("-" * 78)
    for row in rows:
        rid, rtype, state, tags = row
        tag_str = ", ".join(f"{k}={v}" for k, v in tags.items())
        print(f"  {rid:<30} {rtype:<15} {state:<15} {tag_str}")

"""clean — (stretch) bulk terminate resources matching a tag."""
import boto3

from commands._common import parse_kv, tags_to_dict, tags_match


def _find_targets(tag_key, tag_val):
    ec2 = boto3.client("ec2")
    result = {"ec2": [], "volume": []}

    paginator = ec2.get_paginator("describe_instances")
    for page in paginator.paginate():
        for res in page["Reservations"]:
            for inst in res["Instances"]:
                state = inst["State"]["Name"]
                if state in ("terminated", "shutting-down"):
                    continue
                tags = tags_to_dict(inst.get("Tags"))
                if tags.get(tag_key) == tag_val:
                    result["ec2"].append(inst["InstanceId"])

    vol_paginator = ec2.get_paginator("describe_volumes")
    for page in vol_paginator.paginate():
        for vol in page["Volumes"]:
            if vol["State"] != "available":
                continue
            tags = tags_to_dict(vol.get("Tags"))
            if tags.get(tag_key) == tag_val:
                result["volume"].append(vol["VolumeId"])

    return result


def run(args):
    key, val = parse_kv(args.tag)
    targets = _find_targets(key, val)

    ec2_count = len(targets["ec2"])
    vol_count = len(targets["volume"])
    total = ec2_count + vol_count

    if total == 0:
        print("Nothing to clean.")
        return

    print(f"Found {ec2_count} EC2 instance(s), {vol_count} volume(s) with {key}={val}")

    if not args.apply:
        for iid in targets["ec2"]:
            print(f"  [dry-run] would terminate EC2 {iid}")
        for vid in targets["volume"]:
            print(f"  [dry-run] would delete volume {vid}")
        print("(dry-run — pass --apply to actually terminate)")
        return

    ec2 = boto3.client("ec2")
    if targets["ec2"]:
        ec2.terminate_instances(InstanceIds=targets["ec2"])
        for iid in targets["ec2"]:
            print(f"  Terminated EC2 {iid}")
    for vid in targets["volume"]:
        ec2.delete_volume(VolumeId=vid)
        print(f"  Deleted volume {vid}")

"""cost — show cost of resources matching a tag, over the last N days."""
import boto3
from collections import defaultdict
from datetime import date, timedelta

from commands._common import parse_kv


def run(args):
    key, val = parse_kv(args.tag)
    end = date.today()
    start = end - timedelta(days=args.days)

    ce = boto3.client("ce")
    resp = ce.get_cost_and_usage(
        TimePeriod={"Start": str(start), "End": str(end)},
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        Filter={"Tags": {"Key": key, "Values": [val]}},
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
    )

    costs = defaultdict(float)
    for day in resp["ResultsByTime"]:
        for group in day.get("Groups", []):
            service = group["Keys"][0]
            amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
            costs[service] += amount

    print(f"Cost for {key}={val} over last {args.days} days ({start} → {end}):")
    print("-" * 60)
    for svc, amt in sorted(costs.items(), key=lambda x: -x[1]):
        print(f"  {svc:<50} $ {amt:>8.2f}")
    total = sum(costs.values())
    print("-" * 60)
    print(f"  {'TOTAL':<50} $ {total:>8.2f}")

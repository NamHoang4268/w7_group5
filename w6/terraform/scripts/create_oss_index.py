"""Bootstrap OpenSearch Serverless vector index for Bedrock KB."""
import os
import time

import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

COLLECTION_ENDPOINT = os.environ["COLLECTION_ENDPOINT"]
INDEX_NAME = os.environ.get("INDEX_NAME", "bedrock-kb-index")
REGION = os.environ.get("AWS_REGION", "us-east-1")

host = COLLECTION_ENDPOINT.replace("https://", "")
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    REGION,
    "aoss",
    session_token=credentials.token,
)

client = OpenSearch(
    hosts=[{"host": host, "port": 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=30,
)


def wait_for_collection():
    for attempt in range(30):
        try:
            client.cat.indices()
            return True
        except Exception:
            pass
        print(f"Waiting for collection... attempt {attempt + 1}/30")
        time.sleep(10)
    raise TimeoutError("Collection not reachable after 5 minutes")


def create_index():
    if client.indices.exists(index=INDEX_NAME):
        print(f"Index '{INDEX_NAME}' already exists, skipping.")
        return

    index_body = {
        "settings": {
            "index": {
                "number_of_shards": 2,
                "number_of_replicas": 0,
                "knn": True,
                "knn.algo_param.ef_search": 512,
            }
        },
        "mappings": {
            "properties": {
                "embedding": {
                    "type": "knn_vector",
                    "dimension": 1024,
                    "method": {
                        "engine": "faiss",
                        "name": "hnsw",
                        "parameters": {"m": 16, "ef_construction": 512},
                        "space_type": "l2",
                    },
                },
                "text": {"type": "text", "index": True},
                "metadata": {"type": "text", "index": False},
            }
        },
    }

    print(f"Creating index '{INDEX_NAME}'...")
    resp = client.indices.create(index=INDEX_NAME, body=index_body)
    print(f"Index created: {resp}")


if __name__ == "__main__":
    wait_for_collection()
    create_index()

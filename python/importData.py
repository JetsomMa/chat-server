from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.http.models import PointStruct
import os
import tqdm
import openai
import json
import time

# collection_name = "pinefield_data_collection_webos"

collection_name = "pinefield_data_collection_test2"

def to_embeddings(prompt):
    # 休眠1秒
    time.sleep(1)
    sentence_embeddings = openai.Embedding.create(
        model="text-embedding-ada-002",
        input=prompt
    )
    return sentence_embeddings["data"][0]["embedding"]


if __name__ == '__main__':
    client = QdrantClient("118.195.236.91", port=6333)
    openai.api_key = os.getenv("OPENAI_API_KEY")
    # 创建collection
    client.recreate_collection(
        collection_name,
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    )

    count = 0
    for root, dirs, files in os.walk("./dataset"):
        for file in files:
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                train_data_org = json.load(f)
                for item in tqdm.tqdm(train_data_org):
                    vector = to_embeddings(item['prompt'])
                    payload={"title": item['prompt'], "text": item['completion']}
                    # print(payload)
                    client.upsert(
                        collection_name,
                        wait=True,
                        points=[
                            PointStruct(id=count, vector=vector, payload=payload),
                        ],
                    )
                    count += 1

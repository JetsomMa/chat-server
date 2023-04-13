from flask import Flask
from flask import render_template
from flask import request
from qdrant_client import QdrantClient
import openai
import os
import json

app = Flask(__name__)

collection_name = "pinefield_data_collection_test2"
def query(text):
    """
    执行逻辑：
    首先使用openai的Embedding API将输入的文本转换为向量
    然后使用Qdrant的search API进行搜索，搜索结果中包含了向量和payload
    """
    print("----- query start -----")

    client = QdrantClient("118.195.236.91", port=6333)
    openai.api_key = os.getenv("OPENAI_API_KEY")
    sentence_embeddings = openai.Embedding.create(
        model="text-embedding-ada-002",
        input=text
    )
    """
    搜索前六个相关摘要
    """
    search_result = client.search(
        collection_name=collection_name,
        query_vector=sentence_embeddings["data"][0]["embedding"],
        limit=5,
        search_params={"exact": False, "hnsw_ef": 512}
    )
    
    """
    因为提示词的长度有限，每个匹配的相关摘要我在这里只取了前300个字符，如果想要更多的相关摘要，可以把这里的300改为更大的值
    """
    resultArray = []
    resultKeyArray = []
    for result in search_result:
        if result.score > 0.8:
            # # 将 JSON 字符串转换为 Python 对象
            jsonObj = json.loads(result.payload["text"])
            print(jsonObj)
            if jsonObj['type'] in resultKeyArray:
                continue
            else:
                resultKeyArray.append(jsonObj['type'])
                resultArray.append({ 'score': result.score, 'payload': result.payload })
                
    print("----- query end -----")
    return {
        "answer": len(resultArray),
        "resultArray": resultArray
    }

@app.route('/')
def hello_world():
    return render_template('index.html')


@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    search = data['search']

    res = query(search)

    return {
        "code": 200,
        "data": {
            "search": search,
            **res
        },
    }


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3003)

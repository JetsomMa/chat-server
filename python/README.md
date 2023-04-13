## 关于Qdrant向量数据库
你可以查看Qdrant的官方文档：https://qdrant.tech/documentation/
使用docker启动Qdrant

`docker run -p 6333:6333 \
-v $(pwd)/qdrant_storage:/qdrant/storage \
qdrant/qdrant
`

## 具体操作流程
### 进入到python文件夹
`cd python`

### 设置OPENAI_API_KEY
`export OPENAI_API_KEY=sk-xxxxxx`


### 安装依赖
`pip install -r requirements.txt`
**如果安装不成功，可以使用豆瓣镜像加速**
`python -m pip install -r requirements.txt -i http://pypi.douban.com/simple/ --trusted-host pypi.douban.com`


### 数据集入库[importData.py] 
`python import_data.py`


### 启动查询服务[server.py] 
`python server.py`

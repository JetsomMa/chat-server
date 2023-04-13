import axios from 'axios';

class QdrantClient {
  private readonly qdrantHost: string;
  private readonly collectionName: string;

  constructor(qdrantHost: string, collectionName: string) {
    this.qdrantHost = qdrantHost;
    this.collectionName = collectionName;
  }

  async createCollection(vectorSize: number, distance: string): Promise<void> {
    const response = await axios.post(`${this.qdrantHost}/collections`, {
      create_collection: {
        name: this.collectionName,
        vector_size: vectorSize,
        distance: distance,
        hnsw_config: {
          m: 16,
          ef_construct: 200,
        },
      },
    });
    console.log('创建集合：', response.data);
  }

  async insertData(vectors: { id: number; vector: number[] }[]): Promise<void> {
    const response = await axios.put(`${this.qdrantHost}/collections/${this.collectionName}/points`, {
      upsert_points: {
        points: vectors.map((vector) => ({
          id: vector.id,
          payload: {},
          vector: vector.vector,
        })),
      },
    });
    console.log('插入数据：', response.data);
  }

  async searchData(vector: number[], limit: number = 6): Promise<[]> {
    const response = await axios.post(`${this.qdrantHost}/collections/${this.collectionName}/points/search`, {
      limit,
      vector,
      with_payload: true,
      params: {"exact": false, "hnsw_ef": 512}
    });

    let result = response.data.result || [];

    return result
  }
}

export default QdrantClient;

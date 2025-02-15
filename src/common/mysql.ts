import { RDSClient } from 'ali-rds'

export interface ConversationRecord {
    prompt: string
    conversation: string
    conversationId: string
    username: string
    datetime: string
    usage?: string
    finish_reason?: string
}

export class MysqlDB {
    MysqlDB: RDSClient | undefined

    constructor() {
        if (process.env.DATASET_MYSQL_USER) {
            this.MysqlDB = new RDSClient({
                host: process.env.MYSQL_HOST,
                port: process.env.MYSQL_PORT,
                user: process.env.DATASET_MYSQL_USER,
                password: process.env.DATASET_MYSQL_PASSWORD,
                database: process.env.DATASET_MYSQL_DATABASE,
            })
        }
    }

    async saveConversation(conversation: ConversationRecord) {
        if (this.MysqlDB) {
            await this.MysqlDB.insert('conversation', conversation)
        }
    }

    disconnect() {
        if (this.MysqlDB) {
            this.MysqlDB.end()
        }
    }
}
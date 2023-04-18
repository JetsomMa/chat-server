const dotenv = require('dotenv') 
import express, { Request } from "express";
const cors = require('cors')
const path = require('path');

import { MysqlDB } from "./common/mysql"
import type { ConversationRecord } from "./common/mysql"
import { dateFormat } from "./common/datetime"
import type { Response } from "./common/openai"
import { OpenAI } from "./common/openai"

// 初始化环境变量
// 根据NODE_ENV环境变量加载相应的.env文件
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: envFile });

// 初始化数据库
const openAIApi = new OpenAI()

// 定义express应用
const port = 3000
const app = express()
const optionsJson = { extended: true, limit: '10mb' }
app.use(express.json(optionsJson)) // 请求体参数是json结构: {name: tom, pwd: 123}
app.use(cors())

app.post('/api/createChatCompletion', async (req: Request, res: any) => {
  const mysqlDB = new MysqlDB()

  console.log('----------------------------------------------------------')
  console.log('req.body -> ', req.body)
  let { prompt, conversationId, userName } = req.body
  let response: Response = {
    prompt,
    conversationId: conversationId || '',
    contents: []
  }

  try {
    if (prompt.includes('重置会话')) {
      openAIApi.resetConversation(response.conversationId)

      response.contents.push({ 
        prompt,
        text: '会话已重置'
      })  
      response.conversationId = ''

      console.log('response', response)
      res.status(200).json(response)
      return
    }

    response = await openAIApi.generateCommand(response)
    
    const conversationDB: ConversationRecord = { 
      prompt, 
      conversation: JSON.stringify(response.contents), 
      conversationId: response.conversationId, 
      username: userName, 
      datetime: dateFormat(new Date()), 
      // usage: JSON.stringify(result.data.usage), 
      // finish_reason 
    }

    console.log('response ->', response)
    res.status(200).json(response)
    try {
      mysqlDB.saveConversation(conversationDB)
    } catch (error) {
      mysqlDB.disconnect()
    }
  } catch (error: any) {
    console.error(error)

    const conversationDB: ConversationRecord = { 
      prompt, 
      conversation: JSON.stringify(error), 
      conversationId: response.conversationId, 
      username: userName, 
      datetime: dateFormat(new Date())
    }

    res.status(500).json({ error: 'An error occurred while processing the request.', message: error.message })
    try {
      mysqlDB.saveConversation(conversationDB)
    } catch (error) {
      mysqlDB.disconnect()
    }
  }
})

app.get('/', async (req, res) => {
  // 返回HTML页面
  res.sendFile(path.join(__dirname, 'index.html'));
})

app.listen(port, () => {
  console.log('Server running at http://localhost:%d', port)
})

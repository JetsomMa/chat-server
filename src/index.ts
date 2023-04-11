const dotenv = require('dotenv') 
const express = require('express')
const cors = require('cors')
const path = require('path');

import { MysqlDB } from "./common/mysql"
import type { ConversationRecord } from "./common/mysql"
import { dateFormat } from "./common/datetime"
import type { Response } from "./common/openai"
import { OpenAI } from "./common/openai"

// 初始化环境变量
dotenv.config()

// 初始化数据库
const mysqlDB = new MysqlDB()
const openAIApi = new OpenAI()

// 定义express应用
const port = 3000
const app = express()
const optionsJson = { extended: true, limit: '10mb' }
app.use(express.json(optionsJson)) // 请求体参数是json结构: {name: tom, pwd: 123}
app.use(cors())

app.post('/api/createChatCompletion', async (req, res) => {
  try {
    console.log('req.body -> ', req.body)
    let { prompt, conversationId, userName } = req.body
    let response: Response = {
      prompt,
      conversationId,
      contents: []
    }

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
      datetime: dateFormat(new Date().getTime()), 
      // usage: JSON.stringify(result.data.usage), 
      // finish_reason 
    }
    mysqlDB.saveConversation(conversationDB)

    // console.log('response', response)
    res.status(200).json(response)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'An error occurred while processing the request.', message: error.message })
  }
})

app.get('/', async (req, res) => {
  // 返回HTML页面
  res.sendFile(path.join(__dirname, 'index.html'));
})

app.listen(port, () => {
  console.log('Server running at http://localhost:%d', port)
})

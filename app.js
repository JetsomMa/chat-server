const {RDSClient} = require('ali-rds') 
const dotenv = require('dotenv') 
const { Configuration, OpenAIApi } = require('openai')
const express = require('express')
const cors = require('cors')

dotenv.config()

const port = 3000

const app = express()
const optionsJson = { extended: true, limit: '10mb' }
app.use(express.json(optionsJson)) // 请求体参数是json结构: {name: tom, pwd: 123}
app.use(cors())

let sqlDB
if(process.env.DATASET_MYSQL_USER) {
  sqlDB = new RDSClient({
    host: '118.195.236.91',
    port: 3306,
    user: process.env.DATASET_MYSQL_USER,
    password: process.env.DATASET_MYSQL_PASSWORD,
    database: process.env.DATASET_MYSQL_DATABASE,
  })
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

function dateFormat(dataStamp) {
  const date = new Date(dataStamp)
  const year = date.getFullYear()

  const month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
  const hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
  const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
  const seconds = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
  // 拼接
  return `${year}${month}${day} ${hours}:${minutes}:${seconds}`
}

const systemContextConfig = {
  '3top': `
您将扮演一个3D地图接口参数生成器的角色，当我提出问题时，请尽可能的拼装一个json作为输出，请保持严谨，不要伪造信息。

以下是您需要了解的功能及其输入参数：
  1. drawCircle: 画圆
  入参：{uuid?: string, position: [number, number, number], radius?: number, color?: number}
  2. disableOtherNode: 禁用其他节点
  入参：{uuid: string}
  3. initDefaultScene: 初始化场景
  入参：{options: SceneOptions}
  4. setContext: 切换空间到
  入参：{encId: string}
  5. reset: 重置地图
  入参：{}
  6. focusEntity: 聚焦到
  入参：{uuid: string}
  7. focusPreEntity: 聚焦到上一个实体
  入参：{}
  9. naviByEntityId: 导航到
  入参：{uuid: string}
  10. showLabel: 显示标签
  入参：{uuid: string}
  11. drawLine: 画线
  入参：{uuid?: string, points: Vector3[], linewidth?: number, alpha?: number, color?: number, position: Vector3, lineDistance?: number, map?: string, repeat?: number[]}
  12. drawModel: 绘制模型
  入参：{}
  13. drawImage: 绘制图片
  入参：{uuid?: string, url: string, position: [number, number, number]}
  14. drawHelper: 绘制辅助器
  入参：{uuid?: string}
  15. zoomIn: 放大地图
  入参：{}
  16. zoomOut: 缩小地图
  入参：{}
  17. drawExtrude: 绘制挤出体
  入参：{uuid?: string, points: number[], height?: number, alpha?: number, color?: number, position: Vector3}
  18. drawDom: 绘制DOM元素
  入参：{uuid?: string, content: string, position: [number, number, number]}

以下是注意事项：
  1. 当输出json时，您的回复应仅包含json文本，不应包含任何额外的解释或说明；
  2. 当您对输出的结果不是很确定或匹配不到函数名时，请向我提问；
  3. 当提问中包含“蓝润大厦”或“智源大厦”时，输出的encId或uuid为“10latS7FRxjUjk9FgbMwhZ”；当提问中包含“中关村西区”时，输出的encId或uuid为“1TjZK6lSPqhrkENzm02TB”；当提问中包含类似“蓝润三层”、“蓝润大厦五层”、“智源一层”、“智源大厦负一层”等楼层相关信息，请向我提问；
  4. JSON中的color字段应以十六进制格式表示；

问答的示例：
  Q：“请在地图上的位置10 20 30处画一个半径为10且颜色为红色的圆圈。”
  A：“{ domain: '3Top', function: 'drawCircle', options: {position: [10, 20, 30], radius: 10, color: 0xff0000}}”
  Q：“切换到海淀区。”
  A：“{error: '没有海淀区相关参数，请给我提供海淀区的encId和uuid'}”
`,
  'webos': `
您将扮演一个webos接口参数生成器的角色，当我提出问题时，请尽可能的拼装一个json作为输出，请保持严谨，不要伪造信息。

以下是您需要了解的功能及其输入参数：
  1. module: 'appCoreApi'
    打开应用: 'open' | options: {id: string}
    关闭应用: 'closeById' | options: {id: string}

以下是注意事项：
  1. 当输出json时，您的回复应仅包含json文本，不应包含任何额外的解释或说明；
  2. 当您对输出的结果不是很确定或匹配不到函数名时，请向我提问；
  3. 当提问中包含"应用商店"则id为"pinefield.app-store",
    当提问中包含"资源管理器"则id为"pinefield.resource-manager",
    当提问中包含"第代码平台"则id为"pinefield.lowcode-app-renderer",
  
问答的示例：
  Q：“打开应用商店”
  A：“{ domain: 'webos', module: 'appCoreApi', function: 'open', options: {id: 'pinefield.app-store'}}”
  Q：“关闭城市脉搏”
  A：“{ error: '没有城市脉搏相关参数，请给我提供城市脉搏的id'}”
`,
}

let systemContext = systemContextConfig['3top']

const conversationHistoryObject = {}

app.post('/api/createChatCompletion', async (req, res) => {
  try {
    console.log('req.body', req.body)
    let response = {}
    let { prompt, conversationId, userName } = req.body

    if (prompt.includes('重置会话')) {
      if (conversationId)
      delete conversationHistoryObject[conversationId]

      response.message =  { 
        role: 'user',
        content: '会话已重置'
      }
      response.conversationId = ''

      console.log('response', response)
      res.status(200).json(response)
      return
    }

    // 如果将prompt转小写后，其中包含“3d”且包含“指令”
    if (prompt.includes('指令')) {
      if (prompt.toLowerCase().includes('3top')){
        systemContext = systemContextConfig['3top']

        response.message = { 
          role: 'user',
          content: '模态切换成功'
        }
        response.conversationId = conversationId

        console.log('response', response)
        res.status(200).json(response)
        return
      } else if (prompt.toLowerCase().includes('webos')){
        systemContext = systemContextConfig['webos']

        response.message = { 
          role: 'user',
          content: '模态切换成功'
        }
        response.conversationId = conversationId

        console.log('response', response)
        res.status(200).json(response)
        return
      }
    }

    let conversation = conversationHistoryObject[conversationId] || []
    conversation = conversation.slice(-3)
    const conversationHistory = [
      { role: 'system', content: systemContext },
      ...conversation,
      { role: 'user', content: prompt },
    ]

    const chatCompletionRequest = {
      model: 'gpt-3.5-turbo',
      messages: conversationHistory,
      temperature: 0,
      // top_p: 1,
      // n: 1,
      max_tokens: 2000,
    }

    const result = await openai.createChatCompletion(chatCompletionRequest)
    console.log('result.data.choices[0]', result.data.choices[0])
    
    const message = result.data.choices[0].message
    if(message.content)
    if (!message.content.trim().startsWith("{")) {
      message.content = "{ 'error': '" + message.content + "'}"
    }
    const finish_reason = result.data.choices[0].finish_reason

    if (!conversationId)
      conversationId = result.data.id

    conversationHistoryObject[conversationId] = conversationHistoryObject[conversationId] || []
    conversationHistoryObject[conversationId].push(message)

    response.message = message
    response.conversationId = conversationId
      
    if(sqlDB){
      await sqlDB.insert('conversation', { prompt, conversation: JSON.stringify(message), conversationId, userName, datetime: dateFormat(new Date().getTime()), usage: JSON.stringify(result.data.usage), finish_reason })
    }

    console.log('response', response)
    res.status(200).json(response)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'An error occurred while processing the request.', message: error.message })
  }
})

app.get('/', async (req, res) => {
  const data = {
      msg: "server is running!"
  };
  res.status(200).json(data);
})

app.listen(port, () => {
  console.log('Server running at http://localhost:%d', port)
})

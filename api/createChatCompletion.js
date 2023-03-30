import { RDSClient } from 'ali-rds'
import * as dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'

dotenv.config()

export const sqlDB = new RDSClient({
  host: '118.195.236.91',
  port: 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
})

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
  3. initDefaultScene: 初始化默认场景
  入参：{options: SceneOptions}
  4. setContext: 空间切换
  入参：{encId: string}
  5. reset: 重置
  入参：{}
  6. focusEntity: 聚焦实体
  入参：{uuid: string}
  7. focusPreEntity: 聚焦上一个实体
  入参：{}
  8. disableOtherNode: 禁用其他节点
  入参：{uuid: string}
  9. naviByEntityId: 根据实体ID导航
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
  2. 当您对输出的结果不是很确定或匹配不到函数名时，请返回“{error: ” + 返回的内容 + ”}“的格式来向我提问；
  3. 当提问中包含“蓝润大厦”或“智源大厦”时，输出的encId或uuid为“10latS7FRxjUjk9FgbMwhZ”；当提问中包含“中关村西区”时，输出的encId或uuid为“1TjZK6lSPqhrkENzm02TB”；当提问中包含类似“蓝润三层”、“蓝润大厦五层”、“智源一层”、“智源大厦负一层”等楼层相关信息，请返回“{error: ” + 返回的内容 + ”}“的格式来向我提问；
  4. JSON中的color字段应以十六进制格式表示；

问答的示例：
  Q：“请在地图上的位置10 20 30处画一个半径为10且颜色为红色的圆圈。”
  A：“{ domain: '3Top', function: 'drawCircle', options: {position: [10, 20, 30], radius: 10, color: 0xff0000}}”
  Q：“切换到海淀区。”
  A：“{error: '没有海淀区相关参数，请给我提供海淀区的encId和uuid'}”
`,
  'webos': `
我想让您作为一个3D地图接口调用参数生成器，可以推测，但是请不要伪造信息，当我提出问题时，您需要拼装一个json作为输出。1. 当输出json时，您的回复应仅包含json文本，不应包含任何额外的解释或说明；2. 当对输出的内容不确定时，请您向我提问；
我向您提问的示例：
Q:  “打开资源管理器”
A:  “{ domain: 'webos', function: 'openApp', options: {appName: '资源管理器'}}”
  `,
}

let systemContext = systemContextConfig['3top']

const conversationHistoryObject = {}

module.exports = async (req, res) => {
  try {
    let { prompt, conversationId, userName } = req.body

    if (prompt.includes('重置会话')) {
      if (conversationId)
        delete conversationHistoryObject[conversationId]

      res.status(200).json({
        message: '会话已重置',
        conversationId: '',
      })
      return
    }

    // 如果将prompt转小写后，其中包含“3d”且包含“指令”
    if (prompt.includes('指令')) {
      if (prompt.toLowerCase().includes('3d'))
        systemContext = systemContextConfig['3top']
      else if (prompt.toLowerCase().includes('webos'))
        systemContext = systemContextConfig.webos
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
      top_p: 1,
      n: 1,
      max_tokens: 2000,
    }

    const result = await openai.createChatCompletion(chatCompletionRequest)
    console.log('result.data', result.data)

    const message = result.data.choices[0].message
    const finish_reason = result.data.choices[0].finish_reason

    if (!conversationId)
      conversationId = result.data.id

    conversationHistoryObject[conversationId] = conversationHistoryObject[conversationId] || []
    conversationHistoryObject[conversationId].push(message)

    const response = {
      message,
      conversationId,
    }

    await sqlDB.insert('conversation', { prompt, conversation: JSON.stringify(message), conversationId, userName, datetime: dateFormat(new Date().getTime()), usage: JSON.stringify(result.data.usage), finish_reason })

    res.status(200).json(response)
  }
  catch (error) {
    console.error(error)
    res.status(500).json({ error: 'An error occurred while processing the request.', message: error.message })
  }
}

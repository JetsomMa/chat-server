import { Configuration, OpenAIApi } from "openai"
import type { CreateChatCompletionRequest, ChatCompletionRequestMessage } from "openai"
import { systemContexts } from './system-contexts'
import QdrantClient from './qdrant-client'

type Domain = '3top' | 'system' | 'default' | 'splitsteps'
export interface Content {
    prompt?: string
    domain?: Domain
    method?: string
    params?: any[]
    text?: string
}

export interface Response {
    text?: string
    prompt: string
    conversationId: string
    type?: 'cmd' | 'cmdshow' | 'text' | 'markdown',
    contents: Content[]
}

interface ConversationHistoryObject {
    [key: string]: ChatCompletionRequestMessage[]
}

export class OpenAI {
    openai: OpenAIApi | undefined
    conversationHistoryObject: ConversationHistoryObject = {}
    chatCompletionRequest: CreateChatCompletionRequest
    currentDemo: Domain = 'default'
    qdrantClient: QdrantClient | undefined

    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        })
        
        this.openai = new OpenAIApi(configuration, process.env.OPENAI_PROXY || undefined)

        this.chatCompletionRequest = {
            model: 'gpt-3.5-turbo',
            messages: [],
            temperature: 0,
            max_tokens: 2000,
        }

        this.qdrantClient = new QdrantClient(`http://${process.env.QDRANT_HOST}:${process.env.QDRANT_PORT}`, process.env.COLLECTION_NAME || '')
    }

    // 重置会话
    resetConversation(conversationId: string) {
        if (conversationId)
            delete this.conversationHistoryObject[conversationId]
    }

    async embeddings(prompt: string): Promise<number[]> {
        if (!this.openai) {
            return []
        }

        const result = await this.openai.createEmbedding({ model: "text-embedding-ada-002", input: prompt })
        return result.data.data[0].embedding
    }

    // 指令生成调用总入口
    async generateCommand(response: Response): Promise<Response> {
        try {
            // 进行指令拆解
            let splitResult = await this.splitCommand(response)

            let contents: Content[] = []
            if (splitResult) {
                // 指令拆解后，如果是文本，则直接返回
                if (splitResult.text) {
                    response.type = 'text'
                    response.contents = [splitResult]

                    return response
                }

                if (splitResult.contents && splitResult.contents.length > 0) {
                    for (let commandPrompt of splitResult.contents) {
                        commandPrompt.domain = commandPrompt.domain || 'default'
                        if (commandPrompt.domain === 'default') {
                            commandPrompt.domain = this.currentDemo
                        }

                        if (commandPrompt.prompt) {
                            let content = await this.convertCommand(response.conversationId, commandPrompt.prompt, commandPrompt.domain)
                            if (content) {
                                if (content.text) {
                                    response.type = 'text'
                                    response.contents = [content]
                                    this.conversationHistoryObject[response.conversationId] = this.conversationHistoryObject[response.conversationId] || []
                                    this.conversationHistoryObject[response.conversationId].push({
                                        role: 'user',
                                        content: response.prompt
                                    })
                                    this.conversationHistoryObject[response.conversationId].push({
                                        role: 'assistant',
                                        content: JSON.stringify(content)
                                    })
                                    this.currentDemo = commandPrompt.domain || ''
                                    return response
                                } else {
                                    contents.push(content)
                                    this.conversationHistoryObject[response.conversationId] = []
                                    this.currentDemo = 'default'
                                }
                            }
                        }
                    }

                    response.type = splitResult.type
                }
            }
            response.contents = contents

            if (response.type === 'markdown') {
                let content: Content = {
                    text: '```\n' + JSON.stringify(response.contents) + '\n```'
                }
                response.contents = [content]
            }

            return response
        } catch (error: any) {
            console.error("------------error------------")
            console.error(error)
            response.type = 'text'
            response.contents = [{ text: '指令生成失败: ' + error.message }]
            return response
        }
    }

    // 指令拆分
    async splitCommand(response: Response): Promise<Response | undefined> {
        this.chatCompletionRequest.messages = [
            { role: 'system', content: systemContexts['splitsteps'] },
            { role: 'user', content: response.prompt },
        ]

        if (!this.openai) {
            let result: Response = {
                type: 'text',
                contents: [{
                    text: 'OpenAI API Key 未配置'
                }],
                prompt: response.prompt,
                conversationId: response.conversationId,
            }

            return result
        }

        const result = await this.openai.createChatCompletion(this.chatCompletionRequest)
        const message = result.data.choices[0].message || { content: '' }

        message.content = message.content.replace('A:', '').trim()

        if (!response.conversationId)
            response.conversationId = result.data.id

        let retJson = this.extractJsonFromString(message.content)

        console.error("splitCommand-> ", retJson)

        return retJson
    }

    // 指令转换
    async convertCommand(conversationId: string, prompt: string, domain: Domain): Promise<Content | undefined> {
        let extendData: [] = (await this.qdrantClient?.searchData(await this.embeddings(prompt)) ?? [])

        let typeArray: string[] = []
        let systemTextExtend: string = ''
        extendData = extendData || []
        if (extendData.length > 0) {
            let indexText = 0
            extendData.forEach((item: any, index: number) => {
                let text = JSON.parse(item.payload.text)
                let type = text.type
                delete text.type
                if (item.score > 0.85 && !typeArray.includes(type)) {
                    for(let key in text) {
                        indexText = indexText + 1
                        systemTextExtend += indexText + '. ' + item.payload.title + '的' + key + '为' + text[key] + ', '
                    }
                    typeArray.push(type)
                }
            })
        }

        if (systemTextExtend) {
            systemTextExtend = '参数信息: ' + systemTextExtend.replace(/,(?=\s*$)/, '') + '; '
        }

        let systemText = systemContexts[domain] || ''

        console.error("prompt ->", systemTextExtend + '我的提问: ' + prompt)

        let conversation = this.conversationHistoryObject[conversationId] || []
        conversation = conversation.slice(-4)
        this.chatCompletionRequest.messages = [
            { role: 'system', content: systemText },
            ...conversation,
            { role: 'user', content: systemTextExtend + ' 我的提问: ' + prompt },
        ]

        if (!this.openai) {
            let result: Content = {
                text: 'OpenAI API Key 未配置'
            }

            return result
        }

        const result = await this.openai.createChatCompletion(this.chatCompletionRequest)

        const message = result.data.choices[0].message || { content: '' }
        message.content = message.content.replace('A:', '').trim()

        let retJson = this.extractJsonFromString(message.content)
        retJson.prompt = prompt
        return retJson
    }
    extractJsonFromString(text: string) {
        // 查找字符串中的第一个{和最后一个}
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');

        // 如果找到了{和}，则尝试创建JSON对象
        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
            const jsonString = text.slice(startIndex, endIndex + 1);
            try {
                const jsonObject = JSON.parse(jsonString);
                return jsonObject;
            } catch (error) {
                console.error("无法解析JSON字符串:", error);
                return { text: "指令集转换失败，信息不明确" };
            }
        }

        // 如果没有找到{和}，或无法创建JSON对象，则返回{"text": text}这样的JSON对象
        return { text: text };
    }
}
import { Configuration, OpenAIApi } from "openai"
import type { CreateChatCompletionRequest, ChatCompletionRequestMessage } from "openai"
import { systemContexts } from './system-contexts'

export interface Content {
    prompt?: string
    domain?: string
    method?: string
    params?: any[]
    text?: string
}

export interface Response {
    prompt?: string
    conversationId?: string | undefined
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
    currentDemo: string

    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        })
        this.openai = new OpenAIApi(configuration)

        this.chatCompletionRequest = {
            model: 'gpt-3.5-turbo',
            messages: [],
            temperature: 0,
            max_tokens: 2000,
        }
    }

    // 重置会话
    resetConversation(conversationId: string) {
        if (conversationId)
            delete this.conversationHistoryObject[conversationId]
    }

    // 指令生成调用总入口
    async generateCommand(response): Promise<Response> {
        try {
            // 进行指令拆解
            let splitResult: Response = await this.splitCommand(response) as Response

            let contents: Content[] = []
            try {
                for (let commandPrompt of splitResult.contents) {
                    
                    if(commandPrompt.domain === 'default' && this.currentDemo) {
                        commandPrompt.domain = this.currentDemo
                    }
    
                    let content = await this.convertCommand({ conversationId: response.conversationId, prompt: commandPrompt.prompt }, commandPrompt.domain) as Content
                    if(content.text) {
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
                        this.currentDemo = commandPrompt.domain
                        return response
                    } else {
                        contents.push(content)
                        this.conversationHistoryObject[response.conversationId] = []
                        this.currentDemo = ''
                    }
                }
            } catch (error) {
                console.error("------------splitResult-error-----------")
                console.error(error)
                console.error(splitResult)
                console.error("------------splitResult-error-end----------")
            }

            response.type = splitResult.type
            response.contents = contents

            if(response.type === 'markdown'){
                let content: Content = {
                    // prompt: response.prompt,
                    text: '```\n' + JSON.stringify(response.contents) + '\n```'
                }
                // let content = await this.convertCommand({ conversationId: response.conversationId, prompt: '以markdown格式展示下面内容\n\n' + JSON.stringify(response.contents) }, '') as Response
                response.contents = [content]
            }

            console.error("response -> ", response)

            return response
        } catch (error) {
            console.error("------------error------------")
            console.error(error)
        }
    }

    // 指令拆分
    async splitCommand(response): Promise<Content | Response> {
        this.chatCompletionRequest.messages = [
            { role: 'system', content: systemContexts['splitsteps'] },
            { role: 'user', content: response.prompt },
        ]
            
        const result = await this.openai.createChatCompletion(this.chatCompletionRequest)
        const message = result.data.choices[0].message

        message.content = message.content.replace('A:', '').trim()
        console.error("splitCommand-content-> ", message.content)

        // if (message.content)
        //     if (!message.content.startsWith("{")) {
        //         message.content = '{ "text": "' + message.content + '"}';
        //     }

        if (!response.conversationId)
            response.conversationId = result.data.id

        try {
            let result = JSON.parse(message.content)
            return result
        } catch (error) {
            console.error('splitCommand-error', error)
            console.error('splitCommand-message -> ', message)
            return {}
        }
    }

      // 指令转换
      async convertCommand(response, domain): Promise<Content | Response> {
        let conversation = this.conversationHistoryObject[response.conversationId] || []
        conversation = conversation.slice(-4)
        this.chatCompletionRequest.messages = [
            { role: 'system', content: (systemContexts[(domain || 'default')] || '') },
            ...conversation,
            { role: 'user', content: response.prompt },
        ]

        console.log("this.chatCompletionRequest.messages -> ", this.chatCompletionRequest.messages)

        const result = await this.openai.createChatCompletion(this.chatCompletionRequest)
        // retObject.finish_reason = result.data.choices[0].finish_reason

        const message = result.data.choices[0].message
        message.content = message.content.replace('A:', '').trim()
        if (message.content)
            if (!message.content.startsWith("{")) {
                console.error("不是json -> ", message.content)
                message.content = '{ "text": "' + message.content + '"}';
            }

        if (!response.conversationId)
            response.conversationId = result.data.id

        console.error("convertCommand-content-> ", message.content)
        try {
            let result = JSON.parse(message.content)
            return result
        } catch (error) {
            console.error('error', error)
            console.error('message -> ', message)
            return {}
        }
    }
}
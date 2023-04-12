import { Configuration, OpenAIApi } from "openai"
import type { CreateChatCompletionRequest, ChatCompletionRequestMessage } from "openai"
import { systemContexts } from './system-contexts'

type Domain = '3top'|'webos'|'default'|'splitsteps'
export interface Content {
    prompt?: string
    domain?: Domain
    method?: string
    params?: any[]
    text?: string
}

export interface Response {
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

    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        })
        // this.openai = new OpenAIApi(configuration, 'https://gpt.io404.net/v1')
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
    async generateCommand(response: Response): Promise<Response> {
        try {
            // 进行指令拆解
            let splitResult = await this.splitCommand(response)

            let contents: Content[] = []
            if(splitResult && splitResult.contents && splitResult.contents.length > 0) {
                try {
                    for (let commandPrompt of splitResult.contents) {
                        commandPrompt.domain = commandPrompt.domain || 'default'
                        if(commandPrompt.domain === 'default') {
                            commandPrompt.domain = this.currentDemo
                        }
        
                        if(commandPrompt.prompt) {
                            let content = await this.convertCommand(response.conversationId, commandPrompt.prompt , commandPrompt.domain)
                            if(content) {
                                if(content.text){
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
                } catch (error) {
                    console.error("------------splitResult-error-----------")
                    console.error(error)
                    console.error(splitResult)
                    console.error("------------splitResult-error-end----------")
                }

                response.type = splitResult.type
            }
            response.contents = contents

            if(response.type === 'markdown'){
                let content: Content = {
                    text: '```\n' + JSON.stringify(response.contents) + '\n```'
                }
                response.contents = [content]
            }

            console.error("response -> ", response)

            return response
        } catch (error) {
            console.error("------------error------------")
            console.error(error)
            return response
        }
    }

    // 指令拆分
    async splitCommand(response: Response): Promise<Response|undefined> {
        this.chatCompletionRequest.messages = [
            { role: 'system', content: systemContexts['splitsteps'] },
            { role: 'user', content: response.prompt },
        ]

        if(!this.openai){
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
        const message = result.data.choices[0].message || { content: ''}

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
        }
    }

    // 指令转换
    async convertCommand(conversationId: string, prompt: string, domain: Domain): Promise<Content|undefined> {
        let conversation = this.conversationHistoryObject[conversationId] || []
        conversation = conversation.slice(-4)
        this.chatCompletionRequest.messages = [
            { role: 'system', content: (systemContexts[domain] || '') },
            ...conversation,
            { role: 'user', content: prompt },
        ]

        if(!this.openai){
            let result: Content = {
                text: 'OpenAI API Key 未配置'
            }

            return result
        }

        const result = await this.openai.createChatCompletion(this.chatCompletionRequest)
        
        const message = result.data.choices[0].message || { content: ''}
        message.content = message.content.replace('A:', '').trim()
        if (message.content)
            if (!message.content.startsWith("{")) {
                console.error("不是json -> ", message.content)
                message.content = '{ "text": "' + message.content + '"}';
            }

        try {
            let result = JSON.parse(message.content)
            return result
        } catch (error) {
            console.error('error', error)
            console.error('message -> ', message)
        }
    }
}
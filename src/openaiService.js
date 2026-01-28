const axios = require('axios');
const { logger } = require('./logger');

/**
 * OpenAI API 服务
 * 用于转接 OpenAI API 调用，支持 GPT 系列模型
 */
class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
        this.model = process.env.OPENAI_MODEL || 'gpt-5-nano';
        // 默认超时时间为300秒（5分钟）
        this.timeout = parseInt(process.env.OPENAI_TIMEOUT || '300000', 10);
        // 对于 gpt-5 推理模型，需要更大的 token 限制（reasoning tokens + output tokens）
        this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '16384', 10);
    }

    /**
     * 设置 API Key
     * @param {string} apiKey - OpenAI API Key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * 设置 API URL
     * @param {string} apiUrl - OpenAI API URL
     */
    setApiUrl(apiUrl) {
        this.apiUrl = apiUrl;
    }

    /**
     * 验证配置是否完整
     * @returns {Object} 验证结果
     */
    validateConfig() {
        const result = {
            valid: true,
            errors: []
        };

        if (!this.apiKey) {
            result.valid = false;
            result.errors.push('OPENAI_API_KEY 未配置');
        }

        if (!this.apiUrl) {
            result.valid = false;
            result.errors.push('OPENAI_API_URL 未配置');
        }

        return result;
    }

    /**
     * 调用 OpenAI Chat Completions API
     * @param {Array} messages - 对话消息数组
     * @param {Object} options - 可选参数
     * @returns {Promise<Object>} 返回 API 响应
     */
    async chatCompletion(messages, options = {}) {
        try {
            if (!messages || messages.length === 0) {
                throw new Error('消息数组不能为空');
            }

            const {
                model = this.model,
                temperature = 1,
                maxTokens = this.maxTokens,
                stream = false,
                topP,
                frequencyPenalty,
                presencePenalty,
                stop
            } = options;

            logger.info(`[OpenAI] 开始调用 - 消息数量: ${messages.length}, 模型: ${model}, 流式: ${stream}`);

            // 构建请求数据
            const requestData = {
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: stream
            };

            // 添加可选参数
            if (topP !== undefined) requestData.top_p = topP;
            if (frequencyPenalty !== undefined) requestData.frequency_penalty = frequencyPenalty;
            if (presencePenalty !== undefined) requestData.presence_penalty = presencePenalty;
            if (stop !== undefined) requestData.stop = stop;

            const response = await axios.post(
                this.apiUrl,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: this.timeout,
                    responseType: stream ? 'stream' : 'json'
                }
            );

            if (stream) {
                // 流式响应直接返回 stream
                return response;
            } else {
                // 非流式响应验证格式
                if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                    throw new Error('OpenAI API 返回数据格式错误');
                }

                const content = response.data.choices[0].message.content;
                const usage = response.data.usage || {};

                logger.info(`[OpenAI] 调用成功 - 回复长度: ${content.length}`);
                logger.info(`[OpenAI] Token 使用 - prompt: ${usage.prompt_tokens || 0}, completion: ${usage.completion_tokens || 0}, total: ${usage.total_tokens || 0}`);

                return response.data;
            }

        } catch (error) {
            logger.error('[OpenAI] 调用失败:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * 处理错误
     * @param {Error} error - 原始错误对象
     * @returns {Error} 处理后的错误对象
     * @private
     */
    handleError(error) {
        // 处理 axios 错误
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (status === 401) {
                return new Error('OpenAI API Key 无效或权限不足');
            } else if (status === 429) {
                return new Error('OpenAI API 请求频率超限，请稍后重试');
            } else if (status === 500 || status === 502 || status === 503) {
                return new Error('OpenAI 服务器错误，请稍后重试');
            } else if (data && data.error && data.error.message) {
                return new Error(`OpenAI API 错误: ${data.error.message}`);
            }
        }

        // 处理超时错误
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return new Error('OpenAI API 请求超时，请稍后重试');
        }

        // 处理网络错误
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new Error('无法连接到 OpenAI API 服务器，请检查网络连接');
        }

        return error;
    }
}

module.exports = OpenAIService;

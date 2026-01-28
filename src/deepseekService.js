const axios = require('axios');
const { logger } = require('./logger');

/**
 * DeepSeek AI 服务
 * 用于文本改写和内容生成
 */
class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
        this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        // 默认超时时间改为300秒（5分钟），与nginx配置保持一致，避免大token请求被中断
        this.timeout = parseInt(process.env.DEEPSEEK_TIMEOUT || '300000', 10);
    }

    /**
     * 设置 API Key
     * @param {string} apiKey - DeepSeek API Key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
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
            result.errors.push('DEEPSEEK_API_KEY 未配置');
        }

        if (!this.apiUrl) {
            result.valid = false;
            result.errors.push('DEEPSEEK_API_URL 未配置');
        }

        return result;
    }

    /**
     * 根据素材和要求改写稿件
     * @param {string} originalText - 原始文本（OCR识别的文字）
     * @param {string} instruction - 用户的改写要求
     * @returns {Promise<string>} 返回改写后的文本
     */
    async rewriteArticle(originalText, instruction) {
        try {
            if (!originalText || !instruction) {
                throw new Error('原始文本和改写要求不能为空');
            }

            logger.info(`[DeepSeek] 开始改写稿件 - 原文长度: ${originalText.length}, 要求: ${instruction.substring(0, 50)}...`);

            // 构建提示词
            const systemPrompt = '你是一个专业的文案编辑和内容创作者，擅长根据素材和要求创作高质量的稿件。';
            const userPrompt = `请根据以下素材和要求，改写一篇稿件。

【素材内容】
${originalText}

【改写要求】
${instruction}

请直接输出改写后的稿件内容，不要添加任何解释或说明。`;

            // 调用 DeepSeek API
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: this.timeout
                }
            );

            if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                throw new Error('DeepSeek API 返回数据格式错误');
            }

            const rewrittenText = response.data.choices[0].message.content.trim();

            logger.info(`[DeepSeek] 稿件改写成功 - 改写后长度: ${rewrittenText.length}`);
            logger.info(`[DeepSeek] Token 使用 - prompt: ${response.data.usage?.prompt_tokens || 0}, completion: ${response.data.usage?.completion_tokens || 0}, total: ${response.data.usage?.total_tokens || 0}`);

            return rewrittenText;

        } catch (error) {
            logger.error('[DeepSeek] 改写稿件失败:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * 通用文本生成接口
     * @param {string} prompt - 提示词
     * @param {Object} options - 可选参数
     * @returns {Promise<string>} 返回生成的文本
     */
    async generateText(prompt, options = {}) {
        try {
            if (!prompt) {
                throw new Error('提示词不能为空');
            }

            logger.info(`[DeepSeek] 开始生成文本 - 提示词长度: ${prompt.length}`);

            const {
                systemPrompt = '你是一个专业的AI助手。',
                temperature = 0.7,
                maxTokens = 4000
            } = options;

            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: temperature,
                    max_tokens: maxTokens
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: this.timeout
                }
            );

            if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                throw new Error('DeepSeek API 返回数据格式错误');
            }

            const generatedText = response.data.choices[0].message.content.trim();

            logger.info(`[DeepSeek] 文本生成成功 - 生成长度: ${generatedText.length}`);

            return generatedText;

        } catch (error) {
            logger.error('[DeepSeek] 生成文本失败:', error.message);
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
                return new Error('DeepSeek API Key 无效或权限不足');
            } else if (status === 429) {
                return new Error('DeepSeek API 请求频率超限，请稍后重试');
            } else if (status === 500) {
                return new Error('DeepSeek 服务器错误，请稍后重试');
            } else if (data && data.error && data.error.message) {
                return new Error(`DeepSeek API 错误: ${data.error.message}`);
            }
        }

        // 处理超时错误
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return new Error('DeepSeek API 请求超时，请稍后重试');
        }

        // 处理网络错误
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new Error('无法连接到 DeepSeek API 服务器，请检查网络连接');
        }

        return error;
    }
}

module.exports = DeepSeekService;

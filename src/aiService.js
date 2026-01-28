const axios = require('axios');

/**
 * AI服务 - 支持元宝AI和OpenAI
 */
class AIService {
    constructor() {
        // AI提供商配置：yuanbao 或 openai
        this.provider = process.env.AI_PROVIDER || 'yuanbao';

        // 元宝AI配置
        this.yuanbaoApiUrl = 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions';
        this.assistantId = process.env.YUANBAO_ASSISTANT_ID || 'your_assistant_id_here';
        this.yuanbaoToken = process.env.YUANBAO_TOKEN || 'your_yuanbao_token_here';
        this.userId = process.env.YUANBAO_USER_ID || 'user_' + Date.now();

        // OpenAI配置
        this.openaiApiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
        this.openaiApiKey = process.env.OPENAI_API_KEY || '';
        this.openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    }

    /**
     * 生成公众号文章
     * @param {string} newsContent 新闻内容
     * @returns {Promise<string>} 生成的文章内容
     */
    async generateArticle(newsContent) {
        if (this.provider === 'openai') {
            return await this.generateArticleWithOpenAI(newsContent);
        } else {
            return await this.generateArticleWithYuanbao(newsContent);
        }
    }

    /**
     * 使用元宝AI生成文章
     */
    async generateArticleWithYuanbao(newsContent) {
        try {
            console.log('正在调用元宝AI生成文章...');

            const prompt = `请根据以下新闻内容，生成一篇适合微信公众号发布的文章。要求：
1. 标题要吸引人，简洁明了
2. 内容要有条理，分段清晰
3. 语言要生动有趣，适合大众阅读
4. 可以适当添加一些评论和观点
5. 文章结构要完整，包含开头、正文和结尾
6. 字数控制在800-1500字之间

新闻内容：
${newsContent}`;

            const requestData = {
                assistant_id: this.assistantId,
                user_id: this.userId,
                stream: false,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(this.yuanbaoApiUrl, requestData, {
                headers: {
                    'X-Source': 'openapi',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.yuanbaoToken}`
                },
                timeout: 60000
            });

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const article = response.data.choices[0].message.content;
                console.log('文章生成成功');
                return article;
            } else {
                throw new Error('AI返回数据格式错误');
            }
        } catch (error) {
            console.error('生成文章失败:', error.message);
            if (error.response) {
                console.error('API响应错误:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * 使用OpenAI生成文章
     */
    async generateArticleWithOpenAI(newsContent) {
        try {
            console.log('正在调用OpenAI生成文章...');

            const prompt = `请根据以下新闻内容，生成一篇适合微信公众号发布的文章。要求：
1. 标题要吸引人，简洁明了
2. 内容要有条理，分段清晰
3. 语言要生动有趣，适合大众阅读
4. 可以适当添加一些评论和观点
5. 文章结构要完整，包含开头、正文和结尾
6. 字数控制在800-1500字之间

新闻内容：
${newsContent}`;

            const requestData = {
                model: this.openaiModel,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            };

            const response = await axios.post(this.openaiApiUrl, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                timeout: 60000
            });

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const article = response.data.choices[0].message.content;
                console.log('文章生成成功');
                return article;
            } else {
                throw new Error('OpenAI返回数据格式错误');
            }
        } catch (error) {
            console.error('生成文章失败:', error.message);
            if (error.response) {
                console.error('API响应错误:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * 设置用户ID
     * @param {string} userId 用户ID
     */
    setUserId(userId) {
        this.userId = userId;
    }

    /**
     * 设置Token
     * @param {string} token API Token
     */
    setToken(token) {
        if (this.provider === 'openai') {
            this.openaiApiKey = token;
        } else {
            this.yuanbaoToken = token;
        }
    }
}

module.exports = AIService;
const { GoogleGenAI } = require('@google/genai');
const { logger } = require('./logger');

/**
 * Google Gemini 图片生成服务
 * 支持 Gemini 2.5 Flash Image 模型
 * 功能：文本转图片、修改图片、组合多张图片
 */
class GoogleImageService {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY || '';
        this.model = process.env.GOOGLE_IMAGE_MODEL || 'gemini-2.5-flash-image';
        this.ai = null;

        if (this.apiKey) {
            this.initializeClient();
        }
    }

    /**
     * 初始化 Google GenAI 客户端
     */
    initializeClient() {
        try {
            this.ai = new GoogleGenAI({
                apiKey: this.apiKey
            });
            logger.info('[GoogleImage] Google GenAI 客户端初始化成功');
        } catch (error) {
            logger.error('[GoogleImage] 初始化客户端失败:', error.message);
            throw error;
        }
    }

    /**
     * 设置 API Key
     * @param {string} apiKey - Google AI API Key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.initializeClient();
    }

    /**
     * 文本转图片 (Text-to-Image)
     * @param {string} prompt - 图片描述提示词
     * @returns {Promise<Buffer>} 返回图片 Buffer
     */
    async textToImage(prompt) {
        try {
            if (!this.ai) {
                throw new Error('Google GenAI 客户端未初始化，请检查 API Key 配置');
            }

            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new Error('提示词不能为空');
            }

            logger.info(`[GoogleImage] 文本转图片 - 提示词: ${prompt.substring(0, 50)}...`);

            // 增强提示词以确保生成图片而不是文本
            const enhancedPrompt = this.enhancePromptForImageGeneration(prompt.trim());

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: enhancedPrompt
            });

            return this.extractImageFromResponse(response);

        } catch (error) {
            logger.error('[GoogleImage] 文本转图片失败:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * 增强提示词以确保生成图片
     * @param {string} prompt - 原始提示词
     * @returns {string} 增强后的提示词
     * @private
     */
    enhancePromptForImageGeneration(prompt) {
        // 检查是否已经包含"生成"、"创建"等关键词
        const hasImageKeywords = /\b(generate|create|draw|paint|illustrate|make|produce|render|生成|创建|画|绘制|制作)\b/i.test(prompt);

        if (hasImageKeywords) {
            return prompt; // 已经有明确指令，不需要增强
        }

        // 对于简单描述，添加"生成图片"指令
        return `Generate an image of: ${prompt}`;
    }

    /**
     * 修改图片 (Image Editing)
     * @param {string} prompt - 修改指令
     * @param {string} base64Image - Base64 编码的图片数据
     * @param {string} mimeType - 图片 MIME 类型（如 image/png）
     * @returns {Promise<Buffer>} 返回修改后的图片 Buffer
     */
    async editImage(prompt, base64Image, mimeType = 'image/png') {
        try {
            if (!this.ai) {
                throw new Error('Google GenAI 客户端未初始化，请检查 API Key 配置');
            }

            if (!prompt || !base64Image) {
                throw new Error('提示词和图片数据不能为空');
            }

            logger.info(`[GoogleImage] 修改图片 - 提示词: ${prompt.substring(0, 50)}...`);

            const contents = [
                { text: prompt.trim() },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                }
            ];

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: contents
            });

            return this.extractImageFromResponse(response);

        } catch (error) {
            logger.error('[GoogleImage] 修改图片失败:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * 组合多张图片 (Image Composition)
     * @param {string} prompt - 组合指令
     * @param {Array<Object>} images - 图片数组，每个元素包含 {data: base64String, mimeType: string}
     * @returns {Promise<Buffer>} 返回组合后的图片 Buffer
     */
    async composeImages(prompt, images) {
        try {
            if (!this.ai) {
                throw new Error('Google GenAI 客户端未初始化，请检查 API Key 配置');
            }

            if (!prompt || !images || images.length === 0) {
                throw new Error('提示词和图片数据不能为空');
            }

            logger.info(`[GoogleImage] 组合图片 - 图片数量: ${images.length}, 提示词: ${prompt.substring(0, 50)}...`);

            // 构建内容数组，先放图片，再放提示词
            const contents = [];

            // 添加所有图片
            for (const image of images) {
                contents.push({
                    inlineData: {
                        mimeType: image.mimeType || 'image/png',
                        data: image.data
                    }
                });
            }

            // 添加提示词
            contents.push({ text: prompt.trim() });

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: contents
            });

            return this.extractImageFromResponse(response);

        } catch (error) {
            logger.error('[GoogleImage] 组合图片失败:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * 通用图片生成接口
     * 自动判断是文本转图片、修改图片还是组合图片
     * @param {Object} options - 生成选项
     * @param {string} options.prompt - 提示词
     * @param {Array<Object>} options.images - 可选，图片数组
     * @returns {Promise<Buffer>} 返回图片 Buffer
     */
    async generateImage(options) {
        const { prompt, images } = options;

        if (!images || images.length === 0) {
            // 文本转图片
            return await this.textToImage(prompt);
        } else if (images.length === 1) {
            // 修改单张图片
            return await this.editImage(prompt, images[0].data, images[0].mimeType);
        } else {
            // 组合多张图片
            return await this.composeImages(prompt, images);
        }
    }

    /**
     * 从响应中提取图片数据
     * @param {Object} response - API 响应对象
     * @returns {Buffer} 图片 Buffer
     * @private
     */
    extractImageFromResponse(response) {
        try {
            if (!response || !response.candidates || response.candidates.length === 0) {
                throw new Error('API 返回数据格式错误：没有候选结果');
            }

            const candidate = response.candidates[0];
            if (!candidate.content || !candidate.content.parts) {
                throw new Error('API 返回数据格式错误：没有内容部分');
            }

            let textResponse = '';

            // 遍历所有 parts，查找图片数据
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const imageData = part.inlineData.data;
                    const buffer = Buffer.from(imageData, 'base64');
                    logger.info(`[GoogleImage] 图片生成成功 - 大小: ${buffer.length} bytes`);
                    return buffer;
                }

                // 如果有文本，记录下来
                if (part.text) {
                    textResponse = part.text;
                    logger.info(`[GoogleImage] API 返回文本: ${part.text}`);
                }
            }

            // 如果只返回了文本而没有图片
            if (textResponse) {
                throw new Error(`API 返回了文本而不是图片。提示：请使用更具体的图片生成指令，比如 "Create an image of..." 或 "Generate a picture of..."。返回文本: ${textResponse.substring(0, 100)}`);
            }

            throw new Error('API 响应中没有找到图片数据');

        } catch (error) {
            logger.error('[GoogleImage] 提取图片数据失败:', error.message);
            throw error;
        }
    }

    /**
     * 处理错误
     * @param {Error} error - 原始错误对象
     * @returns {Error} 处理后的错误对象
     * @private
     */
    handleError(error) {
        // 处理特定的 API 错误
        if (error.message) {
            const message = error.message.toLowerCase();

            if (message.includes('api key') || message.includes('unauthorized')) {
                return new Error('API Key 无效或权限不足');
            } else if (message.includes('quota') || message.includes('rate limit')) {
                return new Error('API 请求频率超限或配额不足，请稍后重试');
            } else if (message.includes('timeout')) {
                return new Error('请求超时，图片生成时间过长');
            } else if (message.includes('invalid')) {
                return new Error(`请求参数错误: ${error.message}`);
            }
        }

        return error;
    }

    /**
     * 将 Buffer 转换为 base64
     * @param {Buffer} buffer - 图片 Buffer
     * @returns {string} base64 字符串
     */
    bufferToBase64(buffer) {
        return buffer.toString('base64');
    }

    /**
     * 将 base64 转换为 Buffer
     * @param {string} base64Data - base64 编码的图片数据
     * @returns {Buffer} 图片 Buffer
     */
    base64ToBuffer(base64Data) {
        return Buffer.from(base64Data, 'base64');
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
            result.errors.push('GOOGLE_API_KEY 未配置');
        }

        if (!this.ai) {
            result.valid = false;
            result.errors.push('Google GenAI 客户端未初始化');
        }

        return result;
    }
}

module.exports = GoogleImageService;

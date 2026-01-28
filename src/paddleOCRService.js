const axios = require('axios');
const { logger } = require('./logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Paddle OCR 服务
 * 用于 PDF 和图片的 OCR 识别
 */
class PaddleOCRService {
    constructor() {
        this.apiUrl = process.env.PADDLE_OCR_API_URL || 'https://u8yeibc471q3e274.aistudio-app.com/ocr';
        this.token = process.env.PADDLE_OCR_TOKEN || '';
    }

    /**
     * 设置 API URL
     */
    setApiUrl(apiUrl) {
        this.apiUrl = apiUrl;
    }

    /**
     * 设置认证 Token
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * 验证配置
     */
    validateConfig() {
        const errors = [];

        if (!this.apiUrl) {
            errors.push('PADDLE_OCR_API_URL 未设置');
        }

        if (!this.token) {
            errors.push('PADDLE_OCR_TOKEN 未设置');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * OCR 识别文件
     * @param {Buffer} fileBuffer 文件内容
     * @param {Object} options 选项
     * @param {number} options.fileType 文件类型 (0: PDF, 1: 图片)
     * @param {boolean} options.useDocOrientationClassify 是否使用文档方向分类
     * @param {boolean} options.useDocUnwarping 是否使用文档去畸变
     * @param {boolean} options.useTextlineOrientation 是否使用文本行方向
     * @param {boolean} options.saveImages 是否保存返回的图片到本地
     * @param {string} options.outputDir 图片保存目录
     * @param {string} options.filename 文件名（用于命名保存的图片）
     * @returns {Promise<Object>} OCR 结果
     */
    async recognizeFile(fileBuffer, options = {}) {
        const {
            fileType = 0, // 0: PDF, 1: 图片
            useDocOrientationClassify = false,
            useDocUnwarping = false,
            useTextlineOrientation = false,
            saveImages = false,
            outputDir = 'output/paddle-ocr',
            filename = 'document'
        } = options;

        // 验证配置
        const validation = this.validateConfig();
        if (!validation.valid) {
            throw new Error(`Paddle OCR 配置错误: ${validation.errors.join(', ')}`);
        }

        try {
            logger.info('[Paddle OCR] 开始 OCR 识别');
            logger.info(`[Paddle OCR] 文件大小: ${fileBuffer.length} bytes, 类型: ${fileType === 0 ? 'PDF' : '图片'}`);

            // 将文件转换为 base64
            const fileData = fileBuffer.toString('base64');

            // 构建请求
            const headers = {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json'
            };

            const payload = {
                file: fileData,
                fileType: fileType,
                useDocOrientationClassify: useDocOrientationClassify,
                useDocUnwarping: useDocUnwarping,
                useTextlineOrientation: useTextlineOrientation
            };

            logger.info('[Paddle OCR] 发送 OCR 请求到 Paddle API...');

            // 发送请求
            const response = await axios.post(this.apiUrl, payload, {
                headers: headers,
                timeout: 300000, // 5 分钟超时（PDF 处理可能较慢）
                maxContentLength: 50 * 1024 * 1024, // 50MB
                maxBodyLength: 50 * 1024 * 1024
            });

            if (response.status !== 200) {
                throw new Error(`Paddle OCR API 返回错误状态码: ${response.status}`);
            }

            const result = response.data.result;

            if (!result || !result.ocrResults) {
                throw new Error('Paddle OCR API 返回的数据格式不正确');
            }

            logger.info(`[Paddle OCR] OCR 识别成功 - 识别到 ${result.ocrResults.length} 个页面/区域`);

            // 提取文本内容
            const textResults = [];
            for (let i = 0; i < result.ocrResults.length; i++) {
                const ocrResult = result.ocrResults[i];
                textResults.push({
                    index: i,
                    text: ocrResult.prunedResult || '',
                    imageUrl: ocrResult.ocrImage || null
                });
            }

            // 如果需要保存图片
            let savedImages = [];
            if (saveImages) {
                logger.info('[Paddle OCR] 开始保存识别结果图片...');
                savedImages = await this.saveOCRImages(result.ocrResults, outputDir, filename);
                logger.info(`[Paddle OCR] 图片保存完成 - 成功保存 ${savedImages.length} 张图片`);
            }

            return {
                success: true,
                totalPages: result.ocrResults.length,
                results: textResults,
                savedImages: savedImages,
                rawResult: result
            };

        } catch (error) {
            logger.error('[Paddle OCR] OCR 识别失败:', error);

            // 提供更详细的错误信息
            if (error.response) {
                logger.error('[Paddle OCR] API 响应错误:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
                throw new Error(`Paddle OCR API 错误: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                logger.error('[Paddle OCR] 请求失败，未收到响应');
                throw new Error('Paddle OCR API 请求失败，请检查网络连接和 API URL');
            } else {
                throw error;
            }
        }
    }

    /**
     * 保存 OCR 识别结果中的图片
     * @param {Array} ocrResults OCR 结果数组
     * @param {string} outputDir 输出目录
     * @param {string} filename 文件名前缀
     * @returns {Promise<Array>} 保存的图片路径列表
     */
    async saveOCRImages(ocrResults, outputDir, filename) {
        const savedImages = [];

        // 创建输出目录
        await fs.mkdir(outputDir, { recursive: true });

        for (let i = 0; i < ocrResults.length; i++) {
            const ocrResult = ocrResults[i];
            const imageUrl = ocrResult.ocrImage;

            if (!imageUrl) {
                logger.warn(`[Paddle OCR] 第 ${i} 个结果没有图片 URL`);
                continue;
            }

            try {
                logger.info(`[Paddle OCR] 下载第 ${i + 1}/${ocrResults.length} 张图片...`);

                // 下载图片
                const imgResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                if (imgResponse.status === 200) {
                    // 保存图片
                    const imagePath = path.join(outputDir, `${filename}_${i}.jpg`);
                    await fs.writeFile(imagePath, imgResponse.data);

                    savedImages.push({
                        index: i,
                        path: imagePath,
                        url: imageUrl
                    });

                    logger.info(`[Paddle OCR] 图片已保存: ${imagePath}`);
                } else {
                    logger.warn(`[Paddle OCR] 下载图片失败，状态码: ${imgResponse.status}`);
                }

            } catch (error) {
                logger.error(`[Paddle OCR] 保存第 ${i} 张图片失败:`, error.message);
            }
        }

        return savedImages;
    }

    /**
     * 识别 PDF 文件
     * @param {Buffer} pdfBuffer PDF 文件内容
     * @param {Object} options 选项
     * @returns {Promise<Object>} OCR 结果
     */
    async recognizePDF(pdfBuffer, options = {}) {
        return await this.recognizeFile(pdfBuffer, {
            ...options,
            fileType: 0 // PDF
        });
    }

    /**
     * 识别图片文件
     * @param {Buffer} imageBuffer 图片文件内容
     * @param {Object} options 选项
     * @returns {Promise<Object>} OCR 结果
     */
    async recognizeImage(imageBuffer, options = {}) {
        return await this.recognizeFile(imageBuffer, {
            ...options,
            fileType: 1 // 图片
        });
    }

    /**
     * 批量识别文件
     * @param {Array<{buffer: Buffer, filename: string, type: 'pdf'|'image'}>} files 文件列表
     * @param {Object} options 选项
     * @returns {Promise<Array>} OCR 结果列表
     */
    async recognizeBatch(files, options = {}) {
        logger.info(`[Paddle OCR] 开始批量识别 - 文件数量: ${files.length}`);

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            logger.info(`[Paddle OCR] 处理第 ${i + 1}/${files.length} 个文件: ${file.filename}`);

            try {
                const fileType = file.type === 'pdf' ? 0 : 1;
                const result = await this.recognizeFile(file.buffer, {
                    ...options,
                    fileType: fileType,
                    filename: path.parse(file.filename).name
                });

                results.push({
                    filename: file.filename,
                    success: true,
                    ...result
                });

            } catch (error) {
                logger.error(`[Paddle OCR] 识别文件 ${file.filename} 失败:`, error.message);
                results.push({
                    filename: file.filename,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.length - successCount;

        logger.info(`[Paddle OCR] 批量识别完成 - 成功: ${successCount}, 失败: ${failedCount}`);

        return results;
    }
}

module.exports = PaddleOCRService;

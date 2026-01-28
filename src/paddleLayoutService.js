const axios = require('axios');
const { logger } = require('./logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Paddle Layout Parsing 服务
 * 用于 PDF 和图片的布局解析，转换为 Markdown 格式
 * 比 paddleOCRService 更先进，支持保留文档结构和格式
 */
class PaddleLayoutService {
    constructor() {
        this.apiUrl = process.env.PADDLE_LAYOUT_API_URL || 'https://u9x0gfmaod92r0q2.aistudio-app.com/layout-parsing';
        this.token = process.env.PADDLE_LAYOUT_TOKEN || '';
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
            errors.push('PADDLE_LAYOUT_API_URL 未设置');
        }

        if (!this.token) {
            errors.push('PADDLE_LAYOUT_TOKEN 未设置');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 布局解析文件
     * @param {Buffer} fileBuffer 文件内容
     * @param {Object} options 选项
     * @param {number} options.fileType 文件类型 (0: PDF, 1: 图片)
     * @param {boolean} options.useDocOrientationClassify 是否使用文档方向分类
     * @param {boolean} options.useDocUnwarping 是否使用文档去畸变
     * @param {boolean} options.useChartRecognition 是否使用图表识别
     * @param {boolean} options.saveFiles 是否保存 Markdown 和图片到本地
     * @param {string} options.outputDir 输出目录
     * @param {string} options.filename 文件名（用于命名输出文件）
     * @returns {Promise<Object>} 解析结果
     */
    async parseLayout(fileBuffer, options = {}) {
        const {
            fileType = 0, // 0: PDF, 1: 图片
            useDocOrientationClassify = false,
            useDocUnwarping = false,
            useChartRecognition = false,
            saveFiles = false,
            outputDir = 'output/paddle-layout',
            filename = 'document'
        } = options;

        // 验证配置
        const validation = this.validateConfig();
        if (!validation.valid) {
            throw new Error(`Paddle Layout 配置错误: ${validation.errors.join(', ')}`);
        }

        try {
            logger.info('[Paddle Layout] 开始布局解析');
            logger.info(`[Paddle Layout] 文件大小: ${fileBuffer.length} bytes, 类型: ${fileType === 0 ? 'PDF' : '图片'}`);

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
                useChartRecognition: useChartRecognition
            };

            logger.info('[Paddle Layout] 发送布局解析请求到 Paddle API...');

            // 发送请求
            const response = await axios.post(this.apiUrl, payload, {
                headers: headers,
                timeout: 600000, // 10 分钟超时
                maxContentLength: 50 * 1024 * 1024, // 50MB
                maxBodyLength: 50 * 1024 * 1024
            });

            if (response.status !== 200) {
                throw new Error(`Paddle Layout API 返回错误状态码: ${response.status}`);
            }

            const result = response.data.result;

            if (!result || !result.layoutParsingResults) {
                throw new Error('Paddle Layout API 返回的数据格式不正确');
            }

            logger.info(`[Paddle Layout] 布局解析成功 - 解析到 ${result.layoutParsingResults.length} 个页面/区域`);

            // 提取解析结果
            const parsingResults = [];
            for (let i = 0; i < result.layoutParsingResults.length; i++) {
                const layoutResult = result.layoutParsingResults[i];
                parsingResults.push({
                    index: i,
                    markdown: layoutResult.markdown || { text: '', images: {} },
                    outputImages: layoutResult.outputImages || {}
                });
            }

            // 如果需要保存文件
            let savedFiles = [];
            if (saveFiles) {
                logger.info('[Paddle Layout] 开始保存 Markdown 和图片文件...');
                savedFiles = await this.saveLayoutResults(result.layoutParsingResults, outputDir, filename);
                logger.info(`[Paddle Layout] 文件保存完成 - 保存了 ${savedFiles.length} 个文件`);
            }

            return {
                success: true,
                totalPages: result.layoutParsingResults.length,
                results: parsingResults,
                savedFiles: savedFiles,
                rawResult: result
            };

        } catch (error) {
            logger.error('[Paddle Layout] 布局解析失败:', error);

            // 提供更详细的错误信息
            if (error.response) {
                logger.error('[Paddle Layout] API 响应错误:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
                throw new Error(`Paddle Layout API 错误: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                logger.error('[Paddle Layout] 请求失败，未收到响应');
                throw new Error('Paddle Layout API 请求失败，请检查网络连接和 API URL');
            } else {
                throw error;
            }
        }
    }

    /**
     * 保存布局解析结果
     * @param {Array} layoutParsingResults 布局解析结果数组
     * @param {string} outputDir 输出目录
     * @param {string} filename 文件名前缀
     * @returns {Promise<Array>} 保存的文件路径列表
     */
    async saveLayoutResults(layoutParsingResults, outputDir, filename) {
        const savedFiles = [];

        // 创建输出目录
        await fs.mkdir(outputDir, { recursive: true });

        for (let i = 0; i < layoutParsingResults.length; i++) {
            const result = layoutParsingResults[i];

            try {
                // 1. 保存 Markdown 文件
                if (result.markdown && result.markdown.text) {
                    const mdFilename = `${filename}_${i}.md`;
                    const mdPath = path.join(outputDir, mdFilename);

                    await fs.writeFile(mdPath, result.markdown.text, 'utf8');

                    savedFiles.push({
                        type: 'markdown',
                        index: i,
                        path: mdPath,
                        filename: mdFilename
                    });

                    logger.info(`[Paddle Layout] Markdown 文档已保存: ${mdPath}`);

                    // 2. 保存 Markdown 中引用的图片
                    if (result.markdown.images) {
                        for (const [imgPath, imgUrl] of Object.entries(result.markdown.images)) {
                            try {
                                const fullImgPath = path.join(outputDir, imgPath);
                                const imgDir = path.dirname(fullImgPath);

                                // 创建图片目录
                                await fs.mkdir(imgDir, { recursive: true });

                                // 下载图片
                                const imgResponse = await axios.get(imgUrl, {
                                    responseType: 'arraybuffer',
                                    timeout: 30000
                                });

                                if (imgResponse.status === 200) {
                                    await fs.writeFile(fullImgPath, imgResponse.data);

                                    savedFiles.push({
                                        type: 'markdown-image',
                                        index: i,
                                        path: fullImgPath,
                                        filename: imgPath,
                                        url: imgUrl
                                    });

                                    logger.info(`[Paddle Layout] Markdown 图片已保存: ${fullImgPath}`);
                                }
                            } catch (imgError) {
                                logger.error(`[Paddle Layout] 保存 Markdown 图片失败 (${imgPath}):`, imgError.message);
                            }
                        }
                    }
                }

                // 3. 保存输出图片（处理后的页面图片）
                if (result.outputImages) {
                    for (const [imgName, imgUrl] of Object.entries(result.outputImages)) {
                        try {
                            const outputImgResponse = await axios.get(imgUrl, {
                                responseType: 'arraybuffer',
                                timeout: 30000
                            });

                            if (outputImgResponse.status === 200) {
                                const outputImgFilename = `${imgName}_${i}.jpg`;
                                const outputImgPath = path.join(outputDir, outputImgFilename);

                                await fs.writeFile(outputImgPath, outputImgResponse.data);

                                savedFiles.push({
                                    type: 'output-image',
                                    index: i,
                                    path: outputImgPath,
                                    filename: outputImgFilename,
                                    url: imgUrl
                                });

                                logger.info(`[Paddle Layout] 输出图片已保存: ${outputImgPath}`);
                            }
                        } catch (imgError) {
                            logger.error(`[Paddle Layout] 保存输出图片失败 (${imgName}):`, imgError.message);
                        }
                    }
                }

            } catch (error) {
                logger.error(`[Paddle Layout] 保存第 ${i} 个结果失败:`, error.message);
            }
        }

        return savedFiles;
    }

    /**
     * 解析 PDF 文件
     * @param {Buffer} pdfBuffer PDF 文件内容
     * @param {Object} options 选项
     * @returns {Promise<Object>} 解析结果
     */
    async parsePDF(pdfBuffer, options = {}) {
        return await this.parseLayout(pdfBuffer, {
            ...options,
            fileType: 0 // PDF
        });
    }

    /**
     * 解析图片文件
     * @param {Buffer} imageBuffer 图片文件内容
     * @param {Object} options 选项
     * @returns {Promise<Object>} 解析结果
     */
    async parseImage(imageBuffer, options = {}) {
        return await this.parseLayout(imageBuffer, {
            ...options,
            fileType: 1 // 图片
        });
    }

    /**
     * 批量解析文件
     * @param {Array<{buffer: Buffer, filename: string, type: 'pdf'|'image'}>} files 文件列表
     * @param {Object} options 选项
     * @returns {Promise<Array>} 解析结果列表
     */
    async parseBatch(files, options = {}) {
        logger.info(`[Paddle Layout] 开始批量解析 - 文件数量: ${files.length}`);

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            logger.info(`[Paddle Layout] 处理第 ${i + 1}/${files.length} 个文件: ${file.filename}`);

            try {
                const fileType = file.type === 'pdf' ? 0 : 1;
                const result = await this.parseLayout(file.buffer, {
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
                logger.error(`[Paddle Layout] 解析文件 ${file.filename} 失败:`, error.message);
                results.push({
                    filename: file.filename,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.length - successCount;

        logger.info(`[Paddle Layout] 批量解析完成 - 成功: ${successCount}, 失败: ${failedCount}`);

        return results;
    }
}

module.exports = PaddleLayoutService;

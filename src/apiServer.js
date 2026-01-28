const express = require('express');
const axios = require('axios');
const WeChatService = require('./wechatService');
const GoogleImageService = require('./googleImageService');
const DeepSeekService = require('./deepseekService');
const OpenAIService = require('./openaiService');
const TranslateService = require('./translateService');
const PaddleOCRService = require('./paddleOCRService');
const PaddleLayoutService = require('./paddleLayoutService');
const database = require('./db');
const { logger } = require('./logger');

/**
 * API服务器 - 提供远程调用接口
 */
class APIServer {
    constructor() {
        this.app = express();
        this.wechatService = new WeChatService();
        this.googleImageService = new GoogleImageService();
        this.deepseekService = new DeepSeekService();
        this.openaiService = new OpenAIService();
        this.translateService = new TranslateService();
        this.paddleOCRService = new PaddleOCRService();
        this.paddleLayoutService = new PaddleLayoutService();
        this.port = process.env.API_PORT || 5003;
        this.apiKey = process.env.API_KEY || '';

        // 配置微信服务
        if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
            this.wechatService.setConfig(
                process.env.WECHAT_APP_ID,
                process.env.WECHAT_APP_SECRET
            );
        }

        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * 配置中间件
     */
    setupMiddleware() {
        // CORS支持 - 必须在所有其他中间件之前
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
            res.header('Access-Control-Max-Age', '86400'); // 24小时

            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });

        // 解析JSON请求体
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // 日志中间件
        this.app.use((req, res, next) => {
            logger.info(`[API] ${req.method} ${req.path} - IP: ${req.ip}`);
            next();
        });
    }

    /**
     * API认证中间件
     */
    authenticate(req, res, next) {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

        // 如果未设置API_KEY，则跳过认证（开发模式）
        if (!this.apiKey) {
            logger.warn('[API] API_KEY未设置，跳过认证检查（不建议在生产环境使用）');
            return next();
        }

        if (!apiKey || apiKey !== this.apiKey) {
            logger.warn(`[API] 认证失败 - IP: ${req.ip}`);
            // 确保认证失败的响应也包含 CORS 头部
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: '无效的API密钥'
            });
        }

        next();
    }

    /**
     * 配置路由
     */
    setupRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                status: 'running',
                timestamp: new Date().toISOString()
            });
        });

        // API文档
        this.app.get('/', (req, res) => {
            res.json({
                name: '微信公众号自动推送 API',
                version: '1.0.0',
                endpoints: {
                    'POST /api/draft/create': '创建草稿',
                    'POST /api/draft/create-with-credentials': '使用客户端凭证创建草稿',
                    'POST /api/draft/publish': '发布草稿',
                    'POST /api/draft/create-and-publish': '创建并发布草稿',
                    'POST /api/draft/list': '获取草稿列表',
                    'POST /api/draft/delete': '删除草稿',
                    'POST /api/draft/delete-all': '删除全部草稿',
                    'POST /api/publish/status': '查询发布状态',
                    'POST /api/media/upload-image': '上传图文消息图片',
                    'POST /api/media/upload-image-url': '通过URL上传图文消息图片（自动保存到数据库）',
                    'GET /api/images/list': '获取图片列表（从数据库查询已上传的图片记录，支持分页和筛选）',
                    'POST /api/image/generate': '生成AI图片（Google Gemini 2.5 Flash Image - 支持文本转图片、修改图片、组合图片）',
                    'POST /api/image/generate-wechat': '生成AI图片并上传到微信（返回微信图片URL，自动保存到数据库）',
                    'POST /api/image/ocr': '图片文字识别（OCR）- 批量识别图片文字（腾讯云OCR）',
                    'POST /api/image/generate-article': '智能稿件生成 - 根据图片素材和改写要求生成稿件（OCR + DeepSeek AI）',
                    'POST /api/translate': '翻译文本（Google Translate - 支持100+种语言，自动语言检测）',
                    'POST /api/translate/batch': '批量翻译（Google Translate - 支持批量翻译多个文本）',
                    'GET /api/translate/languages': '获取支持的语言列表',
                    'POST /api/deepseek/chat': 'DeepSeek AI对话（DeepSeek Chat Completions - 支持流式响应/客户端API Key，默认最大8000 tokens）',
                    'POST /api/deepseek/chat/completions': 'DeepSeek AI对话（OpenAI格式路径别名，功能同上）',
                    'POST /api/paddle-ocr/pdf': 'PDF文档识别（Paddle OCR - 识别PDF文档内容并返回文本和图片）',
                    'POST /api/paddle-ocr/image': '图片文字识别（Paddle OCR - 识别图片文字内容）',
                    'POST /api/paddle-ocr/batch': '批量文档识别（Paddle OCR - 批量识别PDF和图片）',
                    'POST /api/paddle-layout/pdf': 'PDF布局解析（Paddle Layout - 解析PDF为Markdown格式，保留文档结构）',
                    'POST /api/paddle-layout/image': '图片布局解析（Paddle Layout - 解析图片为Markdown格式）',
                    'POST /api/paddle-layout/batch': '批量布局解析（Paddle Layout - 批量解析PDF和图片为Markdown）',
                    'GET /health': '健康检查'
                },
                docs: '请查看 README.md 了解详细使用方法'
            });
        });

        // 创建草稿
        this.app.post('/api/draft/create', this.authenticate.bind(this), async (req, res) => {
            try {
                const { title, content, author, digest, imageUrl, sourceUrl, titleMode, pic_crop_1_1, pic_crop_235_1 } = req.body;

                // 参数验证
                if (!title || !content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: title 和 content'
                    });
                }

                logger.info(`[API] 创建草稿请求 - 标题: ${title}`);

                const articleData = {
                    title,
                    content,
                    author: author || '喵酱',
                    digest: digest || content.substring(0, 100) + '...',
                    imageUrl,
                    sourceUrl: sourceUrl || '',
                    pic_crop_1_1,
                    pic_crop_235_1
                };

                const mediaId = await this.wechatService.createDraft(articleData, titleMode || 'smart');

                logger.info(`[API] 草稿创建成功 - media_id: ${mediaId}`);

                res.json({
                    success: true,
                    message: '草稿创建成功',
                    data: {
                        mediaId,
                        title: articleData.title
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 创建草稿失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 使用客户端凭证创建草稿
        this.app.post('/api/draft/create-with-credentials', this.authenticate.bind(this), async (req, res) => {
            try {
                // 兼容 appId 和 appID 两种参数名
                const appId = req.body.appId || req.body.appID;
                const { appsecret, title, content, author, digest, imageUrl, sourceUrl, titleMode, pic_crop_1_1, pic_crop_235_1 } = req.body;

                // 记录接收到的参数（不记录敏感信息）
                logger.info(`[API] 接收到参数 - appId: ${appId ? '已提供' : '未提供'}, appsecret: ${appsecret ? '已提供' : '未提供'}, title: ${title ? '已提供' : '未提供'}`);
                logger.info(`[API] 请求体键名: ${Object.keys(req.body).join(', ')}`);

                // 参数验证
                if (!appId || !appsecret) {
                    logger.warn(`[API] 参数验证失败 - appId: ${!!appId}, appsecret: ${!!appsecret}`);
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: appId/appID 和 appsecret'
                    });
                }

                if (!title || !content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: title 和 content'
                    });
                }

                logger.info(`[API] 使用客户端凭证创建草稿请求 - 标题: ${title}, appId: ${appId}`);

                // 创建临时的 WeChatService 实例
                const tempWechatService = new WeChatService();
                tempWechatService.setConfig(appId, appsecret);

                const articleData = {
                    title,
                    content,
                    author: author || '喵酱',
                    digest: digest || content.substring(0, 100) + '...',
                    imageUrl,
                    sourceUrl: sourceUrl || '',
                    pic_crop_1_1,
                    pic_crop_235_1
                };

                const mediaId = await tempWechatService.createDraft(articleData, titleMode || 'smart');

                logger.info(`[API] 草稿创建成功 - media_id: ${mediaId}`);

                res.json({
                    success: true,
                    message: '草稿创建成功',
                    data: {
                        mediaId,
                        title: articleData.title
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 使用客户端凭证创建草稿失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 获取草稿列表
        this.app.post('/api/draft/list', this.authenticate.bind(this), async (req, res) => {
            try {
                const { offset = 0, count = 20, noContent = 1 } = req.body;

                // 参数验证
                if (count < 1 || count > 20) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: 'count参数必须在1到20之间'
                    });
                }

                logger.info(`[API] 获取草稿列表请求 - offset: ${offset}, count: ${count}`);

                const result = await this.wechatService.getDraftList(offset, count, noContent);

                logger.info(`[API] 草稿列表获取成功 - 总数: ${result.total_count}, 返回数量: ${result.item_count}`);

                res.json({
                    success: true,
                    message: '草稿列表获取成功',
                    data: result,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 获取草稿列表失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 删除草稿
        this.app.post('/api/draft/delete', this.authenticate.bind(this), async (req, res) => {
            try {
                const { mediaId } = req.body;

                if (!mediaId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: mediaId'
                    });
                }

                logger.info(`[API] 删除草稿请求 - media_id: ${mediaId}`);

                await this.wechatService.deleteDraft(mediaId);

                logger.info(`[API] 草稿删除成功 - media_id: ${mediaId}`);

                res.json({
                    success: true,
                    message: '草稿删除成功',
                    data: {
                        mediaId
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 删除草稿失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 删除全部草稿
        this.app.post('/api/draft/delete-all', this.authenticate.bind(this), async (req, res) => {
            try {
                logger.info('[API] 删除全部草稿请求');

                const result = await this.wechatService.deleteAllDrafts();

                logger.info(`[API] 删除全部草稿完成 - 成功: ${result.total_deleted}, 失败: ${result.failed_count}`);

                res.json({
                    success: true,
                    message: '草稿批量删除完成',
                    data: result,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 删除全部草稿失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 发布草稿
        this.app.post('/api/draft/publish', this.authenticate.bind(this), async (req, res) => {
            try {
                const { mediaId } = req.body;

                if (!mediaId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: mediaId'
                    });
                }

                logger.info(`[API] 发布草稿请求 - media_id: ${mediaId}`);

                const publishId = await this.wechatService.publishDraft(mediaId);

                logger.info(`[API] 草稿发布成功 - publish_id: ${publishId}`);

                res.json({
                    success: true,
                    message: '草稿发布请求已提交',
                    data: {
                        publishId,
                        mediaId
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 发布草稿失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 创建并发布草稿（一步到位）
        this.app.post('/api/draft/create-and-publish', this.authenticate.bind(this), async (req, res) => {
            try {
                const { title, content, author, digest, imageUrl, sourceUrl, titleMode, pic_crop_1_1, pic_crop_235_1 } = req.body;

                // 参数验证
                if (!title || !content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: title 和 content'
                    });
                }

                logger.info(`[API] 创建并发布草稿请求 - 标题: ${title}`);

                const articleData = {
                    title,
                    content,
                    author: author || '喵酱',
                    digest: digest || content.substring(0, 100) + '...',
                    imageUrl,
                    sourceUrl: sourceUrl || '',
                    pic_crop_1_1,
                    pic_crop_235_1
                };

                // 创建草稿
                const mediaId = await this.wechatService.createDraft(articleData, titleMode || 'smart');
                logger.info(`[API] 草稿创建成功 - media_id: ${mediaId}`);

                // 发布草稿
                const publishId = await this.wechatService.publishDraft(mediaId);
                logger.info(`[API] 草稿发布成功 - publish_id: ${publishId}`);

                res.json({
                    success: true,
                    message: '草稿创建并发布成功',
                    data: {
                        mediaId,
                        publishId,
                        title: articleData.title
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 创建并发布草稿失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 通过URL上传图文消息图片
        this.app.post('/api/media/upload-image-url', this.authenticate.bind(this), async (req, res) => {
            // 确保 CORS 头部在最开始就设置
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

            try {
                const { imageUrl } = req.body;

                // 参数验证
                if (!imageUrl) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: imageUrl'
                    });
                }

                // URL格式验证
                try {
                    new URL(imageUrl);
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '无效的图片URL格式'
                    });
                }

                logger.info(`[API] 通过URL上传图文消息图片请求 - URL: ${imageUrl}`);

                // 下载图片
                const axios = require('axios');
                let imageResponse;
                try {
                    imageResponse = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        maxContentLength: 10 * 1024 * 1024 // 10MB限制
                    });
                } catch (error) {
                    logger.error('[API] 下载图片失败:', error.message);
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: `下载图片失败: ${error.message}`
                    });
                }

                // 获取图片信息
                const imageBuffer = Buffer.from(imageResponse.data);
                const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

                // 验证是否为图片
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(contentType)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: `不支持的图片格式: ${contentType}，仅支持JPG、PNG和GIF`
                    });
                }

                // 提取文件名
                const urlPath = new URL(imageUrl).pathname;
                const filename = urlPath.split('/').pop() || 'image.jpg';

                logger.info(`[API] 图片下载成功 - 大小: ${imageBuffer.length} bytes, 类型: ${contentType}`);

                // 上传到微信
                const url = await this.wechatService.uploadNewsImage(
                    imageBuffer,
                    filename,
                    contentType
                );

                logger.info(`[API] 图文消息图片上传成功 - URL: ${url}`);

                // 保存到数据库
                try {
                    await database.saveImage({
                        url: url,
                        basename: 'insurance',
                        original_url: imageUrl,
                        file_size: imageBuffer.length,
                        content_type: contentType
                    });
                    logger.info('[API] 图片记录已保存到数据库');
                } catch (dbError) {
                    logger.warn('[API] 保存图片记录到数据库失败（不影响接口返回）:', dbError.message);
                }

                res.json({
                    success: true,
                    message: '图片上传成功',
                    data: {
                        url: url
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 通过URL上传图文消息图片失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 上传图文消息图片
        this.app.post('/api/media/upload-image', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024 // 10MB
                    },
                    fileFilter: (req, file, cb) => {
                        // 验证文件类型
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持JPG、PNG和GIF格式的图片'));
                        }
                    }
                }).single('media');

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 图片上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: err.message
                        });
                    }

                    if (!req.file) {
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: '未上传图片文件，请在请求中包含media字段'
                        });
                    }

                    try {
                        logger.info(`[API] 上传图文消息图片请求 - 文件大小: ${req.file.size} bytes`);

                        const url = await this.wechatService.uploadNewsImage(
                            req.file.buffer,
                            req.file.originalname,
                            req.file.mimetype
                        );

                        logger.info(`[API] 图文消息图片上传成功 - URL: ${url}`);

                        res.json({
                            success: true,
                            message: '图片上传成功',
                            data: {
                                url: url
                            },
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 上传图文消息图片失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 上传图文消息图片失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 查询发布状态
        this.app.post('/api/publish/status', this.authenticate.bind(this), async (req, res) => {
            try {
                const { publishId } = req.body;

                if (!publishId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: publishId'
                    });
                }

                logger.info(`[API] 查询发布状态 - publish_id: ${publishId}`);

                const status = await this.wechatService.getPublishStatus(publishId);

                res.json({
                    success: true,
                    message: '查询成功',
                    data: status,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 查询发布状态失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 获取图片列表
        this.app.get('/api/images/list', this.authenticate.bind(this), async (req, res) => {
            // 确保 CORS 头部在最开始就设置
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

            try {
                // 获取查询参数
                const basename = req.query.basename || null;
                const limit = parseInt(req.query.limit) || 100;
                const offset = parseInt(req.query.offset) || 0;

                // 参数验证
                if (limit < 1 || limit > 1000) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: 'limit 参数必须在 1 到 1000 之间'
                    });
                }

                if (offset < 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: 'offset 参数不能为负数'
                    });
                }

                logger.info(`[API] 获取图片列表请求 - basename: ${basename || 'all'}, limit: ${limit}, offset: ${offset}`);

                // 查询数据库
                const images = await database.getImages({
                    basename: basename,
                    limit: limit,
                    offset: offset
                });

                logger.info(`[API] 图片列表查询成功 - 返回 ${images.length} 条记录`);

                res.json({
                    success: true,
                    message: '查询成功',
                    data: {
                        images: images,
                        count: images.length,
                        limit: limit,
                        offset: offset,
                        basename: basename
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 获取图片列表失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 生成AI图片并上传到微信（返回微信图片URL）
        this.app.post('/api/image/generate-wechat', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024,
                        files: 10
                    }
                }).array('images', 10);

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        const { prompt, apiKey, appId, appsecret } = req.body;

                        // 参数验证
                        if (!prompt) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '缺少必需参数: prompt (图片描述或修改指令)'
                            });
                        }

                        logger.info(`[API] 生成AI图片并上传微信请求 - 提示词: ${prompt.substring(0, 50)}...`);

                        // 1. 使用 Google Image Service 生成图片
                        let googleImageService = this.googleImageService;
                        if (apiKey) {
                            logger.info('[API] 使用客户端提供的 Google API Key');
                            googleImageService = new GoogleImageService();
                            googleImageService.setApiKey(apiKey);
                        }

                        // 验证配置
                        const validation = googleImageService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Google AI 配置错误: ${validation.errors.join(', ')}`
                            });
                        }

                        // 处理输入图片数据
                        let images = [];
                        if (req.files && req.files.length > 0) {
                            for (const file of req.files) {
                                images.push({
                                    data: file.buffer.toString('base64'),
                                    mimeType: file.mimetype
                                });
                            }
                        }

                        if (req.body.imagesData) {
                            try {
                                const imagesData = typeof req.body.imagesData === 'string'
                                    ? JSON.parse(req.body.imagesData)
                                    : req.body.imagesData;
                                if (Array.isArray(imagesData)) {
                                    images.push(...imagesData);
                                }
                            } catch (e) {
                                logger.warn('[API] 解析 imagesData 失败:', e.message);
                            }
                        }

                        // 判断场景类型
                        let sceneType = 'text-to-image';
                        if (images.length === 1) {
                            sceneType = 'image-editing';
                        } else if (images.length > 1) {
                            sceneType = 'image-composition';
                        }

                        logger.info(`[API] 场景类型: ${sceneType}, 输入图片数量: ${images.length}`);

                        // 生成图片
                        const imageBuffer = await googleImageService.generateImage({
                            prompt: prompt,
                            images: images.length > 0 ? images : undefined
                        });

                        logger.info(`[API] AI图片生成成功 - 大小: ${imageBuffer.length} bytes`);

                        // 2. 上传图片到微信
                        // 配置微信服务
                        let wechatService = this.wechatService;
                        if (appId && appsecret) {
                            logger.info('[API] 使用客户端提供的微信凭证');
                            const WeChatService = require('./wechatService');
                            wechatService = new WeChatService();
                            wechatService.setConfig(appId, appsecret);
                        }

                        // 验证微信配置
                        if (!wechatService.appId || !wechatService.appSecret) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: '微信配置错误: 请在 .env 中配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET，或在请求中提供 appId 和 appsecret'
                            });
                        }

                        logger.info('[API] 开始上传图片到微信...');

                        // 上传到微信（图文消息图片）
                        const wechatImageUrl = await wechatService.uploadNewsImage(
                            imageBuffer,
                            'generated-image.png',
                            'image/png'
                        );

                        logger.info(`[API] 图片上传微信成功 - URL: ${wechatImageUrl}`);

                        // 保存到数据库
                        try {
                            await database.saveImage({
                                url: wechatImageUrl,
                                basename: 'insurance',
                                original_url: null,
                                file_size: imageBuffer.length,
                                content_type: 'image/png'
                            });
                            logger.info('[API] 图片记录已保存到数据库');
                        } catch (dbError) {
                            logger.warn('[API] 保存图片记录到数据库失败（不影响接口返回）:', dbError.message);
                        }

                        // 3. 返回结果
                        res.json({
                            success: true,
                            message: 'AI图片生成并上传微信成功',
                            data: {
                                wechatImageUrl: wechatImageUrl,
                                imageSize: imageBuffer.length,
                                prompt: prompt,
                                sceneType: sceneType,
                                inputImagesCount: images.length
                            },
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 生成AI图片并上传微信失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 生成AI图片并上传微信失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 生成AI图片（Google Gemini 2.5 Flash Image）
        // 支持：文本转图片、修改图片、组合多张图片
        this.app.post('/api/image/generate', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024, // 10MB per file
                        files: 10 // 最多10个文件
                    }
                }).array('images', 10); // 支持上传多张图片

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        const { prompt, apiKey, returnFormat } = req.body;

                        // 参数验证
                        if (!prompt) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '缺少必需参数: prompt (图片描述或修改指令)'
                            });
                        }

                        // 如果客户端提供了 API Key，使用客户端的；否则使用服务器配置的
                        let googleImageService = this.googleImageService;
                        if (apiKey) {
                            logger.info('[API] 使用客户端提供的 API Key');
                            googleImageService = new GoogleImageService();
                            googleImageService.setApiKey(apiKey);
                        }

                        // 验证配置
                        const validation = googleImageService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `配置错误: ${validation.errors.join(', ')}`
                            });
                        }

                        // 处理图片数据
                        let images = [];

                        // 1. 从上传的文件中获取图片
                        if (req.files && req.files.length > 0) {
                            for (const file of req.files) {
                                images.push({
                                    data: file.buffer.toString('base64'),
                                    mimeType: file.mimetype
                                });
                            }
                        }

                        // 2. 从 JSON 请求体中获取 base64 图片
                        if (req.body.imagesData) {
                            try {
                                const imagesData = typeof req.body.imagesData === 'string'
                                    ? JSON.parse(req.body.imagesData)
                                    : req.body.imagesData;

                                if (Array.isArray(imagesData)) {
                                    images.push(...imagesData);
                                }
                            } catch (e) {
                                logger.warn('[API] 解析 imagesData 失败:', e.message);
                            }
                        }

                        // 判断场景类型
                        let sceneType = 'text-to-image';
                        if (images.length === 1) {
                            sceneType = 'image-editing';
                        } else if (images.length > 1) {
                            sceneType = 'image-composition';
                        }

                        logger.info(`[API] 生成AI图片请求 - 场景: ${sceneType}, 图片数量: ${images.length}, 提示词: ${prompt.substring(0, 50)}...`);

                        // 生成图片
                        const imageBuffer = await googleImageService.generateImage({
                            prompt: prompt,
                            images: images.length > 0 ? images : undefined
                        });

                        logger.info(`[API] AI图片生成成功 - 大小: ${imageBuffer.length} bytes`);

                        // 根据返回格式处理
                        const format = returnFormat || 'base64';

                        if (format === 'file') {
                            // 直接返回图片文件
                            res.set({
                                'Content-Type': 'image/png',
                                'Content-Length': imageBuffer.length,
                                'Content-Disposition': 'attachment; filename="generated-image.png"'
                            });
                            res.send(imageBuffer);
                        } else {
                            // 返回 JSON（包含 base64）
                            const base64Image = imageBuffer.toString('base64');

                            res.json({
                                success: true,
                                message: 'AI图片生成成功',
                                data: {
                                    imageData: base64Image,
                                    mimeType: 'image/png',
                                    size: imageBuffer.length,
                                    prompt: prompt,
                                    sceneType: sceneType,
                                    inputImagesCount: images.length
                                },
                                timestamp: new Date().toISOString()
                            });
                        }

                    } catch (error) {
                        logger.error('[API] 生成AI图片失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 生成AI图片失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 图片文字识别（OCR）- 批量识别图片文字
        this.app.post('/api/image/ocr', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024, // 10MB per file
                        files: 50 // 最多50个文件
                    },
                    fileFilter: (req, file, cb) => {
                        // 验证文件类型
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持JPG、PNG、GIF、BMP格式的图片'));
                        }
                    }
                }).array('images', 50); // 支持上传多张图片，字段名为 images

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        // 验证是否上传了图片
                        if (!req.files || req.files.length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传至少一张图片'
                            });
                        }

                        logger.info(`[API] 图片文字识别请求 - 图片数量: ${req.files.length}`);

                        // 从环境变量读取腾讯云密钥
                        const secretId = process.env.TENCENTCLOUD_SECRET_ID;
                        const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;

                        if (!secretId || !secretKey) {
                            return res.status(500).json({
                                success: false,
                                error: 'Configuration Error',
                                message: '腾讯云OCR服务未配置，请在 .env 中设置 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY'
                            });
                        }

                        // 初始化腾讯云 OCR 客户端
                        const tencentcloud = require('tencentcloud-sdk-nodejs-ocr');
                        const OcrClient = tencentcloud.ocr.v20181119.Client;

                        const clientConfig = {
                            credential: {
                                secretId: secretId,
                                secretKey: secretKey,
                            },
                            region: "",
                            profile: {
                                httpProfile: {
                                    endpoint: "ocr.tencentcloudapi.com",
                                },
                            },
                        };

                        const client = new OcrClient(clientConfig);

                        // 对每张图片进行 OCR 识别
                        const ocrResults = [];
                        for (let i = 0; i < req.files.length; i++) {
                            const file = req.files[i];
                            logger.info(`[API] 正在识别第 ${i + 1}/${req.files.length} 张图片 - ${file.originalname}`);

                            try {
                                // 将图片转换为 base64
                                const imageBase64 = file.buffer.toString('base64');

                                // 调用腾讯云通用印刷体识别接口
                                const params = {
                                    ImageBase64: imageBase64
                                };

                                const data = await client.GeneralBasicOCR(params);

                                // 提取识别的文字内容
                                let recognizedText = '';
                                if (data.TextDetections && data.TextDetections.length > 0) {
                                    recognizedText = data.TextDetections
                                        .map(item => item.DetectedText)
                                        .join('\n');
                                }

                                ocrResults.push({
                                    index: i,
                                    filename: file.originalname,
                                    size: file.size,
                                    success: true,
                                    text: recognizedText,
                                    textCount: data.TextDetections ? data.TextDetections.length : 0,
                                    angle: data.Angel || 0 // 图片旋转角度
                                });

                                logger.info(`[API] 第 ${i + 1} 张图片识别成功 - 识别到 ${data.TextDetections ? data.TextDetections.length : 0} 行文字`);

                            } catch (error) {
                                logger.error(`[API] 第 ${i + 1} 张图片识别失败:`, error);
                                ocrResults.push({
                                    index: i,
                                    filename: file.originalname,
                                    size: file.size,
                                    success: false,
                                    error: error.message,
                                    text: ''
                                });
                            }
                        }

                        // 统计识别结果
                        const successCount = ocrResults.filter(r => r.success).length;
                        const failedCount = ocrResults.length - successCount;

                        logger.info(`[API] 图片文字识别完成 - 成功: ${successCount}, 失败: ${failedCount}`);

                        res.json({
                            success: true,
                            message: `图片文字识别完成，成功 ${successCount} 张，失败 ${failedCount} 张`,
                            data: {
                                totalImages: ocrResults.length,
                                successCount: successCount,
                                failedCount: failedCount,
                                results: ocrResults
                            },
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 图片文字识别失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 图片文字识别失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 智能稿件生成 - 根据图片素材和改写要求生成稿件（OCR + DeepSeek AI）
        this.app.post('/api/image/generate-article', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024, // 10MB per file
                        files: 50 // 最多50个文件
                    },
                    fileFilter: (req, file, cb) => {
                        // 验证文件类型
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持JPG、PNG、GIF、BMP格式的图片'));
                        }
                    }
                }).array('images', 50); // 支持上传多张图片，字段名为 images

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        // 获取改写要求参数
                        const { instruction, deepseekApiKey } = req.body;

                        // 验证是否上传了图片
                        if (!req.files || req.files.length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传至少一张图片素材'
                            });
                        }

                        // 验证是否提供了改写要求
                        if (!instruction || instruction.trim().length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请提供改写要求（instruction参数）'
                            });
                        }

                        logger.info(`[API] 智能稿件生成请求 - 图片数量: ${req.files.length}, 要求: ${instruction.substring(0, 50)}...`);

                        // 步骤1: 使用腾讯云 OCR 识别图片文字
                        logger.info('[API] 步骤1: 开始 OCR 识别图片文字...');

                        const secretId = process.env.TENCENTCLOUD_SECRET_ID;
                        const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;

                        if (!secretId || !secretKey) {
                            return res.status(500).json({
                                success: false,
                                error: 'Configuration Error',
                                message: '腾讯云OCR服务未配置，请在 .env 中设置 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY'
                            });
                        }

                        // 初始化腾讯云 OCR 客户端
                        const tencentcloud = require('tencentcloud-sdk-nodejs-ocr');
                        const OcrClient = tencentcloud.ocr.v20181119.Client;

                        const clientConfig = {
                            credential: {
                                secretId: secretId,
                                secretKey: secretKey,
                            },
                            region: "",
                            profile: {
                                httpProfile: {
                                    endpoint: "ocr.tencentcloudapi.com",
                                },
                            },
                        };

                        const client = new OcrClient(clientConfig);

                        // 对每张图片进行 OCR 识别
                        const ocrResults = [];
                        let allRecognizedText = [];

                        for (let i = 0; i < req.files.length; i++) {
                            const file = req.files[i];
                            logger.info(`[API] 正在识别第 ${i + 1}/${req.files.length} 张图片 - ${file.originalname}`);

                            try {
                                // 将图片转换为 base64
                                const imageBase64 = file.buffer.toString('base64');

                                // 调用腾讯云通用印刷体识别接口
                                const params = {
                                    ImageBase64: imageBase64
                                };

                                const data = await client.GeneralBasicOCR(params);

                                // 提取识别的文字内容
                                let recognizedText = '';
                                if (data.TextDetections && data.TextDetections.length > 0) {
                                    recognizedText = data.TextDetections
                                        .map(item => item.DetectedText)
                                        .join('\n');
                                }

                                ocrResults.push({
                                    index: i,
                                    filename: file.originalname,
                                    success: true,
                                    text: recognizedText,
                                    textCount: data.TextDetections ? data.TextDetections.length : 0
                                });

                                if (recognizedText) {
                                    allRecognizedText.push(`\n=== 图片 ${i + 1}: ${file.originalname} ===\n${recognizedText}`);
                                }

                                logger.info(`[API] 第 ${i + 1} 张图片识别成功 - 识别到 ${data.TextDetections ? data.TextDetections.length : 0} 行文字`);

                            } catch (error) {
                                logger.error(`[API] 第 ${i + 1} 张图片识别失败:`, error);
                                ocrResults.push({
                                    index: i,
                                    filename: file.originalname,
                                    success: false,
                                    error: error.message,
                                    text: ''
                                });
                            }
                        }

                        // 统计识别结果
                        const successCount = ocrResults.filter(r => r.success).length;
                        const failedCount = ocrResults.length - successCount;

                        logger.info(`[API] OCR 识别完成 - 成功: ${successCount}, 失败: ${failedCount}`);

                        // 如果没有识别到任何文字
                        if (allRecognizedText.length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '所有图片均未识别到文字内容，请确保图片包含清晰的文字',
                                data: {
                                    ocrResults: ocrResults
                                }
                            });
                        }

                        // 步骤2: 使用 DeepSeek 改写稿件
                        logger.info('[API] 步骤2: 使用 DeepSeek 改写稿件...');

                        // 如果客户端提供了 DeepSeek API Key，使用客户端的；否则使用服务器配置的
                        let deepseekService = this.deepseekService;
                        if (deepseekApiKey) {
                            logger.info('[API] 使用客户端提供的 DeepSeek API Key');
                            deepseekService = new DeepSeekService();
                            deepseekService.setApiKey(deepseekApiKey);
                        }

                        // 验证 DeepSeek 配置
                        const validation = deepseekService.validateConfig();
                        if (!validation.valid) {
                            return res.status(500).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `DeepSeek 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 DEEPSEEK_API_KEY，或在请求中提供 deepseekApiKey 参数`
                            });
                        }

                        // 合并所有识别的文字
                        const combinedText = allRecognizedText.join('\n\n');

                        // 调用 DeepSeek 进行改写
                        const rewrittenArticle = await deepseekService.rewriteArticle(combinedText, instruction);

                        logger.info(`[API] 稿件生成成功 - 原文长度: ${combinedText.length}, 改写后长度: ${rewrittenArticle.length}`);

                        // 返回结果
                        res.json({
                            success: true,
                            message: '稿件生成成功',
                            data: {
                                article: rewrittenArticle,
                                metadata: {
                                    totalImages: ocrResults.length,
                                    ocrSuccessCount: successCount,
                                    ocrFailedCount: failedCount,
                                    originalTextLength: combinedText.length,
                                    rewrittenTextLength: rewrittenArticle.length,
                                    instruction: instruction
                                },
                                ocrResults: ocrResults
                            },
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 智能稿件生成失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 智能稿件生成失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 翻译文本（单个翻译）
        this.app.post('/api/translate', this.authenticate.bind(this), async (req, res) => {
            try {
                const { text, from, to, raw } = req.body;

                // 参数验证
                if (!text) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: text（要翻译的文本）'
                    });
                }

                if (text.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '翻译文本不能为空'
                    });
                }

                logger.info(`[API] 翻译请求 - 文本长度: ${text.length}, 从 ${from || 'auto'} 到 ${to || 'en'}`);

                // 调用翻译服务
                const result = await this.translateService.translate(text, {
                    from: from || 'auto',
                    to: to || 'en',
                    raw: raw || false
                });

                logger.info(`[API] 翻译成功 - 检测语言: ${result.from.language.iso}, 结果长度: ${result.text.length}`);

                // 构建响应数据
                const responseData = {
                    translatedText: result.text,
                    originalText: text,
                    detectedLanguage: result.from.language.iso,
                    targetLanguage: to || 'en',
                    from: result.from,
                    raw: result.raw
                };

                // 如果有词典信息，添加到响应中
                if (result.dictionary) {
                    responseData.dictionary = result.dictionary;
                    logger.info(`[API] 包含词典信息 - 定义: ${result.dictionary.definitions.length}, 例句: ${result.dictionary.examples.length}`);
                }

                res.json({
                    success: true,
                    message: result.dictionary ? '单词查询成功' : '翻译成功',
                    data: responseData,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 翻译失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 批量翻译
        this.app.post('/api/translate/batch', this.authenticate.bind(this), async (req, res) => {
            try {
                const { texts, from, to } = req.body;

                // 参数验证
                if (!texts) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: texts（要翻译的文本数组）'
                    });
                }

                if (!Array.isArray(texts)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: 'texts 必须是数组'
                    });
                }

                if (texts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: 'texts 数组不能为空'
                    });
                }

                if (texts.length > 100) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '批量翻译最多支持 100 个文本'
                    });
                }

                logger.info(`[API] 批量翻译请求 - 文本数量: ${texts.length}, 从 ${from || 'auto'} 到 ${to || 'en'}`);

                // 调用批量翻译服务
                const results = await this.translateService.translateBatch(texts, {
                    from: from || 'auto',
                    to: to || 'en'
                });

                const successCount = results.filter(r => r.success).length;
                const failedCount = results.length - successCount;

                logger.info(`[API] 批量翻译完成 - 成功: ${successCount}, 失败: ${failedCount}`);

                res.json({
                    success: true,
                    message: `批量翻译完成，成功 ${successCount} 个，失败 ${failedCount} 个`,
                    data: {
                        totalCount: results.length,
                        successCount: successCount,
                        failedCount: failedCount,
                        results: results
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 批量翻译失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 获取支持的语言列表
        this.app.get('/api/translate/languages', this.authenticate.bind(this), async (req, res) => {
            try {
                logger.info('[API] 获取支持的语言列表');

                const languages = this.translateService.getSupportedLanguages();

                res.json({
                    success: true,
                    message: '获取语言列表成功',
                    data: {
                        languages: languages,
                        totalCount: Object.keys(languages).length
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('[API] 获取语言列表失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // DeepSeek AI对话接口处理函数
        const handleDeepSeekChat = async (req, res) => {
            try {
                const { messages, model, temperature, maxTokens, stream, deepseekApiKey, deepseekApiUrl } = req.body;

                // 参数验证
                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: '缺少必需参数: messages（消息数组，至少包含一条消息）'
                    });
                }

                // 验证 messages 格式
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (!msg.role || !msg.content) {
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `消息格式错误: messages[${i}] 必须包含 role 和 content 字段`
                        });
                    }
                    if (!['system', 'user', 'assistant'].includes(msg.role)) {
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `消息角色错误: messages[${i}].role 必须是 system, user 或 assistant`
                        });
                    }
                }

                const enableStream = stream === true;
                logger.info(`[API] DeepSeek Chat 请求 - 消息数量: ${messages.length}, 流式: ${enableStream}, 使用${deepseekApiKey ? '客户端' : '服务器'} API Key`);

                // 创建 DeepSeek 服务实例
                let deepseekService = this.deepseekService;

                // 如果客户端提供了 API Key 或 URL，使用客户端的配置
                if (deepseekApiKey || deepseekApiUrl) {
                    logger.info('[API] 使用客户端提供的 DeepSeek 配置');
                    const DeepSeekService = require('./deepseekService');
                    deepseekService = new DeepSeekService();
                    if (deepseekApiKey) deepseekService.setApiKey(deepseekApiKey);
                }

                // 验证配置
                const validation = deepseekService.validateConfig();
                if (!validation.valid) {
                    return res.status(500).json({
                        success: false,
                        error: 'Configuration Error',
                        message: `DeepSeek 配置错误: ${validation.errors.join(', ')}`
                    });
                }

                // 准备 API 请求参数
                const apiUrl = deepseekApiUrl || deepseekService.apiUrl;
                const apiModel = model || deepseekService.model;
                const apiTemperature = temperature !== undefined ? temperature : 0.7;
                const apiMaxTokens = maxTokens || 8000;

                logger.info(`[API] 调用 DeepSeek API - 模型: ${apiModel}, 温度: ${apiTemperature}, 最大tokens: ${apiMaxTokens}`);

                const axios = require('axios');

                // 流式响应
                if (enableStream) {
                    // 设置 SSE 响应头
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');
                    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

                    try {
                        const response = await axios.post(
                            apiUrl,
                            {
                                model: apiModel,
                                messages: messages,
                                temperature: apiTemperature,
                                max_tokens: apiMaxTokens,
                                stream: true
                            },
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${deepseekApiKey || deepseekService.apiKey}`
                                },
                                responseType: 'stream',
                                timeout: 0 // 流式响应不设超时
                            }
                        );

                        logger.info('[API] DeepSeek Stream 开始接收数据');

                        // 处理流式数据
                        response.data.on('data', (chunk) => {
                            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    // 直接转发 SSE 数据
                                    res.write(line + '\n\n');

                                    // 检查是否是结束标记
                                    if (line.includes('[DONE]')) {
                                        logger.info('[API] DeepSeek Stream 完成');
                                    }
                                }
                            }
                        });

                        response.data.on('end', () => {
                            logger.info('[API] DeepSeek Stream 连接关闭');
                            res.end();
                        });

                        response.data.on('error', (error) => {
                            logger.error('[API] DeepSeek Stream 错误:', error.message);
                            res.write(`data: {"error": "${error.message}"}\n\n`);
                            res.end();
                        });

                        // 处理客户端断开连接
                        req.on('close', () => {
                            logger.info('[API] 客户端断开连接');
                            response.data.destroy();
                        });

                    } catch (error) {
                        logger.error('[API] DeepSeek Stream 初始化失败:', error.message);

                        // 如果还没有发送响应头，发送错误
                        if (!res.headersSent) {
                            return res.status(500).json({
                                success: false,
                                error: 'Stream Error',
                                message: error.message
                            });
                        } else {
                            res.write(`data: {"error": "${error.message}"}\n\n`);
                            res.end();
                        }
                    }

                } else {
                    // 非流式响应（原有逻辑）
                    const response = await axios.post(
                        apiUrl,
                        {
                            model: apiModel,
                            messages: messages,
                            temperature: apiTemperature,
                            max_tokens: apiMaxTokens,
                            stream: false
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${deepseekApiKey || deepseekService.apiKey}`
                            },
                            timeout: deepseekService.timeout
                        }
                    );

                    // 验证响应格式
                    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                        throw new Error('DeepSeek API 返回数据格式错误');
                    }

                    const assistantMessage = response.data.choices[0].message.content;
                    const usage = response.data.usage || {};

                    logger.info(`[API] DeepSeek Chat 成功 - 回复长度: ${assistantMessage.length}`);
                    logger.info(`[API] Token 使用 - prompt: ${usage.prompt_tokens || 0}, completion: ${usage.completion_tokens || 0}, total: ${usage.total_tokens || 0}`);

                    // 返回完整响应
                    res.json({
                        success: true,
                        message: 'DeepSeek Chat 调用成功',
                        data: {
                            message: assistantMessage,
                            role: 'assistant',
                            model: apiModel,
                            usage: {
                                promptTokens: usage.prompt_tokens || 0,
                                completionTokens: usage.completion_tokens || 0,
                                totalTokens: usage.total_tokens || 0
                            },
                            raw: response.data
                        },
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                // 处理错误（仅用于非流式响应）
                let errorMessage = error.message;
                let statusCode = 500;

                // 记录完整的错误信息以便调试
                logger.error('[API] DeepSeek Chat 失败 - 错误类型:', error.code || error.name);
                logger.error('[API] DeepSeek Chat 失败 - 错误消息:', error.message);
                if (error.stack) {
                    logger.error('[API] DeepSeek Chat 失败 - 堆栈跟踪:', error.stack.split('\n').slice(0, 5).join('\n'));
                }

                // 特殊处理 axios 连接中断错误
                if (error.code === 'ECONNABORTED' || error.message === 'aborted') {
                    errorMessage = 'DeepSeek API 请求超时或连接中断，请稍后重试';
                    logger.error('[API] 请求被中断 - 可能原因: 客户端断开连接、网络超时或服务器超时');
                } else if (error.code === 'ETIMEDOUT') {
                    errorMessage = 'DeepSeek API 连接超时，请检查网络连接';
                } else if (error.response) {
                    statusCode = error.response.status;
                    const data = error.response.data;
                    logger.error('[API] DeepSeek API 响应错误 - 状态码:', statusCode);
                    logger.error('[API] DeepSeek API 响应数据:', JSON.stringify(data).substring(0, 500));

                    if (statusCode === 401) {
                        errorMessage = 'DeepSeek API Key 无效或权限不足';
                    } else if (statusCode === 429) {
                        errorMessage = 'DeepSeek API 请求频率超限，请稍后重试';
                    } else if (statusCode === 500) {
                        errorMessage = 'DeepSeek 服务器错误，请稍后重试';
                    } else if (data && data.error && data.error.message) {
                        errorMessage = `DeepSeek API 错误: ${data.error.message}`;
                    }
                }

                // 如果还没有发送响应，发送 JSON 错误
                if (!res.headersSent) {
                    res.status(statusCode).json({
                        success: false,
                        error: statusCode === 500 ? 'Internal Server Error' : 'API Error',
                        message: errorMessage
                    });
                }
            }
        };

        // 注册 DeepSeek 路由（支持两种路径格式）
        // 主路径: /api/deepseek/chat
        this.app.post('/api/deepseek/chat', this.authenticate.bind(this), handleDeepSeekChat);

        // 兼容路径: /api/deepseek/chat/completions (OpenAI 格式)
        this.app.post('/api/deepseek/chat/completions', this.authenticate.bind(this), handleDeepSeekChat);

        // OpenAI Chat Completions API 转接服务
        const handleOpenAIChat = async (req, res) => {
            try {
                const {
                    messages,
                    model,
                    temperature,
                    maxTokens,
                    max_tokens,
                    topP,
                    top_p,
                    frequencyPenalty,
                    frequency_penalty,
                    presencePenalty,
                    presence_penalty,
                    stop,
                    stream,
                    openaiApiKey,
                    openaiApiUrl
                } = req.body;

                // 验证必需参数
                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: 'messages 参数为必填项，且必须是非空数组'
                    });
                }

                // 验证每条消息的格式
                for (const msg of messages) {
                    if (!msg.role || !msg.content) {
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: '每条消息必须包含 role 和 content 字段'
                        });
                    }
                }

                // 使用客户端提供的配置或服务器默认配置
                const openaiService = this.openaiService;
                const useClientKey = !!openaiApiKey;

                if (useClientKey) {
                    logger.info('[API] 使用客户端提供的 OpenAI 配置');
                }

                // 处理参数（支持下划线和驼峰命名）
                const apiModel = model || openaiService.model;
                const apiTemperature = temperature !== undefined ? temperature : 1;
                const apiMaxTokens = maxTokens || max_tokens || openaiService.maxTokens;
                const apiTopP = topP || top_p;
                const apiFrequencyPenalty = frequencyPenalty || frequency_penalty;
                const apiPresencePenalty = presencePenalty || presence_penalty;
                const enableStream = stream === true;

                // 判断是否使用新的 max_completion_tokens 参数（gpt-5 系列模型）
                const useMaxCompletionTokens = apiModel && apiModel.startsWith('gpt-5');
                const maxTokensKey = useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens';

                logger.info(`[API] POST /api/openai/chat - IP: ${req.ip}`);
                logger.info(`[API] OpenAI Chat 请求 - 消息数量: ${messages.length}, 流式: ${enableStream}, 使用${useClientKey ? '客户端' : '服务器'} API Key`);
                logger.info(`[API] 调用 OpenAI API - 模型: ${apiModel}, 温度: ${apiTemperature}, 最大tokens: ${apiMaxTokens}, 参数: ${maxTokensKey}`);

                // 处理流式响应
                if (enableStream) {
                    try {
                        // 设置 SSE 响应头
                        res.setHeader('Content-Type', 'text/event-stream');
                        res.setHeader('Cache-Control', 'no-cache');
                        res.setHeader('Connection', 'keep-alive');
                        res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

                        logger.info('[API] OpenAI Stream 开始接收数据');

                        // 调用 OpenAI API
                        const requestBody = {
                            model: apiModel,
                            messages: messages,
                            temperature: apiTemperature,
                            [maxTokensKey]: apiMaxTokens,
                            top_p: apiTopP,
                            frequency_penalty: apiFrequencyPenalty,
                            presence_penalty: apiPresencePenalty,
                            stop: stop,
                            stream: true
                        };

                        const response = await axios.post(
                            openaiApiUrl || openaiService.apiUrl,
                            requestBody,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${openaiApiKey || openaiService.apiKey}`
                                },
                                responseType: 'stream',
                                timeout: 0 // 流式响应不设置超时
                            }
                        );

                        // 转发流式数据
                        response.data.on('data', (chunk) => {
                            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    // 直接转发 SSE 数据
                                    res.write(line + '\n\n');

                                    // 检查是否是结束标记
                                    if (line.includes('[DONE]')) {
                                        logger.info('[API] OpenAI Stream 完成');
                                    }
                                }
                            }
                        });

                        response.data.on('end', () => {
                            logger.info('[API] OpenAI Stream 连接关闭');
                            res.end();
                        });

                        response.data.on('error', (error) => {
                            logger.error('[API] OpenAI Stream 错误:', error.message);
                            res.write(`data: {"error": "${error.message}"}\n\n`);
                            res.end();
                        });

                        // 处理客户端断开连接
                        req.on('close', () => {
                            logger.info('[API] 客户端断开连接');
                            response.data.destroy();
                        });

                    } catch (error) {
                        logger.error('[API] OpenAI Stream 初始化失败:', error.message);

                        // 如果还没有发送响应头，发送错误
                        if (!res.headersSent) {
                            return res.status(500).json({
                                success: false,
                                error: 'Stream Error',
                                message: error.message
                            });
                        } else {
                            res.write(`data: {"error": "${error.message}"}\n\n`);
                            res.end();
                        }
                    }

                } else {
                    // 非流式响应
                    const requestBody = {
                        model: apiModel,
                        messages: messages,
                        temperature: apiTemperature,
                        [maxTokensKey]: apiMaxTokens,
                        top_p: apiTopP,
                        frequency_penalty: apiFrequencyPenalty,
                        presence_penalty: apiPresencePenalty,
                        stop: stop,
                        stream: false
                    };

                    const response = await axios.post(
                        openaiApiUrl || openaiService.apiUrl,
                        requestBody,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openaiApiKey || openaiService.apiKey}`
                            },
                            timeout: openaiService.timeout
                        }
                    );

                    // 验证响应格式
                    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                        throw new Error('OpenAI API 返回数据格式错误');
                    }

                    // 记录完整响应用于调试
                    const finishReason = response.data.choices[0].finish_reason;
                    const hasContent = !!response.data.choices[0].message.content;
                    const contentLength = response.data.choices[0].message.content?.length || 0;

                    logger.info(`[API] OpenAI 响应结构: ${JSON.stringify({
                        finish_reason: finishReason,
                        has_content: hasContent,
                        has_refusal: !!response.data.choices[0].message.refusal,
                        content_length: contentLength
                    })}`);

                    const assistantMessage = response.data.choices[0].message.content || '';
                    const usage = response.data.usage || {};

                    logger.info(`[API] OpenAI Chat 成功 - 回复长度: ${assistantMessage.length}`);
                    logger.info(`[API] Token 使用 - prompt: ${usage.prompt_tokens || 0}, completion: ${usage.completion_tokens || 0}, total: ${usage.total_tokens || 0}`);

                    // 检查是否因为 token 限制导致内容为空
                    let warningMessage = null;
                    if (finishReason === 'length' && !assistantMessage) {
                        warningMessage = '模型达到 token 限制，推理过程消耗了所有 tokens，建议增加 maxTokens 参数（推荐 16384 或更高）';
                        logger.warn(`[API] ${warningMessage}`);
                    }

                    // 返回完整响应
                    res.json({
                        success: true,
                        message: 'OpenAI Chat 调用成功',
                        data: {
                            message: assistantMessage,
                            role: 'assistant',
                            model: apiModel,
                            finishReason: finishReason,
                            warning: warningMessage,
                            usage: {
                                promptTokens: usage.prompt_tokens || 0,
                                completionTokens: usage.completion_tokens || 0,
                                totalTokens: usage.total_tokens || 0,
                                reasoningTokens: usage.completion_tokens_details?.reasoning_tokens || 0
                            },
                            raw: response.data
                        },
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                // 处理错误
                let errorMessage = error.message;
                let statusCode = 500;

                // 记录完整的错误信息以便调试
                logger.error('[API] OpenAI Chat 失败 - 错误类型:', error.code || error.name);
                logger.error('[API] OpenAI Chat 失败 - 错误消息:', error.message);
                if (error.stack) {
                    logger.error('[API] OpenAI Chat 失败 - 堆栈跟踪:', error.stack.split('\n').slice(0, 5).join('\n'));
                }

                // 特殊处理 axios 连接中断错误
                if (error.code === 'ECONNABORTED' || error.message === 'aborted') {
                    errorMessage = 'OpenAI API 请求超时或连接中断，请稍后重试';
                    logger.error('[API] 请求被中断 - 可能原因: 客户端断开连接、网络超时或服务器超时');
                } else if (error.code === 'ETIMEDOUT') {
                    errorMessage = 'OpenAI API 连接超时，请检查网络连接';
                } else if (error.response) {
                    statusCode = error.response.status;
                    const data = error.response.data;
                    logger.error('[API] OpenAI API 响应错误 - 状态码:', statusCode);
                    logger.error('[API] OpenAI API 响应数据:', JSON.stringify(data).substring(0, 500));

                    if (statusCode === 401) {
                        errorMessage = 'OpenAI API Key 无效或权限不足';
                    } else if (statusCode === 429) {
                        errorMessage = 'OpenAI API 请求频率超限，请稍后重试';
                    } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
                        errorMessage = 'OpenAI 服务器错误，请稍后重试';
                    } else if (data && data.error && data.error.message) {
                        errorMessage = `OpenAI API 错误: ${data.error.message}`;
                    }
                }

                // 如果还没有发送响应，发送 JSON 错误
                if (!res.headersSent) {
                    res.status(statusCode).json({
                        success: false,
                        error: statusCode === 500 ? 'Internal Server Error' : 'API Error',
                        message: errorMessage
                    });
                }
            }
        };

        // 注册 OpenAI 路由（支持两种路径格式）
        // 主路径: /api/openai/chat
        this.app.post('/api/openai/chat', this.authenticate.bind(this), handleOpenAIChat);

        // 兼容路径: /api/openai/chat/completions 和 /v1/chat/completions (标准 OpenAI 格式)
        this.app.post('/api/openai/chat/completions', this.authenticate.bind(this), handleOpenAIChat);
        this.app.post('/v1/chat/completions', this.authenticate.bind(this), handleOpenAIChat);

        // PDF文档识别（Paddle OCR）
        this.app.post('/api/paddle-ocr/pdf', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 50 * 1024 * 1024 // 50MB
                    },
                    fileFilter: (req, file, cb) => {
                        // 验证文件类型
                        if (file.mimetype === 'application/pdf') {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持 PDF 格式的文件'));
                        }
                    }
                }).single('file');

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] PDF 文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        // 验证是否上传了文件
                        if (!req.file) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传 PDF 文件'
                            });
                        }

                        // 获取参数
                        const {
                            useDocOrientationClassify,
                            useDocUnwarping,
                            useTextlineOrientation,
                            saveImages,
                            paddleApiUrl,
                            paddleToken
                        } = req.body;

                        logger.info(`[API] Paddle OCR PDF 识别请求 - 文件: ${req.file.originalname}, 大小: ${req.file.size} bytes`);

                        // 如果客户端提供了 API 配置，使用客户端的
                        let paddleOCRService = this.paddleOCRService;
                        if (paddleApiUrl || paddleToken) {
                            logger.info('[API] 使用客户端提供的 Paddle OCR 配置');
                            const PaddleOCRService = require('./paddleOCRService');
                            paddleOCRService = new PaddleOCRService();
                            if (paddleApiUrl) paddleOCRService.setApiUrl(paddleApiUrl);
                            if (paddleToken) paddleOCRService.setToken(paddleToken);
                        }

                        // 验证配置
                        const validation = paddleOCRService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Paddle OCR 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 PADDLE_OCR_API_URL 和 PADDLE_OCR_TOKEN，或在请求中提供 paddleApiUrl 和 paddleToken`
                            });
                        }

                        // 调用 OCR 服务
                        const path = require('path');
                        const filename = path.parse(req.file.originalname).name;

                        const result = await paddleOCRService.recognizePDF(req.file.buffer, {
                            useDocOrientationClassify: useDocOrientationClassify === 'true' || useDocOrientationClassify === true,
                            useDocUnwarping: useDocUnwarping === 'true' || useDocUnwarping === true,
                            useTextlineOrientation: useTextlineOrientation === 'true' || useTextlineOrientation === true,
                            saveImages: saveImages === 'true' || saveImages === true,
                            filename: filename
                        });

                        logger.info(`[API] PDF 识别成功 - 识别到 ${result.totalPages} 个页面`);

                        res.json({
                            success: true,
                            message: 'PDF 识别成功',
                            data: result,
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] PDF 识别失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] PDF 识别失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 图片识别（Paddle OCR）
        this.app.post('/api/paddle-ocr/image', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024 // 10MB
                    },
                    fileFilter: (req, file, cb) => {
                        // 验证文件类型
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持 JPG、PNG、GIF、BMP 格式的图片'));
                        }
                    }
                }).single('file');

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 图片文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        // 验证是否上传了文件
                        if (!req.file) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传图片文件'
                            });
                        }

                        // 获取参数
                        const {
                            useDocOrientationClassify,
                            useDocUnwarping,
                            useTextlineOrientation,
                            saveImages,
                            paddleApiUrl,
                            paddleToken
                        } = req.body;

                        logger.info(`[API] Paddle OCR 图片识别请求 - 文件: ${req.file.originalname}, 大小: ${req.file.size} bytes`);

                        // 如果客户端提供了 API 配置，使用客户端的
                        let paddleOCRService = this.paddleOCRService;
                        if (paddleApiUrl || paddleToken) {
                            logger.info('[API] 使用客户端提供的 Paddle OCR 配置');
                            const PaddleOCRService = require('./paddleOCRService');
                            paddleOCRService = new PaddleOCRService();
                            if (paddleApiUrl) paddleOCRService.setApiUrl(paddleApiUrl);
                            if (paddleToken) paddleOCRService.setToken(paddleToken);
                        }

                        // 验证配置
                        const validation = paddleOCRService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Paddle OCR 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 PADDLE_OCR_API_URL 和 PADDLE_OCR_TOKEN，或在请求中提供 paddleApiUrl 和 paddleToken`
                            });
                        }

                        // 调用 OCR 服务
                        const path = require('path');
                        const filename = path.parse(req.file.originalname).name;

                        const result = await paddleOCRService.recognizeImage(req.file.buffer, {
                            useDocOrientationClassify: useDocOrientationClassify === 'true' || useDocOrientationClassify === true,
                            useDocUnwarping: useDocUnwarping === 'true' || useDocUnwarping === true,
                            useTextlineOrientation: useTextlineOrientation === 'true' || useTextlineOrientation === true,
                            saveImages: saveImages === 'true' || saveImages === true,
                            filename: filename
                        });

                        logger.info(`[API] 图片识别成功 - 识别到 ${result.totalPages} 个区域`);

                        res.json({
                            success: true,
                            message: '图片识别成功',
                            data: result,
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 图片识别失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 图片识别失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 批量文档识别（Paddle OCR）
        this.app.post('/api/paddle-ocr/batch', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 50 * 1024 * 1024, // 50MB per file
                        files: 20 // 最多 20 个文件
                    },
                    fileFilter: (req, file, cb) => {
                        // 验证文件类型
                        const allowedTypes = [
                            'application/pdf',
                            'image/jpeg',
                            'image/jpg',
                            'image/png',
                            'image/gif',
                            'image/bmp'
                        ];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持 PDF、JPG、PNG、GIF、BMP 格式的文件'));
                        }
                    }
                }).array('files', 20);

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 批量文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        // 验证是否上传了文件
                        if (!req.files || req.files.length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传至少一个文件'
                            });
                        }

                        // 获取参数
                        const {
                            useDocOrientationClassify,
                            useDocUnwarping,
                            useTextlineOrientation,
                            saveImages,
                            paddleApiUrl,
                            paddleToken
                        } = req.body;

                        logger.info(`[API] Paddle OCR 批量识别请求 - 文件数量: ${req.files.length}`);

                        // 如果客户端提供了 API 配置，使用客户端的
                        let paddleOCRService = this.paddleOCRService;
                        if (paddleApiUrl || paddleToken) {
                            logger.info('[API] 使用客户端提供的 Paddle OCR 配置');
                            const PaddleOCRService = require('./paddleOCRService');
                            paddleOCRService = new PaddleOCRService();
                            if (paddleApiUrl) paddleOCRService.setApiUrl(paddleApiUrl);
                            if (paddleToken) paddleOCRService.setToken(paddleToken);
                        }

                        // 验证配置
                        const validation = paddleOCRService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Paddle OCR 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 PADDLE_OCR_API_URL 和 PADDLE_OCR_TOKEN，或在请求中提供 paddleApiUrl 和 paddleToken`
                            });
                        }

                        // 准备文件列表
                        const files = req.files.map(file => ({
                            buffer: file.buffer,
                            filename: file.originalname,
                            type: file.mimetype === 'application/pdf' ? 'pdf' : 'image'
                        }));

                        // 调用批量识别服务
                        const results = await paddleOCRService.recognizeBatch(files, {
                            useDocOrientationClassify: useDocOrientationClassify === 'true' || useDocOrientationClassify === true,
                            useDocUnwarping: useDocUnwarping === 'true' || useDocUnwarping === true,
                            useTextlineOrientation: useTextlineOrientation === 'true' || useTextlineOrientation === true,
                            saveImages: saveImages === 'true' || saveImages === true
                        });

                        const successCount = results.filter(r => r.success).length;
                        const failedCount = results.length - successCount;

                        logger.info(`[API] 批量识别完成 - 成功: ${successCount}, 失败: ${failedCount}`);

                        res.json({
                            success: true,
                            message: `批量识别完成，成功 ${successCount} 个，失败 ${failedCount} 个`,
                            data: {
                                totalFiles: results.length,
                                successCount: successCount,
                                failedCount: failedCount,
                                results: results
                            },
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 批量识别失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 批量识别失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // PDF布局解析（Paddle Layout）
        this.app.post('/api/paddle-layout/pdf', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 50 * 1024 * 1024 // 50MB
                    },
                    fileFilter: (req, file, cb) => {
                        if (file.mimetype === 'application/pdf') {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持 PDF 格式的文件'));
                        }
                    }
                }).single('file');

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] PDF 文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        if (!req.file) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传 PDF 文件'
                            });
                        }

                        const {
                            useDocOrientationClassify,
                            useDocUnwarping,
                            useChartRecognition,
                            saveFiles,
                            paddleLayoutApiUrl,
                            paddleLayoutToken
                        } = req.body;

                        logger.info(`[API] Paddle Layout PDF 解析请求 - 文件: ${req.file.originalname}, 大小: ${req.file.size} bytes`);

                        let paddleLayoutService = this.paddleLayoutService;
                        if (paddleLayoutApiUrl || paddleLayoutToken) {
                            logger.info('[API] 使用客户端提供的 Paddle Layout 配置');
                            const PaddleLayoutService = require('./paddleLayoutService');
                            paddleLayoutService = new PaddleLayoutService();
                            if (paddleLayoutApiUrl) paddleLayoutService.setApiUrl(paddleLayoutApiUrl);
                            if (paddleLayoutToken) paddleLayoutService.setToken(paddleLayoutToken);
                        }

                        const validation = paddleLayoutService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Paddle Layout 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 PADDLE_LAYOUT_API_URL 和 PADDLE_LAYOUT_TOKEN，或在请求中提供 paddleLayoutApiUrl 和 paddleLayoutToken`
                            });
                        }

                        const path = require('path');
                        const filename = path.parse(req.file.originalname).name;

                        const result = await paddleLayoutService.parsePDF(req.file.buffer, {
                            useDocOrientationClassify: useDocOrientationClassify === 'true' || useDocOrientationClassify === true,
                            useDocUnwarping: useDocUnwarping === 'true' || useDocUnwarping === true,
                            useChartRecognition: useChartRecognition === 'true' || useChartRecognition === true,
                            saveFiles: saveFiles === 'true' || saveFiles === true,
                            filename: filename
                        });

                        logger.info(`[API] PDF 布局解析成功 - 解析到 ${result.totalPages} 个页面`);

                        // 检查是否需要返回纯 Markdown 格式
                        const format = req.query.format || req.body.format;
                        if (format === 'markdown' || format === 'md') {
                            // 合并所有页面的 Markdown 文本
                            const allMarkdown = result.results.map(r => r.markdown.text).join('\n\n---\n\n');
                            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                            res.send(allMarkdown);
                        } else {
                            // 返回 JSON 格式
                            res.json({
                                success: true,
                                message: 'PDF 布局解析成功',
                                data: result,
                                timestamp: new Date().toISOString()
                            });
                        }

                    } catch (error) {
                        logger.error('[API] PDF 布局解析失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] PDF 布局解析失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 图片布局解析（Paddle Layout）
        this.app.post('/api/paddle-layout/image', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 10 * 1024 * 1024 // 10MB
                    },
                    fileFilter: (req, file, cb) => {
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持 JPG、PNG、GIF、BMP 格式的图片'));
                        }
                    }
                }).single('file');

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 图片文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        if (!req.file) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传图片文件'
                            });
                        }

                        const {
                            useDocOrientationClassify,
                            useDocUnwarping,
                            useChartRecognition,
                            saveFiles,
                            paddleLayoutApiUrl,
                            paddleLayoutToken
                        } = req.body;

                        logger.info(`[API] Paddle Layout 图片解析请求 - 文件: ${req.file.originalname}, 大小: ${req.file.size} bytes`);

                        let paddleLayoutService = this.paddleLayoutService;
                        if (paddleLayoutApiUrl || paddleLayoutToken) {
                            logger.info('[API] 使用客户端提供的 Paddle Layout 配置');
                            const PaddleLayoutService = require('./paddleLayoutService');
                            paddleLayoutService = new PaddleLayoutService();
                            if (paddleLayoutApiUrl) paddleLayoutService.setApiUrl(paddleLayoutApiUrl);
                            if (paddleLayoutToken) paddleLayoutService.setToken(paddleLayoutToken);
                        }

                        const validation = paddleLayoutService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Paddle Layout 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 PADDLE_LAYOUT_API_URL 和 PADDLE_LAYOUT_TOKEN，或在请求中提供 paddleLayoutApiUrl 和 paddleLayoutToken`
                            });
                        }

                        const path = require('path');
                        const filename = path.parse(req.file.originalname).name;

                        const result = await paddleLayoutService.parseImage(req.file.buffer, {
                            useDocOrientationClassify: useDocOrientationClassify === 'true' || useDocOrientationClassify === true,
                            useDocUnwarping: useDocUnwarping === 'true' || useDocUnwarping === true,
                            useChartRecognition: useChartRecognition === 'true' || useChartRecognition === true,
                            saveFiles: saveFiles === 'true' || saveFiles === true,
                            filename: filename
                        });

                        logger.info(`[API] 图片布局解析成功 - 解析到 ${result.totalPages} 个区域`);

                        // 检查是否需要返回纯 Markdown 格式
                        const format = req.query.format || req.body.format;
                        if (format === 'markdown' || format === 'md') {
                            // 合并所有区域的 Markdown 文本
                            const allMarkdown = result.results.map(r => r.markdown.text).join('\n\n---\n\n');
                            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                            res.send(allMarkdown);
                        } else {
                            // 返回 JSON 格式
                            res.json({
                                success: true,
                                message: '图片布局解析成功',
                                data: result,
                                timestamp: new Date().toISOString()
                            });
                        }

                    } catch (error) {
                        logger.error('[API] 图片布局解析失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 图片布局解析失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 批量布局解析（Paddle Layout）
        this.app.post('/api/paddle-layout/batch', this.authenticate.bind(this), async (req, res) => {
            try {
                const multer = require('multer');
                const upload = multer({
                    storage: multer.memoryStorage(),
                    limits: {
                        fileSize: 50 * 1024 * 1024,
                        files: 20
                    },
                    fileFilter: (req, file, cb) => {
                        const allowedTypes = [
                            'application/pdf',
                            'image/jpeg',
                            'image/jpg',
                            'image/png',
                            'image/gif',
                            'image/bmp'
                        ];
                        if (allowedTypes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('仅支持 PDF、JPG、PNG、GIF、BMP 格式的文件'));
                        }
                    }
                }).array('files', 20);

                upload(req, res, async (err) => {
                    if (err) {
                        logger.error('[API] 批量文件上传失败:', err);
                        return res.status(400).json({
                            success: false,
                            error: 'Bad Request',
                            message: `文件上传失败: ${err.message}`
                        });
                    }

                    try {
                        if (!req.files || req.files.length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'Bad Request',
                                message: '请上传至少一个文件'
                            });
                        }

                        const {
                            useDocOrientationClassify,
                            useDocUnwarping,
                            useChartRecognition,
                            saveFiles,
                            paddleLayoutApiUrl,
                            paddleLayoutToken
                        } = req.body;

                        logger.info(`[API] Paddle Layout 批量解析请求 - 文件数量: ${req.files.length}`);

                        let paddleLayoutService = this.paddleLayoutService;
                        if (paddleLayoutApiUrl || paddleLayoutToken) {
                            logger.info('[API] 使用客户端提供的 Paddle Layout 配置');
                            const PaddleLayoutService = require('./paddleLayoutService');
                            paddleLayoutService = new PaddleLayoutService();
                            if (paddleLayoutApiUrl) paddleLayoutService.setApiUrl(paddleLayoutApiUrl);
                            if (paddleLayoutToken) paddleLayoutService.setToken(paddleLayoutToken);
                        }

                        const validation = paddleLayoutService.validateConfig();
                        if (!validation.valid) {
                            return res.status(400).json({
                                success: false,
                                error: 'Configuration Error',
                                message: `Paddle Layout 配置错误: ${validation.errors.join(', ')}。请在 .env 中设置 PADDLE_LAYOUT_API_URL 和 PADDLE_LAYOUT_TOKEN，或在请求中提供 paddleLayoutApiUrl 和 paddleLayoutToken`
                            });
                        }

                        const files = req.files.map(file => ({
                            buffer: file.buffer,
                            filename: file.originalname,
                            type: file.mimetype === 'application/pdf' ? 'pdf' : 'image'
                        }));

                        const results = await paddleLayoutService.parseBatch(files, {
                            useDocOrientationClassify: useDocOrientationClassify === 'true' || useDocOrientationClassify === true,
                            useDocUnwarping: useDocUnwarping === 'true' || useDocUnwarping === true,
                            useChartRecognition: useChartRecognition === 'true' || useChartRecognition === true,
                            saveFiles: saveFiles === 'true' || saveFiles === true
                        });

                        const successCount = results.filter(r => r.success).length;
                        const failedCount = results.length - successCount;

                        logger.info(`[API] 批量布局解析完成 - 成功: ${successCount}, 失败: ${failedCount}`);

                        res.json({
                            success: true,
                            message: `批量布局解析完成，成功 ${successCount} 个，失败 ${failedCount} 个`,
                            data: {
                                totalFiles: results.length,
                                successCount: successCount,
                                failedCount: failedCount,
                                results: results
                            },
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        logger.error('[API] 批量布局解析失败:', error);
                        res.status(500).json({
                            success: false,
                            error: 'Internal Server Error',
                            message: error.message
                        });
                    }
                });

            } catch (error) {
                logger.error('[API] 批量布局解析失败:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message
                });
            }
        });

        // 404处理
        this.app.use((req, res) => {
            // 确保 404 响应包含 CORS 头部
            res.header('Access-Control-Allow-Origin', '*');
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: '接口不存在'
            });
        });

        // 错误处理
        this.app.use((err, req, res, next) => {
            logger.error('[API] 服务器错误:', err);
            // 确保错误响应包含 CORS 头部
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: err.message
            });
        });
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            // 初始化数据库连接
            try {
                await database.init();
                logger.info('[API] 数据库初始化成功');
            } catch (error) {
                logger.warn('[API] 数据库初始化失败（将继续运行，但图片URL不会保存到数据库）:', error.message);
            }

            return new Promise((resolve, reject) => {
                try {
                    this.server = this.app.listen(this.port, () => {
                        logger.info(`[API] 服务器已启动在端口 ${this.port}`);
                        if (!this.apiKey) {
                            logger.warn('[API] ⚠️  警告: API_KEY未设置，建议在生产环境中设置API密钥');
                        }
                        resolve(this.server);
                    });

                    this.server.on('error', (error) => {
                        logger.error('[API] 服务器启动失败:', error);
                        reject(error);
                    });

                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * 停止服务器
     */
    async stop() {
        return new Promise(async (resolve, reject) => {
            if (this.server) {
                this.server.close(async (err) => {
                    if (err) {
                        logger.error('[API] 服务器停止失败:', err);
                        reject(err);
                    } else {
                        logger.info('[API] 服务器已停止');

                        // 关闭数据库连接
                        try {
                            await database.close();
                        } catch (error) {
                            logger.warn('[API] 关闭数据库连接失败:', error.message);
                        }

                        resolve();
                    }
                });
            } else {
                // 关闭数据库连接
                try {
                    await database.close();
                } catch (error) {
                    logger.warn('[API] 关闭数据库连接失败:', error.message);
                }
                resolve();
            }
        });
    }
}

// 如果直接运行此文件
if (require.main === module) {
    // 使用 override: true 让 .env 文件优先于系统环境变量
    require('dotenv').config({ override: true });

    const server = new APIServer();
    server.start().catch(error => {
        console.error('启动API服务器失败:', error);
        process.exit(1);
    });

    // 优雅退出
    process.on('SIGINT', async () => {
        console.log('\n正在停止API服务器...');
        await server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n正在停止API服务器...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = APIServer;

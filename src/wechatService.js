const axios = require('axios');
const { marked } = require('marked');
const sharp = require('sharp');

/**
 * 微信公众号服务
 */
class WechatService {
    constructor() {
        this.appId = process.env.WECHAT_APP_ID;
        this.appSecret = process.env.WECHAT_APP_SECRET;
        this.accessToken = null;
        this.tokenExpireTime = 0;
    }

    /**
     * 获取访问令牌
     * @returns {Promise<string>} access_token
     */
    async getAccessToken() {
        try {
            // 检查token是否过期
            if (this.accessToken && Date.now() < this.tokenExpireTime) {
                return this.accessToken;
            }

            console.log('正在获取微信访问令牌...');
            const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
            
            const response = await axios.get(url, { timeout: 10000 });
            
            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                // 提前5分钟过期，确保token有效性
                this.tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000;
                console.log('访问令牌获取成功');
                return this.accessToken;
            } else {
                throw new Error(`获取access_token失败: ${response.data.errmsg}`);
            }
        } catch (error) {
            console.error('获取访问令牌失败:', error.message);
            throw error;
        }
    }

    /**
     * 压缩图片
     * @param {Buffer} imageBuffer 原始图片Buffer
     * @param {number} targetSizeKB 目标大小(KB)，默认1024KB(1MB)
     * @returns {Promise<Buffer>} 压缩后的图片Buffer
     */
    async compressImage(imageBuffer, targetSizeKB = 1024) {
        const originalSizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
        console.log(`[压缩] 原始图片大小: ${originalSizeMB}MB`);

        // 如果图片小于目标大小，直接返回
        if (imageBuffer.length <= targetSizeKB * 1024) {
            console.log('[压缩] 图片无需压缩');
            return imageBuffer;
        }

        try {
            // 获取图片元数据
            const metadata = await sharp(imageBuffer).metadata();
            console.log(`[压缩] 图片格式: ${metadata.format}, 尺寸: ${metadata.width}x${metadata.height}`);

            // 设置初始质量
            let quality = 90;
            let compressedBuffer = imageBuffer;
            let attempts = 0;
            const maxAttempts = 5;

            // 多次尝试压缩直到达到目标大小
            while (compressedBuffer.length > targetSizeKB * 1024 && attempts < maxAttempts) {
                attempts++;

                const sharpInstance = sharp(imageBuffer);

                // 根据格式选择压缩方式
                if (metadata.format === 'png') {
                    compressedBuffer = await sharpInstance
                        .png({ quality, compressionLevel: 9 })
                        .toBuffer();
                } else if (metadata.format === 'gif') {
                    // GIF转为JPEG进行压缩
                    compressedBuffer = await sharpInstance
                        .jpeg({ quality })
                        .toBuffer();
                } else {
                    // JPEG和其他格式
                    compressedBuffer = await sharpInstance
                        .jpeg({ quality })
                        .toBuffer();
                }

                const currentSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
                console.log(`[压缩] 第${attempts}次尝试 - 质量:${quality}, 大小:${currentSizeMB}MB`);

                // 降低质量继续压缩
                quality -= 15;
                if (quality < 30) quality = 30; // 最低质量限制
            }

            // 如果还是太大，尝试缩小尺寸
            if (compressedBuffer.length > targetSizeKB * 1024) {
                console.log('[压缩] 质量压缩不够，尝试缩小尺寸');
                let scaleFactor = 0.8;

                while (compressedBuffer.length > targetSizeKB * 1024 && scaleFactor > 0.3) {
                    const newWidth = Math.floor(metadata.width * scaleFactor);
                    const newHeight = Math.floor(metadata.height * scaleFactor);

                    compressedBuffer = await sharp(imageBuffer)
                        .resize(newWidth, newHeight, { fit: 'inside' })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    const currentSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
                    console.log(`[压缩] 缩放至 ${newWidth}x${newHeight}, 大小:${currentSizeMB}MB`);

                    scaleFactor -= 0.1;
                }
            }

            const finalSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
            const compressionRatio = ((1 - compressedBuffer.length / imageBuffer.length) * 100).toFixed(1);
            console.log(`[压缩] 压缩完成 - 原始:${originalSizeMB}MB, 压缩后:${finalSizeMB}MB, 压缩率:${compressionRatio}%`);

            return compressedBuffer;
        } catch (error) {
            console.error('[压缩] 图片压缩失败:', error.message);
            console.log('[压缩] 使用原始图片');
            return imageBuffer;
        }
    }

    /**
     * 上传图文消息图片（返回URL）
     * @param {Buffer} imageBuffer 图片Buffer数据
     * @param {string} filename 文件名
     * @param {string} contentType 图片类型
     * @returns {Promise<string>} 图片URL
     */
    async uploadNewsImage(imageBuffer, filename = 'image.jpg', contentType = 'image/jpeg') {
        try {
            console.log('正在上传图文消息图片...');
            const accessToken = await this.getAccessToken();

            // 验证图片大小（微信要求图片大小不超过10MB）
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (imageBuffer.length > maxSize) {
                throw new Error(`图片过大(${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)，微信公众号要求图片不超过10MB`);
            }

            // 如果图片大于2MB，自动压缩
            const compressThreshold = 2 * 1024 * 1024; // 2MB
            if (imageBuffer.length > compressThreshold) {
                console.log('[上传] 图片超过2MB，开始压缩...');
                imageBuffer = await this.compressImage(imageBuffer, 2048); // 压缩到2MB以下
            }

            console.log('[DEBUG] 图片验证通过, 大小:', imageBuffer.length, 'bytes');

            const FormData = require('form-data');
            const form = new FormData();

            console.log('[DEBUG] 准备上传, filename:', filename, 'contentType:', contentType);

            // 添加图片到表单
            form.append('media', imageBuffer, {
                filename: filename,
                contentType: contentType
            });

            // 使用上传图文消息图片接口
            const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`;

            console.log('[DEBUG] 上传URL:', uploadUrl.replace(accessToken, 'TOKEN'));

            const uploadResponse = await axios.post(uploadUrl, form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const uploadResult = uploadResponse.data;
            console.log('[DEBUG] 微信上传图文消息图片API响应:', JSON.stringify(uploadResult));

            if (uploadResult.url) {
                console.log('[SUCCESS] 图文消息图片上传成功, url:', uploadResult.url);
                return uploadResult.url;
            } else {
                const errorMsg = `图片上传到微信失败 - errcode: ${uploadResult.errcode}, errmsg: ${uploadResult.errmsg}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            // 增强错误信息
            if (error.response) {
                console.error('[ERROR] HTTP状态码:', error.response.status);
                console.error('[ERROR] 响应数据:', JSON.stringify(error.response.data));
                throw new Error(`上传图片失败(${error.response.status}): ${JSON.stringify(error.response.data)}`);
            } else {
                console.error('上传图片失败:', error.message);
                throw error;
            }
        }
    }

    /**
     * 上传图片素材（永久素材，用于草稿）
     * @param {string} imageUrl 图片URL或base64字符串
     * @returns {Promise<string>} media_id
     */
    async uploadImage(imageUrl) {
        try {
            console.log('正在上传图片素材（永久素材）...');
            const accessToken = await this.getAccessToken();

            let imageBuffer;
            let contentType = 'image/png';
            let filename = 'cover.png';

            // 判断是否为base64格式
            if (imageUrl.startsWith('data:image/')) {
                console.log('[DEBUG] 检测到base64格式图片');

                // 解析base64字符串
                const matches = imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                if (!matches) {
                    throw new Error('无效的base64图片格式');
                }

                const imageType = matches[1].toLowerCase();
                const base64Data = matches[2];

                // 检查图片格式
                if (imageType === 'svg+xml' || imageType === 'svg') {
                    throw new Error('微信公众号不支持SVG格式图片，请使用JPG、PNG或GIF格式');
                }

                // 将base64转换为Buffer
                imageBuffer = Buffer.from(base64Data, 'base64');
                console.log('[DEBUG] base64图片解码成功, 大小:', imageBuffer.length, 'bytes');

                // 设置contentType和filename
                if (imageType === 'jpeg' || imageType === 'jpg') {
                    contentType = 'image/jpeg';
                    filename = 'cover.jpg';
                } else if (imageType === 'png') {
                    contentType = 'image/png';
                    filename = 'cover.png';
                } else if (imageType === 'gif') {
                    contentType = 'image/gif';
                    filename = 'cover.gif';
                } else {
                    // 默认使用原始类型
                    contentType = `image/${imageType}`;
                    filename = `cover.${imageType}`;
                }
            } else {
                // URL格式，下载图片
                let imageResponse;
                try {
                    console.log('[DEBUG] 开始下载图片:', imageUrl);
                    imageResponse = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    console.log('[DEBUG] 图片下载成功, 大小:', imageResponse.data.length, 'bytes, Content-Type:', imageResponse.headers['content-type']);

                    // 检查图片格式
                    const responseContentType = imageResponse.headers['content-type'] || '';
                    if (responseContentType.includes('svg')) {
                        throw new Error(`微信公众号不支持SVG格式图片，请使用JPG、PNG或GIF格式。当前图片: ${imageUrl}`);
                    }

                    imageBuffer = imageResponse.data;
                    contentType = responseContentType || 'image/png';

                    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                        filename = 'cover.jpg';
                    } else if (contentType.includes('gif')) {
                        filename = 'cover.gif';
                    } else {
                        filename = 'cover.png';
                    }
                } catch (downloadError) {
                    if (downloadError.response && downloadError.response.status === 404) {
                        throw new Error(`封面图片URL无法访问(404): ${imageUrl}，请确保图片URL可公网访问`);
                    } else if (downloadError.response && downloadError.response.status === 412) {
                        throw new Error(`图片服务器返回412错误，可能需要特定的请求头: ${imageUrl}`);
                    } else if (downloadError.code === 'ECONNREFUSED') {
                        throw new Error(`无法连接到图片服务器: ${imageUrl}`);
                    } else {
                        throw new Error(`下载封面图片失败: ${downloadError.message}`);
                    }
                }
            }

            // 验证图片大小（微信要求图片大小不超过2MB）
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (imageBuffer.length > maxSize) {
                throw new Error(`图片过大(${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)，微信公众号要求图片不超过2MB`);
            }

            console.log('[DEBUG] 图片验证通过, 大小:', imageBuffer.length, 'bytes');

            const FormData = require('form-data');
            const form = new FormData();

            console.log('[DEBUG] 准备上传, filename:', filename, 'contentType:', contentType);

            // 直接使用Buffer而不是Stream
            form.append('media', imageBuffer, {
                filename: filename,
                contentType: contentType
            });

            // 使用永久素材上传接口
            const uploadUrl = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;

            console.log('[DEBUG] 上传URL:', uploadUrl.replace(accessToken, 'TOKEN'));

            const uploadResponse = await axios.post(uploadUrl, form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const uploadResult = uploadResponse.data;
            console.log('[DEBUG] 微信永久素材上传API响应:', JSON.stringify(uploadResult));

            if (uploadResult.media_id) {
                console.log('[SUCCESS] 永久素材上传成功, media_id:', uploadResult.media_id);
                return uploadResult.media_id;
            } else if (uploadResult.url) {
                // 有些情况下返回url而不是media_id
                console.log('[SUCCESS] 图片上传成功, url:', uploadResult.url);
                return uploadResult.media_id || uploadResult.url;
            } else {
                const errorMsg = `图片上传到微信失败 - errcode: ${uploadResult.errcode}, errmsg: ${uploadResult.errmsg}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            // 增强错误信息
            if (error.response) {
                console.error('[ERROR] HTTP状态码:', error.response.status);
                console.error('[ERROR] 响应数据:', JSON.stringify(error.response.data));
                throw new Error(`上传图片失败(${error.response.status}): ${JSON.stringify(error.response.data)}`);
            } else {
                console.error('上传图片失败:', error.message);
                throw error;
            }
        }
    }

    /**
     * 创建草稿
     * @param {Object} articleData 文章数据
     * @returns {Promise<string>} media_id
     */
    async createDraft(articleData, titleMode = 'smart') {
        try {
            console.log('正在创建公众号草稿...');
            const accessToken = await this.getAccessToken();

            const { title, content, author = '', digest = '', imageUrl, sourceUrl = '', pic_crop_1_1, pic_crop_235_1 } = articleData;

            // 验证并优化标题以符合微信公众号限制
            console.log(`使用${titleMode}模式处理标题: ${title}`);
            const validatedTitle = this.validateAndTruncateTitle(title, titleMode);

            // 将markdown格式的内容转换为HTML格式
            console.log('正在将Markdown内容转换为HTML格式...');
            const htmlContent = this.convertMarkdownToHtml(content);

            let thumbMediaId;
            let finalImageUrl = imageUrl;
            let useDefaultImage = false; // 标记是否使用了默认图片

            // 如果没有提供封面图片，使用默认图片
            if (!finalImageUrl) {
                console.warn('未提供封面图片URL');

                // 检查环境变量中是否配置了默认图片
                if (process.env.DEFAULT_COVER_IMAGE) {
                    finalImageUrl = process.env.DEFAULT_COVER_IMAGE;
                    useDefaultImage = true;
                    console.log(`使用环境变量配置的默认封面图: ${finalImageUrl}`);
                } else {
                    // 如果没有配置默认图片，抛出错误
                    throw new Error('未提供封面图片URL，且未配置DEFAULT_COVER_IMAGE环境变量。请提供imageUrl参数或在.env中配置DEFAULT_COVER_IMAGE');
                }
            }

            // 尝试上传封面图片，如果失败则使用默认图片
            try {
                thumbMediaId = await this.uploadImage(finalImageUrl);
            } catch (uploadError) {
                console.error(`封面图片上传失败: ${uploadError.message}`);

                // 如果上传失败且配置了默认图片，尝试使用默认图片
                if (process.env.DEFAULT_COVER_IMAGE && finalImageUrl !== process.env.DEFAULT_COVER_IMAGE) {
                    console.log('尝试使用默认封面图...');
                    finalImageUrl = process.env.DEFAULT_COVER_IMAGE;
                    useDefaultImage = true;
                    thumbMediaId = await this.uploadImage(finalImageUrl);
                    console.log('使用默认封面图上传成功');
                } else {
                    // 如果没有默认图片或默认图片本身就失败了，抛出错误
                    throw uploadError;
                }
            }

            const article = {
                title: validatedTitle,
                author: author,
                digest: digest || content.substring(0, 100) + '...',
                content: htmlContent,
                thumb_media_id: thumbMediaId,
                need_open_comment: 0,
                only_fans_can_comment: 0
            };

            // 只有在未使用默认图片时才添加图片裁剪参数
            if (!useDefaultImage) {
                if (pic_crop_1_1 !== undefined && pic_crop_1_1 !== null) {
                    article.pic_crop_1_1 = pic_crop_1_1;
                    console.log('[DEBUG] 添加图片裁剪参数 pic_crop_1_1:', pic_crop_1_1);
                }

                if (pic_crop_235_1 !== undefined && pic_crop_235_1 !== null) {
                    article.pic_crop_235_1 = pic_crop_235_1;
                    console.log('[DEBUG] 添加图片裁剪参数 pic_crop_235_1:', pic_crop_235_1);
                }
            } else {
                console.log('[DEBUG] 使用默认图片，跳过图片裁剪参数');
            }

            const draftData = {
                articles: [article]
            };
            console.log('[DEBUG] 准备创建草稿, thumb_media_id:', thumbMediaId);
            console.log('[DEBUG] thumb_media_id 类型:', typeof thumbMediaId, '长度:', thumbMediaId ? thumbMediaId.length : 0);

            const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;

            const response = await axios.post(url, draftData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            console.log('[DEBUG] 微信创建草稿API响应:', JSON.stringify(response.data));

            if (response.data.media_id) {
                console.log('[SUCCESS] 草稿创建成功，media_id:', response.data.media_id);
                return response.data.media_id;
            } else {
                console.error('[ERROR] 草稿创建失败:', JSON.stringify(response.data));
                throw new Error(`创建草稿失败: ${response.data.errmsg || JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.error('创建草稿失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取草稿列表
     * @param {number} offset 从全部素材的该偏移位置开始返回，0表示从第一个素材
     * @param {number} count 返回素材的数量，取值在1到20之间
     * @param {boolean} noContent 是否返回 content 字段，1表示不返回
     * @returns {Promise<Object>} 草稿列表
     */
    async getDraftList(offset = 0, count = 20, noContent = 1) {
        try {
            console.log(`正在获取草稿列表 - offset: ${offset}, count: ${count}, no_content: ${noContent}`);
            const accessToken = await this.getAccessToken();

            const requestData = {
                offset,
                count,
                no_content: noContent
            };

            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${accessToken}`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data.errcode === 0 || response.data.item) {
                console.log(`草稿列表获取成功，共 ${response.data.total_count} 个草稿`);
                return {
                    total_count: response.data.total_count,
                    item_count: response.data.item_count,
                    items: response.data.item || []
                };
            } else {
                console.error('获取草稿列表失败:', JSON.stringify(response.data));
                throw new Error(`获取草稿列表失败: ${response.data.errmsg}`);
            }
        } catch (error) {
            console.error('获取草稿列表失败:', error.message);
            throw error;
        }
    }

    /**
     * 删除草稿
     * @param {string} mediaId 草稿的media_id
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteDraft(mediaId) {
        try {
            console.log(`正在删除草稿 - media_id: ${mediaId}`);
            const accessToken = await this.getAccessToken();

            const requestData = {
                media_id: mediaId
            };

            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=${accessToken}`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data.errcode === 0) {
                console.log(`草稿删除成功 - media_id: ${mediaId}`);
                return true;
            } else {
                console.error('删除草稿失败:', JSON.stringify(response.data));
                throw new Error(`删除草稿失败: ${response.data.errmsg}`);
            }
        } catch (error) {
            console.error('删除草稿失败:', error.message);
            throw error;
        }
    }

    /**
     * 删除全部草稿
     * @returns {Promise<Object>} 删除结果统计
     */
    async deleteAllDrafts() {
        try {
            console.log('正在删除全部草稿...');

            let totalDeleted = 0;
            let failedCount = 0;
            let failedItems = [];

            const batchSize = 20; // 每次获取20个

            while (true) {
                // 始终从offset=0获取,因为删除后列表会变化
                const draftList = await this.getDraftList(0, batchSize, 1);

                if (!draftList.items || draftList.items.length === 0) {
                    break; // 没有更多草稿了
                }

                console.log(`正在删除剩余 ${draftList.total_count} 个草稿中的 ${draftList.items.length} 个...`);

                // 逐个删除草稿
                for (const item of draftList.items) {
                    try {
                        await this.deleteDraft(item.media_id);
                        totalDeleted++;
                        // 添加短暂延迟,避免请求过快
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        failedCount++;
                        failedItems.push({
                            media_id: item.media_id,
                            error: error.message
                        });
                        console.error(`删除草稿失败 - media_id: ${item.media_id}, 错误: ${error.message}`);
                    }
                }
            }

            const result = {
                success: true,
                total_deleted: totalDeleted,
                failed_count: failedCount,
                failed_items: failedItems
            };

            console.log(`草稿删除完成 - 成功: ${totalDeleted}, 失败: ${failedCount}`);

            return result;
        } catch (error) {
            console.error('删除全部草稿失败:', error.message);
            throw error;
        }
    }

    /**
     * 发布草稿
     * @param {string} mediaId 草稿的media_id
     * @returns {Promise<string>} 发布结果
     */
    async publishDraft(mediaId) {
        try {
            console.log('正在发布草稿...');
            const accessToken = await this.getAccessToken();
            
            const publishData = {
                media_id: mediaId
            };

            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${accessToken}`,
                publishData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.errcode === 0) {
                console.log('草稿发布成功，publish_id:', response.data.publish_id);
                return response.data.publish_id;
            } else {
                console.error('草稿发布失败:', JSON.stringify(response.data));
                throw new Error(`发布草稿失败: ${response.data.errmsg}`);
            }
        } catch (error) {
            console.error('发布草稿失败:', error.message);
            throw error;
        }
    }

    /**
     * 查询发布状态
     * @param {string} publishId 发布任务的publish_id
     * @returns {Promise<Object>} 发布状态信息
     */
    async getPublishStatus(publishId) {
        try {
            const accessToken = await this.getAccessToken();
            
            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${accessToken}`,
                {
                    publish_id: publishId
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.errcode === 0) {
                return {
                    status: response.data.publish_status,
                    statusText: this.getPublishStatusText(response.data.publish_status),
                    failReason: response.data.fail_reason || '',
                    articleId: response.data.article_id || '',
                    articleUrl: response.data.article_url || ''
                };
            } else {
                throw new Error(`查询发布状态失败: ${response.data.errmsg}`);
            }
        } catch (error) {
            console.error('查询发布状态失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取发布状态文本描述
     * @param {number} status 发布状态码
     * @returns {string} 状态描述
     */
    getPublishStatusText(status) {
        const statusMap = {
            0: '发布成功',
            1: '发布失败',
            2: '审核中',
            3: '原创校验中',
            4: '原创校验失败',
            5: '成功后用户删除所有文章'
        };
        return statusMap[status] || '未知状态';
    }

    /**
     * 将markdown格式转换为HTML格式
     * @param {string} markdownContent markdown格式的内容
     * @returns {string} HTML格式的内容
     */
    convertMarkdownToHtml(markdownContent) {
        try {
            // 配置marked选项，适合微信公众号
            marked.setOptions({
                breaks: true,        // 支持换行符转换为<br>
                gfm: true,          // 支持GitHub风格的markdown
                sanitize: false,    // 不过滤HTML标签
                smartLists: true,   // 智能列表
                smartypants: false  // 不转换引号等字符
            });

            // 转换markdown为HTML
            const htmlContent = marked(markdownContent);
            
            // 微信公众号HTML样式优化
            const styledHtml = this.optimizeHtmlForWechat(htmlContent);
            
            console.log('Markdown转HTML成功');
            return styledHtml;
        } catch (error) {
            console.error('Markdown转HTML失败:', error.message);
            // 如果转换失败，返回原始内容
            return markdownContent;
        }
    }

    /**
     * 优化HTML内容以适配微信公众号
     * @param {string} htmlContent 原始HTML内容
     * @returns {string} 优化后的HTML内容
     */
    optimizeHtmlForWechat(htmlContent) {
        let optimizedHtml = htmlContent;

        // 为段落添加样式
        optimizedHtml = optimizedHtml.replace(/<p>/g, '<p style="margin: 10px 0; line-height: 1.6; text-align: justify;">');
        
        // 为标题添加样式
        optimizedHtml = optimizedHtml.replace(/<h1>/g, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; color: #333;">');
        optimizedHtml = optimizedHtml.replace(/<h2>/g, '<h2 style="font-size: 20px; font-weight: bold; margin: 18px 0 8px 0; color: #333;">');
        optimizedHtml = optimizedHtml.replace(/<h3>/g, '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0 6px 0; color: #333;">');
        
        // 为列表添加样式
        optimizedHtml = optimizedHtml.replace(/<ul>/g, '<ul style="margin: 10px 0; padding-left: 20px;">');
        optimizedHtml = optimizedHtml.replace(/<ol>/g, '<ol style="margin: 10px 0; padding-left: 20px;">');
        optimizedHtml = optimizedHtml.replace(/<li>/g, '<li style="margin: 5px 0; line-height: 1.6;">');
        
        // 为强调文本添加样式
        optimizedHtml = optimizedHtml.replace(/<strong>/g, '<strong style="font-weight: bold; color: #d32f2f;">');
        optimizedHtml = optimizedHtml.replace(/<em>/g, '<em style="font-style: italic; color: #1976d2;">');
        
        // 为引用添加样式
        optimizedHtml = optimizedHtml.replace(/<blockquote>/g, '<blockquote style="margin: 15px 0; padding: 10px 15px; border-left: 4px solid #ddd; background-color: #f9f9f9; font-style: italic;">');

        return optimizedHtml;
    }

    /**
     * 智能优化标题以符合微信公众号限制
     * @param {string} title 原始标题
     * @param {string} mode 处理模式: 'smart'(智能), 'simple'(简单截断), 'extract'(提取关键词)
     * @returns {string} 处理后的标题
     */
    validateAndTruncateTitle(title, mode = 'smart') {
        const MAX_TITLE_BYTES = 64; // 微信公众号标题最大字节数
        
        if (!title) {
            return '无标题';
        }

        // 检查字节长度
        const titleBytes = Buffer.byteLength(title, 'utf8');
        
        if (titleBytes <= MAX_TITLE_BYTES) {
            console.log(`标题长度检查通过: ${title.length}字符, ${titleBytes}字节`);
            return title;
        }

        console.log(`标题过长，需要优化: ${title.length}字符, ${titleBytes}字节 > ${MAX_TITLE_BYTES}字节`);
        console.log(`使用${mode}模式处理标题`);
        
        let optimizedTitle = '';
        
        switch (mode) {
            case 'smart':
                optimizedTitle = this.smartTitleOptimization(title, MAX_TITLE_BYTES);
                break;
            case 'extract':
                optimizedTitle = this.extractKeywordsTitle(title, MAX_TITLE_BYTES);
                break;
            case 'simple':
            default:
                optimizedTitle = this.simpleTruncateTitle(title, MAX_TITLE_BYTES);
                break;
        }
        
        const finalBytes = Buffer.byteLength(optimizedTitle, 'utf8');
        console.log(`标题优化完成: ${optimizedTitle.length}字符, ${finalBytes}字节`);
        console.log(`优化后标题: ${optimizedTitle}`);
        
        return optimizedTitle;
    }

    /**
     * 智能标题优化 - 保留最有趣和最重要的部分
     * @param {string} title 原始标题
     * @param {number} maxBytes 最大字节数
     * @returns {string} 优化后的标题
     */
    smartTitleOptimization(title, maxBytes) {
        // 定义关键词优先级（越高越重要）
        const keywordPriority = {
            // 时间相关
            '今天': 3, '明天': 3, '昨天': 3,
            '2025': 2, '2024': 2, '年': 1, '月': 1, '日': 1,
            
            // 有趣的表达
            '喵呜': 5, '喵喵': 5, '两脚兽': 4, '教授': 3,
            '新闻罐头': 5, 'Wi-Fi': 4, '尾巴天线': 4,
            '小鱼干': 4, '本喵': 4,
            
            // 动作词
            '截获': 3, '带着': 2, '准备': 2, '看看': 2,
            
            // 修饰词
            '新鲜': 3, '重点': 3, '好多': 2
        };

        // 尝试不同的组合策略
        const strategies = [
            // 策略1: 保留开头的称呼 + 核心内容
            () => this.buildTitleFromParts(title, ['喵呜~', '新闻罐头', 'Wi-Fi尾巴天线', '小鱼干'], maxBytes),
            
            // 策略2: 保留时间 + 特色词汇
            () => this.buildTitleFromParts(title, ['今天', '喵喵酱', '新闻罐头', 'Wi-Fi'], maxBytes),
            
            // 策略3: 保留最有特色的部分
            () => this.buildTitleFromParts(title, ['两脚兽教授', '本喵喵酱', 'Wi-Fi尾巴天线'], maxBytes),
            
            // 策略4: 简化版本
            () => this.buildTitleFromParts(title, ['喵呜~', '今天', '新闻'], maxBytes)
        ];

        // 尝试每个策略，返回第一个成功的
        for (const strategy of strategies) {
            const result = strategy();
            if (result && Buffer.byteLength(result, 'utf8') <= maxBytes) {
                return result;
            }
        }

        // 如果所有策略都失败，使用简单截断
        return this.simpleTruncateTitle(title, maxBytes);
    }

    /**
     * 从标题中构建包含指定关键词的新标题
     * @param {string} originalTitle 原始标题
     * @param {string[]} keywords 要包含的关键词
     * @param {number} maxBytes 最大字节数
     * @returns {string} 构建的标题
     */
    buildTitleFromParts(originalTitle, keywords, maxBytes) {
        const foundParts = [];
        
        // 查找包含关键词的部分
        for (const keyword of keywords) {
            if (originalTitle.includes(keyword)) {
                // 找到关键词周围的上下文
                const index = originalTitle.indexOf(keyword);
                let start = Math.max(0, index - 5);
                let end = Math.min(originalTitle.length, index + keyword.length + 5);
                
                // 调整边界到合适的位置（避免截断字符）
                while (start > 0 && !/[，。！？~\s]/.test(originalTitle[start - 1])) {
                    start--;
                }
                while (end < originalTitle.length && !/[，。！？~\s]/.test(originalTitle[end])) {
                    end++;
                }
                
                const part = originalTitle.substring(start, end).trim();
                if (part && !foundParts.includes(part)) {
                    foundParts.push(part);
                }
            }
        }

        if (foundParts.length === 0) {
            return null;
        }

        // 组合找到的部分
        let result = foundParts.join(' ');
        
        // 如果还是太长，尝试只用最重要的部分
        if (Buffer.byteLength(result, 'utf8') > maxBytes - 3) {
            result = foundParts[0];
        }
        
        // 如果还是太长，进行截断
        if (Buffer.byteLength(result, 'utf8') > maxBytes - 3) {
            result = this.simpleTruncateTitle(result, maxBytes);
        } else {
            result += '...';
        }

        return result;
    }

    /**
     * 提取关键词生成标题
     * @param {string} title 原始标题
     * @param {number} maxBytes 最大字节数
     * @returns {string} 关键词标题
     */
    extractKeywordsTitle(title, maxBytes) {
        // 提取关键信息
        const keywords = [];
        
        // 提取时间信息
        const timeMatch = title.match(/\d{4}年\d{1,2}月\d{1,2}日/);
        if (timeMatch) {
            keywords.push(timeMatch[0]);
        } else if (title.includes('今天')) {
            keywords.push('今天');
        }
        
        // 提取特色词汇
        const specialWords = ['喵呜', '喵喵酱', '两脚兽', '新闻罐头', 'Wi-Fi', '小鱼干'];
        for (const word of specialWords) {
            if (title.includes(word) && keywords.length < 3) {
                keywords.push(word);
            }
        }
        
        // 添加通用词
        if (keywords.length < 2) {
            keywords.push('新闻速递');
        }

        let result = keywords.join(' ') + '...';
        
        // 确保不超过字节限制
        if (Buffer.byteLength(result, 'utf8') > maxBytes) {
            result = keywords[0] + '...';
        }

        return result;
    }

    /**
     * 简单截断标题（原来的方法）
     * @param {string} title 原始标题
     * @param {number} maxBytes 最大字节数
     * @returns {string} 截断后的标题
     */
    simpleTruncateTitle(title, maxBytes) {
        let truncatedTitle = '';
        let currentBytes = 0;
        
        for (let i = 0; i < title.length; i++) {
            const char = title[i];
            const charBytes = Buffer.byteLength(char, 'utf8');
            
            if (currentBytes + charBytes > maxBytes - 3) {
                break;
            }
            
            truncatedTitle += char;
            currentBytes += charBytes;
        }
        
        return truncatedTitle + '...';
    }

    /**
     * 设置微信公众号配置
     * @param {string} appId 应用ID
     * @param {string} appSecret 应用密钥
     */
    setConfig(appId, appSecret) {
        this.appId = appId;
        this.appSecret = appSecret;
        // 重置token
        this.accessToken = null;
        this.tokenExpireTime = 0;
    }

    /**
     * 解析文章标题和内容
     * @param {string} article 完整文章
     * @returns {Object} 解析后的文章数据
     */
    parseArticle(article) {
        const lines = article.split('\n');
        let title = '';
        let content = '';
        
        // 查找标题（通常是第一行或包含"标题"的行）
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('#') && line.length > 5 && line.length < 100) {
                title = line.replace(/^#+\s*/, '').replace(/^标题[:：]\s*/, '');
                content = lines.slice(i + 1).join('\n').trim();
                break;
            }
        }
        
        // 如果没找到合适的标题，使用默认标题
        if (!title) {
            title = '今日新闻速览';
            content = article;
        }
        
        return { title, content };
    }
}

module.exports = WechatService;
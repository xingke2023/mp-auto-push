# 微信公众号自动推送 API 文档

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在 `.env` 文件中添加以下配置：

```env
# 微信公众号配置（必需）
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# API服务配置
API_PORT=5003
API_KEY=your_secure_api_key_here
```

### 3. 启动API服务

```bash
# 生产环境
npm run api

# 开发环境
npm run api:dev
```

服务启动后会在配置的端口（默认5003）监听请求。

---

## API 接口说明

### 基础信息

- **Base URL**: `http://your-server:5003`
- **认证方式**: API Key（通过请求头 `X-API-Key` 或 `Authorization: Bearer <API_KEY>`）
- **请求格式**: `application/json`
- **响应格式**: `application/json`

---

## 接口列表

### 1. 健康检查

**接口**: `GET /health`

**描述**: 检查API服务是否正常运行

**请求示例**:
```bash
curl http://localhost:5003/health
```

**响应示例**:
```json
{
  "success": true,
  "status": "running",
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

---

### 2. 创建草稿

**接口**: `POST /api/draft/create`

**描述**: 创建微信公众号草稿（不发布）

**请求头**:
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

**请求参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | 是 | 文章标题（会自动优化以符合微信64字节限制） |
| content | string | 是 | 文章内容（支持Markdown格式） |
| imageUrl | string | 条件必需 | 封面图片URL（必须可公网访问）。如未配置DEFAULT_COVER_IMAGE则必需 |
| author | string | 否 | 作者名称（默认：喵酱） |
| digest | string | 否 | 文章摘要（默认：自动截取前100字） |
| sourceUrl | string | 否 | 原文链接 |
| titleMode | string | 否 | 标题处理模式：`smart`(智能保留关键词)/`simple`(简单截断)/`extract`(提取关键词)，默认：smart |

**请求示例**:
```bash
# 示例1：提供封面图（推荐）
curl -X POST http://localhost:5003/api/draft/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "title": "今日科技新闻速览",
    "content": "## 重点新闻\n\n1. 人工智能技术突破\n2. 新能源汽车销量创新高\n\n详细内容...",
    "imageUrl": "https://your-domain.com/cover.jpg",
    "author": "小编",
    "digest": "今日科技新闻精选"
  }'

# 示例2：不提供封面图（需要在.env中配置DEFAULT_COVER_IMAGE）
curl -X POST http://localhost:5003/api/draft/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "title": "今日新闻速览",
    "content": "## 新闻内容\n\n详细报道...",
    "author": "编辑部"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "草稿创建成功",
  "data": {
    "mediaId": "media_id_string_from_wechat",
    "title": "今日科技新闻速览"
  },
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

---

### 3. 发布草稿

**接口**: `POST /api/draft/publish`

**描述**: 发布已创建的草稿到微信公众号

**请求头**:
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

**请求参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| mediaId | string | 是 | 草稿ID（创建草稿接口返回的mediaId） |

**请求示例**:
```bash
curl -X POST http://localhost:5003/api/draft/publish \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "mediaId": "media_id_string_from_wechat"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "草稿发布请求已提交",
  "data": {
    "publishId": "publish_id_from_wechat",
    "mediaId": "media_id_string_from_wechat"
  },
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

---

### 4. 创建并发布草稿（一步到位）

**接口**: `POST /api/draft/create-and-publish`

**描述**: 创建草稿并立即发布到微信公众号

**请求头**:
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

**请求参数**: 同"创建草稿"接口

**请求示例**:
```bash
curl -X POST http://localhost:5003/api/draft/create-and-publish \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "title": "今日科技新闻速览",
    "content": "## 重点新闻\n\n1. 人工智能技术突破\n2. 新能源汽车销量创新高",
    "imageUrl": "https://example.com/cover.jpg"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "草稿创建并发布成功",
  "data": {
    "mediaId": "media_id_string_from_wechat",
    "publishId": "publish_id_from_wechat",
    "title": "今日科技新闻速览"
  },
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

---

### 5. 上传图文消息图片

**接口**: `POST /api/media/upload-image`

**描述**: 上传图片到微信服务器，获取可在图文消息中使用的图片URL

**请求头**:
```
Content-Type: multipart/form-data
X-API-Key: your_api_key_here
```

**请求参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| media | file | 是 | 图片文件（支持JPG、PNG、GIF格式，最大10MB） |

**请求示例**:
```bash
# cURL 示例
curl -X POST http://localhost:5003/api/media/upload-image \
  -H "X-API-Key: your_api_key_here" \
  -F "media=@/path/to/image.jpg"
```

**响应示例**:
```json
{
  "success": true,
  "message": "图片上传成功",
  "data": {
    "url": "http://mmbiz.qpic.cn/mmbiz_jpg/xxx/0?wx_fmt=jpeg"
  },
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

**错误示例**:
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "仅支持JPG、PNG和GIF格式的图片"
}
```

**注意事项**:
- 上传的图片会存储在微信服务器，返回的URL可以在图文消息内容中使用
- 图片大小不能超过10MB
- 仅支持JPG、PNG、GIF格式
- 返回的URL是微信CDN地址，长期有效

---

### 6. 查询发布状态

**接口**: `POST /api/publish/status`

**描述**: 查询文章发布状态

**请求头**:
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

**请求参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| publishId | string | 是 | 发布任务ID（发布接口返回的publishId） |

**请求示例**:
```bash
curl -X POST http://localhost:5003/api/publish/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "publishId": "publish_id_from_wechat"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "status": 0,
    "statusText": "发布成功",
    "failReason": "",
    "articleId": "article_id",
    "articleUrl": "https://mp.weixin.qq.com/s/xxx"
  },
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

**发布状态说明**:

| 状态码 | 说明 |
|--------|------|
| 0 | 发布成功 |
| 1 | 发布失败 |
| 2 | 审核中 |
| 3 | 原创校验中 |
| 4 | 原创校验失败 |
| 5 | 成功后用户删除所有文章 |

---

## 错误响应

所有接口在发生错误时返回统一格式：

```json
{
  "success": false,
  "error": "错误类型",
  "message": "错误详细信息"
}
```

**常见错误码**:

| HTTP状态码 | 错误类型 | 说明 |
|-----------|---------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | API密钥无效或未提供 |
| 404 | Not Found | 接口不存在 |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 使用示例

### Python 示例

```python
import requests

API_URL = "http://localhost:5003"
API_KEY = "your_api_key_here"

def create_and_publish_draft():
    url = f"{API_URL}/api/draft/create-and-publish"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    data = {
        "title": "今日新闻速览",
        "content": "## 重点新闻\n\n1. 新闻内容1\n2. 新闻内容2",
        "imageUrl": "https://example.com/image.jpg",
        "author": "编辑部"
    }

    response = requests.post(url, json=data, headers=headers)
    result = response.json()

    if result["success"]:
        print(f"发布成功！mediaId: {result['data']['mediaId']}")
    else:
        print(f"发布失败：{result['message']}")

if __name__ == "__main__":
    create_and_publish_draft()
```

### JavaScript/Node.js 示例

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:5003';
const API_KEY = 'your_api_key_here';

// 示例1: 创建并发布草稿
async function createAndPublishDraft() {
    try {
        const response = await axios.post(
            `${API_URL}/api/draft/create-and-publish`,
            {
                title: '今日新闻速览',
                content: '## 重点新闻\n\n1. 新闻内容1\n2. 新闻内容2',
                imageUrl: 'https://example.com/image.jpg',
                author: '编辑部'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                }
            }
        );

        if (response.data.success) {
            console.log(`发布成功！mediaId: ${response.data.data.mediaId}`);
        }
    } catch (error) {
        console.error('发布失败:', error.response?.data || error.message);
    }
}

// 示例2: 上传图片
async function uploadImage(imagePath) {
    try {
        const form = new FormData();
        form.append('media', fs.createReadStream(imagePath));

        const response = await axios.post(
            `${API_URL}/api/media/upload-image`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'X-API-Key': API_KEY
                }
            }
        );

        if (response.data.success) {
            console.log(`图片上传成功！URL: ${response.data.data.url}`);
            return response.data.data.url;
        }
    } catch (error) {
        console.error('上传失败:', error.response?.data || error.message);
    }
}

// 使用
createAndPublishDraft();
// uploadImage('/path/to/image.jpg');
```

### cURL 完整工作流示例

```bash
# 1. 创建草稿
RESPONSE=$(curl -s -X POST http://localhost:5003/api/draft/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "title": "测试文章",
    "content": "这是测试内容",
    "imageUrl": "https://example.com/image.jpg"
  }')

# 2. 提取 mediaId
MEDIA_ID=$(echo $RESPONSE | jq -r '.data.mediaId')
echo "草稿创建成功，mediaId: $MEDIA_ID"

# 3. 发布草稿
PUBLISH_RESPONSE=$(curl -s -X POST http://localhost:5003/api/draft/publish \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d "{\"mediaId\": \"$MEDIA_ID\"}")

# 4. 提取 publishId
PUBLISH_ID=$(echo $PUBLISH_RESPONSE | jq -r '.data.publishId')
echo "发布请求已提交，publishId: $PUBLISH_ID"

# 5. 等待3秒后查询状态
sleep 3

# 6. 查询发布状态
curl -X POST http://localhost:5003/api/publish/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d "{\"publishId\": \"$PUBLISH_ID\"}"
```

---

## 安全建议

1. **强密码**: 使用强随机密码作为 API_KEY
   ```bash
   # 生成安全的API密钥
   openssl rand -hex 32
   ```

2. **HTTPS**: 生产环境务必使用 HTTPS 加密传输

3. **防火墙**: 配置防火墙限制API访问来源IP

4. **请求限流**: 建议在反向代理层（如Nginx）配置请求限流

5. **日志监控**: 定期检查 `logs/` 目录下的访问日志

---

## PM2 部署（推荐）

使用 PM2 管理API服务进程：

```bash
# 创建 PM2 配置文件 ecosystem.api.config.js
module.exports = {
  apps: [{
    name: 'mp-api-server',
    script: './src/apiServer.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}

# 启动服务
pm2 start ecosystem.api.config.js

# 查看状态
pm2 status mp-api-server

# 查看日志
pm2 logs mp-api-server

# 重启服务
pm2 restart mp-api-server
```

---

## 常见问题

### Q: 为什么接口返回 401 错误？
A: 请检查是否在请求头中正确设置了 `X-API-Key` 或 `Authorization` 字段，并确保API密钥与 `.env` 中配置的一致。

### Q: 为什么创建草稿失败？
A: 请确保：
1. 微信公众号配置正确（WECHAT_APP_ID 和 WECHAT_APP_SECRET）
2. 封面图片URL可公网访问且在中国大陆可访问（微信服务器在国内）
3. 标题和内容符合微信公众号规范
4. 如果不提供imageUrl，必须在.env中配置DEFAULT_COVER_IMAGE

### Q: 封面图URL要求是什么？
A: 封面图要求：
1. ✅ 必须是 HTTP/HTTPS 协议
2. ✅ 必须可公网访问（不能是内网地址）
3. ✅ 必须在中国大陆可访问（微信服务器在国内）
4. ✅ **图片格式支持：JPG、PNG、GIF（不支持SVG、WebP）**
5. ✅ 建议尺寸：800x600 或更大
6. ⚠️ 国外图床可能不稳定，建议使用国内CDN
7. ✅ 推荐：自己服务器、七牛云、阿里云OSS、腾讯云COS

### Q: titleMode参数有什么作用？
A: 当标题超过微信64字节限制时，`titleMode` 控制如何处理：

**smart模式（默认，推荐）**：
- 智能保留重要关键词
- 例如："喵呜~ 今日新闻罐头 Wi-Fi尾巴天线..."
- 适合有特色词汇的标题

**simple模式**：
- 简单从前往后截断
- 例如："喵呜~ 本喵喵酱今天截获两脚兽教..."
- 适合普通标题

**extract模式**：
- 提取关键词重组
- 例如："今天 喵喵酱 新闻罐头..."
- 适合需要保留核心信息的标题

使用方法：
```json
{
  "title": "很长的标题...",
  "content": "内容",
  "titleMode": "smart"
}
```

### Q: 为什么发布后文章没有立即显示？
A: 微信公众号文章发布可能需要审核，可以通过"查询发布状态"接口检查发布进度。

### Q: 如何在公网部署？
A: 建议使用 Nginx 作为反向代理，配置 HTTPS 证书，并设置合理的访问限制。

---

## 技术支持

如有问题，请查看：
- 项目 README.md
- 日志文件: `logs/app.log` 和 `logs/error.log`
- GitHub Issues

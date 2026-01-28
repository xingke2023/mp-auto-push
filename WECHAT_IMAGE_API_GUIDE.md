# 微信版 AI 图片生成 API 使用指南

## 接口说明

本接口将 Google Gemini 2.5 Flash Image 生成的图片自动上传到微信公众号，并返回微信图片 URL。

**流程**：
1. 使用 Google Gemini 生成 AI 图片
2. 自动上传图片到微信公众号
3. 返回微信图片 URL（可直接用于微信公众号文章）

## 接口地址

```
POST /api/image/generate-wechat
```

## 认证方式

请求时需要在 Header 中携带 API Key：

```
X-API-Key: your_api_key_here
```

或者使用 Bearer Token：

```
Authorization: Bearer your_api_key_here
```

## 配置说明

### 服务器配置

在 `.env` 文件中配置：

```bash
# Google AI API Key（必需）
GOOGLE_API_KEY=your_google_api_key_here

# 微信公众号配置（必需）
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# API 服务器认证密钥（必需）
API_KEY=your_api_key
```

### 客户端提供凭证（可选）

客户端可以在请求中提供自己的 Google API Key 和微信凭证：

```json
{
  "prompt": "your prompt",
  "apiKey": "客户端的Google_API_Key",
  "appId": "客户端的微信AppID",
  "appsecret": "客户端的微信AppSecret"
}
```

## 请求参数

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| prompt | string | 图片描述提示词 |

### 可选参数

| 参数 | 类型 | 说明 |
|------|------|------|
| apiKey | string | 客户端的 Google API Key |
| appId | string | 客户端的微信 AppID |
| appsecret | string | 客户端的微信 AppSecret |
| images | file[] | 输入图片（用于修改或组合场景） |
| imagesData | array | Base64 格式的图片数组 |

## 使用示例

### 场景一：生成 Nano Banana 并上传微信

#### 方法 1：cURL

```bash
curl -X POST http://localhost:5003/api/image/generate-wechat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
  }'
```

#### 方法 2：Node.js

```javascript
const axios = require('axios');

async function generateNanoBananaForWechat() {
  try {
    const response = await axios.post('http://localhost:5003/api/image/generate-wechat', {
      prompt: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
      }
    });

    if (response.data.success) {
      const { wechatImageUrl, imageSize, sceneType } = response.data.data;

      console.log('✓ 图片生成并上传微信成功！');
      console.log('✓ 微信图片URL:', wechatImageUrl);
      console.log('✓ 图片大小:', (imageSize / 1024).toFixed(2), 'KB');
      console.log('✓ 场景类型:', sceneType);

      // 可以直接在微信公众号文章中使用这个 URL
      return wechatImageUrl;
    }
  } catch (error) {
    console.error('✗ 错误:', error.response?.data || error.message);
  }
}

generateNanoBananaForWechat();
```

#### 方法 3：Python

```python
import requests

def generate_nano_banana_for_wechat():
    url = 'http://localhost:5003/api/image/generate-wechat'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    }
    data = {
        'prompt': 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
    }

    response = requests.post(url, json=data, headers=headers)

    if response.status_code == 200 and response.json()['success']:
        result = response.json()
        wechat_url = result['data']['wechatImageUrl']
        image_size = result['data']['imageSize']

        print('✓ 图片生成并上传微信成功！')
        print(f'✓ 微信图片URL: {wechat_url}')
        print(f'✓ 图片大小: {image_size / 1024:.2f} KB')

        return wechat_url
    else:
        print('✗ 错误:', response.json())

if __name__ == '__main__':
    generate_nano_banana_for_wechat()
```

### 场景二：使用客户端凭证

```bash
curl -X POST http://localhost:5003/api/image/generate-wechat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana dish",
    "apiKey": "客户端的Google_API_Key",
    "appId": "客户端的微信AppID",
    "appsecret": "客户端的微信AppSecret"
  }'
```

### 场景三：修改图片并上传微信

```bash
curl -X POST http://localhost:5003/api/image/generate-wechat \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Add a wizard hat to this image" \
  -F "images=@cat.png"
```

Node.js 示例：

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function editImageForWechat() {
  const form = new FormData();
  form.append('prompt', 'Add a wizard hat to this image');
  form.append('images', fs.createReadStream('cat.png'));

  const response = await axios.post('http://localhost:5003/api/image/generate-wechat', form, {
    headers: {
      ...form.getHeaders(),
      'X-API-Key': 'your_api_key'
    }
  });

  if (response.data.success) {
    console.log('微信图片URL:', response.data.data.wechatImageUrl);
  }
}

editImageForWechat();
```

### 场景四：组合多张图片并上传微信

```bash
curl -X POST http://localhost:5003/api/image/generate-wechat \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Combine these images into a fashion photo" \
  -F "images=@dress.png" \
  -F "images=@model.png"
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "message": "AI图片生成并上传微信成功",
  "data": {
    "wechatImageUrl": "https://mmbiz.qpic.cn/...",
    "imageSize": 524288,
    "prompt": "Create a picture of a nano banana dish...",
    "sceneType": "text-to-image",
    "inputImagesCount": 0
  },
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Configuration Error",
  "message": "Google AI 配置错误: GOOGLE_API_KEY 未配置"
}
```

## 场景类型

API 会自动判断场景类型：

| sceneType | 说明 | 触发条件 |
|-----------|------|----------|
| text-to-image | 文本转图片 | 不提供输入图片 |
| image-editing | 修改图片 | 提供 1 张输入图片 |
| image-composition | 组合图片 | 提供 2 张或更多输入图片 |

## 完整示例：生成图片并创建微信草稿

```javascript
const axios = require('axios');

async function createWechatDraftWithAIImage() {
  const API_BASE_URL = 'http://localhost:5003';
  const API_KEY = 'your_api_key';

  try {
    // 1. 生成 AI 图片并上传到微信
    console.log('📸 正在生成 Nano Banana 图片...');

    const imageResponse = await axios.post(`${API_BASE_URL}/api/image/generate-wechat`, {
      prompt: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    if (!imageResponse.data.success) {
      throw new Error('图片生成失败: ' + imageResponse.data.message);
    }

    const wechatImageUrl = imageResponse.data.data.wechatImageUrl;
    console.log('✓ 图片已上传到微信');
    console.log('✓ 微信图片URL:', wechatImageUrl);

    // 2. 使用微信图片URL创建草稿
    console.log('\n📝 正在创建微信公众号草稿...');

    const draftResponse = await axios.post(`${API_BASE_URL}/api/draft/create`, {
      title: '探索未来美食：Nano Banana 的奇幻之旅',
      content: `
        <p>欢迎来到未来餐厅，体验前所未有的 Nano Banana 美食之旅！</p>
        <img src="${wechatImageUrl}" />
        <p>这道充满科技感的料理将带您进入一个全新的美食世界...</p>
      `,
      author: 'AI 美食探索者',
      digest: '体验未来美食，探索 Nano Banana 的无限可能',
      imageUrl: wechatImageUrl
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    if (draftResponse.data.success) {
      console.log('✓ 草稿创建成功！');
      console.log('✓ Media ID:', draftResponse.data.data.mediaId);
      console.log('✓ 标题:', draftResponse.data.data.title);
    }

  } catch (error) {
    console.error('✗ 错误:', error.response?.data || error.message);
  }
}

createWechatDraftWithAIImage();
```

## 与普通接口的区别

| 特性 | `/api/image/generate` | `/api/image/generate-wechat` |
|------|----------------------|------------------------------|
| 返回格式 | base64 图片数据 | 微信图片 URL |
| 用途 | 通用图片生成 | 专门用于微信公众号 |
| 需要微信配置 | ❌ 不需要 | ✅ 需要 |
| 可直接用于微信文章 | ❌ 需要手动上传 | ✅ 可以直接使用 URL |
| 响应速度 | 较快（只生成） | 较慢（生成+上传） |

## 常见问题

### Q: 需要配置哪些参数？

A: 最少需要配置三个：
1. `GOOGLE_API_KEY` - Google AI API Key
2. `WECHAT_APP_ID` - 微信公众号 AppID
3. `WECHAT_APP_SECRET` - 微信公众号 AppSecret

### Q: 生成需要多长时间？

A: 通常需要 15-90 秒，包括：
- 图片生成：10-60 秒
- 上传到微信：5-30 秒

### Q: 返回的微信图片 URL 有效期多久？

A: 微信图文消息图片永久有效，可以长期使用。

### Q: 可以批量生成吗？

A: 可以，但建议控制并发数量，避免触发限流：

```javascript
const prompts = [
  'nano banana in modern restaurant',
  'nano banana in traditional restaurant',
  'nano banana in futuristic restaurant'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (const prompt of prompts) {
  const result = await generateWechatImage(prompt);
  console.log('生成完成:', result);
  await sleep(5000); // 等待5秒避免过快
}
```

### Q: 如何在微信文章中使用生成的图片？

A: 直接在 HTML 内容中使用返回的 URL：

```html
<img src="返回的wechatImageUrl" />
```

或在创建草稿时使用：

```javascript
{
  "title": "文章标题",
  "content": "<img src='返回的wechatImageUrl' />",
  "imageUrl": "返回的wechatImageUrl"  // 作为封面图
}
```

### Q: 上传失败怎么办？

A: 检查以下几点：
1. 微信公众号是否已认证
2. AppID 和 AppSecret 是否正确
3. 图片大小是否超过限制（10MB）
4. 查看服务器日志获取详细错误

## 安全建议

1. **保护 API Key**：不要在客户端代码中硬编码
2. **使用 HTTPS**：生产环境务必使用 HTTPS
3. **限制请求频率**：避免滥用和配额耗尽
4. **验证请求来源**：使用 IP 白名单或其他认证机制
5. **监控配额使用**：定期检查 Google API 和微信 API 的配额使用情况

## 获取帮助

- 完整 API 文档：`IMAGE_API_GUIDE.md`
- 微信公众号开发文档：https://developers.weixin.qq.com/doc/offiaccount/
- Google AI Studio：https://aistudio.google.com/

## 总结

✅ 一键生成 AI 图片并上传到微信
✅ 返回永久有效的微信图片 URL
✅ 可直接用于微信公众号文章
✅ 支持三种场景（文本转图片、修改图片、组合图片）
✅ 支持客户端提供凭证
✅ 完整的错误处理和日志记录

这个接口专为微信公众号场景优化，让您的工作流程更加高效！

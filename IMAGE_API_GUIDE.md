# Google Gemini 图片生成 API 使用指南

## 接口说明

本接口使用 Google Gemini 2.5 Flash Image 模型，支持三种智能图片生成场景：

1. **文本转图片** (Text-to-Image)：根据文字描述生成图片
2. **修改图片** (Image Editing)：对现有图片进行 AI 修改
3. **组合多张图片** (Image Composition)：智能组合多张图片

**接口会根据输入参数自动判断使用哪种场景**，无需手动指定。

## 接口地址

```
POST /api/image/generate
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

### 方式一：服务器配置（推荐用于内部服务）

在 `.env` 文件中配置：

```env
# Google AI API Key（在 https://aistudio.google.com/apikey 获取）
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image
```

**配置优先级**：
1. 本地 `.env` 文件中的配置（最高优先级）
2. 系统环境变量（如果 `.env` 中没有配置）

这意味着如果你在 `.env` 中设置了 `GOOGLE_API_KEY`，即使系统环境变量中也有同名变量，也会优先使用 `.env` 文件中的值。

### 方式二：客户端提供 API Key（推荐用于对外服务）

客户端在请求时提供自己的 API Key：

```json
{
  "prompt": "描述文本",
  "apiKey": "客户端的Google AI API Key"
}
```

## 场景一：文本转图片

根据文字描述生成全新的图片。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| prompt | string | 是 | 图片描述提示词 |
| apiKey | string | 否 | 客户端的 Google AI API Key |
| returnFormat | string | 否 | 返回格式：base64（默认）或 file |

### 请求示例

#### 方法1：纯 JSON 请求

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
  }'
```

#### Node.js 示例

```javascript
const axios = require('axios');
const fs = require('fs');

async function textToImage() {
  const response = await axios.post('http://localhost:5003/api/image/generate', {
    prompt: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    }
  });

  if (response.data.success) {
    const imageData = response.data.data.imageData;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync('generated-image.png', buffer);
    console.log('图片已保存');
  }
}

textToImage();
```

## 场景二：修改图片

对现有图片进行 AI 修改，如添加元素、改变风格等。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| prompt | string | 是 | 修改指令（描述想要的修改） |
| images | file[] | 是 | 要修改的图片（1张） |
| apiKey | string | 否 | 客户端的 Google AI API Key |
| returnFormat | string | 否 | 返回格式：base64（默认）或 file |

### 请求示例

#### 方法1：文件上传（multipart/form-data）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Using the provided image of my cat, please add a small, knitted wizard hat on its head" \
  -F "images=@/path/to/cat_photo.png"
```

#### 方法2：Base64 JSON 请求

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Using the provided image of my cat, please add a small, knitted wizard hat on its head",
    "imagesData": [
      {
        "data": "base64_encoded_image_data...",
        "mimeType": "image/png"
      }
    ]
  }'
```

#### Node.js 示例（文件上传）

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function editImage() {
  const form = new FormData();
  form.append('prompt', 'Using the provided image of my cat, please add a small, knitted wizard hat on its head');
  form.append('images', fs.createReadStream('/path/to/cat_photo.png'));

  const response = await axios.post('http://localhost:5003/api/image/generate', form, {
    headers: {
      ...form.getHeaders(),
      'X-API-Key': 'your_api_key'
    }
  });

  if (response.data.success) {
    const imageData = response.data.data.imageData;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync('cat_with_hat.png', buffer);
    console.log('图片已保存');
  }
}

editImage();
```

#### Node.js 示例（Base64 JSON）

```javascript
const axios = require('axios');
const fs = require('fs');

async function editImage() {
  // 读取图片并转为 base64
  const imageBuffer = fs.readFileSync('/path/to/cat_photo.png');
  const base64Image = imageBuffer.toString('base64');

  const response = await axios.post('http://localhost:5003/api/image/generate', {
    prompt: 'Using the provided image of my cat, please add a small, knitted wizard hat on its head',
    imagesData: [
      {
        data: base64Image,
        mimeType: 'image/png'
      }
    ]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    }
  });

  if (response.data.success) {
    const imageData = response.data.data.imageData;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync('cat_with_hat.png', buffer);
    console.log('图片已保存');
  }
}

editImage();
```

## 场景三：组合多张图片

智能组合多张图片，创建新的合成图片。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| prompt | string | 是 | 组合指令（描述如何组合） |
| images | file[] | 是 | 要组合的图片（2张或更多） |
| apiKey | string | 否 | 客户端的 Google AI API Key |
| returnFormat | string | 否 | 返回格式：base64（默认）或 file |

### 请求示例

#### 方法1：文件上传（multipart/form-data）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it." \
  -F "images=@/path/to/dress.png" \
  -F "images=@/path/to/model.png"
```

#### Node.js 示例（文件上传）

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function composeImages() {
  const form = new FormData();
  form.append('prompt', 'Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match the outdoor environment.');
  form.append('images', fs.createReadStream('/path/to/dress.png'));
  form.append('images', fs.createReadStream('/path/to/model.png'));

  const response = await axios.post('http://localhost:5003/api/image/generate', form, {
    headers: {
      ...form.getHeaders(),
      'X-API-Key': 'your_api_key'
    }
  });

  if (response.data.success) {
    const imageData = response.data.data.imageData;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync('fashion_ecommerce_shot.png', buffer);
    console.log('图片已保存');
  }
}

composeImages();
```

#### Node.js 示例（Base64 JSON）

```javascript
const axios = require('axios');
const fs = require('fs');

async function composeImages() {
  // 读取多张图片并转为 base64
  const image1 = fs.readFileSync('/path/to/dress.png').toString('base64');
  const image2 = fs.readFileSync('/path/to/model.png').toString('base64');

  const response = await axios.post('http://localhost:5003/api/image/generate', {
    prompt: 'Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it.',
    imagesData: [
      { data: image1, mimeType: 'image/png' },
      { data: image2, mimeType: 'image/png' }
    ]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    }
  });

  if (response.data.success) {
    const imageData = response.data.data.imageData;
    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync('fashion_ecommerce_shot.png', buffer);
    console.log('图片已保存');
  }
}

composeImages();
```

## 响应格式

### 成功响应（returnFormat=base64 或未指定）

```json
{
  "success": true,
  "message": "AI图片生成成功",
  "data": {
    "imageData": "base64编码的图片数据...",
    "mimeType": "image/png",
    "size": 524288,
    "prompt": "用户的提示词",
    "sceneType": "text-to-image",
    "inputImagesCount": 0
  },
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

### 成功响应（returnFormat=file）

直接返回图片文件流，Content-Type 为 `image/png`。

### 错误响应

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "缺少必需参数: prompt (图片描述或修改指令)"
}
```

## 场景类型说明

API 会自动判断场景类型并在响应中返回：

| sceneType | 说明 | 触发条件 |
|-----------|------|----------|
| text-to-image | 文本转图片 | 不提供图片 |
| image-editing | 修改图片 | 提供 1 张图片 |
| image-composition | 组合图片 | 提供 2 张或更多图片 |

## Python 示例

### 文本转图片

```python
import requests
import base64

def text_to_image():
    url = 'http://localhost:5003/api/image/generate'
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
        image_data = result['data']['imageData']
        image_bytes = base64.b64decode(image_data)

        with open('generated-image.png', 'wb') as f:
            f.write(image_bytes)
        print('图片已保存')

text_to_image()
```

### 修改图片

```python
import requests
import base64

def edit_image():
    url = 'http://localhost:5003/api/image/generate'
    headers = {'X-API-Key': 'your_api_key'}

    # 方法1：文件上传
    with open('/path/to/cat_photo.png', 'rb') as f:
        files = {'images': f}
        data = {
            'prompt': 'Using the provided image of my cat, please add a small, knitted wizard hat on its head'
        }
        response = requests.post(url, data=data, files=files, headers=headers)

    if response.status_code == 200 and response.json()['success']:
        result = response.json()
        image_data = result['data']['imageData']
        image_bytes = base64.b64decode(image_data)

        with open('cat_with_hat.png', 'wb') as f:
            f.write(image_bytes)
        print('图片已保存')

edit_image()
```

### 组合图片

```python
import requests
import base64

def compose_images():
    url = 'http://localhost:5003/api/image/generate'
    headers = {'X-API-Key': 'your_api_key'}

    # 文件上传方式
    files = [
        ('images', open('/path/to/dress.png', 'rb')),
        ('images', open('/path/to/model.png', 'rb'))
    ]
    data = {
        'prompt': 'Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it.'
    }

    response = requests.post(url, data=data, files=files, headers=headers)

    if response.status_code == 200 and response.json()['success']:
        result = response.json()
        image_data = result['data']['imageData']
        image_bytes = base64.b64decode(image_data)

        with open('fashion_ecommerce_shot.png', 'wb') as f:
            f.write(image_bytes)
        print('图片已保存')

compose_images()
```

## 常见错误码

| 状态码 | 错误类型 | 说明 | 解决方案 |
|--------|----------|------|----------|
| 400 | Bad Request | 请求参数错误 | 检查必需参数是否提供 |
| 401 | Unauthorized | API Key 无效 | 检查 X-API-Key header |
| 500 | Internal Server Error | 服务器错误 | 查看日志，检查 Google AI API Key 配置 |

## 获取 Google AI API Key

1. 访问 **Google AI Studio**: https://aistudio.google.com/apikey
2. 使用 Google 账号登录
3. 点击 **"Create API Key"** 创建新的 API Key
4. 复制生成的 API Key

## 注意事项

1. **模型限制**：Gemini 2.5 Flash Image 是 Google 最新的图片生成模型
2. **配额限制**：Google AI API 有免费配额限制，超出后需要付费
3. **图片大小**：单个上传图片不超过 10MB，最多支持 10 张图片
4. **生成时间**：图片生成通常需要 10-60 秒，建议设置合理的超时时间
5. **内容政策**：确保生成的内容符合 Google 的使用政策
6. **API Key 安全**：不要在客户端代码中硬编码 API Key

## 最佳实践

1. **提示词优化**：提供详细、具体的描述会得到更好的生成效果
2. **场景自动判断**：只需提供图片或不提供，API 会自动判断场景
3. **错误处理**：实现完善的错误处理和重试机制
4. **灵活使用**：支持文件上传和 base64 两种方式，根据需求选择
5. **返回格式**：base64 适合 JSON API，file 适合直接下载

## 技术支持

- 服务器日志：查看详细的错误信息
- Google AI 文档：https://ai.google.dev/docs
- 项目 README：查看更多配置说明

## 更新日志

- 2025-10-08：使用 Gemini 2.5 Flash Image 模型，支持三种智能场景

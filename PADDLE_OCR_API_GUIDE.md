# Paddle OCR API 使用指南

## 概述

Paddle OCR API 提供了强大的 PDF 和图片文字识别功能，可以快速准确地识别文档中的文字内容，并可选择保存识别结果图片。

## 配置

### 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# Paddle OCR 配置
PADDLE_OCR_API_URL=https://u8yeibc471q3e274.aistudio-app.com/ocr
PADDLE_OCR_TOKEN=your_paddle_ocr_token_here
```

**注意**：
- `PADDLE_OCR_API_URL`: Paddle OCR 服务的 API 地址
- `PADDLE_OCR_TOKEN`: 认证令牌，由服务提供方提供

### 客户端配置（可选）

如果不想在服务器配置，也可以在调用 API 时传入配置参数：
- `paddleApiUrl`: Paddle OCR API URL
- `paddleToken`: 认证令牌

## API 端点

### 1. PDF 文档识别

**端点**: `POST /api/paddle-ocr/pdf`

**功能**: 识别 PDF 文档中的文字内容

**请求参数**:
- `file` (必需): PDF 文件，通过 multipart/form-data 上传
- `useDocOrientationClassify` (可选): 是否使用文档方向分类，默认 false
- `useDocUnwarping` (可选): 是否使用文档去畸变，默认 false
- `useTextlineOrientation` (可选): 是否使用文本行方向，默认 false
- `saveImages` (可选): 是否保存识别结果图片到本地，默认 false
- `paddleApiUrl` (可选): 客户端提供的 Paddle API URL
- `paddleToken` (可选): 客户端提供的 Paddle Token

**请求示例**:

```bash
curl -X POST http://localhost:5003/api/paddle-ocr/pdf \
  -H "X-API-Key: your_api_key" \
  -F "file=@/path/to/document.pdf" \
  -F "saveImages=true"
```

**使用 JavaScript**:

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('file', fs.createReadStream('./document.pdf'));
formData.append('saveImages', 'true');

const response = await axios.post(
    'http://localhost:5003/api/paddle-ocr/pdf',
    formData,
    {
        headers: {
            'X-API-Key': 'your_api_key',
            ...formData.getHeaders()
        }
    }
);

console.log('识别结果:', response.data);
```

**响应示例**:

```json
{
  "success": true,
  "message": "PDF 识别成功",
  "data": {
    "success": true,
    "totalPages": 3,
    "results": [
      {
        "index": 0,
        "text": "第一页的文字内容...",
        "imageUrl": "https://..."
      },
      {
        "index": 1,
        "text": "第二页的文字内容...",
        "imageUrl": "https://..."
      }
    ],
    "savedImages": [
      {
        "index": 0,
        "path": "output/paddle-ocr/document_0.jpg",
        "url": "https://..."
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 2. 图片文字识别

**端点**: `POST /api/paddle-ocr/image`

**功能**: 识别图片中的文字内容

**请求参数**:
- `file` (必需): 图片文件（JPG、PNG、GIF、BMP），通过 multipart/form-data 上传
- `useDocOrientationClassify` (可选): 是否使用文档方向分类，默认 false
- `useDocUnwarping` (可选): 是否使用文档去畸变，默认 false
- `useTextlineOrientation` (可选): 是否使用文本行方向，默认 false
- `saveImages` (可选): 是否保存识别结果图片到本地，默认 false
- `paddleApiUrl` (可选): 客户端提供的 Paddle API URL
- `paddleToken` (可选): 客户端提供的 Paddle Token

**请求示例**:

```bash
curl -X POST http://localhost:5003/api/paddle-ocr/image \
  -H "X-API-Key: your_api_key" \
  -F "file=@/path/to/image.jpg" \
  -F "useDocOrientationClassify=true"
```

**响应示例**:

```json
{
  "success": true,
  "message": "图片识别成功",
  "data": {
    "success": true,
    "totalPages": 1,
    "results": [
      {
        "index": 0,
        "text": "图片中的文字内容...",
        "imageUrl": "https://..."
      }
    ],
    "savedImages": []
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 3. 批量文档识别

**端点**: `POST /api/paddle-ocr/batch`

**功能**: 批量识别多个 PDF 或图片文件

**请求参数**:
- `files` (必需): 文件数组（PDF 或图片），通过 multipart/form-data 上传，最多 20 个文件
- `useDocOrientationClassify` (可选): 是否使用文档方向分类，默认 false
- `useDocUnwarping` (可选): 是否使用文档去畸变，默认 false
- `useTextlineOrientation` (可选): 是否使用文本行方向，默认 false
- `saveImages` (可选): 是否保存识别结果图片到本地，默认 false
- `paddleApiUrl` (可选): 客户端提供的 Paddle API URL
- `paddleToken` (可选): 客户端提供的 Paddle Token

**请求示例**:

```bash
curl -X POST http://localhost:5003/api/paddle-ocr/batch \
  -H "X-API-Key: your_api_key" \
  -F "files=@/path/to/doc1.pdf" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/doc2.pdf" \
  -F "saveImages=true"
```

**使用 JavaScript**:

```javascript
const formData = new FormData();
formData.append('files', fs.createReadStream('./doc1.pdf'));
formData.append('files', fs.createReadStream('./image1.jpg'));
formData.append('files', fs.createReadStream('./doc2.pdf'));
formData.append('saveImages', 'true');

const response = await axios.post(
    'http://localhost:5003/api/paddle-ocr/batch',
    formData,
    {
        headers: {
            'X-API-Key': 'your_api_key',
            ...formData.getHeaders()
        },
        timeout: 300000 // 5 分钟超时
    }
);

console.log('批量识别结果:', response.data);
```

**响应示例**:

```json
{
  "success": true,
  "message": "批量识别完成，成功 3 个，失败 0 个",
  "data": {
    "totalFiles": 3,
    "successCount": 3,
    "failedCount": 0,
    "results": [
      {
        "filename": "doc1.pdf",
        "success": true,
        "totalPages": 2,
        "results": [
          {
            "index": 0,
            "text": "第一页内容...",
            "imageUrl": "https://..."
          }
        ],
        "savedImages": []
      },
      {
        "filename": "image1.jpg",
        "success": true,
        "totalPages": 1,
        "results": [
          {
            "index": 0,
            "text": "图片内容...",
            "imageUrl": "https://..."
          }
        ],
        "savedImages": []
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## 测试

### 使用测试脚本

项目提供了测试脚本 `test-paddle-ocr.js`，可以快速测试 Paddle OCR 功能：

```bash
# 测试所有功能
node test-paddle-ocr.js

# 仅测试 PDF 识别
node test-paddle-ocr.js pdf

# 仅测试图片识别
node test-paddle-ocr.js image

# 仅测试批量识别
node test-paddle-ocr.js batch
```

**准备测试文件**:
1. 将测试 PDF 文件命名为 `test.pdf` 并放在项目根目录
2. 将测试图片文件命名为 `test.jpg` 并放在项目根目录
3. 批量测试需要 `test1.pdf` 和 `test2.jpg`

### 使用 curl 测试

```bash
# 设置 API Key
export API_KEY="0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647"

# 测试 PDF 识别
curl -X POST http://localhost:5003/api/paddle-ocr/pdf \
  -H "X-API-Key: $API_KEY" \
  -F "file=@./test.pdf" \
  -F "saveImages=true"

# 测试图片识别
curl -X POST http://localhost:5003/api/paddle-ocr/image \
  -H "X-API-Key: $API_KEY" \
  -F "file=@./test.jpg"

# 测试批量识别
curl -X POST http://localhost:5003/api/paddle-ocr/batch \
  -H "X-API-Key: $API_KEY" \
  -F "files=@./test.pdf" \
  -F "files=@./test.jpg"
```

## 参数说明

### OCR 选项参数

- **useDocOrientationClassify**:
  - 类型: boolean
  - 默认: false
  - 说明: 是否使用文档方向分类，可以自动检测并纠正文档方向

- **useDocUnwarping**:
  - 类型: boolean
  - 默认: false
  - 说明: 是否使用文档去畸变，可以矫正拍摄角度不正的文档

- **useTextlineOrientation**:
  - 类型: boolean
  - 默认: false
  - 说明: 是否使用文本行方向检测，可以检测文本行的倾斜角度

- **saveImages**:
  - 类型: boolean
  - 默认: false
  - 说明: 是否保存识别结果图片到本地 `output/paddle-ocr/` 目录

## 文件限制

- **PDF 文件**: 最大 50MB
- **图片文件**: 最大 10MB
- **批量识别**: 最多 20 个文件，每个文件最大 50MB
- **支持的图片格式**: JPG、PNG、GIF、BMP

## 错误处理

### 常见错误

1. **配置错误**:
```json
{
  "success": false,
  "error": "Configuration Error",
  "message": "Paddle OCR 配置错误: PADDLE_OCR_TOKEN 未设置"
}
```
解决方法: 在 `.env` 中设置 `PADDLE_OCR_TOKEN`，或在请求中提供 `paddleToken` 参数

2. **文件格式错误**:
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "文件上传失败: 仅支持 PDF 格式的文件"
}
```
解决方法: 确保上传的文件格式正确

3. **API 调用失败**:
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Paddle OCR API 错误: 401 - Unauthorized"
}
```
解决方法: 检查 Paddle OCR Token 是否正确

4. **超时错误**:
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "timeout of 300000ms exceeded"
}
```
解决方法:
- 服务端默认超时时间为 5 分钟（300 秒）
- 对于超大 PDF 文件（>50MB 或页数过多），建议：
  1. 压缩 PDF 文件
  2. 拆分 PDF 文件后使用批量接口处理
  3. 联系 Paddle OCR 服务提供方优化处理速度

## 应用场景

1. **合同文档识别**: 识别 PDF 合同中的文字内容
2. **发票识别**: 识别发票图片中的文字信息
3. **证件识别**: 识别身份证、驾驶证等证件图片
4. **文档数字化**: 将纸质文档扫描后进行文字识别
5. **批量文档处理**: 批量处理大量 PDF 和图片文件

## 性能优化建议

1. **批量处理**: 对于多个文件，建议使用批量接口而不是多次调用单文件接口
2. **图片预处理**: 上传前可以对图片进行适当的预处理（如裁剪、旋转），提高识别准确率
3. **按需保存图片**: 仅在需要时开启 `saveImages` 选项，避免占用过多磁盘空间
4. **超时设置**: 对于大文件或批量处理，适当增加请求超时时间

## 注意事项

1. 识别准确率受图片质量影响，建议使用清晰、正面拍摄的图片
2. PDF 文件页数较多时，识别时间可能较长，请耐心等待
3. 保存的图片文件存储在 `output/paddle-ocr/` 目录下，请定期清理
4. Paddle OCR API 可能有调用频率限制，请注意控制调用频率

## 与原 Python 代码的对应关系

原 Python 代码:
```python
import requests
import base64

# 读取文件并转换为 base64
with open(file_path, "rb") as file:
    file_bytes = file.read()
    file_data = base64.b64encode(file_bytes).decode("ascii")

# 发送请求
payload = {
    "file": file_data,
    "fileType": 0,  # 0: PDF, 1: 图片
    "useDocOrientationClassify": False,
    "useDocUnwarping": False,
    "useTextlineOrientation": False,
}

response = requests.post(API_URL, json=payload, headers=headers)
result = response.json()["result"]
```

对应的 JavaScript 实现（服务端已封装）:
```javascript
// 客户端只需上传文件，服务端自动处理 base64 转换
const formData = new FormData();
formData.append('file', fileBuffer);
formData.append('useDocOrientationClassify', 'false');
formData.append('useDocUnwarping', 'false');
formData.append('useTextlineOrientation', 'false');

const response = await axios.post(
    'http://localhost:5003/api/paddle-ocr/pdf',
    formData,
    { headers: { 'X-API-Key': apiKey, ...formData.getHeaders() } }
);
```

服务端 `paddleOCRService.js` 已实现完整的逻辑，包括：
- 文件读取和 base64 转换
- API 调用
- 结果解析
- 图片下载和保存

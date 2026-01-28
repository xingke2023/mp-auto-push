# Paddle OCR 快速开始

## 1. 配置

编辑 `.env` 文件，添加 Paddle OCR 配置：

```bash
# Paddle OCR 配置
PADDLE_OCR_API_URL=https://u8yeibc471q3e274.aistudio-app.com/ocr
PADDLE_OCR_TOKEN=764a4d3e03c87b2e07c30324d3a678113e3c5bdf

# API 服务配置
API_PORT=5003
API_KEY=0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647
```

## 2. 启动 API 服务器

```bash
# 安装依赖（如果还没有安装）
npm install

# 启动 API 服务器
npm run api
```

## 3. 测试

### 方法一：使用测试脚本（推荐）

```bash
# 准备测试文件
# 将 PDF 文件命名为 test.pdf 放在项目根目录
# 将图片文件命名为 test.jpg 放在项目根目录

# 运行测试
node test-paddle-ocr.js

# 或者测试单个功能
node test-paddle-ocr.js pdf      # 仅测试 PDF
node test-paddle-ocr.js image    # 仅测试图片
node test-paddle-ocr.js batch    # 仅测试批量识别
```

### 方法二：使用 curl

```bash
# 测试 PDF 识别
curl -X POST http://localhost:5003/api/paddle-ocr/pdf \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -F "file=@./test.pdf" \
  -F "saveImages=true"

# 测试图片识别
curl -X POST http://localhost:5003/api/paddle-ocr/image \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -F "file=@./test.jpg"
```

### 方法三：使用 JavaScript

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testPaddleOCR() {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test.pdf'));
    formData.append('saveImages', 'true');

    const response = await axios.post(
        'http://localhost:5003/api/paddle-ocr/pdf',
        formData,
        {
            headers: {
                'X-API-Key': '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647',
                ...formData.getHeaders()
            }
        }
    );

    console.log('识别结果:', response.data);
}

testPaddleOCR();
```

## 4. 查看结果

识别成功后，会返回 JSON 格式的结果：

```json
{
  "success": true,
  "message": "PDF 识别成功",
  "data": {
    "totalPages": 2,
    "results": [
      {
        "index": 0,
        "text": "识别到的文字内容...",
        "imageUrl": "https://..."
      }
    ],
    "savedImages": [
      {
        "index": 0,
        "path": "output/paddle-ocr/test_0.jpg",
        "url": "https://..."
      }
    ]
  }
}
```

## 5. 访问 API 文档

启动 API 服务器后，访问根路径查看所有可用的 API 端点：

```bash
curl http://localhost:5003/
```

## 常见问题

### 1. 配置错误

**错误**: `Paddle OCR 配置错误: PADDLE_OCR_TOKEN 未设置`

**解决**: 在 `.env` 文件中设置 `PADDLE_OCR_TOKEN`

### 2. 认证失败

**错误**: `Unauthorized - 无效的API密钥`

**解决**: 检查请求头中的 `X-API-Key` 是否正确

### 3. 文件过大

**错误**: `File too large`

**解决**:
- PDF 文件限制: 50MB
- 图片文件限制: 10MB
- 如需处理更大文件，请修改 `src/apiServer.js` 中的 `limits` 配置

### 4. 超时

**错误**: `timeout of 120000ms exceeded`

**解决**: PDF 处理可能较慢，可以在客户端增加超时时间：

```javascript
const response = await axios.post(url, data, {
    timeout: 300000 // 5 分钟
});
```

## 更多信息

详细的 API 使用说明请参考 `PADDLE_OCR_API_GUIDE.md`

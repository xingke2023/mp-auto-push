# Node.js 客户端使用指南

## 快速开始

### 1. 安装依赖

```bash
npm install axios form-data
```

### 2. 配置 API Key

编辑 `nodejs-client-example.js` 文件，修改以下配置：

```javascript
const API_BASE_URL = 'https://wechat.easy-write.com';
const API_KEY = 'your_api_key_here';  // 替换为你的 API Key
```

### 3. 运行示例

```bash
node nodejs-client-example.js
```

## API 端点

### 实际地址
```
https://wechat.easy-write.com
```

### 主要接口
- `POST /api/image/generate-wechat` - 生成图片并上传到微信
- `GET /health` - 健康检查

## 使用示例

### 场景一：文本转图片（Nano Banana）

```javascript
const axios = require('axios');
const FormData = require('form-data');

async function generateNanoBanana() {
  const form = new FormData();
  form.append('prompt', 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme');

  const response = await axios.post(
    'https://wechat.easy-write.com/api/image/generate-wechat',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-API-Key': 'your_api_key'
      },
      timeout: 180000
    }
  );

  console.log('微信URL:', response.data.data.wechatImageUrl);
}

generateNanoBanana();
```

### 场景二：修改图片

```javascript
const fs = require('fs');

async function editImage() {
  const form = new FormData();
  form.append('prompt', 'Add a wizard hat on this cat');
  form.append('images', fs.createReadStream('./cat.png'));

  const response = await axios.post(
    'https://wechat.easy-write.com/api/image/generate-wechat',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-API-Key': 'your_api_key'
      },
      timeout: 180000
    }
  );

  console.log('微信URL:', response.data.data.wechatImageUrl);
}

editImage();
```

### 场景三：组合多张图片

```javascript
async function composeImages() {
  const form = new FormData();
  form.append('prompt', 'Combine these images');
  form.append('images', fs.createReadStream('./image1.png'));
  form.append('images', fs.createReadStream('./image2.png'));

  const response = await axios.post(
    'https://wechat.easy-write.com/api/image/generate-wechat',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-API-Key': 'your_api_key'
      },
      timeout: 180000
    }
  );

  console.log('微信URL:', response.data.data.wechatImageUrl);
}

composeImages();
```

## 使用封装类

```javascript
const { WechatImageClient } = require('./nodejs-client-example');

async function main() {
  const client = new WechatImageClient('your_api_key');

  // 文本转图片
  const result = await client.textToImage('Create a nano banana picture');
  console.log('微信URL:', result.wechatImageUrl);

  // 修改图片
  const result2 = await client.editImage('Add a hat', './cat.png');
  console.log('微信URL:', result2.wechatImageUrl);

  // 组合图片
  const result3 = await client.composeImages('Combine', ['./img1.png', './img2.png']);
  console.log('微信URL:', result3.wechatImageUrl);
}

main();
```

## 响应格式

```json
{
  "success": true,
  "message": "AI图片生成并上传微信成功",
  "data": {
    "wechatImageUrl": "https://mmbiz.qpic.cn/...",
    "imageSize": 524288,
    "prompt": "Create a picture of a nano banana...",
    "sceneType": "text-to-image",
    "inputImagesCount": 0
  },
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

## 常见问题

### Q: 需要多长时间？
A: 通常 30-90 秒（图片生成 + 上传微信）

### Q: 支持哪些图片格式？
A: JPG、PNG、GIF，单个文件最大 10MB

### Q: 如何获取 API Key？
A: 联系管理员获取

### Q: 超时怎么办？
A: 设置更长的超时时间：`timeout: 180000`（3分钟）

## 技术支持

- API 文档：查看项目中的 `WECHAT_IMAGE_API_GUIDE.md`
- 完整示例：`nodejs-client-example.js`
- 远程调用指南：`WECHAT_IMAGE_API_REMOTE_GUIDE.md`

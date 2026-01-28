# OpenAI API 快速开始

最快 5 分钟接入 OpenAI API 转接服务！

## 1. 配置环境变量

编辑 `.env` 文件，添加 OpenAI 配置：

```bash
# OpenAI API 配置
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-5-nano
OPENAI_TIMEOUT=300000
OPENAI_MAX_TOKENS=4096

# API 服务配置
API_KEY=your_secure_api_key_here
```

## 2. 启动服务

```bash
# 重启 API 服务器
pm2 restart mp-auto-push-api

# 查看状态
pm2 status mp-auto-push-api
```

## 3. 测试接口

### 快速测试（命令行）

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

### 运行测试脚本

```bash
node test-openai-api.js
```

## 4. 常用示例

### 基础对话

```javascript
const axios = require('axios');

axios.post('http://localhost:5003/api/openai/chat', {
    messages: [
        { role: 'user', content: '介绍一下你自己' }
    ],
    maxTokens: 100
}, {
    headers: { 'X-API-Key': 'your_api_key' }
}).then(res => {
    console.log(res.data.data.message);
});
```

### 流式响应

```javascript
const axios = require('axios');

axios.post('http://localhost:5003/api/openai/chat', {
    messages: [
        { role: 'user', content: '写一首诗' }
    ],
    stream: true
}, {
    headers: { 'X-API-Key': 'your_api_key' },
    responseType: 'stream'
}).then(response => {
    response.data.on('data', chunk => {
        // 处理流式数据
        console.log(chunk.toString());
    });
});
```

## 5. 可用端点

| 端点路径 | 说明 |
|---------|------|
| `/api/openai/chat` | 主路径 |
| `/api/openai/chat/completions` | 兼容路径 |
| `/v1/chat/completions` | 标准 OpenAI 路径 |

所有路径功能完全相同！

## 6. 支持的模型

- `gpt-5-nano` - GPT-5 Nano（默认）
- `gpt-4o` - 最新 GPT-4 Optimized
- `gpt-4o-mini` - 小型高效版本
- `gpt-4` - GPT-4 标准
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-3.5-turbo` - GPT-3.5
- 其他 OpenAI 模型

## 7. 关键参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| messages | 对话消息数组 | 必填 |
| model | 模型名称 | gpt-5-nano |
| maxTokens | 最大生成 token 数 | 4096 |
| temperature | 随机性（0-2） | 1.0 |
| stream | 是否流式响应 | false |

## 8. 更多信息

详细文档请查看：
- `OPENAI_API_GUIDE.md` - 完整使用指南
- `test-openai-api.js` - 测试脚本
- `.env.example` - 配置示例

## 常见问题

**Q: 如何获取 OpenAI API Key？**
A: 访问 https://platform.openai.com/api-keys

**Q: 支持哪些模型？**
A: 支持所有 OpenAI 模型，默认使用 gpt-5-nano

**Q: 请求超时怎么办？**
A: 默认 5 分钟超时，可在 .env 中调整 OPENAI_TIMEOUT

**Q: 如何使用流式响应？**
A: 设置 `stream: true` 参数

**Q: 客户端可以提供自己的 API Key 吗？**
A: 可以，在请求中传递 `openaiApiKey` 参数

## 快速故障排查

```bash
# 1. 检查服务状态
pm2 status mp-auto-push-api

# 2. 查看日志
pm2 logs mp-auto-push-api --lines 50

# 3. 测试连接
curl -I http://localhost:5003

# 4. 重启服务
pm2 restart mp-auto-push-api
```

## 完整示例

```bash
# 完整的 curl 测试命令
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "你是一个有帮助的助手"},
      {"role": "user", "content": "介绍一下人工智能"}
    ],
    "model": "gpt-5-nano",
    "temperature": 0.7,
    "maxTokens": 200
  }'
```

---

🎉 现在你已经可以使用 OpenAI API 转接服务了！

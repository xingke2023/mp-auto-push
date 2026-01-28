# OpenAI API 调用转接服务使用指南

本服务提供 OpenAI API 的转接服务，支持 GPT-4o、GPT-4、GPT-3.5、GPT-4o-mini 等所有 OpenAI 模型。服务器端统一管理 API Key，客户端也可以自行提供 API Key。

## 功能特性

- ✅ 支持所有 OpenAI 模型（GPT-4o、GPT-4、GPT-3.5 等）
- ✅ 支持流式响应（Server-Sent Events）
- ✅ 支持非流式响应
- ✅ 支持服务器端 API Key 和客户端提供的 API Key
- ✅ 支持自定义 API URL（可使用中转服务）
- ✅ 完整的参数支持（temperature、max_tokens、top_p、frequency_penalty 等）
- ✅ 超时时间：5 分钟（300秒），可配置
- ✅ 完善的错误处理和日志记录
- ✅ 兼容标准 OpenAI API 路径格式

## 配置说明

### 服务器端配置

在 `.env` 文件中配置：

```bash
# OpenAI API 配置
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-5-nano
OPENAI_TIMEOUT=300000  # 5分钟
OPENAI_MAX_TOKENS=4096

# API 服务配置
API_PORT=5003
API_KEY=your_secure_api_key_here
```

### 模型选择

支持的模型包括：
- `gpt-5-nano` - GPT-5 Nano 模型（默认）
- `gpt-4o` - 最新的 GPT-4 Optimized 模型
- `gpt-4o-mini` - GPT-4o 的小型版本
- `gpt-4` - GPT-4 标准模型
- `gpt-4-turbo` - GPT-4 Turbo 模型
- `gpt-3.5-turbo` - GPT-3.5 模型
- 其他 OpenAI 支持的模型

## API 端点

服务提供三个等效的端点路径：

1. **主路径**: `POST /api/openai/chat`
2. **兼容路径**: `POST /api/openai/chat/completions`
3. **标准 OpenAI 路径**: `POST /v1/chat/completions`

所有路径功能完全相同，选择任意一个即可。

## 请求参数

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| messages | Array | 对话消息数组，每个消息包含 `role` 和 `content` 字段 |

### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| model | String | gpt-4o-mini | 使用的模型 |
| temperature | Number | 1.0 | 温度参数（0-2），控制随机性 |
| maxTokens / max_tokens | Number | 4096 | 最大生成 token 数 |
| topP / top_p | Number | - | 核采样参数（0-1） |
| frequencyPenalty / frequency_penalty | Number | - | 频率惩罚（-2.0 到 2.0） |
| presencePenalty / presence_penalty | Number | - | 存在惩罚（-2.0 到 2.0） |
| stop | String/Array | - | 停止序列 |
| stream | Boolean | false | 是否使用流式响应 |
| openaiApiKey | String | - | 客户端提供的 API Key（可选） |
| openaiApiUrl | String | - | 客户端提供的 API URL（可选） |

**参数命名兼容性**: 支持驼峰命名（`maxTokens`）和下划线命名（`max_tokens`），与标准 OpenAI API 完全兼容。

### 认证

在请求头中提供 API Key：

```
X-API-Key: your_api_key_here
```

或使用 Bearer Token 格式：

```
Authorization: Bearer your_api_key_here
```

## 使用示例

### 1. 基础对话（非流式）

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己。"}
    ],
    "temperature": 0.7,
    "maxTokens": 100
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "OpenAI Chat 调用成功",
  "data": {
    "message": "你好！我是 OpenAI 开发的 AI 助手...",
    "role": "assistant",
    "model": "gpt-5-nano",
    "usage": {
      "promptTokens": 15,
      "completionTokens": 50,
      "totalTokens": 65
    },
    "raw": { ... }
  },
  "timestamp": "2025-12-06T05:30:00.000Z"
}
```

### 2. 流式响应

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "写一首关于春天的诗"}
    ],
    "stream": true,
    "maxTokens": 500
  }'
```

**流式响应格式** (Server-Sent Events):
```
data: {"choices":[{"delta":{"content":"春"}}]}

data: {"choices":[{"delta":{"content":"天"}}]}

data: {"choices":[{"delta":{"content":"到"}}]}

...

data: [DONE]
```

### 3. 使用客户端 API Key

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "解释什么是机器学习"}
    ],
    "openaiApiKey": "sk-your_client_openai_key",
    "model": "gpt-4",
    "maxTokens": 200
  }'
```

### 4. 多轮对话

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "你是一个专业的编程助手。"},
      {"role": "user", "content": "什么是递归？"},
      {"role": "assistant", "content": "递归是函数调用自身的编程技术..."},
      {"role": "user", "content": "能举个例子吗？"}
    ],
    "temperature": 0.7,
    "maxTokens": 300
  }'
```

### 5. 使用高级参数

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "创作一个故事开头"}
    ],
    "model": "gpt-4o",
    "temperature": 0.9,
    "max_tokens": 500,
    "top_p": 0.95,
    "frequency_penalty": 0.5,
    "presence_penalty": 0.6
  }'
```

### 6. 使用标准 OpenAI 路径

```bash
curl -X POST http://localhost:5003/v1/chat/completions \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "max_tokens": 50
  }'
```

## Node.js 代码示例

### 非流式调用

```javascript
const axios = require('axios');

async function callOpenAI() {
    try {
        const response = await axios.post('http://localhost:5003/api/openai/chat', {
            messages: [
                { role: 'user', content: '介绍一下 Node.js' }
            ],
            temperature: 0.7,
            maxTokens: 200
        }, {
            headers: {
                'X-API-Key': 'your_api_key',
                'Content-Type': 'application/json'
            }
        });

        console.log('回复:', response.data.data.message);
        console.log('Token 使用:', response.data.data.usage);

    } catch (error) {
        console.error('错误:', error.response?.data || error.message);
    }
}

callOpenAI();
```

### 流式调用

```javascript
const axios = require('axios');

async function streamOpenAI() {
    try {
        const response = await axios.post('http://localhost:5003/api/openai/chat', {
            messages: [
                { role: 'user', content: '写一个故事' }
            ],
            stream: true,
            maxTokens: 500
        }, {
            headers: {
                'X-API-Key': 'your_api_key',
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);

                    if (data === '[DONE]') {
                        console.log('\n流式响应完成');
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0].delta.content;
                        if (content) {
                            process.stdout.write(content);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        });

    } catch (error) {
        console.error('错误:', error.message);
    }
}

streamOpenAI();
```

## Python 代码示例

### 非流式调用

```python
import requests

API_URL = "http://localhost:5003/api/openai/chat"
API_KEY = "your_api_key"

response = requests.post(
    API_URL,
    headers={
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    },
    json={
        "messages": [
            {"role": "user", "content": "介绍一下 Python"}
        ],
        "temperature": 0.7,
        "maxTokens": 200
    }
)

data = response.json()
print("回复:", data["data"]["message"])
print("Token 使用:", data["data"]["usage"])
```

### 流式调用

```python
import requests

API_URL = "http://localhost:5003/api/openai/chat"
API_KEY = "your_api_key"

response = requests.post(
    API_URL,
    headers={
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    },
    json={
        "messages": [
            {"role": "user", "content": "写一首诗"}
        ],
        "stream": True,
        "maxTokens": 500
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                print("\n流式响应完成")
                break

            try:
                import json
                parsed = json.loads(data)
                content = parsed["choices"][0]["delta"].get("content", "")
                if content:
                    print(content, end='', flush=True)
            except:
                pass
```

## 错误处理

### 常见错误码

| 状态码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查 messages 参数格式 |
| 401 | API Key 无效 | 检查 OpenAI API Key 是否正确 |
| 429 | 请求频率超限 | 稍后重试或升级 OpenAI 套餐 |
| 500 | 服务器错误 | 查看服务器日志，检查网络连接 |
| 504 | 网关超时 | 请求超过 5 分钟，考虑减少 maxTokens |

### 错误响应示例

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "messages 参数为必填项，且必须是非空数组"
}
```

## 测试

运行测试脚本：

```bash
# 完整测试
node test-openai-api.js

# 如果使用客户端 API Key，需要先配置环境变量
export OPENAI_API_KEY=sk-your_key
node test-openai-api.js
```

测试脚本包含以下测试：
1. 使用服务器 API Key（非流式）
2. 使用客户端 API Key（非流式）
3. 参数验证
4. 多轮对话
5. 流式响应
6. 参数格式兼容性
7. 标准 OpenAI 路径

## 性能和限制

### 超时配置

- **默认超时**: 300 秒（5 分钟）
- **流式响应**: 无超时限制
- **配置方式**: 在 `.env` 中设置 `OPENAI_TIMEOUT`

### Token 限制

不同模型的 token 限制不同：
- GPT-4o: 最大 128K tokens
- GPT-4: 最大 8K-32K tokens
- GPT-3.5-turbo: 最大 16K tokens
- 默认 `maxTokens`: 4096

### 并发请求

服务器可以处理多个并发请求，每个请求独立处理。建议：
- 非流式请求：并发 10-20 个
- 流式请求：并发 5-10 个

## 最佳实践

1. **选择合适的模型**
   - 简单任务：使用 `gpt-3.5-turbo` 或 `gpt-4o-mini`
   - 复杂任务：使用 `gpt-4` 或 `gpt-4o`

2. **合理设置 temperature**
   - 事实性回答：0.0-0.3
   - 平衡创意和准确：0.7-0.8
   - 创意性内容：0.9-1.5

3. **控制 token 使用**
   - 设置合理的 `maxTokens` 避免浪费
   - 使用 system 消息设定角色和限制

4. **使用流式响应**
   - 长文本生成时使用流式响应改善用户体验
   - 实时反馈减少等待时间

5. **错误处理**
   - 始终捕获和处理错误
   - 对 429 错误实施重试机制
   - 记录错误便于调试

## 与 OpenAI 官方 API 的区别

本服务是 OpenAI API 的转接服务，主要区别：

1. **响应格式**: 非流式响应包装在 `{success, data, message}` 结构中
2. **认证方式**: 使用自定义的 `X-API-Key` 进行服务器认证
3. **中转功能**: 支持服务器端统一管理 API Key
4. **参数命名**: 同时支持驼峰和下划线命名
5. **错误处理**: 提供更详细的中文错误信息

## 故障排查

### 1. 连接超时

**问题**: 请求超过 5 分钟超时

**解决方案**:
- 减少 `maxTokens` 参数
- 使用流式响应
- 增加 `OPENAI_TIMEOUT` 环境变量

### 2. API Key 无效

**问题**: 返回 401 错误

**解决方案**:
- 检查 `.env` 中的 `OPENAI_API_KEY`
- 确认 API Key 格式正确（以 `sk-` 开头）
- 检查 API Key 是否过期或被禁用

### 3. 模型不可用

**问题**: 返回模型不存在错误

**解决方案**:
- 检查模型名称是否正确
- 确认 OpenAI 账户有权限访问该模型
- 使用默认模型 `gpt-4o-mini`

### 4. 查看日志

```bash
# 查看 API 服务器日志
pm2 logs mp-auto-push-api --lines 50

# 查看实时日志
tail -f logs/app.log
```

## 相关文件

- `src/openaiService.js` - OpenAI 服务类
- `src/apiServer.js` - API 服务器（OpenAI 端点在 1880-2133 行）
- `.env.example` - 环境变量配置示例
- `test-openai-api.js` - 测试脚本

## 更新日志

### 2025-12-06

- ✅ 初始版本发布
- ✅ 支持所有 OpenAI 模型
- ✅ 支持流式和非流式响应
- ✅ 支持服务器端和客户端 API Key
- ✅ 超时时间设置为 5 分钟
- ✅ 完善的错误处理和日志记录
- ✅ 兼容标准 OpenAI API 路径

## 技术支持

如有问题，请：
1. 查看本文档的故障排查章节
2. 查看服务器日志
3. 运行测试脚本验证功能
4. 查看 OpenAI 官方文档

## 许可证

本服务基于 OpenAI API 构建，使用时请遵守 OpenAI 的使用条款。

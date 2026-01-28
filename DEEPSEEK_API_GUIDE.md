# DeepSeek API 使用指南

## 概述

DeepSeek API 转接服务允许客户端通过服务器调用 DeepSeek Chat Completions API，支持：
- **流式响应（Server-Sent Events）和非流式响应**
- 标准的聊天对话格式（messages 数组）
- 客户端提供自己的 API Key
- 默认最大 8000 tokens（可自定义）
- 完整的错误处理和日志记录

## API 端点

```
POST /api/deepseek/chat
```

## 认证

使用 API Key 进行认证，通过以下任一方式提供：
- HTTP Header: `X-API-Key: your_api_key`
- HTTP Header: `Authorization: Bearer your_api_key`

## 请求参数

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `messages` | Array | 消息数组，每个消息包含 `role` 和 `content` 字段 |

### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `stream` | Boolean | `false` | 是否启用流式响应（SSE） |
| `model` | String | `deepseek-chat` | DeepSeek 模型名称 |
| `temperature` | Number | `0.7` | 温度参数（0-2），控制随机性 |
| `maxTokens` | Number | `8000` | 最大生成 tokens 数量 |
| `deepseekApiKey` | String | 服务器配置 | 客户端提供的 DeepSeek API Key |
| `deepseekApiUrl` | String | `https://api.deepseek.com/v1/chat/completions` | 自定义 API URL |

### Messages 格式

每个消息对象必须包含：
- `role`: 消息角色，可选值：`system`、`user`、`assistant`
- `content`: 消息内容（字符串）

```json
{
  "role": "user",
  "content": "你好！"
}
```

## 请求示例

### 示例 1: 简单对话（使用服务器 API Key）

```bash
curl -X POST http://localhost:5003/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "请用一句话介绍什么是人工智能。"
      }
    ]
  }'
```

### 示例 2: 带系统提示的对话

```bash
curl -X POST http://localhost:5003/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "你是一个专业的AI助手，回答简洁明了。"
      },
      {
        "role": "user",
        "content": "什么是深度学习？"
      }
    ],
    "temperature": 0.7,
    "maxTokens": 100
  }'
```

### 示例 3: 多轮对话

```bash
curl -X POST http://localhost:5003/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "你是一个友好的AI助手。"
      },
      {
        "role": "user",
        "content": "你好！"
      },
      {
        "role": "assistant",
        "content": "你好！很高兴见到你。有什么我可以帮助的吗？"
      },
      {
        "role": "user",
        "content": "请介绍一下你自己。"
      }
    ]
  }'
```

### 示例 4: 使用客户端 API Key

```bash
curl -X POST http://localhost:5003/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "你好！"
      }
    ],
    "deepseekApiKey": "sk-your-deepseek-api-key"
  }'
```

### 示例 5: 自定义模型和参数

```bash
curl -X POST http://localhost:5003/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "写一首关于春天的诗。"
      }
    ],
    "model": "deepseek-chat",
    "temperature": 0.9,
    "maxTokens": 500
  }'
```

### 示例 6: 流式响应（SSE）

```bash
curl -N -X POST http://localhost:5003/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "介绍一下人工智能。"
      }
    ],
    "stream": true
  }'
```

**注意**: 使用 curl 的 `-N` 或 `--no-buffer` 选项来禁用缓冲，实时查看流式输出。

### 示例 7: 流式响应输出格式

流式响应使用 Server-Sent Events (SSE) 格式，每个数据块的格式为：

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"deepseek-chat","choices":[{"index":0,"delta":{"role":"assistant","content":"人工"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"智能"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"是"},"finish_reason":null}]}

data: [DONE]
```

## 响应格式

### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "DeepSeek Chat 调用成功",
  "data": {
    "message": "人工智能是让机器模拟人类智能行为的技术。",
    "role": "assistant",
    "model": "deepseek-chat",
    "usage": {
      "promptTokens": 21,
      "completionTokens": 10,
      "totalTokens": 31
    },
    "raw": {
      // 完整的 DeepSeek API 原始响应
    }
  },
  "timestamp": "2025-12-06T05:05:52.123Z"
}
```

### 错误响应

#### 参数错误 (400 Bad Request)

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "缺少必需参数: messages（消息数组，至少包含一条消息）"
}
```

#### 配置错误 (500 Configuration Error)

```json
{
  "success": false,
  "error": "Configuration Error",
  "message": "DeepSeek 配置错误: DEEPSEEK_API_KEY 未配置"
}
```

#### API 错误 (401/429/500)

```json
{
  "success": false,
  "error": "API Error",
  "message": "DeepSeek API Key 无效或权限不足"
}
```

## Node.js 使用示例

### 非流式响应

```javascript
const axios = require('axios');

async function callDeepSeek() {
  try {
    const response = await axios.post(
      'http://localhost:5003/api/deepseek/chat',
      {
        messages: [
          { role: 'system', content: '你是一个专业的AI助手。' },
          { role: 'user', content: '你好！' }
        ],
        temperature: 0.7,
        maxTokens: 100,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your_api_key'
        }
      }
    );

    console.log('响应:', response.data.data.message);
    console.log('Token 使用:', response.data.data.usage);
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

callDeepSeek();
```

### 流式响应

```javascript
const axios = require('axios');

async function callDeepSeekStream() {
  try {
    const response = await axios.post(
      'http://localhost:5003/api/deepseek/chat',
      {
        messages: [
          { role: 'system', content: '你是一个专业的AI助手。' },
          { role: 'user', content: '你好！' }
        ],
        stream: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your_api_key'
        },
        responseType: 'stream'
      }
    );

    let fullMessage = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();

          if (data === '[DONE]') {
            console.log('\n完成!');
            console.log('完整消息:', fullMessage);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              process.stdout.write(content);
              fullMessage += content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });

    response.data.on('error', (error) => {
      console.error('流式错误:', error.message);
    });

  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

callDeepSeekStream();
```

## Python 使用示例

### 非流式响应

```python
import requests
import json

def call_deepseek():
    url = 'http://localhost:5003/api/deepseek/chat'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    }
    data = {
        'messages': [
            {'role': 'system', 'content': '你是一个专业的AI助手。'},
            {'role': 'user', 'content': '你好！'}
        ],
        'temperature': 0.7,
        'maxTokens': 100,
        'stream': False
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()

        result = response.json()
        print('响应:', result['data']['message'])
        print('Token 使用:', result['data']['usage'])
    except requests.exceptions.RequestException as e:
        print('错误:', e)

call_deepseek()
```

### 流式响应

```python
import requests
import json

def call_deepseek_stream():
    url = 'http://localhost:5003/api/deepseek/chat'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    }
    data = {
        'messages': [
            {'role': 'system', 'content': '你是一个专业的AI助手。'},
            {'role': 'user', 'content': '你好！'}
        ],
        'stream': True
    }

    try:
        response = requests.post(url, headers=headers, json=data, stream=True)
        response.raise_for_status()

        full_message = ''

        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')

                if line_str.startswith('data: '):
                    data_str = line_str[6:].strip()

                    if data_str == '[DONE]':
                        print('\n完成!')
                        print('完整消息:', full_message)
                        break

                    try:
                        data_json = json.loads(data_str)
                        content = data_json.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        if content:
                            print(content, end='', flush=True)
                            full_message += content
                    except json.JSONDecodeError:
                        pass

    except requests.exceptions.RequestException as e:
        print('错误:', e)

call_deepseek_stream()
```

## 环境配置

### 服务器端配置（.env 文件）

如果不提供客户端 API Key，需要在服务器的 `.env` 文件中配置：

```bash
# DeepSeek 配置
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT=60000
```

### 客户端配置

客户端可以在请求中直接提供自己的 API Key，无需服务器配置：

```json
{
  "messages": [...],
  "deepseekApiKey": "sk-client-deepseek-api-key"
}
```

## 错误处理

### 常见错误及解决方法

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `缺少必需参数: messages` | 未提供 messages 参数 | 确保请求包含 messages 数组 |
| `消息格式错误` | messages 格式不正确 | 检查每个消息是否包含 role 和 content |
| `DeepSeek API Key 无效` | API Key 错误或过期 | 检查 API Key 是否正确 |
| `请求频率超限` | 超过 API 调用限制 | 等待一段时间后重试 |
| `DeepSeek 配置错误` | 服务器未配置 API Key | 在 .env 中配置或提供客户端 API Key |

## 测试脚本

### 非流式响应测试

使用提供的测试脚本测试非流式接口：

```bash
node test-deepseek-api.js
```

测试脚本包含：
1. 使用服务器 API Key 的基本测试
2. 使用客户端 API Key 的测试
3. 参数验证测试
4. 多轮对话测试

### 流式响应测试

使用流式测试脚本：

```bash
# 测试流式响应
node test-deepseek-stream.js stream

# 对比流式和非流式性能
node test-deepseek-stream.js compare
```

流式测试脚本功能：
1. 实时显示流式输出
2. 统计字符数和数据块数
3. 对比流式和非流式的性能差异
4. 测量首字节响应时间（TTFB）

## 性能说明

### 非流式响应
- **默认超时**: 60 秒
- **响应方式**: 等待完整内容生成后一次性返回
- **适用场景**: 需要完整结果后再处理，或对实时性要求不高

### 流式响应
- **超时**: 无超时限制（长连接）
- **响应方式**: 实时逐字返回，边生成边发送
- **首字节时间**: 通常 < 1 秒
- **适用场景**: 需要实时显示、聊天界面、提升用户体验

### 通用特性
- **默认 max_tokens**: 8000（可自定义，最大取决于模型限制）
- **并发支持**: 支持多个并发请求
- **日志记录**: 所有请求和响应都会记录到日志文件
- **连接管理**: 流式响应支持客户端主动断开，自动清理资源

## 安全建议

1. **保护 API Key**: 不要在客户端代码中硬编码 API Key
2. **使用 HTTPS**: 生产环境应使用 HTTPS 加密传输
3. **验证输入**: 客户端应验证用户输入，避免注入攻击
4. **限流控制**: 建议实施速率限制，防止滥用
5. **日志审计**: 定期审查日志，监控异常请求

## 更新日志

- **2025-12-06 v1.1**: 新增流式响应支持
  - ✨ 支持 Server-Sent Events (SSE) 流式响应
  - ✨ 实时逐字返回，提升用户体验
  - ✨ 支持客户端主动断开，自动资源清理
  - 📝 更新文档和测试脚本

- **2025-12-06 v1.0**: 初始版本，支持基本的 DeepSeek Chat Completions 转接
  - 支持标准消息格式
  - 支持客户端和服务器端 API Key
  - 默认 max_tokens 设置为 8000
  - 完整的错误处理和日志记录

## 相关文档

- [API Server 主文档](./README.md)
- [CLAUDE.md](./CLAUDE.md) - 项目架构和开发指南
- [DeepSeek 官方文档](https://platform.deepseek.com/docs)

## 技术支持

如有问题或建议，请查看：
- 项目日志: `logs/app.log`
- 错误日志: `logs/error.log`
- PM2 日志: `pm2 logs mp-auto-push-api`

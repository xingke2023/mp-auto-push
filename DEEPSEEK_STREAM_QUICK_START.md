# DeepSeek Stream API 快速开始

## 最简单的流式调用示例

### curl 命令（推荐用于快速测试）

```bash
curl -N http://localhost:5003/api/deepseek/chat \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

**注意**: `-N` 参数很重要，它禁用缓冲以实时查看输出。

### 输出示例

```
data: {"id":"chatcmpl-xxx","choices":[{"index":0,"delta":{"role":"assistant","content":"你好"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","choices":[{"index":0,"delta":{"content":"！"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","choices":[{"index":0,"delta":{"content":"很"},"finish_reason":null}]}

data: [DONE]
```

## Node.js 最简示例

```javascript
const axios = require('axios');

axios.post('http://localhost:5003/api/deepseek/chat', {
  messages: [{ role: 'user', content: '你好' }],
  stream: true
}, {
  headers: { 'X-API-Key': '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647' },
  responseType: 'stream'
}).then(response => {
  response.data.on('data', chunk => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const data = JSON.parse(line.substring(6));
          const content = data.choices?.[0]?.delta?.content || '';
          if (content) process.stdout.write(content);
        } catch {}
      }
    }
  });
});
```

## Python 最简示例

```python
import requests

response = requests.post(
    'http://localhost:5003/api/deepseek/chat',
    headers={'X-API-Key': '0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647'},
    json={'messages': [{'role': 'user', 'content': '你好'}], 'stream': True},
    stream=True
)

for line in response.iter_lines():
    if line and line.startswith(b'data: ') and b'[DONE]' not in line:
        try:
            import json
            data = json.loads(line[6:])
            content = data['choices'][0]['delta'].get('content', '')
            if content:
                print(content, end='', flush=True)
        except:
            pass
```

## 流式 vs 非流式对比

### 非流式（默认）

```bash
curl http://localhost:5003/api/deepseek/chat \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

**响应**: 等待完整生成后一次性返回 JSON

```json
{
  "success": true,
  "data": {
    "message": "你好！很高兴见到你...",
    "usage": {"totalTokens": 50}
  }
}
```

### 流式

```bash
curl -N http://localhost:5003/api/deepseek/chat \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

**响应**: 逐字实时返回 SSE 格式数据

```
data: {...,"delta":{"content":"你"}}
data: {...,"delta":{"content":"好"}}
data: [DONE]
```

## 性能对比

| 特性 | 非流式 | 流式 |
|------|--------|------|
| 首字节时间 | 需等待完整生成 | < 1 秒 |
| 用户体验 | 等待中无反馈 | 实时显示 |
| 适用场景 | API 集成 | 聊天界面 |
| 响应格式 | JSON | SSE |

## 测试命令

```bash
# 测试流式响应
node test-deepseek-stream.js stream

# 对比性能
node test-deepseek-stream.js compare

# 测试非流式
node test-deepseek-api.js
```

## 常见问题

### Q: 如何禁用缓冲？
**A**: 使用 curl 时加 `-N` 参数，axios 设置 `responseType: 'stream'`

### Q: 如何检测流结束？
**A**: 接收到 `data: [DONE]` 时表示结束

### Q: 支持多轮对话吗？
**A**: 支持！在 `messages` 数组中包含历史消息即可

### Q: 流式响应会超时吗？
**A**: 不会，流式连接没有超时限制

### Q: 客户端断开会怎样？
**A**: 服务器会自动检测并清理资源

## 完整文档

详细文档请查看: [DEEPSEEK_API_GUIDE.md](./DEEPSEEK_API_GUIDE.md)

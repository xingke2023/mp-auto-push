# 翻译 API 使用指南

## 概述

本项目新增了基于 Google Translate 的翻译 API 功能，支持 100+ 种语言的自动翻译。

## API 端点

### 1. 翻译文本（单个）

**端点**: `POST /api/translate`

**功能**: 翻译单个文本，支持自动语言检测

**请求参数**:
```json
{
  "text": "要翻译的文本（必需）",
  "from": "源语言代码（可选，默认: auto 自动检测）",
  "to": "目标语言代码（可选，默认: en）",
  "raw": false
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "翻译成功",
  "data": {
    "translatedText": "Hello, World!",
    "originalText": "你好，世界！",
    "detectedLanguage": "zh-cn",
    "targetLanguage": "en",
    "from": {
      "language": {
        "didYouMean": false,
        "iso": "zh-cn"
      },
      "text": {
        "autoCorrected": false,
        "value": "",
        "didYouMean": false
      }
    }
  },
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

**cURL 示例**:
```bash
curl -X POST http://localhost:5003/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "text": "你好，世界！",
    "from": "zh-cn",
    "to": "en"
  }'
```

---

### 2. 批量翻译

**端点**: `POST /api/translate/batch`

**功能**: 批量翻译多个文本（最多 100 个）

**请求参数**:
```json
{
  "texts": ["文本1", "文本2", "文本3"],
  "from": "zh-cn",
  "to": "en"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "批量翻译完成，成功 3 个，失败 0 个",
  "data": {
    "totalCount": 3,
    "successCount": 3,
    "failedCount": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "original": "早上好",
        "translated": "Good morning",
        "detectedLanguage": "zh-cn"
      },
      {
        "index": 1,
        "success": true,
        "original": "下午好",
        "translated": "Good afternoon",
        "detectedLanguage": "zh-cn"
      },
      {
        "index": 2,
        "success": true,
        "original": "晚上好",
        "translated": "Good evening",
        "detectedLanguage": "zh-cn"
      }
    ]
  },
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

**cURL 示例**:
```bash
curl -X POST http://localhost:5003/api/translate/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "texts": ["早上好", "下午好", "晚上好"],
    "from": "zh-cn",
    "to": "en"
  }'
```

---

### 3. 获取支持的语言列表

**端点**: `GET /api/translate/languages`

**功能**: 获取所有支持的语言及其代码

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "message": "获取语言列表成功",
  "data": {
    "languages": {
      "auto": "Automatic",
      "zh-cn": "Chinese Simplified",
      "zh-tw": "Chinese Traditional",
      "en": "English",
      "ja": "Japanese",
      "ko": "Korean",
      "fr": "French",
      "de": "German",
      "es": "Spanish",
      "ru": "Russian",
      ...
    },
    "totalCount": 105
  },
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

**cURL 示例**:
```bash
curl -X GET http://localhost:5003/api/translate/languages \
  -H "X-API-Key: your-api-key"
```

---

## 支持的语言代码

### 常用语言
| 代码 | 语言 |
|------|------|
| `auto` | 自动检测 |
| `zh-cn` | 简体中文 |
| `zh-tw` | 繁体中文 |
| `en` | 英语 |
| `ja` | 日语 |
| `ko` | 韩语 |
| `fr` | 法语 |
| `de` | 德语 |
| `es` | 西班牙语 |
| `ru` | 俄语 |
| `ar` | 阿拉伯语 |
| `pt` | 葡萄牙语 |
| `it` | 意大利语 |
| `th` | 泰语 |
| `vi` | 越南语 |
| `hi` | 印地语 |
| `id` | 印度尼西亚语 |

更多语言请通过 `/api/translate/languages` 端点查询。

---

## 使用示例

### Node.js 示例

```javascript
const axios = require('axios');

const api = axios.create({
    baseURL: 'http://localhost:5003',
    headers: {
        'X-API-Key': 'your-api-key'
    }
});

// 单个翻译
async function translate() {
    const response = await api.post('/api/translate', {
        text: '你好，世界！',
        from: 'zh-cn',
        to: 'en'
    });
    console.log(response.data.data.translatedText);
}

// 批量翻译
async function batchTranslate() {
    const response = await api.post('/api/translate/batch', {
        texts: ['早上好', '下午好', '晚上好'],
        from: 'zh-cn',
        to: 'en'
    });
    console.log(response.data.data.results);
}

translate();
batchTranslate();
```

### Python 示例

```python
import requests

API_BASE_URL = 'http://localhost:5003'
API_KEY = 'your-api-key'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# 单个翻译
def translate(text, from_lang='auto', to_lang='en'):
    response = requests.post(
        f'{API_BASE_URL}/api/translate',
        headers=headers,
        json={
            'text': text,
            'from': from_lang,
            'to': to_lang
        }
    )
    return response.json()

# 批量翻译
def batch_translate(texts, from_lang='zh-cn', to_lang='en'):
    response = requests.post(
        f'{API_BASE_URL}/api/translate/batch',
        headers=headers,
        json={
            'texts': texts,
            'from': from_lang,
            'to': to_lang
        }
    )
    return response.json()

# 使用示例
result = translate('你好，世界！', 'zh-cn', 'en')
print(result['data']['translatedText'])

batch_result = batch_translate(['早上好', '下午好', '晚上好'])
for item in batch_result['data']['results']:
    print(f"{item['original']} -> {item['translated']}")
```

---

## 错误处理

### 错误响应格式
```json
{
  "success": false,
  "error": "错误类型",
  "message": "错误详细信息"
}
```

### 常见错误

#### 1. 缺少必需参数
**HTTP 状态码**: 400
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "缺少必需参数: text（要翻译的文本）"
}
```

#### 2. 不支持的语言
**HTTP 状态码**: 500
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "翻译失败: 不支持的源语言: invalid-lang"
}
```

#### 3. 请求过于频繁
**HTTP 状态码**: 500
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "请求过于频繁，请稍后再试"
}
```

#### 4. 认证失败
**HTTP 状态码**: 401
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "无效的API密钥"
}
```

---

## 技术实现

### 实现架构

翻译功能基于以下技术实现：

1. **TranslateService** (`src/translateService.js`)
   - 封装了 Google Translate API 的调用逻辑
   - 参考 `google-translate-api` 库的实现
   - 支持自动语言检测、拼写纠正等功能

2. **API 路由** (`src/apiServer.js`)
   - 提供 RESTful API 端点
   - 参数验证和错误处理
   - 支持 CORS 跨域访问

3. **特性**:
   - 自动语言检测
   - 拼写纠正建议
   - 批量翻译（防抖处理）
   - 100+ 种语言支持
   - 完整的错误处理

### 核心代码结构

```
src/
├── translateService.js      # 翻译服务核心逻辑
└── apiServer.js            # API 路由配置

google-translate-api/        # Google Translate API 实现参考
├── index.js                # 核心翻译逻辑
├── languages.js            # 语言列表
└── package.json            # 依赖配置
```

---

## 注意事项

### Google Translate API 限制

1. **免费服务**: 本实现使用 Google Translate 的非官方免费接口
2. **速率限制**: Google 可能会对频繁请求进行限制
3. **稳定性**: 由于是非官方接口，可能会受到 Google 政策变化影响
4. **建议**:
   - 对于生产环境，建议使用 Google Cloud Translation API 官方服务
   - 添加缓存机制减少重复翻译请求
   - 使用队列系统处理大量翻译任务

### 最佳实践

1. **批量翻译**: 对于多个文本，使用批量翻译接口而不是多次调用单个翻译
2. **错误处理**: 始终处理可能的翻译失败情况
3. **速率控制**: 避免在短时间内发送大量请求
4. **语言验证**: 使用语言列表接口验证语言代码的有效性

---

## 测试

项目提供了完整的测试脚本：

```bash
# 运行翻译 API 测试
export API_KEY=your-api-key
node test-translate-api.js
```

测试覆盖：
- ✅ 自动语言检测
- ✅ 指定源语言和目标语言
- ✅ 批量翻译
- ✅ 获取语言列表
- ✅ 长文本翻译
- ✅ 错误处理（空文本、不支持的语言）

---

## 更新日志

### 2025-11-02
- ✅ 创建 TranslateService 翻译服务类
- ✅ 添加 3 个翻译相关 API 端点
- ✅ 支持 100+ 种语言
- ✅ 实现批量翻译功能
- ✅ 完善错误处理和参数验证
- ✅ 添加完整的测试脚本

---

## 相关文档

- [API 文档](API_DOCS.md)
- [环境配置](ENV_CONFIG_PRIORITY.md)
- [Google Translate API 参考](https://github.com/matheuss/google-translate-api)

---

## 联系支持

如有问题或建议，请提交 Issue 或联系项目维护者。

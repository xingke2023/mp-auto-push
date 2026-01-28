# 翻译 API 远程调用指南

## 概述

本文档说明如何从远程客户端（网页、移动应用、其他服务器等）调用 Google 翻译 API。

## API 基本信息

### 服务端点
```
http://your-server-ip:5003
或
https://your-domain.com:5003
```

### 认证方式
所有 API 请求需要在请求头中携带 API Key：
```
X-API-Key: your_api_key_here
```

## API 接口列表

### 1. 单文本翻译

**端点**: `POST /api/translate`

**请求示例**:
```bash
curl -X POST http://your-server:5003/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "text": "Hello, world!",
    "from": "en",
    "to": "zh-cn"
  }'
```

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| text | string | 是 | 要翻译的文本 |
| from | string | 否 | 源语言代码（默认 auto 自动检测）|
| to | string | 是 | 目标语言代码 |
| raw | boolean | 否 | 是否返回原始响应数据 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "originalText": "Hello, world!",
    "translatedText": "你好，世界！",
    "detectedLanguage": "en",
    "targetLanguage": "zh-cn"
  }
}
```

### 2. 批量翻译

**端点**: `POST /api/translate/batch`

**请求示例**:
```bash
curl -X POST http://your-server:5003/api/translate/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "texts": ["Good morning", "Good afternoon", "Good evening"],
    "from": "en",
    "to": "zh-cn"
  }'
```

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| texts | array | 是 | 要翻译的文本数组 |
| from | string | 否 | 源语言代码（默认 auto）|
| to | string | 是 | 目标语言代码 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalCount": 3,
    "successCount": 3,
    "failedCount": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "original": "Good morning",
        "translated": "早上好",
        "detectedLanguage": "en"
      },
      {
        "index": 1,
        "success": true,
        "original": "Good afternoon",
        "translated": "下午好",
        "detectedLanguage": "en"
      },
      {
        "index": 2,
        "success": true,
        "original": "Good evening",
        "translated": "晚上好",
        "detectedLanguage": "en"
      }
    ]
  }
}
```

### 3. 获取支持的语言列表

**端点**: `GET /api/translate/languages`

**请求示例**:
```bash
curl -X GET http://your-server:5003/api/translate/languages \
  -H "X-API-Key: your_api_key_here"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalCount": 105,
    "languages": {
      "auto": "Automatic",
      "en": "English",
      "zh-cn": "Chinese Simplified",
      "zh-tw": "Chinese Traditional",
      "ja": "Japanese",
      "ko": "Korean",
      "es": "Spanish",
      "fr": "French",
      "de": "German",
      "...": "..."
    }
  }
}
```

## 常用语言代码

| 语言 | 代码 |
|------|------|
| 自动检测 | auto |
| 英语 | en |
| 中文（简体）| zh-cn |
| 中文（繁体）| zh-tw |
| 日语 | ja |
| 韩语 | ko |
| 法语 | fr |
| 德语 | de |
| 西班牙语 | es |
| 俄语 | ru |
| 阿拉伯语 | ar |
| 葡萄牙语 | pt |
| 意大利语 | it |
| 越南语 | vi |
| 泰语 | th |
| 印地语 | hi |

## 客户端代码示例

### JavaScript (浏览器)

```javascript
// 翻译单个文本
async function translateText(text, targetLang = 'zh-cn') {
    try {
        const response = await fetch('http://your-server:5003/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'your_api_key_here'
            },
            body: JSON.stringify({
                text: text,
                to: targetLang
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('原文:', result.data.originalText);
            console.log('译文:', result.data.translatedText);
            return result.data.translatedText;
        } else {
            console.error('翻译失败:', result.message);
            return null;
        }
    } catch (error) {
        console.error('请求错误:', error);
        return null;
    }
}

// 使用示例
translateText('Hello, how are you?', 'zh-cn')
    .then(translation => {
        if (translation) {
            console.log('翻译结果:', translation);
        }
    });
```

### Node.js (使用 axios)

```javascript
const axios = require('axios');

// 配置
const API_BASE_URL = 'http://your-server:5003';
const API_KEY = 'your_api_key_here';

// 创建 axios 实例
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'X-API-Key': API_KEY
    }
});

// 单文本翻译
async function translate(text, from = 'auto', to = 'en') {
    try {
        const response = await api.post('/api/translate', {
            text,
            from,
            to
        });
        return response.data;
    } catch (error) {
        console.error('翻译失败:', error.response?.data || error.message);
        throw error;
    }
}

// 批量翻译
async function translateBatch(texts, from = 'auto', to = 'en') {
    try {
        const response = await api.post('/api/translate/batch', {
            texts,
            from,
            to
        });
        return response.data;
    } catch (error) {
        console.error('批量翻译失败:', error.response?.data || error.message);
        throw error;
    }
}

// 使用示例
(async () => {
    // 单文本翻译
    const result1 = await translate('Hello world', 'en', 'zh-cn');
    console.log('翻译结果:', result1.data.translatedText);

    // 批量翻译
    const result2 = await translateBatch(
        ['Good morning', 'Good night', 'Thank you'],
        'en',
        'zh-cn'
    );
    console.log('批量翻译结果:', result2.data.results);
})();
```

### Python (使用 requests)

```python
import requests
import json

# 配置
API_BASE_URL = 'http://your-server:5003'
API_KEY = 'your_api_key_here'

class TranslateClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }

    def translate(self, text, from_lang='auto', to_lang='en'):
        """单文本翻译"""
        url = f'{self.base_url}/api/translate'
        data = {
            'text': text,
            'from': from_lang,
            'to': to_lang
        }

        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'翻译失败: {e}')
            return None

    def translate_batch(self, texts, from_lang='auto', to_lang='en'):
        """批量翻译"""
        url = f'{self.base_url}/api/translate/batch'
        data = {
            'texts': texts,
            'from': from_lang,
            'to': to_lang
        }

        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'批量翻译失败: {e}')
            return None

    def get_languages(self):
        """获取支持的语言列表"""
        url = f'{self.base_url}/api/translate/languages'

        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'获取语言列表失败: {e}')
            return None

# 使用示例
if __name__ == '__main__':
    client = TranslateClient(API_BASE_URL, API_KEY)

    # 单文本翻译
    result = client.translate('Hello, world!', from_lang='en', to_lang='zh-cn')
    if result and result['success']:
        print(f"原文: {result['data']['originalText']}")
        print(f"译文: {result['data']['translatedText']}")

    # 批量翻译
    texts = ['Good morning', 'Good afternoon', 'Good evening']
    batch_result = client.translate_batch(texts, from_lang='en', to_lang='zh-cn')
    if batch_result and batch_result['success']:
        for item in batch_result['data']['results']:
            if item['success']:
                print(f"{item['original']} -> {item['translated']}")

    # 获取支持的语言
    languages = client.get_languages()
    if languages and languages['success']:
        print(f"支持 {languages['data']['totalCount']} 种语言")
```

### PHP

```php
<?php

class TranslateClient {
    private $baseUrl;
    private $apiKey;

    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
    }

    /**
     * 单文本翻译
     */
    public function translate($text, $from = 'auto', $to = 'en') {
        $url = $this->baseUrl . '/api/translate';

        $data = [
            'text' => $text,
            'from' => $from,
            'to' => $to
        ];

        return $this->request('POST', $url, $data);
    }

    /**
     * 批量翻译
     */
    public function translateBatch($texts, $from = 'auto', $to = 'en') {
        $url = $this->baseUrl . '/api/translate/batch';

        $data = [
            'texts' => $texts,
            'from' => $from,
            'to' => $to
        ];

        return $this->request('POST', $url, $data);
    }

    /**
     * 获取支持的语言列表
     */
    public function getLanguages() {
        $url = $this->baseUrl . '/api/translate/languages';
        return $this->request('GET', $url);
    }

    /**
     * 发送HTTP请求
     */
    private function request($method, $url, $data = null) {
        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ];

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return json_decode($response, true);
        } else {
            return [
                'success' => false,
                'error' => 'HTTP Error ' . $httpCode,
                'response' => $response
            ];
        }
    }
}

// 使用示例
$client = new TranslateClient('http://your-server:5003', 'your_api_key_here');

// 单文本翻译
$result = $client->translate('Hello, world!', 'en', 'zh-cn');
if ($result['success']) {
    echo "原文: " . $result['data']['originalText'] . "\n";
    echo "译文: " . $result['data']['translatedText'] . "\n";
}

// 批量翻译
$texts = ['Good morning', 'Good afternoon', 'Good evening'];
$batchResult = $client->translateBatch($texts, 'en', 'zh-cn');
if ($batchResult['success']) {
    foreach ($batchResult['data']['results'] as $item) {
        if ($item['success']) {
            echo $item['original'] . " -> " . $item['translated'] . "\n";
        }
    }
}

?>
```

### Java (使用 OkHttp)

```java
import okhttp3.*;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.IOException;

public class TranslateClient {
    private final String baseUrl;
    private final String apiKey;
    private final OkHttpClient client;
    private final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    public TranslateClient(String baseUrl, String apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.client = new OkHttpClient();
    }

    /**
     * 单文本翻译
     */
    public String translate(String text, String from, String to) throws IOException {
        JSONObject json = new JSONObject();
        json.put("text", text);
        json.put("from", from);
        json.put("to", to);

        RequestBody body = RequestBody.create(json.toString(), JSON);
        Request request = new Request.Builder()
            .url(baseUrl + "/api/translate")
            .addHeader("X-API-Key", apiKey)
            .post(body)
            .build();

        try (Response response = client.newCall(request).execute()) {
            return response.body().string();
        }
    }

    /**
     * 批量翻译
     */
    public String translateBatch(String[] texts, String from, String to) throws IOException {
        JSONObject json = new JSONObject();
        json.put("texts", new JSONArray(texts));
        json.put("from", from);
        json.put("to", to);

        RequestBody body = RequestBody.create(json.toString(), JSON);
        Request request = new Request.Builder()
            .url(baseUrl + "/api/translate/batch")
            .addHeader("X-API-Key", apiKey)
            .post(body)
            .build();

        try (Response response = client.newCall(request).execute()) {
            return response.body().string();
        }
    }

    // 使用示例
    public static void main(String[] args) {
        TranslateClient client = new TranslateClient(
            "http://your-server:5003",
            "your_api_key_here"
        );

        try {
            // 单文本翻译
            String result = client.translate("Hello, world!", "en", "zh-cn");
            System.out.println(result);

            // 批量翻译
            String[] texts = {"Good morning", "Good afternoon", "Good evening"};
            String batchResult = client.translateBatch(texts, "en", "zh-cn");
            System.out.println(batchResult);

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

## 错误处理

### 常见错误代码

| HTTP 状态码 | 错误类型 | 说明 |
|------------|---------|------|
| 400 | Bad Request | 请求参数错误（缺少必需参数、参数格式错误等）|
| 401 | Unauthorized | API Key 无效或未提供 |
| 429 | Too Many Requests | 请求频率过高，需要降低请求频率 |
| 500 | Internal Server Error | 服务器内部错误（翻译服务不可用等）|

### 错误响应示例

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "缺少必需参数: text（要翻译的文本）"
}
```

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "无效的API密钥"
}
```

## 性能和限制

### 请求频率限制
- 建议客户端实现请求限流（每秒不超过 5 个请求）
- 批量翻译已内置 200ms 延迟，避免触发 Google 的频率限制
- 如果收到 429 错误，请等待后重试

### 文本长度限制
- 单次翻译建议不超过 5000 字符
- 批量翻译建议每批不超过 10 个文本

### 超时设置
- API 请求超时时间为 30 秒
- 建议客户端设置合理的超时时间（如 60 秒）

## 最佳实践

### 1. 错误重试机制
```javascript
async function translateWithRetry(text, to, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await translateText(text, to);
            return result;
        } catch (error) {
            if (i === maxRetries - 1) throw error;

            // 指数退避
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

### 2. 请求缓存
```javascript
const cache = new Map();

async function translateWithCache(text, to) {
    const cacheKey = `${text}-${to}`;

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const result = await translateText(text, to);
    cache.set(cacheKey, result);

    return result;
}
```

### 3. 批量处理优化
```javascript
// 将大量文本分批处理
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

async function translateLargeArray(texts, to) {
    const chunks = chunkArray(texts, 10); // 每批10个
    const results = [];

    for (const chunk of chunks) {
        const result = await translateBatch(chunk, 'auto', to);
        results.push(...result.data.results);

        // 批次间延迟，避免频率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}
```

## 安全建议

1. **保护 API Key**
   - 不要在前端代码中硬编码 API Key
   - 使用环境变量或配置文件存储
   - 定期更换 API Key

2. **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - 避免 API Key 在传输过程中被窃取

3. **实现请求限流**
   - 客户端实现请求频率控制
   - 避免恶意或异常调用

4. **日志记录**
   - 记录 API 调用日志
   - 监控异常请求和错误

## 联系支持

如有问题或需要技术支持，请联系：
- 查看完整文档：`README.md`
- API 配置说明：`API_DOCS.md`
- Token 实现原理：`GOOGLE_TRANSLATE_TOKEN_IMPLEMENTATION.md`

---

**最后更新**: 2025-11-02
**API 版本**: 1.0.0

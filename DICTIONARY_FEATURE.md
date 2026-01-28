# 单词词典查询功能说明

## 功能概述

翻译 API 现已支持智能单词查询功能。当检测到输入是单个英文单词时，系统会自动返回详细的词典信息，包括：

- ✅ **多种释义** - 按词性分类的详细翻译
- ✅ **词性标注** - 名词、动词、形容词等
- ✅ **同义词** - 相关的同义词列表
- ✅ **例句** - 真实使用场景的例句（如果可用）
- ✅ **使用频率** - 常用程度标识

## 自动识别机制

系统会自动检测输入文本：

- **单词模式**：如果输入是单个英文单词（如 `hello`, `beautiful`, `well-known`），自动返回详细词典信息
- **翻译模式**：如果输入是短语或句子（如 `hello world`, `How are you?`），返回普通翻译结果

## API 使用示例

### 查询单词

**请求**：
```bash
curl -X POST http://your-server:5003/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "text": "beautiful",
    "to": "zh-cn"
  }'
```

**响应**：
```json
{
  "success": true,
  "message": "单词查询成功",
  "data": {
    "originalText": "beautiful",
    "translatedText": "美丽的",
    "detectedLanguage": "en",
    "targetLanguage": "zh-cn",
    "dictionary": {
      "word": "beautiful",
      "translations": [
        {
          "text": "美丽的",
          "partOfSpeech": "beautiful"
        }
      ],
      "definitions": [
        {
          "partOfSpeech": "形容词",
          "meaning": "美丽",
          "synonyms": ["beautiful", "pretty"],
          "frequency": 0
        },
        {
          "partOfSpeech": "形容词",
          "meaning": "漂亮",
          "synonyms": ["beautiful", "pretty", "handsome", "cute"],
          "frequency": 0
        },
        {
          "partOfSpeech": "形容词",
          "meaning": "优美",
          "synonyms": ["beautiful", "graceful", "elegant"],
          "frequency": 0
        }
      ],
      "examples": [
        {
          "source": "She has a beautiful smile.",
          "translation": "她有一个美丽的笑容。"
        }
      ],
      "synonyms": [
        {
          "partOfSpeech": "形容词",
          "words": ["gorgeous", "lovely", "attractive", "pretty"]
        }
      ]
    }
  },
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

### 翻译短语（不触发词典模式）

**请求**：
```bash
curl -X POST http://your-server:5003/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "text": "hello world",
    "to": "zh-cn"
  }'
```

**响应**：
```json
{
  "success": true,
  "message": "翻译成功",
  "data": {
    "originalText": "hello world",
    "translatedText": "你好世界",
    "detectedLanguage": "en",
    "targetLanguage": "zh-cn"
    // 注意：没有 dictionary 字段
  },
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

## 强制控制模式

可以通过 `detailed` 参数手动控制是否使用词典模式：

### 强制使用词典模式
```json
{
  "text": "hello",
  "to": "zh-cn",
  "detailed": true
}
```

### 强制使用普通翻译
```json
{
  "text": "hello",
  "to": "zh-cn",
  "detailed": false
}
```

## 响应数据结构

### dictionary 对象字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| word | string | 查询的单词 |
| translations | array | 所有翻译列表 |
| definitions | array | 详细定义列表（按词性） |
| examples | array | 例句列表 |
| synonyms | array | 同义词组 |

### translations 数组元素

```json
{
  "text": "美丽的",              // 翻译文本
  "partOfSpeech": "beautiful"  // 词性标注
}
```

### definitions 数组元素

```json
{
  "partOfSpeech": "形容词",    // 词性（名词、动词、形容词等）
  "meaning": "美丽",          // 释义
  "synonyms": ["beautiful", "pretty"],  // 该释义的同义词
  "frequency": 0             // 使用频率（数字越大越常用）
}
```

### examples 数组元素

```json
{
  "source": "She has a beautiful smile.",      // 英文例句
  "translation": "她有一个美丽的笑容。"          // 中文翻译
}
```

### synonyms 数组元素

```json
{
  "partOfSpeech": "形容词",    // 词性
  "words": ["gorgeous", "lovely", "attractive"]  // 同义词列表
}
```

## 支持的单词类型

- ✅ 单个英文单词：`hello`, `beautiful`, `run`
- ✅ 带连字符的单词：`well-known`, `state-of-the-art`
- ❌ 短语：`hello world`（会使用普通翻译模式）
- ❌ 句子：`How are you?`（会使用普通翻译模式）

## 客户端代码示例

### JavaScript

```javascript
async function lookupWord(word) {
    const response = await fetch('http://your-server:5003/api/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'your_api_key'
        },
        body: JSON.stringify({
            text: word,
            to: 'zh-cn'
        })
    });

    const result = await response.json();

    if (result.success && result.data.dictionary) {
        const dict = result.data.dictionary;

        console.log(`单词: ${dict.word}`);
        console.log(`翻译: ${result.data.translatedText}`);

        console.log('\n定义:');
        dict.definitions.forEach((def, i) => {
            console.log(`${i + 1}. [${def.partOfSpeech}] ${def.meaning}`);
        });

        if (dict.examples.length > 0) {
            console.log('\n例句:');
            dict.examples.forEach((ex, i) => {
                console.log(`${i + 1}. ${ex.source}`);
                if (ex.translation) {
                    console.log(`   ${ex.translation}`);
                }
            });
        }
    }
}

// 使用示例
lookupWord('hello');
```

### Python

```python
import requests

def lookup_word(word, api_url, api_key):
    """查询单词详细信息"""
    response = requests.post(
        f'{api_url}/api/translate',
        headers={'X-API-Key': api_key},
        json={'text': word, 'to': 'zh-cn'}
    )

    result = response.json()

    if result['success'] and 'dictionary' in result['data']:
        dict_data = result['data']['dictionary']

        print(f"单词: {dict_data['word']}")
        print(f"翻译: {result['data']['translatedText']}")

        print("\n定义:")
        for i, definition in enumerate(dict_data['definitions'], 1):
            print(f"{i}. [{definition['partOfSpeech']}] {definition['meaning']}")
            if definition['synonyms']:
                print(f"   同义词: {', '.join(definition['synonyms'][:3])}")

        if dict_data['examples']:
            print("\n例句:")
            for i, example in enumerate(dict_data['examples'][:3], 1):
                print(f"{i}. {example['source']}")
                if example['translation']:
                    print(f"   {example['translation']}")

    return result

# 使用示例
lookup_word('beautiful', 'http://your-server:5003', 'your_api_key')
```

### PHP

```php
<?php

function lookupWord($word, $apiUrl, $apiKey) {
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "$apiUrl/api/translate");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "X-API-Key: $apiKey"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'text' => $word,
        'to' => 'zh-cn'
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($result['success'] && isset($result['data']['dictionary'])) {
        $dict = $result['data']['dictionary'];

        echo "单词: {$dict['word']}\n";
        echo "翻译: {$result['data']['translatedText']}\n\n";

        echo "定义:\n";
        foreach ($dict['definitions'] as $i => $def) {
            echo ($i + 1) . ". [{$def['partOfSpeech']}] {$def['meaning']}\n";
        }

        if (!empty($dict['examples'])) {
            echo "\n例句:\n";
            foreach (array_slice($dict['examples'], 0, 3) as $i => $ex) {
                echo ($i + 1) . ". {$ex['source']}\n";
                if (!empty($ex['translation'])) {
                    echo "   {$ex['translation']}\n";
                }
            }
        }
    }

    return $result;
}

// 使用示例
lookupWord('apple', 'http://your-server:5003', 'your_api_key');

?>
```

## 技术实现原理

1. **单词检测**（src/translateService.js:312-317）
   - 使用正则表达式判断是否为单个单词
   - 支持普通单词和带连字符的单词

2. **详细查询**（src/translateService.js:325-460）
   - 调用 Google 翻译 API 的扩展参数
   - 请求更多数据类型（dt 参数）：
     - `t` - 基本翻译
     - `bd` - 词典定义
     - `ex` - 例句
     - `ss` - 同义词
     - `md` - 详细定义

3. **数据解析**
   - 解析 Google API 返回的复杂数组结构
   - 按词性分组整理定义
   - 清理 HTML 标签
   - 过滤无效数据

4. **自动降级**
   - 如果词典查询失败，自动降级为普通翻译
   - 保证服务的可用性

## 注意事项

1. **网络延迟**
   - 词典查询比普通翻译稍慢（需要获取更多数据）
   - 通常在 1-2 秒内返回结果

2. **数据可用性**
   - 不是所有单词都有完整的词典信息
   - 例句数量因单词而异
   - 某些冷门单词可能只有基本翻译

3. **语言支持**
   - 目前主要支持英文单词查询
   - 中文、日语等语言会使用普通翻译模式

4. **频率限制**
   - 与普通翻译共用频率限制
   - 建议控制请求频率

## 测试脚本

项目提供了专门的测试脚本：

```bash
# 运行单词查询测试
node test-word-dictionary.js
```

测试脚本会：
- 查询多个英文单词（hello, beautiful, run, apple 等）
- 测试带连字符的单词（well-known）
- 验证短语不触发词典模式
- 显示详细的查询结果

## 应用场景

- 📚 **英语学习应用** - 提供详细的单词释义和例句
- 📖 **在线词典** - 快速查询单词含义
- ✍️ **写作辅助** - 查找同义词和使用场景
- 🎓 **教育平台** - 单词教学和练习
- 📱 **翻译工具** - 智能区分单词和句子翻译

## 更新日志

**v1.1.0** - 2025-11-02
- ✅ 添加自动单词识别功能
- ✅ 实现详细词典查询
- ✅ 支持多种词性的释义
- ✅ 提取同义词和例句
- ✅ HTML 标签清理
- ✅ 自动降级机制

---

**相关文档**：
- API 完整文档：`API_DOCS.md`
- 客户端使用指南：`TRANSLATE_API_CLIENT_GUIDE.md`
- Token 实现原理：`GOOGLE_TRANSLATE_TOKEN_IMPLEMENTATION.md`

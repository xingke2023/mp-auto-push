# Google 翻译 API 原始数据结构详解

## 概述

本文档详细说明 Google 翻译 API 返回的原始数据结构，帮助理解如何从响应中提取各种信息。

## 响应格式

Google 翻译 API 返回一个**大数组**，包含 19 个元素（索引 0-18），每个元素包含不同类型的翻译数据。

### 整体结构

```javascript
[
  [0]  翻译结果数组（主要翻译文本）
  [1]  词典信息（按词性分类的释义）
  [2]  检测到的源语言代码
  [3]  null（保留）
  [4]  null（保留）
  [5]  备选翻译
  [6]  置信度
  [7]  空数组（保留）
  [8]  语言检测详情
  [9]  null（保留）
  [10] null（保留）
  [11] 同义词（单词模式）
  [12] 词语定义（英文定义）
  [13] 例句
  [14] null（保留）
  [15] null（保留）
  [16] null（保留）
  [17] null（保留）
  [18] 其他元数据
]
```

## 详细字段说明

### [0] 翻译结果数组

主要的翻译文本和相关信息。

**结构**：
```javascript
[
  [
    [
      "你好",        // [0][0][0] - 翻译后的文本
      "hello",       // [0][0][1] - 原始文本
      null,
      null,
      10,            // [0][0][4] - 某种评分/权重
      null,
      null,
      null,
      [...],         // 内部元数据
      [...]          // 文本范围
    ],
    [
      null,
      null,
      "Nǐ hǎo",      // [0][1][2] - 拼音/罗马音（目标语言）
      "həˈlō"        // [0][1][3] - 音标（源语言）
    ]
  ]
]
```

**提取翻译文本**：
```javascript
const translatedText = response[0][0][0]; // "你好"
const originalText = response[0][0][1];   // "hello"
const pinyin = response[0][1][2];         // "Nǐ hǎo"（如果有）
const pronunciation = response[0][1][3];  // "həˈlō"（如果有）
```

### [1] 词典信息（按词性）

**仅在单词查询时返回**，包含按词性分类的详细释义。

**结构**：
```javascript
[
  [
    "感叹词",        // [1][0][0] - 词性
    [               // [1][0][1] - 该词性的所有释义列表
      "你好!",
      "喂!"
    ],
    [               // [1][0][2] - 详细释义数组
      [
        "你好!",     // [2][0][0] - 中文释义
        [           // [2][0][1] - 该释义的同义词
          "Hello!",
          "Hi!",
          "Hallo!"
        ],
        null,
        0.13323711  // [2][0][3] - 使用频率（0-1之间）
      ],
      [
        "喂!",
        ["Hey!", "Hello!"],
        null,
        0.020115795
      ]
    ],
    "Hello!",       // [1][0][3] - 原词
    9               // [1][0][4] - 某种类型标识
  ]
]
```

**示例（beautiful）**：
```javascript
[
  [
    "形容词",
    [
      "美丽", "漂亮", "优美", "美", "秀丽", ...
    ],
    [
      [
        "美丽",
        ["beautiful", "pretty"],
        null,
        0.33495805  // 33.5% 使用频率，最常用
      ],
      [
        "漂亮",
        ["beautiful", "pretty", "handsome", "cute", "splendid", "brilliant"],
        null,
        0.08469065  // 8.5% 使用频率
      ],
      ...
    ],
    "beautiful",
    1
  ]
]
```

**提取词典信息**：
```javascript
if (response[1]) {
  response[1].forEach(posGroup => {
    const partOfSpeech = posGroup[0];      // 词性：名词、动词、形容词等
    const allMeanings = posGroup[1];       // 所有释义的简单列表
    const detailedMeanings = posGroup[2];  // 详细释义数组

    detailedMeanings.forEach(meaning => {
      const translation = meaning[0];      // 中文释义
      const synonyms = meaning[1];         // 同义词数组
      const frequency = meaning[3];        // 使用频率
    });
  });
}
```

### [2] 检测的源语言

**类型**：字符串

**示例**：
```javascript
"en"  // 英语
"zh-CN"  // 中文（简体）
"ja"  // 日语
```

**使用**：
```javascript
const detectedLanguage = response[2]; // "en"
```

### [5] 备选翻译

提供其他可能的翻译选项。

**结构**：
```javascript
[
  [
    "hello",        // 原词
    null,
    [               // 备选翻译数组
      [
        "你好",      // 翻译1
        null,
        true,
        false,
        [10]        // 评分/权重
      ],
      [
        "您好",      // 翻译2
        null,
        true,
        false,
        [10]
      ],
      [
        "嗨",        // 翻译3
        null,
        true,
        false,
        [8]
      ]
    ],
    [[0, 5]],       // 文本范围
    "hello",
    0,
    0
  ]
]
```

### [6] 置信度

翻译的置信度评分。

**类型**：数字

**示例**：
```javascript
1  // 高置信度
```

### [8] 语言检测详情

包含语言检测的详细信息。

**结构**：
```javascript
[
  ["en"],     // 检测到的语言
  null,
  [1],        // 置信度
  ["en"]      // 确认的语言
]
```

### [11] 同义词（仅单词模式）

**仅在单词查询时返回**，为空表示该单词没有同义词数据。

**结构（如果有）**：
```javascript
[
  [
    "形容词",        // 词性
    [
      [
        ["gorgeous", "lovely", "attractive", ...]  // 同义词列表
      ]
    ]
  ],
  [
    "名词",
    [
      [
        ["method", "procedure", "technique", ...]
      ]
    ]
  ]
]
```

**示例（beautiful 的同义词）**：
```javascript
// beautiful 有大量同义词
[
  [
    "形容词",
    [
      [
        [
          "beauteous"
        ]
      ]
    ]
  ],
  [
    "形容词",
    [
      [
        [
          "comely",
          "fair"
        ]
      ]
    ]
  ],
  [
    "形容词",
    [
      [
        [
          "attractive",
          "pretty",
          "handsome",
          "good-looking",
          "nice-looking",
          "pleasing",
          ...
        ]
      ]
    ]
  ]
]
```

### [12] 词语定义（英文）

**仅在单词查询时返回**，提供英文词典定义。

**结构**：
```javascript
[
  [
    "惊叹词",         // 词性（中文）
    [
      [
        "used as a greeting or to begin a phone conversation.",  // 英文定义
        "m_en_gbus0460730.012",                                  // 定义ID
        "hello there, Katie!"                                     // 例句
      ]
    ],
    "hello",          // 单词
    17                // 类型标识
  ],
  [
    "名词",
    [
      [
        "an utterance of "hello"; a greeting.",
        "m_en_gbus0460730.025",
        "she was getting polite nods and hellos from people"
      ]
    ],
    "hello",
    1
  ],
  [
    "动词",
    [
      [
        "say or shout "hello"; greet someone.",
        "m_en_gbus0460730.034",
        "I pressed the phone button and helloed"
      ]
    ],
    "hello",
    2
  ]
]
```

**提取定义**：
```javascript
if (response[12]) {
  response[12].forEach(defGroup => {
    const partOfSpeech = defGroup[0];  // 词性
    const definitions = defGroup[1];    // 定义数组

    definitions.forEach(def => {
      const definition = def[0];        // 英文定义
      const defId = def[1];            // 定义ID
      const example = def[2];          // 例句
    });
  });
}
```

### [13] 例句

**仅在某些单词查询时返回**，包含真实使用例句。

**结构**：
```javascript
[
  [
    [
      "<b>hello</b> there, Katie!",  // 例句（可能包含HTML标签高亮原词）
      null,
      null,
      null,
      null,
      "m_en_gbus0460730.012"        // 例句来源ID
    ]
  ]
]
```

**提取例句**：
```javascript
if (response[13]) {
  response[13].forEach(exampleGroup => {
    if (exampleGroup && exampleGroup[0]) {
      exampleGroup[0].forEach(example => {
        let sentence = example[0];
        // 移除HTML标签
        sentence = sentence.replace(/<[^>]*>/g, '');
        console.log(sentence);  // "hello there, Katie!"
      });
    }
  });
}
```

## 完整示例：查询 "hello"

```json
[
  [
    [
      ["你好", "hello", null, null, 10, ...],
      [null, null, "Nǐ hǎo", "həˈlō"]
    ]
  ],
  [
    [
      "感叹词",
      ["你好!", "喂!"],
      [
        ["你好!", ["Hello!", "Hi!", "Hallo!"], null, 0.13323711],
        ["喂!", ["Hey!", "Hello!"], null, 0.020115795]
      ],
      "Hello!",
      9
    ]
  ],
  "en",
  null,
  null,
  [[...]],  // 备选翻译
  1,
  [],
  [["en"], null, [1], ["en"]],
  null,
  null,
  null,
  [
    [
      "惊叹词",
      [["used as a greeting or to begin a phone conversation.", "m_en_gbus0460730.012", "hello there, Katie!"]],
      "hello",
      17
    ],
    // ... 更多定义
  ],
  [
    [["<b>hello</b> there, Katie!", null, null, null, null, "m_en_gbus0460730.012"]]
  ],
  null,
  null,
  null,
  null,
  [null, 2]
]
```

## 数据提取策略

### 基本翻译
```javascript
const translatedText = response[0][0][0];
const originalText = response[0][0][1];
const detectedLanguage = response[2];
```

### 词典信息（单词模式）
```javascript
const hasDictionary = response[1] && response[1].length > 0;

if (hasDictionary) {
  const dictionary = {
    translations: [],
    definitions: [],
    examples: [],
    synonyms: []
  };

  // 提取定义
  response[1].forEach(posGroup => {
    const pos = posGroup[0];
    const meanings = posGroup[2];

    meanings.forEach(meaning => {
      dictionary.definitions.push({
        partOfSpeech: pos,
        meaning: meaning[0],
        synonyms: meaning[1] || [],
        frequency: meaning[3] || 0
      });
    });
  });

  // 提取例句
  if (response[13]) {
    response[13].forEach(exGroup => {
      if (exGroup && exGroup[0]) {
        exGroup[0].forEach(ex => {
          const sentence = ex[0].replace(/<[^>]*>/g, '');
          dictionary.examples.push({ source: sentence });
        });
      }
    });
  }

  // 提取同义词
  if (response[11]) {
    response[11].forEach(synGroup => {
      if (synGroup[1]) {
        synGroup[1].forEach(synList => {
          if (synList[0]) {
            dictionary.synonyms.push({
              partOfSpeech: synGroup[0],
              words: synList[0]
            });
          }
        });
      }
    });
  }
}
```

## dt 参数说明

通过 `dt` 参数控制返回的数据类型：

| 参数 | 说明 | 对应数组索引 |
|------|------|-------------|
| `t` | 翻译文本 | [0] |
| `at` | 备选翻译 | [5] |
| `bd` | 词典定义 | [1] |
| `ex` | 例句 | [13] |
| `ld` | 语言检测 | [2], [8] |
| `md` | 英文定义 | [12] |
| `qca` | 拼写纠正 | [7] |
| `rw` | 相关词 | - |
| `rm` | 罗马音/拼音 | [0][1] |
| `ss` | 同义词 | [11] |
| `gt` | 语法 | - |

**普通翻译请求**：
```
dt=t&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss
```

**词典模式（更详细）**：
```
dt=t&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=gt
```

## 注意事项

1. **数组索引固定** - 各类数据在数组中的位置是固定的，即使数据为空也会保留位置（null 或空数组）

2. **单词 vs 短语** - 某些字段（如 [1] 词典信息、[11] 同义词、[12] 英文定义）仅在查询单个单词时返回

3. **HTML 标签** - 例句中可能包含 `<b>` 等 HTML 标签来高亮原词，需要清理

4. **语言差异** - 不同语言对的返回结构基本一致，但某些字段可能为空

5. **动态数据** - Google 的数据结构可能会随时间变化，建议做好容错处理

## 测试工具

使用项目中的测试脚本查看原始响应：

```bash
# 查看任意单词的原始响应
node test-google-raw-response.js

# 自定义测试
node -e "
const { getGoogleRawResponse } = require('./test-google-raw-response.js');
getGoogleRawResponse('your-word', true);
"
```

---

**相关文档**：
- Token 实现原理：`GOOGLE_TRANSLATE_TOKEN_IMPLEMENTATION.md`
- 词典功能说明：`DICTIONARY_FEATURE.md`
- API 使用指南：`TRANSLATE_API_CLIENT_GUIDE.md`

**最后更新**: 2025-11-02

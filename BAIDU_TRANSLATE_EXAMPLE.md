# 百度翻译 API 集成示例

由于 Google Translate 在服务器端受限，这里提供一个替代方案：百度翻译 API

## 为什么选择百度翻译？

✅ **优势**：
- 免费额度充足（标准版每月 200 万字符免费）
- 在中国服务器访问稳定
- 注册简单，无需信用卡
- 支持 28 种主流语言
- 响应速度快

## 快速开始

### 1. 获取百度翻译 API 密钥

1. 访问 [百度翻译开放平台](https://fanyi-api.baidu.com/)
2. 注册账号并完成认证
3. 创建应用，获取 APP ID 和密钥

### 2. 安装依赖

```bash
npm install md5
```

### 3. 修改 TranslateService

在 `src/translateService.js` 中添加百度翻译实现：

```javascript
const md5 = require('md5');
const axios = require('axios');

class TranslateService {
    constructor() {
        // 百度翻译配置
        this.baiduAppId = process.env.BAIDU_TRANSLATE_APP_ID;
        this.baiduSecret = process.env.BAIDU_TRANSLATE_SECRET;
    }

    /**
     * 百度翻译
     */
    async translateWithBaidu(text, from = 'auto', to = 'zh') {
        const salt = Date.now();
        const sign = md5(this.baiduAppId + text + salt + this.baiduSecret);

        const response = await axios.get('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            params: {
                q: text,
                from: from,
                to: to,
                appid: this.baiduAppId,
                salt: salt,
                sign: sign
            }
        });

        if (response.data.error_code) {
            throw new Error(`百度翻译失败: ${response.data.error_msg}`);
        }

        return {
            text: response.data.trans_result[0].dst,
            from: {
                language: {
                    iso: response.data.from
                }
            }
        };
    }

    /**
     * 主翻译方法 - 自动选择可用的服务
     */
    async translate(text, options = {}) {
        // 优先使用百度翻译（更稳定）
        if (this.baiduAppId && this.baiduSecret) {
            return await this.translateWithBaidu(
                text, 
                this.mapToBaiduLang(options.from || 'auto'),
                this.mapToBaiduLang(options.to || 'zh')
            );
        }

        // 回退到 Google 翻译
        return await this.translateWithGoogle(text, options);
    }

    /**
     * 语言代码映射（Google -> 百度）
     */
    mapToBaiduLang(lang) {
        const mapping = {
            'auto': 'auto',
            'zh-cn': 'zh',
            'zh-tw': 'cht',
            'en': 'en',
            'ja': 'jp',
            'ko': 'kor',
            'fr': 'fra',
            'es': 'spa',
            'ru': 'ru',
            'de': 'de',
            'it': 'it',
            'pt': 'pt',
            'ar': 'ara',
            'th': 'th',
            'vi': 'vie'
        };
        return mapping[lang] || lang;
    }
}
```

### 4. 配置环境变量

在 `.env` 文件中添加：

```bash
# 百度翻译 API
BAIDU_TRANSLATE_APP_ID=your_app_id
BAIDU_TRANSLATE_SECRET=your_secret_key
```

## 测试示例

```bash
# 测试翻译（使用百度 API）
curl -X POST http://localhost:5003/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "text": "apple",
    "from": "en",
    "to": "zh-cn"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "message": "翻译成功",
  "data": {
    "translatedText": "苹果",
    "originalText": "apple",
    "detectedLanguage": "en"
  }
}
```

## 百度翻译支持的语言

| 代码 | 语言 | 百度代码 |
|------|------|----------|
| `auto` | 自动检测 | `auto` |
| `zh-cn` | 中文（简体） | `zh` |
| `zh-tw` | 中文（繁体） | `cht` |
| `en` | 英语 | `en` |
| `ja` | 日语 | `jp` |
| `ko` | 韩语 | `kor` |
| `fr` | 法语 | `fra` |
| `es` | 西班牙语 | `spa` |
| `ru` | 俄语 | `ru` |
| `de` | 德语 | `de` |
| `it` | 意大利语 | `it` |
| `pt` | 葡萄牙语 | `pt` |
| `ar` | 阿拉伯语 | `ara` |
| `th` | 泰语 | `th` |
| `vi` | 越南语 | `vie` |

完整语言列表：[百度翻译语言列表](https://fanyi-api.baidu.com/doc/21)

## 费用说明

### 免费额度
- 标准版：200 万字符/月
- 高级版：100 万字符/月（需认证）

### 收费标准
- 超出免费额度后：49 元/百万字符
- 远低于 Google Cloud Translation API

## 对比分析

| 特性 | Google Translate | 百度翻译 |
|------|-----------------|---------|
| 免费额度 | 50 万字符/月 | 200 万字符/月 |
| 中国访问 | ❌ 不稳定 | ✅ 稳定 |
| 注册难度 | ⭐⭐⭐ | ⭐ |
| 语言支持 | 100+ | 28 种 |
| 翻译质量 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 服务器端使用 | ❌ 受限 | ✅ 支持 |

## 其他推荐的翻译服务

### 1. 有道翻译 API
- 免费额度：100 元体验金
- 注册：http://ai.youdao.com/

### 2. 腾讯翻译君
- 免费额度：500 万字符/月
- 注册：https://cloud.tencent.com/product/tmt

### 3. 阿里翻译
- 按量付费：50 元/百万字符
- 注册：https://www.aliyun.com/product/ai/base_alimt

## 结论

对于在中国服务器部署的项目，**强烈推荐使用百度翻译 API**：
- ✅ 稳定可靠
- ✅ 免费额度充足
- ✅ 注册简单
- ✅ 完全兼容现有代码架构

只需替换 `TranslateService` 的实现，API 接口无需任何改动！

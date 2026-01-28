# Google 翻译 Token 算法实现说明

## 概述

本次改造基于 `free-google-translate` 项目的原理，将完整的 Google 翻译 token 生成算法集成到了翻译 API 中，提高了翻译请求的成功率和稳定性。

## 核心改进

### 1. Token 生成算法

实现了 Google 翻译的完整 token 计算算法，包括：

- **uo 函数** (src/translateService.js:187-195): 位运算核心函数
  - 对输入值进行复杂的位运算变换
  - 使用右移、左移、异或等操作

- **wo 函数** (src/translateService.js:204-253): Token 计算主函数
  - 将文本转换为 UTF-8 字节数组
  - 与 TKK 值进行位运算
  - 生成格式为 "数字.数字" 的 token

### 2. TKK 值管理

- **getTKK()** (src/translateService.js:174-178): 获取当前 TKK 值
  - 默认使用固定值 "434674.96463358"
  - 如果失效需要手动更新

- **updateTKK()** (src/translateService.js:284-305): 从 Google 页面动态获取 TKK
  - 访问 Google 翻译页面
  - 正则提取最新的 TKK 值
  - 自动更新本地值

### 3. 请求优化

#### API 端点
```javascript
https://translate.google.com.hk/translate_a/single
```
使用香港域名，通常比 .com 更稳定

#### 请求参数（参考 free-google-translate）
```javascript
{
  client: 'webapp',      // 模拟网页客户端
  sl: 'auto',           // 源语言（auto 表示自动检测）
  tl: 'en',             // 目标语言
  hl: 'zh-CN',          // 界面语言
  dt: [...],            // 返回数据类型数组
  tk: '动态生成的token',  // 关键！由 wo 函数计算
  q: '要翻译的文本'
}
```

#### 请求头优化（src/translateService.js:376-390）
```javascript
{
  'accept': '*/*',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
  'origin': 'https://translate.google.com.hk',
  'referer': 'https://translate.google.com.hk/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'x-client-data': 'CJK2yQEIpLbJAQjEtskBCKmdygEIqKPKAQi5pcoBCLGnygEI4qjKAQjxqcoBCJetygEIza3KAQ==',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"...',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin'
}
```

### 4. 错误处理

- **403 错误**: Google 拒绝访问，提示更新 TKK 或使用代理
- **400 错误**: 参数验证失败
- **429 错误**: 请求频率过高
- **超时处理**: 30 秒超时限制

## 工作原理

### Token 生成流程

1. **文本编码**
   ```javascript
   待翻译文本 → UTF-8 字节数组
   例如: "Hello" → [72, 101, 108, 108, 111]
   ```

2. **位运算变换**
   ```javascript
   字节数组 + TKK 值 → 通过 uo 函数进行多轮位运算
   使用固定的变换字符串: "+-a^+6" 和 "+-3^+b+-f"
   ```

3. **生成 Token**
   ```javascript
   最终计算结果 → "数字1.数字2" 格式
   例如: "434674.1234567"
   ```

### 请求验证机制

Google 通过以下方式验证请求合法性：

1. **Token 验证**: 检查 tk 参数是否与文本和 TKK 匹配
2. **请求头检查**: 验证 User-Agent、Referer 等是否像浏览器
3. **频率限制**: 同一 IP 请求过于频繁会被限制
4. **TKK 时效性**: TKK 值定期更新，旧 token 会失效

## 测试结果

所有 8 项测试均通过：

✅ **测试 1**: 自动检测语言翻译 - 中文 → 英文
✅ **测试 2**: 指定语言翻译 - 中文 → 日语
✅ **测试 3**: 英文翻译为中文
✅ **测试 4**: 批量翻译（5 个短语）
✅ **测试 5**: 获取支持的语言列表（105 种语言）
✅ **测试 6**: 长文本翻译（162 字符）
✅ **测试 7**: 错误处理 - 空文本返回 400
✅ **测试 8**: 错误处理 - 不支持的语言

## 使用示例

### API 调用示例

```bash
curl -X POST http://localhost:5003/api/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "text": "Hello, world!",
    "from": "en",
    "to": "zh-cn"
  }'
```

### 响应示例

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

## 注意事项

### 1. 频率限制
- 大量同 IP 请求会触发 429 错误
- 建议客户端分散请求，避免集中在服务器端
- 可以添加请求延迟（批量翻译已实现 200ms 延迟）

### 2. TKK 值维护
- TKK 值会定期失效
- 如果出现大量 403 错误，需要更新 TKK
- 可以调用 `updateTKK()` 方法自动获取最新值

### 3. 代理支持
- 如果服务器 IP 被限制，可以考虑使用代理
- 在 axios 配置中添加 proxy 参数

### 4. 备用方案
- 代码会先尝试使用 `google-translate-api` 库
- 如果库不可用，才使用自定义实现
- 形成多层降级策略

## 技术亮点

1. **完整还原算法**: 基于逆向工程，完整实现了 Google 的 token 生成算法
2. **UTF-8 编码处理**: 正确处理多字节字符（如中文、emoji）
3. **位运算优化**: 使用 JavaScript 的位运算符模拟原始算法
4. **错误恢复**: 实现了 token 生成失败的降级方案
5. **请求头伪装**: 完整模拟浏览器请求特征

## 相关文件

- `src/translateService.js` - 翻译服务主文件（包含完整 token 算法）
- `free-google-translate/Python/token.js` - 原始 JavaScript token 算法
- `free-google-translate/Python/GoogleTranslator.py` - Python 参考实现
- `test-translate-api.js` - API 测试脚本

## 参考资源

- [free-google-translate 项目](https://github.com/VictorZhang2014/free-google-translate)
- Google 翻译 API 端点: `https://translate.google.com.hk/translate_a/single`

## 未来优化方向

1. **动态 TKK 更新**: 定期自动检查并更新 TKK 值
2. **代理池支持**: 使用代理池规避 IP 限制
3. **缓存机制**: 对常用翻译结果进行缓存
4. **多域名轮询**: 在多个 Google 翻译域名间轮询
5. **请求限流**: 实现更智能的请求频率控制

---

**最后更新**: 2025-11-02
**版本**: 1.0.0

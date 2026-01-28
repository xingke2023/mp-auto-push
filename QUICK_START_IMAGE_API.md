# 快速开始：Google Gemini 图片生成 API

## 1. 配置 API Key

在 `.env` 文件中添加你的 Google AI API Key：

```bash
# 在 https://aistudio.google.com/apikey 获取 API Key
GOOGLE_API_KEY=你的Google_API_Key

# API 服务器认证密钥
API_KEY=你的API密钥
```

**配置优先级**：本地 `.env` 文件 > 系统环境变量

如果你已经在系统环境变量中设置了 `GOOGLE_API_KEY`，`.env` 文件中的配置会覆盖它。

## 2. 启动 API 服务器

```bash
npm run api
```

服务器将在 `http://localhost:5003` 启动。

## 3. 快速测试

### 场景一：文本生成图片（nano banana）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 你的API密钥" \
  -d '{
    "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
  }'
```

### 场景二：修改图片（添加巫师帽）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "X-API-Key: 你的API密钥" \
  -F "prompt=Using the provided image of my cat, please add a small, knitted wizard hat on its head" \
  -F "images=@/path/to/your/cat_photo.png"
```

### 场景三：组合多张图片

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "X-API-Key: 你的API密钥" \
  -F "prompt=Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it." \
  -F "images=@/path/to/dress.png" \
  -F "images=@/path/to/model.png"
```

## 4. 使用 Node.js 测试脚本

我们提供了一个测试脚本来快速验证功能：

```bash
# 运行所有测试
node test-image-api.js

# 仅测试文本转图片
node test-image-api.js text

# 仅测试修改图片
node test-image-api.js edit

# 仅测试组合图片
node test-image-api.js compose
```

## 5. 接口特点

✅ **智能场景判断**：根据输入自动判断使用哪种场景
✅ **支持多种输入**：文件上传 或 Base64 JSON
✅ **支持多种输出**：Base64 JSON 或 直接文件流
✅ **客户端 API Key**：支持客户端提供自己的 API Key

## 6. 完整文档

查看 `IMAGE_API_GUIDE.md` 获取完整的 API 文档和更多示例。

## 常见问题

**Q: 如何获取 Google AI API Key？**
A: 访问 https://aistudio.google.com/apikey 使用 Google 账号登录并创建 API Key。

**Q: 图片生成需要多长时间？**
A: 通常需要 10-60 秒，取决于图片复杂度和 API 负载。

**Q: 支持哪些图片格式？**
A: 支持 PNG、JPEG、JPG、GIF 等常见格式，输出为 PNG。

**Q: 有配额限制吗？**
A: Google AI API 有免费配额，具体限制请查看 Google AI Studio。

**Q: API 不工作怎么办？**
A: 检查以下几点：
1. GOOLE_API_KEY 是否正确配置
2. API 服务器是否正在运行
3. API_KEY 是否正确
4. 查看服务器日志获取详细错误信息

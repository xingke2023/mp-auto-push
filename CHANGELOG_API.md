# API 更新日志

## 2025-10-08 - Google Gemini 图片生成 API

### 🎉 新增功能

#### 图片生成 API
- **新增接口**: `POST /api/image/generate`
- **模型**: Google Gemini 2.5 Flash Image
- **支持三种场景**:
  1. **文本转图片** (Text-to-Image) - 根据文字描述生成图片
  2. **修改图片** (Image Editing) - 对现有图片进行 AI 修改
  3. **组合多张图片** (Image Composition) - 智能组合多张图片

#### 智能场景判断
- API 会根据输入参数自动判断使用哪种场景
- 无需手动指定场景类型
- 根据提供的图片数量自动切换：
  - 0张图片 → 文本转图片
  - 1张图片 → 修改图片
  - 2张及以上 → 组合图片

#### 灵活的输入方式
- **文件上传**: 支持 `multipart/form-data` 格式上传图片
- **Base64 JSON**: 支持在 JSON 请求体中传递 base64 编码的图片
- **混合使用**: 可以同时使用文件上传和 JSON 方式

#### 灵活的输出格式
- **base64**: 返回 JSON 格式，包含 base64 编码的图片（默认）
- **file**: 直接返回图片文件流，可直接下载

#### 客户端 API Key 支持
- 服务器可以配置默认的 API Key
- 客户端可以在请求中提供自己的 API Key
- 灵活适配多种使用场景

### 📝 配置说明

#### 环境变量
新增以下环境变量配置：

```bash
# Google AI API Key（必需）
GOOGLE_API_KEY=your_google_api_key_here

# 图片生成模型（可选，默认 gemini-2.5-flash-image）
GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image
```

#### 配置优先级
- 本地 `.env` 文件优先于系统环境变量
- 使用 `dotenv` 的 `override: true` 选项
- 确保本地开发配置不会被系统环境变量覆盖

### 📚 新增文档

以下文档已添加到项目：

1. **IMAGE_API_GUIDE.md** - 完整的 API 使用指南
   - 详细的接口说明
   - 三种场景的使用示例
   - Node.js 和 Python 代码示例
   - 错误处理和故障排查

2. **QUICK_START_IMAGE_API.md** - 快速开始指南
   - 5分钟快速上手
   - 配置步骤
   - 测试示例

3. **ENV_CONFIG_PRIORITY.md** - 环境变量配置优先级说明
   - 详细的配置加载机制
   - 各种场景示例
   - 最佳实践
   - 故障排查

4. **GOOGLE_API_KEY_MIGRATION.md** - API Key 配置说明
   - 环境变量设置方法
   - 配置验证
   - 常见问题解答

5. **test-image-api.js** - 测试脚本
   - 支持测试三种场景
   - 可单独或批量运行测试

### 🔧 技术实现

#### 新增文件
- `src/googleImageService.js` - Google Gemini 图片生成服务
- `test-image-api.js` - API 测试脚本

#### 修改文件
- `src/apiServer.js` - 添加图片生成接口路由
- `src/index.js` - 配置 dotenv override
- `src/daemon.js` - 配置 dotenv override
- `.env.example` - 添加 Google API 配置示例
- `package.json` - 添加 `@google/genai` 依赖

#### 依赖包
新增依赖：
```json
{
  "@google/genai": "^1.22.0"
}
```

### 🎯 使用示例

#### 场景一：文本转图片（nano banana）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
  }'
```

#### 场景二：修改图片（添加巫师帽）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Using the provided image of my cat, please add a small, knitted wizard hat on its head" \
  -F "images=@/path/to/cat_photo.png"
```

#### 场景三：组合多张图片（时尚电商）

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it." \
  -F "images=@/path/to/dress.png" \
  -F "images=@/path/to/model.png"
```

### ✅ 功能特性

- ✅ 智能场景自动判断
- ✅ 支持多种输入格式（文件/Base64）
- ✅ 支持多种输出格式（Base64/文件流）
- ✅ 客户端 API Key 支持
- ✅ 完善的错误处理
- ✅ 详细的日志记录
- ✅ 参数验证
- ✅ 配置优先级清晰
- ✅ 完整的文档
- ✅ 测试脚本

### 🔒 安全性

- API Key 认证（X-API-Key 或 Authorization header）
- 支持客户端提供自己的 Google API Key
- 文件大小限制（10MB per file）
- 文件数量限制（最多10个文件）
- 完善的参数验证
- 敏感信息不记录到日志

### 📖 API 端点列表

更新后的 API 端点：

```
GET  /                                      - API 文档
GET  /health                                - 健康检查
POST /api/draft/create                      - 创建草稿
POST /api/draft/create-with-credentials     - 使用客户端凭证创建草稿
POST /api/draft/publish                     - 发布草稿
POST /api/draft/create-and-publish          - 创建并发布草稿
POST /api/draft/list                        - 获取草稿列表
POST /api/draft/delete                      - 删除草稿
POST /api/draft/delete-all                  - 删除全部草稿
POST /api/publish/status                    - 查询发布状态
POST /api/media/upload-image                - 上传图文消息图片
POST /api/media/upload-image-url            - 通过URL上传图文消息图片
POST /api/image/generate                    - 生成AI图片 🆕
```

### 🚀 性能优化

- 使用 Google 最新的 Gemini 2.5 Flash Image 模型
- 支持并发请求
- 合理的超时设置
- Buffer 处理优化

### 📊 监控和日志

- 完整的请求日志
- 详细的错误日志
- 场景类型标识
- 图片大小统计
- API Key 使用情况（脱敏）

### 🐛 已知限制

1. 图片生成时间：通常需要 10-60 秒
2. 文件大小限制：单个文件最大 10MB
3. 文件数量限制：最多 10 个文件
4. Google API 配额限制：根据账号类型有不同的免费配额

### 📋 TODO

- [ ] 添加图片缓存机制
- [ ] 支持批量生成
- [ ] 添加生成进度查询
- [ ] 支持更多图片格式
- [ ] 添加图片质量参数
- [ ] 添加图片尺寸参数
- [ ] 性能监控和统计
- [ ] 更多的错误重试机制

### 🔗 相关链接

- Google AI Studio: https://aistudio.google.com/apikey
- Google Gemini 文档: https://ai.google.dev/docs
- 项目文档: 查看项目根目录的相关 MD 文件

### 👥 贡献者

- AI Assistant - 初始实现

---

## 如何使用

1. **获取 Google API Key**
   ```bash
   # 访问 https://aistudio.google.com/apikey
   # 创建并复制 API Key
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   vim .env
   # 设置 GOOGLE_API_KEY=your_key_here
   ```

3. **启动服务**
   ```bash
   npm run api
   ```

4. **测试接口**
   ```bash
   node test-image-api.js
   ```

5. **查看文档**
   ```bash
   # 查看完整文档
   cat IMAGE_API_GUIDE.md

   # 查看快速开始
   cat QUICK_START_IMAGE_API.md
   ```

---

如有问题，请查看相关文档或提交 Issue。

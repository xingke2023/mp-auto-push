# Google API Key 环境变量统一说明

## 环境变量名称

本项目使用以下标准环境变量名称来配置 Google AI API Key：

```
GOOGLE_API_KEY
```

## 配置方法

### 方法 1：使用 .env 文件（推荐）

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
vim .env
```

在 `.env` 文件中设置：

```bash
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image
```

### 方法 2：使用系统环境变量

```bash
# 设置环境变量
export GOOGLE_API_KEY=your_google_api_key_here

# 添加到 .bashrc 或 .profile 使其持久化
echo 'export GOOGLE_API_KEY=your_google_api_key_here' >> ~/.bashrc
source ~/.bashrc
```

### 方法 3：Docker 环境

```yaml
# docker-compose.yml
services:
  api:
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image
    # 或挂载 .env 文件
    volumes:
      - ./.env:/app/.env
```

## 获取 Google API Key

1. 访问 **Google AI Studio**: https://aistudio.google.com/apikey
2. 使用 Google 账号登录
3. 点击 **"Create API Key"** 创建新的 API Key
4. 复制生成的 API Key

## 配置优先级

```
1. 本地 .env 文件（最高优先级）
   ↓
2. 系统环境变量
   ↓
3. 默认值（空字符串）
```

详见 `ENV_CONFIG_PRIORITY.md` 了解完整的配置优先级说明。

## 验证配置

### 检查配置是否存在

```bash
# 检查 .env 文件
cat .env | grep GOOGLE_API_KEY

# 检查系统环境变量
env | grep GOOGLE_API_KEY

# 检查 Node.js 环境中的值
node -e "require('dotenv').config({override:true}); console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '已配置' : '未配置')"
```

### 验证服务是否正常

启动 API 服务器：

```bash
npm run api
```

如果配置正确，日志中会显示：
```
[GoogleImage] Google GenAI 客户端初始化成功
[API] 服务器已启动在端口 5003
```

### 测试图片生成

```bash
curl -X POST http://localhost:5003/api/image/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana"
  }'
```

## 常见问题

### Q: 配置了但不生效？

A: 检查以下几点：
1. 确认 `.env` 文件在项目根目录
2. 变量名拼写正确（区分大小写）
3. 等号两边没有空格：`GOOGLE_API_KEY=value`（✅正确）vs `GOOGLE_API_KEY = value`（❌错误）
4. 重启服务以重新加载配置

### Q: 如何知道使用的是哪个配置？

A: 在代码中添加日志：

```javascript
const { logger } = require('./logger');
logger.info(`GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '已配置' : '未配置'}`);
```

### Q: 可以在客户端请求时提供 API Key 吗？

A: 可以。在请求体中添加 `apiKey` 参数：

```json
{
  "prompt": "your prompt",
  "apiKey": "客户端的Google API Key"
}
```

### Q: 配置是否安全？

A: 请遵循以下安全最佳实践：
- ✅ 不要将 `.env` 文件提交到 Git（已在 `.gitignore` 中）
- ✅ 使用强密码和复杂的 API Key
- ✅ 限制 `.env` 文件权限：`chmod 600 .env`
- ✅ 定期轮换 API Key
- ✅ 生产环境使用密钥管理服务

## 相关文档

- `IMAGE_API_GUIDE.md` - 完整的 API 使用指南
- `QUICK_START_IMAGE_API.md` - 快速开始指南
- `ENV_CONFIG_PRIORITY.md` - 配置优先级详细说明
- `.env.example` - 配置文件模板

## 故障排查

### 错误：GOOGLE_API_KEY 未配置

```bash
# 1. 检查是否存在
ls -la .env

# 2. 检查内容
cat .env | grep GOOGLE_API_KEY

# 3. 检查格式（不要有空格）
cat .env | grep -E "^GOOGLE_API_KEY="

# 4. 重启服务
npm run api
```

### 错误：API Key 无效

```bash
# 1. 确认 API Key 正确
# 2. 检查 API Key 是否过期
# 3. 访问 https://aistudio.google.com/apikey 重新生成
# 4. 更新 .env 文件
# 5. 重启服务
```

### 错误：配额超限

```bash
# 1. 访问 https://aistudio.google.com 查看配额
# 2. 等待配额重置（通常每日/每月重置）
# 3. 考虑升级到付费计划
```

## 总结

✅ 使用统一的环境变量名：`GOOGLE_API_KEY`
✅ 配置优先级：.env 文件 > 系统环境变量
✅ 支持客户端提供 API Key
✅ 完善的错误提示和故障排查指南

如有问题，请查看相关文档或联系开发团队。

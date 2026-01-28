# 环境变量配置优先级说明

## 配置加载顺序

本项目使用 **`.env` 文件优先** 的配置策略，具体优先级如下：

```
1. 本地 .env 文件（最高优先级）
   ↓
2. 系统环境变量
   ↓
3. 默认值（如果以上都没有）
```

## 实现原理

项目使用 `dotenv` 包加载环境变量，配置了 `override: true` 选项：

```javascript
require('dotenv').config({ override: true });
```

这意味着：
- ✅ 如果 `.env` 文件中定义了某个变量，会使用 `.env` 中的值
- ✅ 如果 `.env` 文件中没有定义，才会使用系统环境变量
- ✅ `.env` 文件中的配置会覆盖系统环境变量中的同名配置

## 示例场景

### 场景 1：只使用 .env 文件

```bash
# .env 文件
GOOGLE_API_KEY=abc123
```

**结果**：使用 `abc123`

### 场景 2：只使用系统环境变量

```bash
# 系统中执行
export GOOGLE_API_KEY=xyz789

# .env 文件中没有 GOOGLE_API_KEY
```

**结果**：使用 `xyz789`

### 场景 3：.env 和系统环境变量都有

```bash
# 系统中执行
export GOOGLE_API_KEY=xyz789

# .env 文件
GOOGLE_API_KEY=abc123
```

**结果**：使用 `abc123`（.env 文件优先）

### 场景 4：都没有配置

```bash
# 系统环境变量中没有
# .env 文件中也没有
```

**结果**：使用默认值（如果代码中有设置）或空字符串

## 适用的环境变量

此优先级策略适用于所有环境变量，包括但不限于：

- `GOOGLE_API_KEY` - Google AI API Key
- `API_KEY` - API 服务器认证密钥
- `WECHAT_APP_ID` - 微信公众号 App ID
- `WECHAT_APP_SECRET` - 微信公众号 App Secret
- `YUANBAO_ASSISTANT_ID` - 元宝 AI 助手 ID
- `YUANBAO_TOKEN` - 元宝 AI Token
- 以及其他所有在 `.env` 中定义的变量

## 最佳实践

### 开发环境
推荐使用 `.env` 文件进行配置：
```bash
# 创建 .env 文件
cp .env.example .env

# 编辑配置
vim .env
```

### 生产环境
有两种选择：

**方式 1：使用 .env 文件（推荐）**
```bash
# 在生产服务器上创建 .env 文件
cat > .env << EOF
GOOGLE_API_KEY=your_production_key
API_KEY=your_production_api_key
...
EOF
```

**方式 2：使用系统环境变量**
```bash
# 在 .profile 或 .bashrc 中设置
export GOOGLE_API_KEY=your_production_key
export API_KEY=your_production_api_key

# 不创建 .env 文件，或在 .env 中不设置这些变量
```

### Docker 环境
使用 Docker 时的推荐配置：

```dockerfile
# Dockerfile
ENV NODE_ENV=production

# docker-compose.yml
services:
  api:
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - API_KEY=${API_KEY}
    # 或者挂载 .env 文件
    volumes:
      - ./.env:/app/.env
```

## 安全建议

1. **不要提交 .env 文件到 Git**
   - `.env` 已被添加到 `.gitignore`
   - 仅提交 `.env.example` 作为模板

2. **生产环境保护**
   - 使用强密码和复杂的 API Key
   - 限制 `.env` 文件的读取权限（`chmod 600 .env`）
   - 定期轮换密钥

3. **敏感信息管理**
   - 生产环境考虑使用密钥管理服务（如 AWS Secrets Manager）
   - 不要在日志中打印敏感信息

## 故障排查

### 问题：配置没有生效

**检查步骤**：

1. 确认 `.env` 文件存在且在项目根目录
```bash
ls -la .env
```

2. 检查 `.env` 文件中的变量名拼写是否正确
```bash
cat .env | grep GOOGLE_API_KEY
```

3. 确认 `.env` 文件格式正确（每行一个变量，等号两边无空格）
```bash
# 正确
GOOGLE_API_KEY=abc123

# 错误
GOOGLE_API_KEY = abc123  # 等号两边有空格
```

4. 重启服务以重新加载配置
```bash
# 重启 API 服务
npm run api

# 或使用 PM2
pm2 restart mp-auto-push
```

### 问题：不确定使用的是哪个配置

在代码中添加日志来查看：

```javascript
const { logger } = require('./logger');
logger.info(`使用的 API Key: ${process.env.GOOGLE_API_KEY?.substring(0, 10)}...`);
```

## 总结

本项目的环境变量配置策略是：**本地 `.env` 文件优先于系统环境变量**。这样的设计使得：

✅ 开发环境配置更方便（使用 .env 文件）
✅ 生产环境更灵活（可以选择 .env 或系统环境变量）
✅ 配置优先级清晰明确
✅ 便于调试和故障排查

如有疑问，请查看项目文档或联系开发团队。

# DeepSeek API 超时问题修复说明

## 问题描述

客户端调用 DeepSeek API 时出现 `"aborted"` 错误，返回：
```json
{"success":false,"error":"Internal Server Error","message":"aborted"}
```

## 根本原因

1. **axios 默认超时时间过短**：之前设置为 60 秒（60000ms）
2. **DeepSeek API 响应时间较长**：特别是当 `max_tokens=8000` 时，可能需要超过 60 秒才能完成响应
3. **Nginx 超时配置不匹配**：虽然 Nginx 已配置 300 秒超时，但 Node.js 应用层在 60 秒就已经中断请求

## 修复方案

### 1. 增加 DeepSeek 服务超时时间

**文件**: `src/deepseekService.js`

**修改前**:
```javascript
this.timeout = parseInt(process.env.DEEPSEEK_TIMEOUT || '60000', 10); // 60秒
```

**修改后**:
```javascript
this.timeout = parseInt(process.env.DEEPSEEK_TIMEOUT || '300000', 10); // 300秒（5分钟）
```

### 2. 改进错误日志

**文件**: `src/apiServer.js`

增强了错误处理逻辑，现在可以记录：
- 错误类型（error.code 或 error.name）
- 错误消息（error.message）
- 堆栈跟踪（前5行）
- 特殊处理 `ECONNABORTED` 和 `aborted` 错误
- 记录 DeepSeek API 响应状态码和数据

**新增日志示例**:
```
[API] DeepSeek Chat 失败 - 错误类型: ECONNABORTED
[API] DeepSeek Chat 失败 - 错误消息: timeout of 60000ms exceeded
[API] 请求被中断 - 可能原因: 客户端断开连接、网络超时或服务器超时
```

## 超时配置层级

现在系统有三层超时保护：

1. **Node.js axios 超时**: 300 秒（可通过 `DEEPSEEK_TIMEOUT` 环境变量配置）
2. **Nginx 代理超时**: 300 秒
   ```nginx
   proxy_connect_timeout 300s;
   proxy_send_timeout 300s;
   proxy_read_timeout 300s;
   ```
3. **流式响应**: 设置为 `timeout: 0`（不限时）

## 环境变量配置

可以通过 `.env` 文件自定义超时时间：

```bash
# DeepSeek API 超时时间（毫秒）
# 默认: 300000 (5分钟)
# 建议: 根据实际 max_tokens 调整
DEEPSEEK_TIMEOUT=300000
```

## 性能建议

| max_tokens | 建议超时时间 | 说明 |
|-----------|------------|------|
| ≤ 1000    | 60 秒      | 短文本响应 |
| 1000-4000 | 120 秒     | 中等长度响应 |
| 4000-8000 | 300 秒     | 长文本响应 |
| > 8000    | 600 秒     | 超长响应（需同时调整 Nginx） |

## 验证修复

### 测试命令

```bash
# 测试非流式响应（长内容）
curl -X POST http://localhost:5003/api/deepseek/chat \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"请详细介绍人工智能的发展历史"}],
    "maxTokens": 8000,
    "stream": false
  }'
```

### 预期结果

- ✅ 请求在 5 分钟内正常完成
- ✅ 返回完整的 DeepSeek API 响应
- ✅ 不再出现 `"aborted"` 错误
- ✅ 日志显示详细的错误信息（如果发生错误）

## 重启服务

修改后需要重启 API 服务：

```bash
# 使用 PM2 重启
pm2 restart mp-auto-push-api

# 或使用 npm 脚本
npm run pm2:restart

# 检查状态
pm2 status mp-auto-push-api

# 查看日志
pm2 logs mp-auto-push-api --lines 50
```

## 故障排查

如果仍然出现超时错误：

1. **检查 DeepSeek API 状态**
   - 访问 https://api.deepseek.com 确认服务可用
   - 查看 DeepSeek 官方状态页

2. **检查网络连接**
   ```bash
   curl -I https://api.deepseek.com/v1/chat/completions
   ```

3. **检查日志详情**
   ```bash
   pm2 logs mp-auto-push-api --lines 100
   ```

4. **增加超时时间**
   - 修改 `.env` 中的 `DEEPSEEK_TIMEOUT`
   - 如果超过 300 秒，同时修改 Nginx 配置

5. **使用流式响应**
   - 对于长内容生成，建议使用 `stream: true`
   - 流式响应没有超时限制，用户体验更好

## 相关文件

- `src/deepseekService.js` - DeepSeek 服务类
- `src/apiServer.js` - API 服务器（DeepSeek 端点在 1627-1876 行）
- `/etc/nginx/sites-enabled/default` - Nginx 配置
- `.env` - 环境变量配置

## 更新日期

2025-12-06

## 影响范围

此修复影响以下 API 端点：
- `POST /api/deepseek/chat`
- `POST /api/deepseek/chat/completions`

对其他端点无影响。

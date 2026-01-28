# OpenAI API 默认模型更新说明

## 更新内容

已将 OpenAI API 服务的默认模型从 `gpt-4o-mini` 更改为 `gpt-5-nano`。

## 生效范围

### 已更新的文件

1. **src/openaiService.js** (第 12 行)
   - 默认模型: `gpt-5-nano`

2. **.env.example** (第 54 行)
   - 配置示例: `OPENAI_MODEL=gpt-5-nano`

3. **OPENAI_API_GUIDE.md**
   - 模型列表已更新，`gpt-5-nano` 列为默认模型
   - 配置示例已更新

4. **OPENAI_API_QUICK_START.md**
   - 所有示例已更新为 `gpt-5-nano`
   - 常见问题已更新

## 如何使用

### 默认使用（无需配置）

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

服务会自动使用 `gpt-5-nano` 模型。

### 指定其他模型

如果需要使用其他模型，在请求中明确指定：

```bash
curl -X POST http://localhost:5003/api/openai/chat \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "model": "gpt-4o"
  }'
```

### 通过环境变量修改默认模型

在 `.env` 文件中配置：

```bash
OPENAI_MODEL=gpt-5-nano
```

或者使用其他模型：

```bash
OPENAI_MODEL=gpt-4o
OPENAI_MODEL=gpt-4
OPENAI_MODEL=gpt-3.5-turbo
```

## 服务状态

✅ API 服务器已重启
✅ 新配置已生效
✅ 所有端点正常工作

## 可用端点

所有端点都使用新的默认模型：

- `POST /api/openai/chat`
- `POST /api/openai/chat/completions`
- `POST /v1/chat/completions`

## 测试

运行测试脚本验证：

```bash
node test-openai-api.js
```

## 兼容性

此更改不影响现有功能：
- ✅ 仍然支持所有 OpenAI 模型
- ✅ 客户端可以在请求中指定任何模型
- ✅ 流式和非流式响应都正常工作
- ✅ 向后兼容，不会破坏现有代码

## 注意事项

1. **API Key 配置**: 确保 `.env` 中配置了有效的 `OPENAI_API_KEY`
2. **模型可用性**: 确认您的 OpenAI 账户有权限访问 `gpt-5-nano` 模型
3. **API URL**: 如果使用中转服务，确保 `OPENAI_API_URL` 指向支持该模型的端点

## 回退方案

如果需要回退到之前的默认模型，修改 `.env`:

```bash
OPENAI_MODEL=gpt-4o-mini
```

然后重启服务：

```bash
pm2 restart mp-auto-push-api
```

## 更新日期

2025-12-06

---

有任何问题请查看 `OPENAI_API_GUIDE.md` 完整文档。

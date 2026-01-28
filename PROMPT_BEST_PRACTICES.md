# Google Gemini 图片生成 - 提示词最佳实践

## 概述

Google Gemini 2.5 Flash Image 模型需要清晰的图片生成指令。本文档介绍如何编写有效的提示词。

## 问题说明

### ❌ 不推荐的提示词

简单的描述性词语可能导致模型返回文本而不是图片：

```
老虎吃肉
猫
一只狗
```

**原因**：模型可能将其理解为一个问题或对话，而不是图片生成请求。

### ✅ 推荐的提示词

使用明确的图片生成指令：

```
Create an image of a tiger eating meat
Generate a picture of a cat sitting on a couch
Draw a friendly dog playing in a park
生成一张老虎吃肉的图片
创建一幅猫咪坐在沙发上的画面
绘制一只在公园玩耍的友好狗狗
```

## 自动提示词增强

本服务已内置自动提示词增强功能：

### 工作原理

1. **检测关键词**：自动检测提示词中是否包含图片生成关键词
   - 英文：generate, create, draw, paint, illustrate, make, produce, render
   - 中文：生成, 创建, 画, 绘制, 制作

2. **自动增强**：如果没有检测到关键词，自动添加 "Generate an image of: " 前缀

### 示例

```javascript
// 输入：
"老虎吃肉"

// 自动转换为：
"Generate an image of: 老虎吃肉"
```

```javascript
// 输入：
"Create a tiger eating meat"

// 保持不变（已经包含 "Create"）：
"Create a tiger eating meat"
```

## 提示词编写技巧

### 1. 使用明确的动词

**推荐**：
- Create an image of...
- Generate a picture of...
- Draw...
- Illustrate...
- Make a photo of...

**中文**：
- 生成一张...的图片
- 创建一幅...的画面
- 绘制...
- 制作...的图像

### 2. 提供详细描述

**基础**：
```
Create a cat
```

**更好**：
```
Create a fluffy orange cat sitting on a windowsill
```

**最佳**：
```
Create a photorealistic image of a fluffy orange tabby cat sitting on a white windowsill, looking out at a sunset, soft lighting, cozy atmosphere
```

### 3. 指定风格和细节

```
Generate a picture of a nano banana dish in a fancy restaurant with a Gemini theme, professional food photography, elegant plating, warm lighting, 4K quality
```

### 4. 场景组合

```
Create an image showing: a modern office with a large window, a desk with a laptop, a coffee mug, and a potted plant, minimalist design, bright natural light
```

## 不同场景的提示词示例

### 文本转图片（Text-to-Image）

```javascript
const form = new FormData();
form.append('prompt', 'Create a beautiful sunset over mountains with a lake in the foreground');
```

### 修改图片（Image Editing）

```javascript
const form = new FormData();
form.append('prompt', 'Add a wizard hat on this cat');
form.append('images', fs.createReadStream('./cat.png'));
```

### 组合图片（Image Composition）

```javascript
const form = new FormData();
form.append('prompt', 'Combine these two images into a creative collage with a vintage style');
form.append('images', fs.createReadStream('./image1.png'));
form.append('images', fs.createReadStream('./image2.png'));
```

## API 错误处理

如果 API 返回文本而不是图片，您会收到友好的错误提示：

```json
{
  "success": false,
  "message": "API 返回了文本而不是图片。提示：请使用更具体的图片生成指令，比如 \"Create an image of...\" 或 \"Generate a picture of...\"。返回文本: 当然，老虎是肉食动物。"
}
```

## 最佳实践总结

1. ✅ 始终使用明确的图片生成动词（Create, Generate, Draw 等）
2. ✅ 提供详细的场景描述
3. ✅ 指定所需的风格、光照、质量等细节
4. ✅ 使用英文提示词通常效果更好
5. ✅ 对于复杂场景，使用逗号分隔的详细描述

6. ❌ 避免只使用简单名词或短语
7. ❌ 避免模糊或歧义的描述
8. ❌ 避免使用疑问句形式

## 示例集合

### 食物摄影
```
Create a professional food photograph of a gourmet burger with melted cheese, bacon, and fresh vegetables on a wooden board, studio lighting, appetizing presentation
```

### 风景
```
Generate a breathtaking landscape image of a mountain range at sunrise, with morning mist in the valleys, colorful sky, dramatic lighting, panoramic view
```

### 人物肖像
```
Create a portrait of a smiling person in a modern office, business casual attire, natural lighting from window, professional headshot style, blurred background
```

### 产品图
```
Generate a product photo of a sleek smartphone on a reflective white surface, minimalist background, soft diffused lighting, commercial photography style
```

### 抽象艺术
```
Create an abstract digital art piece featuring flowing shapes in blue and purple gradients, modern aesthetic, high contrast, artistic composition
```

### 建筑
```
Generate an image of a modern architectural building with glass facades, geometric design, urban setting, golden hour lighting, contemporary style
```

## 调试技巧

如果遇到问题：

1. **检查日志**：查看 `api.log` 中的详细错误信息
2. **简化提示词**：先尝试简单明确的提示词
3. **添加关键词**：确保包含 "create", "generate" 等动词
4. **使用英文**：英文提示词通常更稳定
5. **参考示例**：查看 `nodejs-client-example.js` 中的工作示例

## 技术支持

- API 文档：`WECHAT_IMAGE_API_GUIDE.md`
- 客户端示例：`nodejs-client-example.js`
- 快速测试：`quick-test.js`
- 远程调用指南：`WECHAT_IMAGE_API_REMOTE_GUIDE.md`

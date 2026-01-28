# 远程调用微信版 AI 图片生成 API 指南

## 接口说明

`POST /api/image/generate-wechat` 接口完全支持远程客户端调用，支持以下功能：

✅ **文本转图片**：只发送 `prompt`
✅ **修改图片**：发送 `prompt` + 1张图片
✅ **组合图片**：发送 `prompt` + 多张图片
✅ **客户端凭证**：支持客户端提供自己的 Google API Key 和微信凭证

## 服务器配置（参考远程调用章节）

### 1. 修改服务器监听地址

编辑 `src/apiServer.js`，让服务器监听所有网络接口：

```javascript
// 在 start() 方法中
this.server = this.app.listen(this.port, '0.0.0.0', () => {
    logger.info(`[API] 服务器已启动在端口 ${this.port}`);
});
```

### 2. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 5003/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=5003/tcp
sudo firewall-cmd --reload
```

### 3. 使用域名 + Nginx（推荐）

Nginx 配置：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 20M;  # 允许上传大文件

    location / {
        proxy_pass http://localhost:5003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 重要：增加超时时间（图片生成需要较长时间）
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
    }
}
```

配置 HTTPS：

```bash
sudo certbot --nginx -d api.yourdomain.com
```

## 远程调用方法

### 场景一：只发送 Prompt（文本转图片）

#### cURL 示例

```bash
# 使用 IP 地址
curl -X POST http://123.45.67.89:5003/api/image/generate-wechat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
  }'

# 使用域名（推荐）
curl -X POST https://api.yourdomain.com/api/image/generate-wechat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
  }'
```

#### Node.js 示例

```javascript
const axios = require('axios');

async function generateImageForWechat() {
  const API_URL = 'https://api.yourdomain.com/api/image/generate-wechat';
  const API_KEY = 'your_api_key';

  try {
    const response = await axios.post(API_URL, {
      prompt: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      timeout: 180000  // 3分钟超时
    });

    if (response.data.success) {
      const wechatUrl = response.data.data.wechatImageUrl;
      console.log('✓ 微信图片URL:', wechatUrl);
      return wechatUrl;
    }
  } catch (error) {
    console.error('✗ 错误:', error.response?.data || error.message);
  }
}

generateImageForWechat();
```

#### Python 示例

```python
import requests
import json

def generate_image_for_wechat():
    api_url = 'https://api.yourdomain.com/api/image/generate-wechat'
    api_key = 'your_api_key'

    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': api_key
    }

    data = {
        'prompt': 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme'
    }

    response = requests.post(api_url, json=data, headers=headers, timeout=180)

    if response.status_code == 200 and response.json()['success']:
        wechat_url = response.json()['data']['wechatImageUrl']
        print('✓ 微信图片URL:', wechat_url)
        return wechat_url
    else:
        print('✗ 错误:', response.json())

if __name__ == '__main__':
    generate_image_for_wechat()
```

### 场景二：发送 Prompt + Image（修改图片）

#### cURL 示例（文件上传）

```bash
curl -X POST https://api.yourdomain.com/api/image/generate-wechat \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Add a wizard hat on this cat" \
  -F "images=@/path/to/cat.png"
```

#### Node.js 示例（文件上传）

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function editImageForWechat(imagePath, prompt) {
  const API_URL = 'https://api.yourdomain.com/api/image/generate-wechat';
  const API_KEY = 'your_api_key';

  try {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('images', fs.createReadStream(imagePath));

    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'X-API-Key': API_KEY
      },
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data.success) {
      console.log('✓ 图片修改并上传微信成功');
      console.log('✓ 微信URL:', response.data.data.wechatImageUrl);
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('✗ 错误:', error.response?.data || error.message);
  }
}

// 使用示例
editImageForWechat('./cat.png', 'Add a wizard hat on this cat');
```

#### Node.js 示例（Base64 JSON）

```javascript
const axios = require('axios');
const fs = require('fs');

async function editImageForWechatBase64(imagePath, prompt) {
  const API_URL = 'https://api.yourdomain.com/api/image/generate-wechat';
  const API_KEY = 'your_api_key';

  try {
    // 读取图片并转换为 base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(API_URL, {
      prompt: prompt,
      imagesData: [
        {
          data: base64Image,
          mimeType: 'image/png'
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      timeout: 180000
    });

    if (response.data.success) {
      console.log('✓ 图片修改并上传微信成功');
      console.log('✓ 微信URL:', response.data.data.wechatImageUrl);
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('✗ 错误:', error.response?.data || error.message);
  }
}

// 使用示例
editImageForWechatBase64('./cat.png', 'Add a wizard hat on this cat');
```

#### Python 示例（文件上传）

```python
import requests

def edit_image_for_wechat(image_path, prompt):
    api_url = 'https://api.yourdomain.com/api/image/generate-wechat'
    api_key = 'your_api_key'

    headers = {
        'X-API-Key': api_key
    }

    files = {
        'images': open(image_path, 'rb')
    }

    data = {
        'prompt': prompt
    }

    response = requests.post(
        api_url,
        data=data,
        files=files,
        headers=headers,
        timeout=180
    )

    if response.status_code == 200 and response.json()['success']:
        wechat_url = response.json()['data']['wechatImageUrl']
        print('✓ 微信URL:', wechat_url)
        return wechat_url
    else:
        print('✗ 错误:', response.json())

if __name__ == '__main__':
    edit_image_for_wechat('./cat.png', 'Add a wizard hat on this cat')
```

#### Python 示例（Base64 JSON）

```python
import requests
import base64
import json

def edit_image_for_wechat_base64(image_path, prompt):
    api_url = 'https://api.yourdomain.com/api/image/generate-wechat'
    api_key = 'your_api_key'

    # 读取图片并转换为 base64
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': api_key
    }

    data = {
        'prompt': prompt,
        'imagesData': [
            {
                'data': image_data,
                'mimeType': 'image/png'
            }
        ]
    }

    response = requests.post(
        api_url,
        json=data,
        headers=headers,
        timeout=180
    )

    if response.status_code == 200 and response.json()['success']:
        wechat_url = response.json()['data']['wechatImageUrl']
        print('✓ 微信URL:', wechat_url)
        return wechat_url
    else:
        print('✗ 错误:', response.json())

if __name__ == '__main__':
    edit_image_for_wechat_base64('./cat.png', 'Add a wizard hat on this cat')
```

### 场景三：发送 Prompt + 多张 Images（组合图片）

#### cURL 示例

```bash
curl -X POST https://api.yourdomain.com/api/image/generate-wechat \
  -H "X-API-Key: your_api_key" \
  -F "prompt=Combine these images into a fashion photo" \
  -F "images=@/path/to/dress.png" \
  -F "images=@/path/to/model.png"
```

#### Node.js 示例

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function composeImagesForWechat(imagePaths, prompt) {
  const API_URL = 'https://api.yourdomain.com/api/image/generate-wechat';
  const API_KEY = 'your_api_key';

  try {
    const form = new FormData();
    form.append('prompt', prompt);

    // 添加多张图片
    for (const imagePath of imagePaths) {
      form.append('images', fs.createReadStream(imagePath));
    }

    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'X-API-Key': API_KEY
      },
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data.success) {
      console.log('✓ 图片组合并上传微信成功');
      console.log('✓ 微信URL:', response.data.data.wechatImageUrl);
      console.log('✓ 场景类型:', response.data.data.sceneType);
      return response.data.data.wechatImageUrl;
    }
  } catch (error) {
    console.error('✗ 错误:', error.response?.data || error.message);
  }
}

// 使用示例
composeImagesForWechat(
  ['./dress.png', './model.png'],
  'Create a professional e-commerce fashion photo. Take the dress from the first image and let the model from the second image wear it.'
);
```

#### Python 示例

```python
import requests

def compose_images_for_wechat(image_paths, prompt):
    api_url = 'https://api.yourdomain.com/api/image/generate-wechat'
    api_key = 'your_api_key'

    headers = {
        'X-API-Key': api_key
    }

    # 准备多个文件
    files = [
        ('images', open(path, 'rb'))
        for path in image_paths
    ]

    data = {
        'prompt': prompt
    }

    response = requests.post(
        api_url,
        data=data,
        files=files,
        headers=headers,
        timeout=180
    )

    if response.status_code == 200 and response.json()['success']:
        wechat_url = response.json()['data']['wechatImageUrl']
        print('✓ 微信URL:', wechat_url)
        return wechat_url
    else:
        print('✗ 错误:', response.json())

if __name__ == '__main__':
    compose_images_for_wechat(
        ['./dress.png', './model.png'],
        'Create a professional fashion photo'
    )
```

### 场景四：客户端提供凭证

客户端可以提供自己的 Google API Key 和微信凭证：

#### 只提供 Google API Key

```bash
curl -X POST https://api.yourdomain.com/api/image/generate-wechat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a nano banana picture",
    "apiKey": "客户端的Google_API_Key"
  }'
```

#### 提供完整凭证

```bash
curl -X POST https://api.yourdomain.com/api/image/generate-wechat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "prompt": "Create a nano banana picture",
    "apiKey": "客户端的Google_API_Key",
    "appId": "客户端的微信AppID",
    "appsecret": "客户端的微信AppSecret"
  }'
```

Node.js 示例：

```javascript
async function generateWithClientCredentials() {
  const response = await axios.post('https://api.yourdomain.com/api/image/generate-wechat', {
    prompt: 'Create a nano banana picture',
    apiKey: process.env.CLIENT_GOOGLE_API_KEY,
    appId: process.env.CLIENT_WECHAT_APP_ID,
    appsecret: process.env.CLIENT_WECHAT_APP_SECRET
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    }
  });

  return response.data.data.wechatImageUrl;
}
```

## 完整的客户端 SDK

### Node.js SDK

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class WechatImageAPIClient {
  constructor(baseURL, apiKey, options = {}) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.googleApiKey = options.googleApiKey;
    this.wechatAppId = options.wechatAppId;
    this.wechatAppSecret = options.wechatAppSecret;

    this.client = axios.create({
      baseURL: baseURL,
      timeout: 180000,
      headers: {
        'X-API-Key': apiKey
      }
    });
  }

  /**
   * 文本转图片并上传微信
   */
  async textToImage(prompt) {
    const data = { prompt };

    if (this.googleApiKey) {
      data.apiKey = this.googleApiKey;
    }

    if (this.wechatAppId && this.wechatAppSecret) {
      data.appId = this.wechatAppId;
      data.appsecret = this.wechatAppSecret;
    }

    const response = await this.client.post('/api/image/generate-wechat', data);
    return response.data;
  }

  /**
   * 修改图片并上传微信（文件上传方式）
   */
  async editImage(prompt, imagePath) {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('images', fs.createReadStream(imagePath));

    if (this.googleApiKey) {
      form.append('apiKey', this.googleApiKey);
    }

    if (this.wechatAppId && this.wechatAppSecret) {
      form.append('appId', this.wechatAppId);
      form.append('appsecret', this.wechatAppSecret);
    }

    const response = await this.client.post('/api/image/generate-wechat', form, {
      headers: form.getHeaders()
    });
    return response.data;
  }

  /**
   * 修改图片并上传微信（Base64 方式）
   */
  async editImageBase64(prompt, imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const data = {
      prompt,
      imagesData: [
        {
          data: base64Image,
          mimeType: 'image/png'
        }
      ]
    };

    if (this.googleApiKey) {
      data.apiKey = this.googleApiKey;
    }

    if (this.wechatAppId && this.wechatAppSecret) {
      data.appId = this.wechatAppId;
      data.appsecret = this.wechatAppSecret;
    }

    const response = await this.client.post('/api/image/generate-wechat', data);
    return response.data;
  }

  /**
   * 组合多张图片并上传微信
   */
  async composeImages(prompt, imagePaths) {
    const form = new FormData();
    form.append('prompt', prompt);

    for (const path of imagePaths) {
      form.append('images', fs.createReadStream(path));
    }

    if (this.googleApiKey) {
      form.append('apiKey', this.googleApiKey);
    }

    if (this.wechatAppId && this.wechatAppSecret) {
      form.append('appId', this.wechatAppId);
      form.append('appsecret', this.wechatAppSecret);
    }

    const response = await this.client.post('/api/image/generate-wechat', form, {
      headers: form.getHeaders()
    });
    return response.data;
  }
}

// 使用示例
async function main() {
  const client = new WechatImageAPIClient(
    'https://api.yourdomain.com',
    'your_api_key',
    {
      googleApiKey: process.env.GOOGLE_API_KEY,  // 可选
      wechatAppId: process.env.WECHAT_APP_ID,    // 可选
      wechatAppSecret: process.env.WECHAT_APP_SECRET  // 可选
    }
  );

  try {
    // 场景1：文本转图片
    const result1 = await client.textToImage('Create a nano banana picture');
    console.log('微信URL:', result1.data.wechatImageUrl);

    // 场景2：修改图片
    const result2 = await client.editImage('Add a wizard hat', './cat.png');
    console.log('微信URL:', result2.data.wechatImageUrl);

    // 场景3：组合图片
    const result3 = await client.composeImages(
      'Combine these images',
      ['./image1.png', './image2.png']
    );
    console.log('微信URL:', result3.data.wechatImageUrl);

  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

module.exports = WechatImageAPIClient;
```

### Python SDK

```python
import requests
import base64
from typing import List, Optional

class WechatImageAPIClient:
    def __init__(self, base_url: str, api_key: str,
                 google_api_key: Optional[str] = None,
                 wechat_app_id: Optional[str] = None,
                 wechat_app_secret: Optional[str] = None):
        self.base_url = base_url
        self.api_key = api_key
        self.google_api_key = google_api_key
        self.wechat_app_id = wechat_app_id
        self.wechat_app_secret = wechat_app_secret

    def _get_headers(self, content_type='application/json'):
        headers = {
            'X-API-Key': self.api_key
        }
        if content_type:
            headers['Content-Type'] = content_type
        return headers

    def _add_credentials(self, data: dict):
        """添加客户端凭证"""
        if self.google_api_key:
            data['apiKey'] = self.google_api_key
        if self.wechat_app_id:
            data['appId'] = self.wechat_app_id
        if self.wechat_app_secret:
            data['appsecret'] = self.wechat_app_secret

    def text_to_image(self, prompt: str) -> dict:
        """文本转图片并上传微信"""
        data = {'prompt': prompt}
        self._add_credentials(data)

        response = requests.post(
            f'{self.base_url}/api/image/generate-wechat',
            json=data,
            headers=self._get_headers(),
            timeout=180
        )
        response.raise_for_status()
        return response.json()

    def edit_image(self, prompt: str, image_path: str) -> dict:
        """修改图片并上传微信（文件上传方式）"""
        headers = {'X-API-Key': self.api_key}

        files = {'images': open(image_path, 'rb')}
        data = {'prompt': prompt}

        # 添加凭证
        if self.google_api_key:
            data['apiKey'] = self.google_api_key
        if self.wechat_app_id:
            data['appId'] = self.wechat_app_id
        if self.wechat_app_secret:
            data['appsecret'] = self.wechat_app_secret

        response = requests.post(
            f'{self.base_url}/api/image/generate-wechat',
            data=data,
            files=files,
            headers=headers,
            timeout=180
        )
        response.raise_for_status()
        return response.json()

    def edit_image_base64(self, prompt: str, image_path: str) -> dict:
        """修改图片并上传微信（Base64 方式）"""
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')

        data = {
            'prompt': prompt,
            'imagesData': [
                {
                    'data': image_data,
                    'mimeType': 'image/png'
                }
            ]
        }
        self._add_credentials(data)

        response = requests.post(
            f'{self.base_url}/api/image/generate-wechat',
            json=data,
            headers=self._get_headers(),
            timeout=180
        )
        response.raise_for_status()
        return response.json()

    def compose_images(self, prompt: str, image_paths: List[str]) -> dict:
        """组合多张图片并上传微信"""
        headers = {'X-API-Key': self.api_key}

        files = [('images', open(path, 'rb')) for path in image_paths]
        data = {'prompt': prompt}

        # 添加凭证
        if self.google_api_key:
            data['apiKey'] = self.google_api_key
        if self.wechat_app_id:
            data['appId'] = self.wechat_app_id
        if self.wechat_app_secret:
            data['appsecret'] = self.wechat_app_secret

        response = requests.post(
            f'{self.base_url}/api/image/generate-wechat',
            data=data,
            files=files,
            headers=headers,
            timeout=180
        )
        response.raise_for_status()
        return response.json()

# 使用示例
if __name__ == '__main__':
    import os

    client = WechatImageAPIClient(
        base_url='https://api.yourdomain.com',
        api_key='your_api_key',
        google_api_key=os.getenv('GOOGLE_API_KEY'),  # 可选
        wechat_app_id=os.getenv('WECHAT_APP_ID'),    # 可选
        wechat_app_secret=os.getenv('WECHAT_APP_SECRET')  # 可选
    )

    # 场景1：文本转图片
    result = client.text_to_image('Create a nano banana picture')
    print('微信URL:', result['data']['wechatImageUrl'])

    # 场景2：修改图片
    result = client.edit_image('Add a wizard hat', './cat.png')
    print('微信URL:', result['data']['wechatImageUrl'])

    # 场景3：组合图片
    result = client.compose_images(
        'Combine these images',
        ['./image1.png', './image2.png']
    )
    print('微信URL:', result['data']['wechatImageUrl'])
```

## 响应格式

```json
{
  "success": true,
  "message": "AI图片生成并上传微信成功",
  "data": {
    "wechatImageUrl": "https://mmbiz.qpic.cn/...",
    "imageSize": 524288,
    "prompt": "用户的提示词",
    "sceneType": "text-to-image",  // 或 image-editing, image-composition
    "inputImagesCount": 0
  },
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

## 常见问题

### Q: 支持哪些图片格式？
A: 支持 JPG、PNG、GIF 格式，单个文件最大 10MB。

### Q: 可以同时上传多少张图片？
A: 最多 10 张图片。

### Q: 如何知道是哪种场景？
A: 根据输入图片数量自动判断：
- 0张 → text-to-image
- 1张 → image-editing
- 2张以上 → image-composition

### Q: Base64 和文件上传哪个更好？
A:
- 文件上传：适合本地文件，更直观
- Base64：适合已在内存中的图片，无需文件 I/O

### Q: 生成需要多长时间？
A: 通常 30-90 秒（生成 + 上传微信）

### Q: 如果没有微信凭证怎么办？
A: 必须配置微信凭证（服务器或客户端提供）才能使用此接口。如果只需要生成图片，使用 `/api/image/generate` 接口。

## 总结

✅ **完全支持远程调用**
✅ **支持发送图片和 prompt**
✅ **支持文件上传和 Base64 两种方式**
✅ **支持客户端提供凭证**
✅ **自动判断场景类型**
✅ **返回微信永久 URL**

使用此接口，远程客户端可以轻松实现：生成 AI 图片 → 自动上传微信 → 获取微信 URL！
